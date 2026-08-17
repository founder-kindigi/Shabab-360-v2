-- CreateTable
CREATE TABLE "media_briefs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'graphic',
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueAt" DATETIME,
    "contentBlockId" TEXT,
    "approvalState" TEXT,
    "approvedByStaffMetaId" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "assetMetadata" TEXT,
    "assignedToStaffMetaId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_briefs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "media_briefs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "media_briefs_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "content_plan_blocks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_briefs_assignedToStaffMetaId_fkey" FOREIGN KEY ("assignedToStaffMetaId") REFERENCES "staff_meta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_briefs_approvedByStaffMetaId_fkey" FOREIGN KEY ("approvedByStaffMetaId") REFERENCES "staff_meta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_briefs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "media_briefs_teamId_status_idx" ON "media_briefs"("teamId", "status");

-- CreateIndex
CREATE INDEX "media_briefs_teamId_assignedToStaffMetaId_status_idx" ON "media_briefs"("teamId", "assignedToStaffMetaId", "status");

-- CreateIndex
CREATE INDEX "media_briefs_cityId_status_idx" ON "media_briefs"("cityId", "status");

-- CreateIndex
CREATE INDEX "media_briefs_mediaType_status_idx" ON "media_briefs"("mediaType", "status");

-- CreateIndex
CREATE INDEX "media_briefs_priority_status_idx" ON "media_briefs"("priority", "status");
