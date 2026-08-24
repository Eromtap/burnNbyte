import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getAppUrl, getStripe } from "@/lib/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await prisma.subscription.findUnique({ where: { userId: String(userId) } });
  if (!subscription?.providerCustomerId || subscription.provider !== "stripe") {
    return NextResponse.json({ error: "No Stripe subscription found" }, { status: 404 });
  }
  const portal = await getStripe().billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: `${getAppUrl()}/profile`,
  });
  return NextResponse.json({ url: portal.url });
}
