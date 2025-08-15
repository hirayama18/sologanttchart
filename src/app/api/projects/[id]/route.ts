import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime to avoid build-time resolution issues
import { UpdateProjectRequest, ProjectWithTasksResponse, TaskResponse } from '@/lib/types/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ProjectDAL } = await import('@/dal/projects')
    const { id } = await params
    const project = await ProjectDAL.getById(id)
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const response: ProjectWithTasksResponse = {
      id: project.id,
      title: project.title,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate ? project.endDate.toISOString() : null,
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
        tasks: project.tasks.map(task => {
          const completedAtValue = task.completedAt ? task.completedAt.toISOString() : null
          // デバッグ用ログ
          console.log('Project API - Task:', {
            id: task.id,
            title: task.title,
            completedAt: task.completedAt,
            completedAtValue,
            completedAtType: typeof task.completedAt
          })
          return {
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
          } as TaskResponse
        })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching project:', error)
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
    const { ProjectDAL } = await import('@/dal/projects')
    const { id } = await params
    const body: UpdateProjectRequest = await request.json()
    
    // TODO: Clerk認証実装後に所有者チェックを実装
    // const userId = 'temp-user-id'
    // const isOwner = await ProjectDAL.isOwner(id, userId)
    // if (!isOwner) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }
    
    const updateData: Partial<{ title: string; startDate: Date; endDate: Date | null }> = {}
    if (body.title) updateData.title = body.title
    if (body.startDate) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null

    const project = await ProjectDAL.update(id, updateData)
    
    const response: ProjectWithTasksResponse = {
      id: project.id,
      title: project.title,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate ? project.endDate.toISOString() : null,
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      tasks: project.tasks.map(task => ({
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
      } as TaskResponse))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ProjectDAL } = await import('@/dal/projects')
    const { id } = await params
    // TODO: Clerk認証実装後に所有者チェックを実装
    // const userId = 'temp-user-id'
    // const isOwner = await ProjectDAL.isOwner(id, userId)
    // if (!isOwner) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    await ProjectDAL.delete(id)
    
    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}