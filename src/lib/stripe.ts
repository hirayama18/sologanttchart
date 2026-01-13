import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    // NOTE: build時に環境変数が未設定でも落ちないように、ここでのみ例外を投げる
    throw new Error('Missing environment variable: STRIPE_SECRET_KEY')
  }

  stripeClient = new Stripe(key)
  return stripeClient
}

