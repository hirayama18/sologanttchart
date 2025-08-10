import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { ProjectDAL } from '@/dal/projects'
import { CreateProjectRequest, ProjectResponse } from '@/lib/types/api'

export async function GET() {
  try {
    // TODO: Clerk認証実装後にuserId取得を実装
    const userId = 'temp-user-id' // 一時的なユーザーID
    
    const projects = await ProjectDAL.getByUserId(userId)
    
    const response: ProjectResponse[] = projects.map(project => ({
      id: project.id,
      title: project.title,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate ? project.endDate.toISOString() : null,
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    }))

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
    
    // TODO: Clerk認証実装後にuserId取得を実装
    const userId = 'temp-user-id' // 一時的なユーザーID
    
    const projectData = {
      title: body.title,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      userId
    }

    const project = await ProjectDAL.create(projectData)
    
    const response: ProjectResponse = {
      id: project.id,
      title: project.title,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate ? project.endDate.toISOString() : null,
      userId: project.userId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
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