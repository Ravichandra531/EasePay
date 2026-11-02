ALTER TYPE "AuthType" ADD VALUE IF NOT EXISTS 'Credentials';
ALTER TABLE "Balance" ADD COLUMN "realAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Merchant" ADD COLUMN "ownerId" INTEGER, ADD COLUMN "slug" TEXT, ADD COLUMN "description" TEXT NOT NULL DEFAULT '', ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Other', ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Merchant" SET "slug" = 'legacy-' || "id"::text;
ALTER TABLE "Merchant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Merchant_ownerId_key" ON "Merchant"("ownerId");
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "P2PTransaction" ADD COLUMN "merchantId" INTEGER;
ALTER TABLE "P2PTransaction" ADD CONSTRAINT "P2PTransaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnRampTransaction" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'sandbox', ADD COLUMN "providerOrderId" TEXT, ADD COLUMN "providerPaymentId" TEXT;
CREATE UNIQUE INDEX "OnRampTransaction_providerOrderId_key" ON "OnRampTransaction"("providerOrderId");
CREATE UNIQUE INDEX "OnRampTransaction_providerPaymentId_key" ON "OnRampTransaction"("providerPaymentId");
CREATE TABLE "BankAccount" (
 "id" TEXT PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "holder" TEXT NOT NULL, "ifsc" TEXT NOT NULL, "last4" TEXT NOT NULL, "fingerprint" TEXT NOT NULL, "encryptedAccount" TEXT NOT NULL, "mode" TEXT NOT NULL, "providerFundId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "BankAccount_userId_fingerprint_mode_key" ON "BankAccount"("userId", "fingerprint", "mode");
CREATE TABLE "Withdrawal" (
 "id" TEXT PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "bankAccountId" TEXT NOT NULL REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "amount" INTEGER NOT NULL, "mode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'Processing', "providerPayoutId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Withdrawal_providerPayoutId_key" ON "Withdrawal"("providerPayoutId");
CREATE INDEX "Withdrawal_userId_createdAt_idx" ON "Withdrawal"("userId", "createdAt");
CREATE TABLE "Notification" ("id" TEXT PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "message" TEXT NOT NULL, "link" TEXT NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

ALTER TABLE "Balance" ADD CONSTRAINT "Balance_funds_check" CHECK ("realAmount" >= 0 AND "amount" >= "realAmount" AND "locked" >= 0);
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_amount_check" CHECK ("amount" > 0);
