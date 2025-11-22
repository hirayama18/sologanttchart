import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime
import { CreateProjectRequest, ProjectResponse } from '@/lib/types/api'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

export async function GET() {
  try {
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult
    
    const { ProjectDAL } = await import('@/dal/projects')
    const projects = await ProjectDAL.getByUserId(userId)
    
    const response: ProjectResponse[] = projects.map(project => {
      const s = new Date(project.startDate.getFullYear(), project.startDate.getMonth(), project.startDate.getDate()).toISOString()
      const e = project.endDate
        ? new Date(project.endDate.getFullYear(), project.endDate.getMonth(), project.endDate.getDate()).toISOString()
        : null
      return {
        id: project.id,
        title: project.title,
        startDate: s,
        endDate: e,
        userId: project.userId,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        timeScale: project.timeScale
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json()
    
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult
    
    const { ProjectDAL } = await import('@/dal/projects')
    const projectData = {
      title: body.title,
      startDate: new Date(body.startDate + (body.startDate.includes('T') ? '' : 'T00:00:00')),
      endDate: body.endDate ? new Date(body.endDate + (body.endDate.includes('T') ? '' : 'T00:00:00')) : null,
      userId,
      timeScale: body.timeScale || 'DAY'
    }

    const project = await ProjectDAL.create(projectData)
    
    const response: ProjectResponse = {
      id: project.id,
      title: project.title,
      startDate: new Date(project.startDate.getFullYear(), project.startDate.getMonth(), project.startDate.getDate()).toISOString(),
      endDate: project.endDate ? new Date(project.endDate.getFullYear(), project.endDate.getMonth(), project.endDate.getDate()).toISOString() : null,
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      timeScale: project.timeScale
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}