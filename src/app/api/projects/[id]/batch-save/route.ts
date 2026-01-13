import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CreateTaskRequest, UpdateTaskRequest } from '@/lib/types/api'

interface BatchSaveRequest {
  created: (CreateTaskRequest & { tempId?: string })[]
  updated: { id: string; updates: UpdateTaskRequest }[]
  deleted: string[]
  reordered: { id: string; order: number }[] | null
}

interface BatchSaveResponse {
  success: boolean
  createdTasks: { tempId?: string; id: string }[]
  updatedCount: number
  deletedCount: number
  reorderedCount: number
}

type TaskLimitReachedError = Error & {
  code: 'TASK_LIMIT_REACHED'
  limit: number
  current: number
}

function isTaskLimitReachedError(error: unknown): error is TaskLimitReachedError {
  if (!(error instanceof Error)) return false
  const maybe = error as Partial<TaskLimitReachedError>
  return (
    maybe.code === 'TASK_LIMIT_REACHED' ||
    error.message === 'TASK_LIMIT_REACHED'
  )
}

/**
 * タスクの一括保存API
 * - 新規作成、更新、削除、並び替えをトランザクションで一括処理
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    
    // プロジェクトの所有者確認
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: BatchSaveRequest = await request.json()
    const { created, updated, deleted, reordered } = body

    console.log('Batch save request:', {
      projectId,
      createdCount: created?.length || 0,
      updatedCount: updated?.length || 0,
      deletedCount: deleted?.length || 0,
      reorderedCount: reordered?.length || 0
    })

    // 日付文字列をDateに変換するヘルパー
    const parseDate = (value: string | null | undefined): Date | null => {
      if (!value) return null
      // YYYY-MM-DD形式の場合はローカル深夜として扱う
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(value + 'T00:00:00.000Z')
      }
      // ISO形式の場合はそのまま
      return new Date(value)
    }

    // トランザクションで一括処理
    // NOTE:
    // 変更件数が多い場合、interactive transaction のデフォルト timeout により
    // 途中でトランザクションがクローズされ「Transaction not found」になることがあるため
    // 明示的に timeout / maxWait を延長する。
    const result = await prisma.$transaction(async (tx) => {
      const createdTasks: { tempId?: string; id: string }[] = []
      
      // 1. 削除処理（論理削除）
      if (deleted && deleted.length > 0) {
        await tx.task.updateMany({
          where: {
            id: { in: deleted },
            projectId: projectId
          },
          data: { deleted: true }
        })
      }

      // 無料プラン制限: タスクはプロジェクト内で5件まで
      // - 削除→作成が同一リクエスト内にある場合は、削除後の件数で判定する
      // - created はローカルの仮IDも含むため、DB側の件数に created.length を加算する
      const FREE_TASK_LIMIT = 5
      const { SubscriptionDAL } = await import('@/dal/subscriptions')
      const isPro = await SubscriptionDAL.isProUser(userId)
      if (!isPro) {
        const currentAfterDeletes = await tx.task.count({
          where: { projectId, deleted: false },
        })
        const incomingCreates = created?.length ?? 0
        if (incomingCreates > 0 && currentAfterDeletes + incomingCreates > FREE_TASK_LIMIT) {
          // throw して transaction を中断し、ハンドリングで403を返す
          const err: TaskLimitReachedError = Object.assign(new Error('TASK_LIMIT_REACHED'), {
            code: 'TASK_LIMIT_REACHED' as const,
            limit: FREE_TASK_LIMIT,
            current: currentAfterDeletes,
          })
          throw err
        }
      }

      // 2. 更新処理
      if (updated && updated.length > 0) {
        for (const { id, updates } of updated) {
          // parentIdの解決
          let resolvedParentId: string | null | undefined = updates.parentId
          if (updates.parentId !== undefined && updates.parentId !== null) {
            // 既存のIDの場合は存在確認
            const parentExists = await tx.task.findUnique({
              where: { id: updates.parentId },
              select: { id: true, deleted: true }
            })
            if (!parentExists || parentExists.deleted) {
              console.warn(`Parent task ${updates.parentId} not found or deleted, setting parentId to null`)
              resolvedParentId = null
            }
          }
          
          await tx.task.update({
            where: { id },
            data: {
              ...(updates.title !== undefined && { title: updates.title }),
              ...(updates.assignee !== undefined && { assignee: updates.assignee }),
              ...(updates.plannedStart !== undefined && { plannedStart: parseDate(updates.plannedStart) }),
              ...(updates.plannedEnd !== undefined && { plannedEnd: parseDate(updates.plannedEnd) }),
              ...(updates.isCompleted !== undefined && { isCompleted: updates.isCompleted }),
              ...(updates.parentId !== undefined && { parentId: resolvedParentId ?? null }),
              ...(updates.order !== undefined && { order: updates.order })
            }
          })
        }
      }

      // 3. 新規作成処理
      if (created && created.length > 0) {
        // 現在の最大orderを取得
        const maxOrderResult = await tx.task.aggregate({
          where: { projectId, deleted: false },
          _max: { order: true }
        })
        let currentMaxOrder = maxOrderResult._max.order || 0

        // 親子関係を解決するためのマップ（仮ID -> 実際のID）
        const tempIdToRealId = new Map<string, string>()
        
        // 親子関係を考慮してソート（親を先に作成）
        // parentIdがnullまたは既存のIDの場合は先に作成
        // parentIdが仮IDの場合は後で作成（親が先に作成される）
        const sortedCreated = [...created].sort((a, b) => {
          const aHasTempParent = a.parentId && a.parentId.startsWith('local-')
          const bHasTempParent = b.parentId && b.parentId.startsWith('local-')
          
          // 親がない、または既存の親を持つタスクを先に
          if (!aHasTempParent && bHasTempParent) return -1
          if (aHasTempParent && !bHasTempParent) return 1
          return 0
        })

        for (const taskData of sortedCreated) {
          currentMaxOrder += 1
          
          // parentIdが仮IDの場合は、既に作成された親の実際のIDに置き換え
          let resolvedParentId: string | null = null
          if (taskData.parentId) {
            if (taskData.parentId.startsWith('local-')) {
              // 仮IDの場合、マップから実際のIDを取得
              const realParentId = tempIdToRealId.get(taskData.parentId)
              if (!realParentId) {
                // 親が見つからない場合はエラー（通常は発生しないはず）
                console.warn(`Parent task with tempId ${taskData.parentId} not found, setting parentId to null`)
                resolvedParentId = null
              } else {
                resolvedParentId = realParentId
              }
            } else {
              // 既存のIDの場合は存在確認
              const parentExists = await tx.task.findUnique({
                where: { id: taskData.parentId },
                select: { id: true, deleted: true }
              })
              if (!parentExists || parentExists.deleted) {
                console.warn(`Parent task ${taskData.parentId} not found or deleted, setting parentId to null`)
                resolvedParentId = null
              } else {
                resolvedParentId = taskData.parentId
              }
            }
          }
          
          const newTask = await tx.task.create({
            data: {
              title: taskData.title,
              assignee: taskData.assignee,
              plannedStart: parseDate(taskData.plannedStart),
              plannedEnd: parseDate(taskData.plannedEnd),
              isCompleted: taskData.isCompleted === true,
              projectId: projectId,
              parentId: resolvedParentId,
              order: currentMaxOrder
            }
          })
          
          // 仮IDと実際のIDのマッピングを保存（このタスクが他のタスクの親になる可能性があるため）
          if (taskData.tempId) {
            tempIdToRealId.set(taskData.tempId, newTask.id)
          }
          
          createdTasks.push({ 
            id: newTask.id,
            ...(taskData.tempId && { tempId: taskData.tempId })
          })
        }
      }

      // 4. 並び替え処理（新規作成後に実行）
      if (reordered && reordered.length > 0) {
        for (const { id, order } of reordered) {
          await tx.task.update({
            where: { id },
            data: { order }
          })
        }
      }

      return {
        createdTasks,
        updatedCount: updated?.length || 0,
        deletedCount: deleted?.length || 0,
        reorderedCount: reordered?.length || 0
      }
    }, {
      // 取得待ち(接続待ち)と実行上限を拡張
      // - SQLite / 開発環境で多数更新するとデフォルトでは足りないケースがある
      maxWait: 30_000,
      timeout: 30_000
    })

    const response: BatchSaveResponse = {
      success: true,
      ...result
    }

    console.log('Batch save completed:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Batch save error:', error)
    if (isTaskLimitReachedError(error)) {
      const limit = error.limit ?? 5
      const current = error.current ?? null
      return NextResponse.json(
        {
          error: 'TASK_LIMIT_REACHED',
          message: `無料プランではタスクは${limit}件まで作成できます。アップグレードしてください。`,
          limit,
          current,
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    )
  }
}

