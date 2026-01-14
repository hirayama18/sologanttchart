import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) return authResult.error
    const { userId } = authResult

    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { SubscriptionDAL } = await import('@/dal/subscriptions')
    const existing = await SubscriptionDAL.getByUserId(userId)
    const customerId = existing?.stripeCustomerId

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this user' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

