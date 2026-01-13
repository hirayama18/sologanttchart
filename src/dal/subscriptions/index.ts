import { prisma } from '@/lib/prisma'
import { SubscriptionStatus, UserSubscription } from '@prisma/client'

export class SubscriptionDAL {
  static async getByUserId(userId: string): Promise<UserSubscription | null> {
    return prisma.userSubscription.findUnique({ where: { userId } })
  }

  static async isProUser(userId: string): Promise<boolean> {
    const sub = await prisma.userSubscription.findUnique({
      where: { userId },
      select: { status: true },
    })
    return sub?.status === SubscriptionStatus.ACTIVE || sub?.status === SubscriptionStatus.TRIALING
  }

  static async upsertCustomerId(userId: string, stripeCustomerId: string): Promise<UserSubscription> {
    return prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        status: SubscriptionStatus.FREE,
      },
      update: {
        stripeCustomerId,
      },
    })
  }

  static async upsertFromSubscription(params: {
    userId: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    stripePriceId: string | null
    status: SubscriptionStatus
    currentPeriodEnd: Date | null
  }): Promise<UserSubscription> {
    const {
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodEnd,
    } = params

    return prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: stripePriceId ?? undefined,
        status,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      },
      update: {
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: stripePriceId ?? null,
        status,
        currentPeriodEnd: currentPeriodEnd ?? null,
      },
    })
  }

  static async upsertOneTimePurchase(params: {
    userId: string
    stripeCustomerId: string
    stripeCheckoutSessionId: string
    stripePaymentIntentId: string | null
    stripePriceId: string | null
    purchasedAt: Date
  }): Promise<UserSubscription> {
    const {
      userId,
      stripeCustomerId,
      stripeCheckoutSessionId,
      stripePaymentIntentId,
      stripePriceId,
      purchasedAt,
    } = params

    return prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        stripeCheckoutSessionId,
        stripePaymentIntentId: stripePaymentIntentId ?? undefined,
        stripePriceId: stripePriceId ?? undefined,
        status: SubscriptionStatus.ACTIVE,
        purchasedAt,
      },
      update: {
        stripeCustomerId,
        stripeCheckoutSessionId,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        stripePriceId: stripePriceId ?? null,
        status: SubscriptionStatus.ACTIVE,
        purchasedAt,
        // サブスク項目は買い切りでは未使用
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      },
    })
  }

  static async updateByStripeIds(params: {
    stripeSubscriptionId?: string | null
    stripeCustomerId?: string | null
    status: SubscriptionStatus
    stripePriceId: string | null
    currentPeriodEnd: Date | null
  }): Promise<UserSubscription | null> {
    const { stripeSubscriptionId, stripeCustomerId, status, stripePriceId, currentPeriodEnd } = params

    if (!stripeSubscriptionId && !stripeCustomerId) return null

    const existing = await prisma.userSubscription.findFirst({
      where: {
        OR: [
          ...(stripeSubscriptionId ? [{ stripeSubscriptionId }] : []),
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
        ],
      },
    })

    if (!existing) return null

    return prisma.userSubscription.update({
      where: { userId: existing.userId },
      data: {
        stripeSubscriptionId: stripeSubscriptionId ?? existing.stripeSubscriptionId,
        stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
        stripePriceId,
        status,
        currentPeriodEnd,
      },
    })
  }
}

