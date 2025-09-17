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
      plannedStart: task.plannedStart.toISOString(),
      plannedEnd: task.plannedEnd.toISOString(),
      order: task.order,
      deleted: task.deleted,
      projectId: task.projectId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      completedAt: task.completedAt ? task.completedAt.toISOString() : null
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
      plannedStart: Date;
      plannedEnd: Date;
      order: number;
    }> = {}
    
    if (body.title) updateData.title = body.title
    if (body.assignee) updateData.assignee = body.assignee
    if (body.plannedStart) {
      // ISO形式を最優先、YYYY-MM-DDでも受けつける
      const raw = body.plannedStart
      const startDateStr = typeof raw === 'string' && raw.includes('T')
        ? raw
        : `${raw}T00:00:00.000Z`
      const startDate = new Date(startDateStr)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid plannedStart date format', received: body.plannedStart },
          { status: 400 }
        )
      }
      updateData.plannedStart = startDate
    }
    if (body.plannedEnd) {
      const raw = body.plannedEnd
      const endDateStr = typeof raw === 'string' && raw.includes('T')
        ? raw
        : `${raw}T00:00:00.000Z`
      const endDate = new Date(endDateStr)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid plannedEnd date format', received: body.plannedEnd },
          { status: 400 }
        )
      }
      updateData.plannedEnd = endDate
    }
    if (body.order !== undefined) updateData.order = body.order

    // completedAt は Prisma クライアントの世代差異でエラーになる可能性があるため、
    // 本体更新とは分離して直接SQLで更新する（SQLite）。
    const completedAtIso = body.completedAt

    const task = await TaskDAL.update(id, updateData)

    let finalCompletedAt: string | null = null
    console.log('Task update API - completedAt processing:', {
      taskId: id,
      completedAtIso,
      completedAtUndefined: completedAtIso === undefined,
      originalCompletedAt: task.completedAt
    })
    
    if (completedAtIso !== undefined) {
      let dateOrNull: Date | null = null
      if (completedAtIso) {
        // YYYY-MM-DD形式の場合はT00:00:00.000Zを追加
        const dateString = completedAtIso.includes('T') 
          ? completedAtIso 
          : completedAtIso + 'T00:00:00.000Z'
        dateOrNull = new Date(dateString)
        finalCompletedAt = dateOrNull.toISOString()
        console.log('Task update API - Setting completedAt:', {
          dateString,
          dateOrNull,
          finalCompletedAt
        })
      } else {
        console.log('Task update API - Clearing completedAt')
      }
      const { prisma } = await import('@/lib/prisma')
      await prisma.task.update({
        where: { id },
        data: { completedAt: dateOrNull }
      })
    } else {
      // completedAtが更新されない場合は元の値を使用
      finalCompletedAt = task.completedAt ? task.completedAt.toISOString() : null
      console.log('Task update API - Using original completedAt:', finalCompletedAt)
    }
    
    const response: TaskResponse = {
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      plannedStart: task.plannedStart.toISOString(),
      plannedEnd: task.plannedEnd.toISOString(),
      order: task.order,
      deleted: task.deleted,
      projectId: task.projectId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      completedAt: finalCompletedAt
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
    const { TaskDAL } = await import('@/dal/tasks')
    const { id } = await params
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