-- CreateTable
CREATE TABLE "GrocerySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "unitSystem" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrocerySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrocerySummary_userId_start_end_idx" ON "GrocerySummary"("userId", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "GrocerySummary_userId_start_end_unitSystem_key" ON "GrocerySummary"("userId", "start", "end", "unitSystem");

-- AddForeignKey
ALTER TABLE "GrocerySummary" ADD CONSTRAINT "GrocerySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
