import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { TaskDAL } from '@/dal/tasks'
import { CreateTaskRequest, TaskResponse } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json()
    
    const taskData = {
      title: body.title,
      assignee: body.assignee,
      plannedStart: new Date(body.plannedStart),
      plannedEnd: new Date(body.plannedEnd),
      projectId: body.projectId,
      order: body.order
    }

    const task = await TaskDAL.create(taskData)

    // completedAt を直接反映（Prisma クライアントの差異に備え raw を併用）
    if (body.completedAt !== undefined) {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$executeRawUnsafe(
        'UPDATE tasks SET completedAt = ? WHERE id = ?',
        body.completedAt ? new Date(body.completedAt).toISOString() : null,
        task.id
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
      completedAt: body.completedAt ? new Date(body.completedAt).toISOString() : null
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