import prisma from "@/lib/prisma";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const TRIAL_LENGTH_DAYS = 14;

function isGrantActive(grant, now) {
  if (!grant) return false;
  if (grant.startsAt && grant.startsAt > now) return false;
  if (grant.expiresAt && grant.expiresAt <= now) return false;
  return true;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getSubscriptionExpiry(subscription) {
  return subscription.currentPeriodEnd ?? subscription.trialEndsAt ?? null;
}

export async function getUserAppAccess(userId, now = new Date()) {
  const normalizedUserId = String(userId);

  const user = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: {
      id: true,
      createdAt: true,
      isAdmin: true,
      subscription: true,
      accessGrants: {
        where: {
          accessLevel: { in: ["full_access", "premium"] },
          source: "manual",
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });

  if (!user) {
    return {
      hasAppAccess: false,
      accessState: "missing_user",
      source: "none",
      reason: "missing_user",
      startedAt: null,
      expiresAt: null,
    };
  }

  if (user.isAdmin) {
    return {
      hasAppAccess: true,
      accessState: "admin",
      source: "admin",
      reason: "admin_bypass",
      startedAt: user.createdAt,
      expiresAt: null,
    };
  }

  const subscription = user.subscription;
  const manualGrant = user.accessGrants?.[0] ?? null;

  if (manualGrant && isGrantActive(manualGrant, now)) {
    return {
      hasAppAccess: true,
      accessState: "comped",
      source: "manual",
      reason: manualGrant.reason,
      startedAt: manualGrant.startsAt,
      expiresAt: manualGrant.expiresAt,
      grantId: manualGrant.id,
    };
  }

  if (subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return {
      hasAppAccess: true,
      accessState: subscription.status === "trialing" ? "trialing_subscription" : "paid",
      source: subscription.provider || "subscription",
      reason: subscription.status,
      startedAt: subscription.currentPeriodStart ?? subscription.startDate,
      expiresAt: getSubscriptionExpiry(subscription),
      subscriptionId: subscription.id,
      planCode: subscription.planCode,
      providerProductId: subscription.providerProductId,
    };
  }

  const trialEndsAt = addDays(user.createdAt, TRIAL_LENGTH_DAYS);
  if (trialEndsAt > now) {
    return {
      hasAppAccess: true,
      accessState: "trialing",
      source: "system",
      reason: "trial",
      startedAt: user.createdAt,
      expiresAt: trialEndsAt,
      trialEndsAt,
      trialLengthDays: TRIAL_LENGTH_DAYS,
    };
  }

  return {
    hasAppAccess: false,
    accessState: "expired",
    source: "none",
    reason: "trial_expired",
    startedAt: user.createdAt,
    expiresAt: trialEndsAt,
    trialEndsAt,
    trialLengthDays: TRIAL_LENGTH_DAYS,
  };
}

export async function getUserEntitlement(userId, now = new Date()) {
  return getUserAppAccess(userId, now);
}
