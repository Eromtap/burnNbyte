import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashOAuthState } from "@/lib/retailer";
import {
  exchangeKrogerAuthorizationCode,
  KROGER_PROVIDER,
  saveKrogerConnection,
} from "@/lib/retailers/kroger";

function completionRedirect(request, status, returnTo = "/groceries", reason) {
  const url = new URL("/kroger/complete", request.url);
  url.searchParams.set("status", status);
  url.searchParams.set("returnTo", returnTo);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(request) {
  if (process.env.KROGER_OAUTH_ENABLED !== "true") {
    return completionRedirect(request, "error", "/groceries", "integration_disabled");
  }
  const params = new URL(request.url).searchParams;
  const providerError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");
  if (providerError) return completionRedirect(request, "error", "/groceries", "authorization_denied");
  if (!code || !state) return completionRedirect(request, "error", "/groceries", "invalid_callback");

  try {
    const stateRecord = await prisma.retailerOAuthState.findUnique({
      where: { stateHash: hashOAuthState(state) },
    });
    if (!stateRecord) {
      return completionRedirect(request, "error", "/groceries", "expired_state");
    }
    if (stateRecord.provider !== KROGER_PROVIDER) {
      return completionRedirect(request, "error", "/groceries", "invalid_state");
    }
    if (stateRecord.expiresAt <= new Date()) {
      await prisma.retailerOAuthState.delete({ where: { id: stateRecord.id } });
      return completionRedirect(request, "error", "/groceries", "expired_state");
    }
    const consumed = await prisma.retailerOAuthState.deleteMany({
      where: { id: stateRecord.id, provider: KROGER_PROVIDER, expiresAt: { gt: new Date() } },
    });
    if (consumed.count !== 1) return completionRedirect(request, "error", "/groceries", "invalid_state");

    const tokenResponse = await exchangeKrogerAuthorizationCode(code);
    await saveKrogerConnection(stateRecord.userId, tokenResponse);
    return completionRedirect(request, "connected", stateRecord.returnTo);
  } catch (error) {
    console.error("Kroger authorization callback failed", error?.message || error);
    return completionRedirect(request, "error", "/groceries", "token_exchange_failed");
  }
}
