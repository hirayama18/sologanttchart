import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime
import { CreateTaskRequest, TaskResponse } from '@/lib/types/api'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { TaskDAL } = await import('@/dal/tasks')
    const { ProjectDAL } = await import('@/dal/projects')
    const { SubscriptionDAL } = await import('@/dal/subscriptions')
    const body: CreateTaskRequest = await request.json()
    
    // プロジェクトの所有者チェック
    const isOwner = await ProjectDAL.isOwner(body.projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    // 無料プラン制限: タスクはプロジェクト内で5件まで（deleted=falseのみカウント）
    const FREE_TASK_LIMIT = 5
    const isPro = await SubscriptionDAL.isProUser(userId)
    if (!isPro) {
      const current = await TaskDAL.countActiveByProjectId(body.projectId)
      if (current >= FREE_TASK_LIMIT) {
        return NextResponse.json(
          {
            error: 'TASK_LIMIT_REACHED',
            message: `無料プランではタスクは${FREE_TASK_LIMIT}件まで作成できます。アップグレードしてください。`,
            limit: FREE_TASK_LIMIT,
            current,
          },
          { status: 403 }
        )
      }
    }

    console.log('Create Task Request Body:', JSON.stringify(body))

    // 中項目（parentIdなし）は担当者未設定でもOK。
    // 小項目（parentIdあり）は担当者が空だと運用上困るため、空は弾く。
    const isSubTask = !!body.parentId
    if (isSubTask && (!body.assignee || body.assignee.trim() === '')) {
      return NextResponse.json(
        { error: 'Invalid assignee: required for sub tasks', received: body.assignee },
        { status: 400 }
      )
    }
    
    const parseDate = (val: string | null | undefined): Date | null => {
      if (!val) return null;
      try {
        const strVal = String(val);
        const dateStr = strVal.includes('T') ? strVal : `${strVal}T00:00:00`;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    }

    if (body.isCompleted !== undefined && typeof body.isCompleted !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid isCompleted: must be boolean', received: body.isCompleted },
        { status: 400 }
      )
    }
    
    const taskData = {
      title: body.title,
      // 中項目（parentIdなし）は空文字も許容
      assignee: body.assignee ?? '',
      plannedStart: parseDate(body.plannedStart),
      plannedEnd: parseDate(body.plannedEnd),
      isCompleted: body.isCompleted === true,
      projectId: body.projectId,
      parentId: body.parentId || null,
      // orderはDALで自動計算されるため、明示的に指定しない
      // これにより新規タスクは必ず一番下に配置される
    }

    const task = await TaskDAL.create(taskData)
    
    const response: TaskResponse = {
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      plannedStart: task.plannedStart ? task.plannedStart.toISOString() : null,
      plannedEnd: task.plannedEnd ? task.plannedEnd.toISOString() : null,
      order: task.order,
      deleted: task.deleted,
      projectId: task.projectId,
      parentId: task.parentId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      isCompleted: task.isCompleted
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    )
  }
}