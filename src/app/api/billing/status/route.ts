import { NextResponse } from 'next/server'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) return authResult.error
    const { userId } = authResult

    const { SubscriptionDAL } = await import('@/dal/subscriptions')
    const sub = await SubscriptionDAL.getByUserId(userId)
    const isPro = await SubscriptionDAL.isProUser(userId)

    return NextResponse.json({
      isPro,
      status: sub?.status ?? 'FREE',
      purchasedAt: sub?.purchasedAt ? sub.purchasedAt.toISOString() : null,
    })
  } catch (error) {
    console.error('Billing status error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

