-- Content plans preserve city templates and park-specific overrides. Team
-- membership remains separate from login roles and hierarchy scope.
CREATE TABLE "content_plans" (
  "id" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "batchId" TEXT,
  "parkId" TEXT,
  "basePlanId" TEXT,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'template',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sourceWorkbook" TEXT,
  "sourceSheet" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_plan_sessions" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "weekLabel" TEXT,
  "dayLabel" TEXT,
  "sessionDate" TIMESTAMP(3) NOT NULL,
  "focusArea" TEXT,
  "sourceRow" INTEGER,
  "isOffDay" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_plan_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_plan_blocks" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_plan_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_plan_resources" (
  "id" TEXT NOT NULL,
  "blockId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'external_link',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_plan_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_plan_items" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "contentBlockId" TEXT,
  "assignedStaffMetaId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "scheduledFor" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "activity_plan_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_plans_cityId_status_idx" ON "content_plans"("cityId", "status");
CREATE INDEX "content_plans_batchId_idx" ON "content_plans"("batchId");
CREATE INDEX "content_plans_parkId_idx" ON "content_plans"("parkId");
CREATE INDEX "content_plans_basePlanId_idx" ON "content_plans"("basePlanId");
CREATE UNIQUE INDEX "content_plan_sessions_planId_sessionDate_key" ON "content_plan_sessions"("planId", "sessionDate");
CREATE INDEX "content_plan_sessions_sessionDate_status_idx" ON "content_plan_sessions"("sessionDate", "status");
CREATE UNIQUE INDEX "content_plan_blocks_sessionId_category_sortOrder_key" ON "content_plan_blocks"("sessionId", "category", "sortOrder");
CREATE INDEX "content_plan_blocks_teamId_status_idx" ON "content_plan_blocks"("teamId", "status");
CREATE INDEX "content_plan_resources_blockId_idx" ON "content_plan_resources"("blockId");
CREATE INDEX "activity_plan_items_teamId_status_idx" ON "activity_plan_items"("teamId", "status");
CREATE INDEX "activity_plan_items_assignedStaffMetaId_status_idx" ON "activity_plan_items"("assignedStaffMetaId", "status");

ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_basePlanId_fkey"
  FOREIGN KEY ("basePlanId") REFERENCES "content_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_plan_sessions" ADD CONSTRAINT "content_plan_sessions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "content_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_plan_blocks" ADD CONSTRAINT "content_plan_blocks_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "content_plan_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_plan_blocks" ADD CONSTRAINT "content_plan_blocks_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "collaboration_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_plan_resources" ADD CONSTRAINT "content_plan_resources_blockId_fkey"
  FOREIGN KEY ("blockId") REFERENCES "content_plan_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_plan_items" ADD CONSTRAINT "activity_plan_items_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "collaboration_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_plan_items" ADD CONSTRAINT "activity_plan_items_contentBlockId_fkey"
  FOREIGN KEY ("contentBlockId") REFERENCES "content_plan_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_plan_items" ADD CONSTRAINT "activity_plan_items_assignedStaffMetaId_fkey"
  FOREIGN KEY ("assignedStaffMetaId") REFERENCES "staff_meta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
