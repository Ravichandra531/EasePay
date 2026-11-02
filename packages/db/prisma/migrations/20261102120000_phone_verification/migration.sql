ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3), ADD COLUMN "phoneVerificationProvider" TEXT;
CREATE TABLE "PhoneVerification" (
 "id" TEXT PRIMARY KEY, "phone" TEXT NOT NULL, "purpose" TEXT NOT NULL, "provider" TEXT NOT NULL, "sessionHash" TEXT NOT NULL,
 "providerSid" TEXT, "codeHash" TEXT, "attempts" INTEGER NOT NULL DEFAULT 0,
 "sentAt" TIMESTAMP(3), "verifiedAt" TIMESTAMP(3), "consumedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PhoneVerification_phone_purpose_createdAt_idx" ON "PhoneVerification"("phone", "purpose", "createdAt");
CREATE INDEX "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");
CREATE TABLE "AuthRateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
