import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { TaskDAL } from '@/dal/tasks'
import { TaskResponse } from '@/lib/types/api'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await TaskDAL.duplicate(params.id)
    
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