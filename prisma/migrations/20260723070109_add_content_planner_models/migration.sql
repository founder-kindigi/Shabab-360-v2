-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "mustResetPwd" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_capability_overrides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_capability_overrides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_capability_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "parks_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "cityId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "batches_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "batches_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "parkId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "groups_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "groups_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staff_meta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedCityId" TEXT,
    "assignedParkId" TEXT,
    "assignedGroupId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staff_meta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_meta_assignedCityId_fkey" FOREIGN KEY ("assignedCityId") REFERENCES "cities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staff_meta_assignedParkId_fkey" FOREIGN KEY ("assignedParkId") REFERENCES "parks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "staff_meta_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "collaboration_teams_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staff_team_memberships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffMetaId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staff_team_memberships_staffMetaId_fkey" FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "batchId" TEXT,
    "parkId" TEXT,
    "basePlanId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'template',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceWorkbook" TEXT,
    "sourceSheet" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "content_plans_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_plans_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "content_plans_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "content_plans_basePlanId_fkey" FOREIGN KEY ("basePlanId") REFERENCES "content_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_plan_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "weekLabel" TEXT,
    "dayLabel" TEXT,
    "sessionDate" DATETIME NOT NULL,
    "focusArea" TEXT,
    "sourceRow" INTEGER,
    "isOffDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "content_plan_sessions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "content_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_plan_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "content_plan_blocks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "content_plan_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_plan_blocks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_plan_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'external_link',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_plan_resources_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "content_plan_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_plan_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "contentBlockId" TEXT,
    "assignedStaffMetaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "scheduledFor" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "activity_plan_items_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activity_plan_items_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "content_plan_blocks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "activity_plan_items_assignedStaffMetaId_fkey" FOREIGN KEY ("assignedStaffMetaId") REFERENCES "staff_meta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cnic" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guardian_children" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guardianId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "relation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guardian_children_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guardian_children_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" DATETIME,
    "age" INTEGER,
    "gradeClass" TEXT,
    "gender" TEXT,
    "address" TEXT,
    "groupId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "batch_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "warningAbsents" INTEGER NOT NULL DEFAULT 3,
    "dropoutAbsents" INTEGER NOT NULL DEFAULT 6,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "batch_settings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_events_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fee_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "waiverReason" TEXT,
    "waivedBy" TEXT,
    "waivedAt" DATETIME,
    "reminderSentAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fee_events_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feeEventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "receiptNo" TEXT,
    "recordedBy" TEXT,
    "notes" TEXT,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "waivedAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_feeEventId_fkey" FOREIGN KEY ("feeEventId") REFERENCES "fee_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "receipt_sequences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "admission_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingCode" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantDOB" DATETIME,
    "gender" TEXT,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "guardianRelation" TEXT,
    "cityId" TEXT,
    "preferredParkId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "notes" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "previousEducation" TEXT,
    "reference" TEXT,
    "convertedParticipantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "admission_applications_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "admission_applications_preferredParkId_fkey" FOREIGN KEY ("preferredParkId") REFERENCES "parks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "admission_applications_convertedParticipantId_fkey" FOREIGN KEY ("convertedParticipantId") REFERENCES "participants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admission_interviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "scheduledTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "score1" INTEGER,
    "score2" INTEGER,
    "score3" INTEGER,
    "totalScore" INTEGER,
    "notes" TEXT,
    "conductedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "admission_interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "admission_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "targetRoles" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'in_app',
    "channel" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientEmail" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "report_presets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "role_capability_overrides_role_idx" ON "role_capability_overrides"("role");

-- CreateIndex
CREATE UNIQUE INDEX "role_capability_overrides_role_capability_key" ON "role_capability_overrides"("role", "capability");

-- CreateIndex
CREATE INDEX "user_capability_overrides_userId_isActive_expiresAt_idx" ON "user_capability_overrides"("userId", "isActive", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_capability_overrides_userId_capability_key" ON "user_capability_overrides"("userId", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "cities_code_key" ON "cities"("code");

-- CreateIndex
CREATE INDEX "batches_cityId_isActive_idx" ON "batches"("cityId", "isActive");

-- CreateIndex
CREATE INDEX "groups_batchId_isActive_idx" ON "groups"("batchId", "isActive");

-- CreateIndex
CREATE INDEX "groups_parkId_batchId_isActive_idx" ON "groups"("parkId", "batchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staff_meta_userId_key" ON "staff_meta"("userId");

-- CreateIndex
CREATE INDEX "collaboration_teams_cityId_isActive_idx" ON "collaboration_teams"("cityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_teams_cityId_code_key" ON "collaboration_teams"("cityId", "code");

-- CreateIndex
CREATE INDEX "staff_team_memberships_staffMetaId_isActive_idx" ON "staff_team_memberships"("staffMetaId", "isActive");

-- CreateIndex
CREATE INDEX "staff_team_memberships_teamId_isActive_idx" ON "staff_team_memberships"("teamId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staff_team_memberships_staffMetaId_teamId_startedAt_key" ON "staff_team_memberships"("staffMetaId", "teamId", "startedAt");

-- CreateIndex
CREATE INDEX "content_plans_cityId_status_idx" ON "content_plans"("cityId", "status");

-- CreateIndex
CREATE INDEX "content_plans_batchId_idx" ON "content_plans"("batchId");

-- CreateIndex
CREATE INDEX "content_plans_parkId_idx" ON "content_plans"("parkId");

-- CreateIndex
CREATE INDEX "content_plans_basePlanId_idx" ON "content_plans"("basePlanId");

-- CreateIndex
CREATE INDEX "content_plan_sessions_sessionDate_status_idx" ON "content_plan_sessions"("sessionDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_plan_sessions_planId_sessionDate_key" ON "content_plan_sessions"("planId", "sessionDate");

-- CreateIndex
CREATE INDEX "content_plan_blocks_teamId_status_idx" ON "content_plan_blocks"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_plan_blocks_sessionId_category_sortOrder_key" ON "content_plan_blocks"("sessionId", "category", "sortOrder");

-- CreateIndex
CREATE INDEX "content_plan_resources_blockId_idx" ON "content_plan_resources"("blockId");

-- CreateIndex
CREATE INDEX "activity_plan_items_teamId_status_idx" ON "activity_plan_items"("teamId", "status");

-- CreateIndex
CREATE INDEX "activity_plan_items_assignedStaffMetaId_status_idx" ON "activity_plan_items"("assignedStaffMetaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_userId_key" ON "guardians"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_children_guardianId_participantId_key" ON "guardian_children"("guardianId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_userId_key" ON "participants"("userId");

-- CreateIndex
CREATE INDEX "participants_groupId_state_idx" ON "participants"("groupId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "batch_settings_batchId_key" ON "batch_settings"("batchId");

-- CreateIndex
CREATE INDEX "attendance_events_groupId_eventDate_idx" ON "attendance_events"("groupId", "eventDate");

-- CreateIndex
CREATE INDEX "attendance_events_eventDate_idx" ON "attendance_events"("eventDate");

-- CreateIndex
CREATE INDEX "attendance_records_eventId_idx" ON "attendance_records"("eventId");

-- CreateIndex
CREATE INDEX "attendance_records_participantId_idx" ON "attendance_records"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_eventId_participantId_key" ON "attendance_records"("eventId", "participantId");

-- CreateIndex
CREATE INDEX "fee_events_batchId_isActive_createdAt_idx" ON "fee_events"("batchId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "fee_events_isActive_createdAt_idx" ON "fee_events"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNo_key" ON "payments"("receiptNo");

-- CreateIndex
CREATE INDEX "payments_feeEventId_participantId_idx" ON "payments"("feeEventId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_sequences_prefix_year_key" ON "receipt_sequences"("prefix", "year");

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_trackingCode_key" ON "admission_applications"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_convertedParticipantId_key" ON "admission_applications"("convertedParticipantId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");
