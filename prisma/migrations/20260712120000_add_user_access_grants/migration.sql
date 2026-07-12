CREATE TABLE "UserAccessGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAccessGrant_userId_accessLevel_source_idx" ON "UserAccessGrant"("userId", "accessLevel", "source");
CREATE INDEX "UserAccessGrant_userId_startsAt_expiresAt_idx" ON "UserAccessGrant"("userId", "startsAt", "expiresAt");

ALTER TABLE "UserAccessGrant" ADD CONSTRAINT "UserAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
