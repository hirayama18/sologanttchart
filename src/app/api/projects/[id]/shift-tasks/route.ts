import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

interface ShiftTasksRequest {
  days: number
  includeCompleted?: boolean
}

interface ShiftTasksResponse {
  success: true
  projectId: string
  days: number
  includeCompleted: boolean
  updatedCount: number
}

/**
 * プロジェクト配下のタスク日付を一括で +n 日シフトする
 * - 対象: plannedStart / plannedEnd
 * - 除外: deleted=true
 * - 完了状態（isCompleted）は変更しない
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { ProjectDAL } = await import('@/dal/projects')
    const { TaskDAL } = await import('@/dal/tasks')
    const { id: projectId } = await params

    const isOwner = await ProjectDAL.isOwner(projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    const body: ShiftTasksRequest = await request.json()
    const days = body?.days
    // デフォルトは完了済みも対象
    const includeCompleted = body?.includeCompleted !== false

    if (typeof days !== 'number' || !Number.isFinite(days) || !Number.isInteger(days)) {
      return NextResponse.json(
        { error: 'Invalid days: must be an integer number', received: days },
        { status: 400 }
      )
    }

    if (body?.includeCompleted !== undefined && typeof body.includeCompleted !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid includeCompleted: must be boolean', received: body.includeCompleted },
        { status: 400 }
      )
    }

    // 想定外の事故防止（±10年まで）
    if (Math.abs(days) > 3650) {
      return NextResponse.json(
        { error: 'Invalid days: out of range', received: days },
        { status: 400 }
      )
    }

    const result = await TaskDAL.shiftPlannedDatesByProjectId(projectId, days, { includeCompleted })

    const response: ShiftTasksResponse = {
      success: true,
      projectId,
      days,
      includeCompleted,
      updatedCount: result.updatedCount
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error shifting project tasks:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    )
  }
}



