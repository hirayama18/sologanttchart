import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime
import { TaskResponse } from '@/lib/types/api'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { TaskDAL } = await import('@/dal/tasks')
    const { id } = await params
    
    // タスクの所有者チェック
    const isOwner = await TaskDAL.isOwnerTask(id, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this task' },
        { status: 403 }
      )
    }
    
    const task = await TaskDAL.duplicate(id)
    
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
      updatedAt: task.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error duplicating task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}