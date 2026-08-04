-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "participants_joinedAt_idx" ON "participants"("joinedAt");

-- CreateIndex
CREATE INDEX "participants_createdAt_idx" ON "participants"("createdAt");
