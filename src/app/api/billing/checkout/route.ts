import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
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
    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      return NextResponse.json({ error: 'Missing STRIPE_PRICE_ID' }, { status: 500 })
    }

    const { SubscriptionDAL } = await import('@/dal/subscriptions')

    const existing = await SubscriptionDAL.getByUserId(userId)
    let customerId = existing?.stripeCustomerId ?? null

    if (!customerId) {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      const email = user.emailAddresses?.[0]?.emailAddress

      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      })
      customerId = customer.id
      await SubscriptionDAL.upsertCustomerId(userId, customerId)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/projects?billing=success`,
      cancel_url: `${origin}/pricing?billing=cancel`,
      metadata: { userId, priceId },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe session url missing' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

