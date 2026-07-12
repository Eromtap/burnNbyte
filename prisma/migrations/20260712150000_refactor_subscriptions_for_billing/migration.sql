ALTER TABLE "Subscription"
ADD COLUMN "accessLevel" TEXT NOT NULL DEFAULT 'full_access',
ADD COLUMN "planCode" TEXT,
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'stripe',
ADD COLUMN "providerCustomerId" TEXT,
ADD COLUMN "providerSubscriptionId" TEXT,
ADD COLUMN "providerTransactionId" TEXT,
ADD COLUMN "providerProductId" TEXT,
ADD COLUMN "providerPriceId" TEXT,
ADD COLUMN "environment" TEXT,
ADD COLUMN "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canceledAt" TIMESTAMP(3),
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB;

UPDATE "Subscription"
SET
  "accessLevel" = CASE WHEN "tier" = 'free' THEN 'free' ELSE 'full_access' END,
  "planCode" = CASE
    WHEN "tier" IN ('basic', 'premium', 'elite') THEN lower("tier")
    ELSE NULL
  END,
  "providerCustomerId" = "stripeCustomerId",
  "providerSubscriptionId" = "stripeSubscriptionId",
  "currentPeriodStart" = "startDate",
  "currentPeriodEnd" = "endDate",
  "trialStartedAt" = CASE WHEN "status" = 'trialing' THEN "startDate" ELSE NULL END,
  "trialEndsAt" = CASE WHEN "status" = 'trialing' THEN "endDate" ELSE NULL END;

ALTER TABLE "Subscription"
DROP COLUMN "tier",
DROP COLUMN "endDate",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";

CREATE INDEX "Subscription_provider_providerSubscriptionId_idx" ON "Subscription"("provider", "providerSubscriptionId");
CREATE INDEX "Subscription_userId_status_currentPeriodEnd_idx" ON "Subscription"("userId", "status", "currentPeriodEnd");

CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionEvent_userId_occurredAt_idx" ON "SubscriptionEvent"("userId", "occurredAt");
CREATE INDEX "SubscriptionEvent_provider_eventType_occurredAt_idx" ON "SubscriptionEvent"("provider", "eventType", "occurredAt");
CREATE UNIQUE INDEX "SubscriptionEvent_provider_eventId_key" ON "SubscriptionEvent"("provider", "eventId");

ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
