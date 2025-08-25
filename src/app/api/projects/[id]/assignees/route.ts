import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'
import { ProjectAssigneeOptionDAL } from '@/dal/project-assignee-options'

// 担当者選択肢を取得
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
    const isOwner = await ProjectAssigneeOptionDAL.isProjectOwner(projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    // 担当者選択肢がない場合はデフォルトを作成
    await ProjectAssigneeOptionDAL.ensureAssigneeOptionsExist(projectId)

    // 担当者選択肢を取得
    const options = await ProjectAssigneeOptionDAL.getProjectAssigneeOptions(projectId)

    return NextResponse.json(options.map(option => ({
      name: option.name,
      order: option.order
    })))
  } catch (error) {
    console.error('Error fetching assignee options:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// 担当者選択肢を更新
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
    const { options }: { options: { name: string; order: number }[] } = body

    // バリデーション
    if (!Array.isArray(options) || options.length === 0 || options.length > 4) {
      return NextResponse.json(
        { error: 'Options must be an array with 1-4 items' },
        { status: 400 }
      )
    }

    // 各選択肢のバリデーション
    for (const option of options) {
      if (!option.name || typeof option.name !== 'string' || option.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Each option must have a non-empty name' },
          { status: 400 }
        )
      }
      
      if (typeof option.order !== 'number' || option.order < 0 || option.order > 3) {
        return NextResponse.json(
          { error: 'Order must be a number between 0 and 3' },
          { status: 400 }
        )
      }
    }

    // 順序の重複チェック
    const orders = options.map(o => o.order)
    if (new Set(orders).size !== orders.length) {
      return NextResponse.json(
        { error: 'Duplicate order values are not allowed' },
        { status: 400 }
      )
    }

    // 名前の重複チェック
    const names = options.map(o => o.name.trim())
    if (new Set(names).size !== names.length) {
      return NextResponse.json(
        { error: 'Duplicate names are not allowed' },
        { status: 400 }
      )
    }

    // プロジェクト所有者チェック
    const isOwner = await ProjectAssigneeOptionDAL.isProjectOwner(projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    // 担当者選択肢を更新
    const sanitizedOptions = options.map(option => ({
      name: option.name.trim(),
      order: option.order
    }))
    
    await ProjectAssigneeOptionDAL.setProjectAssigneeOptions(projectId, sanitizedOptions)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating assignee options:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
