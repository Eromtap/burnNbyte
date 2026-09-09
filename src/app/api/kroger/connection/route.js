import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { KROGER_PROVIDER } from "@/lib/retailers/kroger";

export async function GET() {
  if (process.env.KROGER_OAUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Kroger connection is unavailable." }, { status: 404 });
  }
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const connection = await prisma.retailerConnection.findUnique({
    where: {
      userId_provider: { userId: String(auth.session.user.id), provider: KROGER_PROVIDER },
    },
    select: { scope: true, expiresAt: true, connectedAt: true, lastRefreshedAt: true },
  });
  return NextResponse.json({ connected: Boolean(connection), connection });
}

export async function DELETE() {
  if (process.env.KROGER_OAUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Kroger connection is unavailable." }, { status: 404 });
  }
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const userId = String(auth.session.user.id);
  await prisma.$transaction([
    prisma.retailerOAuthState.deleteMany({ where: { userId, provider: KROGER_PROVIDER } }),
    prisma.retailerConnection.deleteMany({ where: { userId, provider: KROGER_PROVIDER } }),
  ]);
  return NextResponse.json({ ok: true, connected: false });
}
