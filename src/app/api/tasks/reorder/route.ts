import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
// Delay DAL import to runtime
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

type ReorderBody = {
  orderedIds: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    const { TaskDAL } = await import('@/dal/tasks')
    const body = (await request.json()) as ReorderBody | string[]
    const orderedIds: string[] = Array.isArray(body)
      ? (body as string[])
      : (body as ReorderBody).orderedIds

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // すべてのタスクが所有者のものかチェック
    for (const taskId of orderedIds) {
      const isOwner = await TaskDAL.isOwnerTask(taskId, userId)
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to one or more tasks' },
          { status: 403 }
        )
      }
    }

    const updates = orderedIds.map((id, index) => ({ id, order: index + 1 }))
    await TaskDAL.updateOrder(updates)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error reordering tasks:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    )
  }
}




