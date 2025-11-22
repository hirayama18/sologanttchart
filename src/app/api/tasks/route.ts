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
    const body: CreateTaskRequest = await request.json()
    
    // プロジェクトの所有者チェック
    const isOwner = await ProjectDAL.isOwner(body.projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    console.log('Create Task Request Body:', JSON.stringify(body))
    
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
    
    const taskData = {
      title: body.title,
      assignee: body.assignee,
      plannedStart: parseDate(body.plannedStart),
      plannedEnd: parseDate(body.plannedEnd),
      projectId: body.projectId,
      parentId: body.parentId || null,
      // orderはDALで自動計算されるため、明示的に指定しない
      // これにより新規タスクは必ず一番下に配置される
    }

    const task = await TaskDAL.create(taskData)

    // completedAt を直接反映（Prismaの型安全なクエリを使用）
    let completedAtValue: string | null = null
    if (body.completedAt !== undefined) {
      const { prisma } = await import('@/lib/prisma')
      let dateOrNull: Date | null = null
      if (body.completedAt) {
        // YYYY-MM-DD形式の場合はT00:00:00.000Zを追加
        const dateString = body.completedAt.includes('T') 
          ? body.completedAt 
          : body.completedAt + 'T00:00:00.000Z'
        dateOrNull = new Date(dateString)
        completedAtValue = dateOrNull.toISOString()
      }
      await prisma.task.update({
        where: { id: task.id },
        data: { completedAt: dateOrNull }
      })
    }
    
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
      completedAt: completedAtValue
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