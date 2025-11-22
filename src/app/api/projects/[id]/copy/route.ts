import { NextRequest, NextResponse } from 'next/server'

export const fetchCache = 'force-no-store'
import { CopyProjectRequest, ProjectWithTasksResponse, TaskResponse } from '@/lib/types/api'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: CopyProjectRequest = await request.json()
    
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult
    
    const { ProjectDAL } = await import('@/dal/projects')
    const { id: sourceProjectId } = await params
    
    // コピー元プロジェクトの所有者チェック
    const isOwner = await ProjectDAL.isOwner(sourceProjectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to the source project' },
        { status: 403 }
      )
    }
    
    const newProjectData = {
      title: body.title,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      userId
    }

    const project = await ProjectDAL.copyProject(sourceProjectId, newProjectData)
    
    const response: ProjectWithTasksResponse = {
      id: project.id,
      title: project.title,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate ? project.endDate.toISOString() : null,
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      timeScale: project.timeScale,
      tasks: project.tasks.map(task => ({
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
      } as TaskResponse))
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error copying project:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
