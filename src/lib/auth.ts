import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * サーバーサイドでClerk認証されたユーザーIDを取得
 * @returns ユーザーIDまたはエラーレスポンス
 */
export async function getAuthenticatedUserId(): Promise<{ userId: string } | { error: NextResponse }> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return {
        error: NextResponse.json(
          { error: 'Unauthorized: User not authenticated' },
          { status: 401 }
        )
      }
    }
    
    return { userId }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

/**
 * ユーザーIDの取得に失敗した場合の型ガード
 */
export function isAuthError(result: { userId: string } | { error: NextResponse }): result is { error: NextResponse } {
  return 'error' in result
}
