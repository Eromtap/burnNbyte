import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getAppUrl, getStripe } from "@/lib/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const price = process.env.STRIPE_PRICE_MONTHLY;
  if (!price) return NextResponse.json({ error: "Stripe monthly price is not configured" }, { status: 503 });

  const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { email: true, subscription: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stripe = getStripe();
  const customer = user.subscription?.provider === "stripe" ? user.subscription.providerCustomerId : null;
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: customer || undefined,
    customer_email: customer ? undefined : user.email || undefined,
    client_reference_id: String(userId),
    metadata: { userId: String(userId) },
    subscription_data: { metadata: { userId: String(userId) } },
    success_url: `${getAppUrl()}/profile?checkout=success`,
    cancel_url: `${getAppUrl()}/expired?checkout=canceled`,
  });
  return NextResponse.json({ url: checkout.url });
}
