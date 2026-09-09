import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createOAuthState,
  hashOAuthState,
  sanitizeRetailerReturnTo,
} from "@/lib/retailer";
import { buildKrogerAuthorizeUrl, KROGER_PROVIDER } from "@/lib/retailers/kroger";

export async function GET(request) {
  if (process.env.KROGER_OAUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Kroger connection is unavailable." }, { status: 404 });
  }
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const userId = String(auth.session.user.id);
  try {
    const state = createOAuthState();
    const returnTo = sanitizeRetailerReturnTo(new URL(request.url).searchParams.get("returnTo"));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.$transaction([
      prisma.retailerOAuthState.deleteMany({
        where: {
          OR: [{ userId, provider: KROGER_PROVIDER }, { expiresAt: { lte: new Date() } }],
        },
      }),
      prisma.retailerOAuthState.create({
        data: { userId, provider: KROGER_PROVIDER, stateHash: hashOAuthState(state), returnTo, expiresAt },
      }),
    ]);
    return NextResponse.redirect(buildKrogerAuthorizeUrl({ state }));
  } catch (error) {
    console.error("Kroger authorization start failed", error?.message || error);
    return NextResponse.json({ error: "Kroger connection is not configured." }, { status: 503 });
  }
}
