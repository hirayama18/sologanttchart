import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { TaskDAL } from '@/dal/tasks'
import { UpdateTaskRequest, TaskResponse } from '@/lib/types/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await TaskDAL.getById(params.id)
    
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
  { params }: { params: { id: string } }
) {
  try {
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
    if (body.plannedStart) updateData.plannedStart = new Date(body.plannedStart)
    if (body.plannedEnd) updateData.plannedEnd = new Date(body.plannedEnd)
    if (body.order !== undefined) updateData.order = body.order

    // completedAt は Prisma クライアントの世代差異でエラーになる可能性があるため、
    // 本体更新とは分離して直接SQLで更新する（SQLite）。
    const completedAtIso = body.completedAt

    const task = await TaskDAL.update(params.id, updateData)

    if (completedAtIso !== undefined) {
      const dateOrNull = completedAtIso ? new Date(completedAtIso).toISOString() : null
      const { prisma } = await import('@/lib/prisma')
      await prisma.$executeRawUnsafe(
        'UPDATE tasks SET completedAt = ? WHERE id = ?',
        dateOrNull,
        params.id
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
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await TaskDAL.delete(params.id)
    
    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}