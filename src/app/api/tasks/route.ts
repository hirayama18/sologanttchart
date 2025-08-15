import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime
import { CreateTaskRequest, TaskResponse } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    const { TaskDAL } = await import('@/dal/tasks')
    const body: CreateTaskRequest = await request.json()
    
    const taskData = {
      title: body.title,
      assignee: body.assignee,
      plannedStart: new Date(body.plannedStart + (body.plannedStart.includes('T') ? '' : 'T00:00:00.000Z')),
      plannedEnd: new Date(body.plannedEnd + (body.plannedEnd.includes('T') ? '' : 'T00:00:00.000Z')),
      projectId: body.projectId,
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
      plannedStart: task.plannedStart.toISOString(),
      plannedEnd: task.plannedEnd.toISOString(),
      order: task.order,
      deleted: task.deleted,
      projectId: task.projectId,
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