import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !webhookSecret) {
      return NextResponse.json({ error: 'Missing webhook signature/secret' }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    const { SubscriptionDAL } = await import('@/dal/subscriptions')

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const sessionId = session.id
        const paymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
        const priceId = session.metadata?.priceId ?? null

        if (!userId || !customerId) {
          break
        }

        // ワンタイム購入（永久）: checkout.session.completed で購入済み扱いにする
        await SubscriptionDAL.upsertOneTimePurchase({
          userId,
          stripeCustomerId: customerId,
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId ?? null,
          stripePriceId: priceId,
          purchasedAt: new Date(),
        })
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', message: (error as Error).message },
      { status: 400 }
    )
  }
}

