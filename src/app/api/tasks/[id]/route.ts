import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime
import { UpdateTaskRequest, TaskResponse } from '@/lib/types/api'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

export async function GET(
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
    
    const task = await TaskDAL.getById(id)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
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
      isCompleted: task.isCompleted
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    
    const body: UpdateTaskRequest = await request.json()
    
    const updateData: Partial<{
      title: string;
      assignee: string;
      plannedStart: Date | null;
      plannedEnd: Date | null;
      order: number;
      parentId: string | null;
      isCompleted: boolean;
    }> = {}
    
    if (body.title) updateData.title = body.title
    // 空文字でのクリアも許可するため、undefined判定にする
    if (body.assignee !== undefined) {
      if (body.assignee !== null && typeof body.assignee !== 'string') {
        return NextResponse.json(
          { error: 'Invalid assignee', received: body.assignee },
          { status: 400 }
        )
      }
      updateData.assignee = (body.assignee ?? '') as string
    }
    if (body.parentId !== undefined) updateData.parentId = body.parentId
    if (body.plannedStart !== undefined) {
      if (body.plannedStart === null) {
        updateData.plannedStart = null
      } else {
        // ISO形式を最優先、YYYY-MM-DDでも受けつける
        const raw = body.plannedStart
        const startDate = typeof raw === 'string' && raw.includes('T')
          ? new Date(raw)
          : new Date(raw as string + 'T00:00:00') // ローカル深夜
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid plannedStart date format', received: body.plannedStart },
            { status: 400 }
          )
        }
        updateData.plannedStart = startDate
      }
    }
    if (body.plannedEnd !== undefined) {
      if (body.plannedEnd === null) {
        updateData.plannedEnd = null
      } else {
        const raw = body.plannedEnd
        const endDate = typeof raw === 'string' && raw.includes('T')
          ? new Date(raw)
          : new Date(raw as string + 'T00:00:00') // ローカル深夜
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid plannedEnd date format', received: body.plannedEnd },
            { status: 400 }
          )
        }
        updateData.plannedEnd = endDate
      }
    }
    if (body.order !== undefined) updateData.order = body.order
    if (body.isCompleted !== undefined) {
      if (typeof body.isCompleted !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid isCompleted: must be boolean', received: body.isCompleted },
          { status: 400 }
        )
      }
      updateData.isCompleted = body.isCompleted
    }

    const task = await TaskDAL.update(id, updateData)
    
    const response: TaskResponse = {
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      plannedStart: task.plannedStart ? new Date(task.plannedStart.getFullYear(), task.plannedStart.getMonth(), task.plannedStart.getDate()).toISOString() : null,
      plannedEnd: task.plannedEnd ? new Date(task.plannedEnd.getFullYear(), task.plannedEnd.getMonth(), task.plannedEnd.getDate()).toISOString() : null,
      order: task.order,
      deleted: task.deleted,
      projectId: task.projectId,
      parentId: task.parentId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      isCompleted: task.isCompleted
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    
    await TaskDAL.delete(id)
    
    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}