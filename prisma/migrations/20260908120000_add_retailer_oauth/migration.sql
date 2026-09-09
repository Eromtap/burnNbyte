CREATE TABLE "RetailerConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "providerProfileId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailerOAuthState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "returnTo" TEXT NOT NULL DEFAULT '/groceries',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RetailerConnection_userId_provider_key" ON "RetailerConnection"("userId", "provider");
CREATE INDEX "RetailerConnection_provider_idx" ON "RetailerConnection"("provider");
CREATE INDEX "RetailerConnection_expiresAt_idx" ON "RetailerConnection"("expiresAt");
CREATE UNIQUE INDEX "RetailerOAuthState_stateHash_key" ON "RetailerOAuthState"("stateHash");
CREATE INDEX "RetailerOAuthState_userId_provider_expiresAt_idx" ON "RetailerOAuthState"("userId", "provider", "expiresAt");
CREATE INDEX "RetailerOAuthState_expiresAt_idx" ON "RetailerOAuthState"("expiresAt");

ALTER TABLE "RetailerConnection" ADD CONSTRAINT "RetailerConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RetailerOAuthState" ADD CONSTRAINT "RetailerOAuthState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
