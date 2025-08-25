import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'
import { AssigneeColorDAL } from '@/dal/assignee-colors'

// 色設定を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { id: projectId } = await params

    // プロジェクト所有者チェック
    const isOwner = await AssigneeColorDAL.isProjectOwner(projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    // 色設定を取得
    const colorSettings = await AssigneeColorDAL.getProjectColorSettings(projectId)

    return NextResponse.json(colorSettings)
  } catch (error) {
    console.error('Error fetching color settings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// 色設定を更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { id: projectId } = await params
    const body = await request.json()
    const { assignee, colorIndex }: { assignee: string; colorIndex: number } = body

    // バリデーション
    if (!assignee || typeof colorIndex !== 'number' || colorIndex < 0 || colorIndex > 4) {
      return NextResponse.json(
        { error: 'Invalid assignee or colorIndex (must be 0-4)' },
        { status: 400 }
      )
    }

    // プロジェクト所有者チェック
    const isOwner = await AssigneeColorDAL.isProjectOwner(projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    // 色設定を更新
    await AssigneeColorDAL.setAssigneeColor(projectId, assignee, colorIndex)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating color settings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// 色設定をリセット（デフォルトに戻す）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const assignee = searchParams.get('assignee')

    // プロジェクト所有者チェック
    const isOwner = await AssigneeColorDAL.isProjectOwner(projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    if (assignee) {
      // 特定の担当者の色設定を削除
      await AssigneeColorDAL.removeAssigneeColor(projectId, assignee)
    } else {
      // 全ての色設定を削除
      await AssigneeColorDAL.clearProjectColorSettings(projectId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting color settings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
