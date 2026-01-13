-- AlterTable
ALTER TABLE "public"."user_subscriptions"
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "purchasedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_stripeCheckoutSessionId_key" ON "public"."user_subscriptions"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_stripePaymentIntentId_key" ON "public"."user_subscriptions"("stripePaymentIntentId");

