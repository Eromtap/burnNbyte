import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Webhook configuration missing", { status: 400 });
  let event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return new NextResponse(`Webhook signature verification failed: ${error.message}`, { status: 400 });
  }
  if (!event.type.startsWith("customer.subscription.")) return NextResponse.json({ received: true });
  const subscription = event.data.object;
  const userId = subscription.metadata?.userId;
  if (!userId) return NextResponse.json({ received: true });
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
  const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null;
  try {
    await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.subscriptionEvent.findUnique({ where: { provider_eventId: { provider: "stripe", eventId: event.id } } });
      if (existingEvent) return;
      const saved = await tx.subscription.upsert({
        where: { userId: String(userId) },
        create: { userId: String(userId), provider: "stripe", status: subscription.status, providerCustomerId: String(subscription.customer), providerSubscriptionId: subscription.id, providerProductId: subscription.items.data[0]?.price?.product ? String(subscription.items.data[0].price.product) : null, providerPriceId: subscription.items.data[0]?.price?.id ?? null, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end), canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null, metadata: subscription.metadata },
        update: { status: subscription.status, providerCustomerId: String(subscription.customer), providerSubscriptionId: subscription.id, providerProductId: subscription.items.data[0]?.price?.product ? String(subscription.items.data[0].price.product) : null, providerPriceId: subscription.items.data[0]?.price?.id ?? null, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end), canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null, metadata: subscription.metadata },
      });
      await tx.subscriptionEvent.create({ data: { userId: String(userId), subscriptionId: saved.id, provider: "stripe", eventType: event.type, eventId: event.id, occurredAt: new Date(event.created * 1000), payload: event.data.object } });
    });
  } catch (error) { console.error("Stripe webhook processing failed", error); return new NextResponse("Webhook processing failed", { status: 500 }); }
  return NextResponse.json({ received: true });
}
