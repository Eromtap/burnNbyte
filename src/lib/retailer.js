import prisma from "@/lib/prisma";
import {
  createOAuthState,
  decryptRetailerToken,
  encryptRetailerToken,
  hashOAuthState,
  sanitizeRetailerReturnTo,
} from "@/lib/retailerCrypto.mjs";

export { createOAuthState, hashOAuthState, sanitizeRetailerReturnTo };

export function normalizeRetailerProvider(value) {
  const provider = String(value || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(provider)) {
    throw new Error("Retailer provider is invalid.");
  }
  return provider;
}

function tokenExpiry(expiresIn) {
  const seconds = Math.max(60, Number(expiresIn) || 1800);
  return new Date(Date.now() + seconds * 1000);
}

export async function saveRetailerConnection({ userId, provider, tokenResponse, defaultScope = "" }) {
  const normalizedProvider = normalizeRetailerProvider(provider);
  if (!tokenResponse?.access_token) throw new Error("Retailer access token is required.");
  const data = {
    accessTokenCiphertext: encryptRetailerToken(tokenResponse.access_token, userId, normalizedProvider),
    refreshTokenCiphertext: tokenResponse.refresh_token
      ? encryptRetailerToken(tokenResponse.refresh_token, userId, normalizedProvider)
      : undefined,
    tokenType: tokenResponse.token_type || "Bearer",
    scope: tokenResponse.scope || defaultScope,
    expiresAt: tokenExpiry(tokenResponse.expires_in),
  };
  return prisma.retailerConnection.upsert({
    where: { userId_provider: { userId, provider: normalizedProvider } },
    create: { userId, provider: normalizedProvider, ...data },
    update: data,
  });
}

export async function getValidRetailerAccessToken({ userId, provider, refreshAuthorization, defaultScope = "" }) {
  const normalizedProvider = normalizeRetailerProvider(provider);
  const connection = await prisma.retailerConnection.findUnique({
    where: { userId_provider: { userId, provider: normalizedProvider } },
  });
  if (!connection) return null;
  if (connection.expiresAt.getTime() > Date.now() + 60_000) {
    return decryptRetailerToken(connection.accessTokenCiphertext, userId, normalizedProvider);
  }
  if (!connection.refreshTokenCiphertext) return null;
  const refreshToken = decryptRetailerToken(
    connection.refreshTokenCiphertext,
    userId,
    normalizedProvider
  );
  const refreshed = await refreshAuthorization(refreshToken);
  const saved = await saveRetailerConnection({
    userId,
    provider: normalizedProvider,
    defaultScope,
    tokenResponse: {
      ...refreshed,
      refresh_token: refreshed.refresh_token || refreshToken,
    },
  });
  await prisma.retailerConnection.update({
    where: { id: saved.id },
    data: { lastRefreshedAt: new Date() },
  });
  return refreshed.access_token;
}
