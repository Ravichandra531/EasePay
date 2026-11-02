ALTER TABLE "P2PTransaction" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "P2PTransaction_requestId_key" ON "P2PTransaction"("requestId");
CREATE INDEX "P2PTransaction_fromUserId_timestamp_idx" ON "P2PTransaction"("fromUserId", "timestamp");
CREATE INDEX "P2PTransaction_toUserId_timestamp_idx" ON "P2PTransaction"("toUserId", "timestamp");
CREATE INDEX "OnRampTransaction_userId_startTime_idx" ON "OnRampTransaction"("userId", "startTime");
