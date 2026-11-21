UPDATE "User"
SET "emailVerifiedAt" = "createdAt"
WHERE "googleSubject" IS NOT NULL
  AND "emailVerifiedAt" IS NULL;
