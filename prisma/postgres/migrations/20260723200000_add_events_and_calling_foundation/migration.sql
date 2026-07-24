-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "venue" TEXT,
    "venueNotes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER,
    "cost" DECIMAL(65,30) DEFAULT 0,
    "requiresConsent" BOOLEAN NOT NULL DEFAULT false,
    "requiresMedical" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporary_event_teams" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temporary_event_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_team_memberships" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "staffMetaId" TEXT NOT NULL,
    "title" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_responsibilities" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "mashwaraId" TEXT,
    "mashwaraOccurrenceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToStaffMetaId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_planner_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToStaffMetaId" TEXT,
    "teamId" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_planner_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calling_campaigns" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calling_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calling_poc_assignments" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "eventResponsibilityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calling_poc_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_support_callers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_support_callers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calling_templates" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calling_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calling_template_uses" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "callerUserId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "variablesUsed" TEXT NOT NULL,
    "valuesHmac" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calling_template_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calling_assignments" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "callerStaffMetaId" TEXT,
    "callerExternalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calling_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_interactions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "callerUserId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_cityId_status_idx" ON "events"("cityId", "status");
CREATE INDEX "events_cityId_startDate_idx" ON "events"("cityId", "startDate");
CREATE INDEX "events_status_startDate_idx" ON "events"("status", "startDate");

-- CreateIndex
CREATE INDEX "temporary_event_teams_eventId_isActive_idx" ON "temporary_event_teams"("eventId", "isActive");
CREATE UNIQUE INDEX "temporary_event_teams_eventId_title_key" ON "temporary_event_teams"("eventId", "title");

-- CreateIndex
CREATE INDEX "event_team_memberships_staffMetaId_isActive_idx" ON "event_team_memberships"("staffMetaId", "isActive");
CREATE INDEX "event_team_memberships_teamId_isActive_idx" ON "event_team_memberships"("teamId", "isActive");
CREATE UNIQUE INDEX "event_team_memberships_teamId_staffMetaId_key" ON "event_team_memberships"("teamId", "staffMetaId");

-- CreateIndex
CREATE INDEX "event_responsibilities_assignedToStaffMetaId_isActive_idx" ON "event_responsibilities"("assignedToStaffMetaId", "isActive");
CREATE INDEX "event_responsibilities_eventId_isActive_idx" ON "event_responsibilities"("eventId", "isActive");
CREATE INDEX "event_responsibilities_cityId_isActive_idx" ON "event_responsibilities"("cityId", "isActive");
CREATE INDEX "event_responsibilities_endDate_isActive_idx" ON "event_responsibilities"("endDate", "isActive");

-- CreateIndex
CREATE INDEX "event_planner_items_eventId_status_idx" ON "event_planner_items"("eventId", "status");
CREATE INDEX "event_planner_items_assignedToStaffMetaId_status_idx" ON "event_planner_items"("assignedToStaffMetaId", "status");
CREATE INDEX "event_planner_items_teamId_status_idx" ON "event_planner_items"("teamId", "status");
CREATE INDEX "event_planner_items_dueDate_status_idx" ON "event_planner_items"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calling_campaigns_cityId_name_key" ON "calling_campaigns"("cityId", "name");
CREATE INDEX "calling_campaigns_cityId_status_idx" ON "calling_campaigns"("cityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calling_poc_assignments_campaignId_eventResponsibilityId_key" ON "calling_poc_assignments"("campaignId", "eventResponsibilityId");

-- CreateIndex
CREATE INDEX "external_support_callers_userId_isActive_idx" ON "external_support_callers"("userId", "isActive");
CREATE INDEX "external_support_callers_campaignId_isActive_idx" ON "external_support_callers"("campaignId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "calling_templates_cityId_title_version_key" ON "calling_templates"("cityId", "title", "version");

-- CreateIndex
CREATE INDEX "calling_template_uses_templateId_idx" ON "calling_template_uses"("templateId");
CREATE INDEX "calling_template_uses_callerUserId_idx" ON "calling_template_uses"("callerUserId");

-- CreateIndex
CREATE INDEX "calling_assignments_callerStaffMetaId_isActive_idx" ON "calling_assignments"("callerStaffMetaId", "isActive");
CREATE INDEX "calling_assignments_callerExternalId_isActive_idx" ON "calling_assignments"("callerExternalId", "isActive");

-- CreateIndex
CREATE INDEX "call_interactions_assignmentId_createdAt_idx" ON "call_interactions"("assignmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_event_teams" ADD CONSTRAINT "temporary_event_teams_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_team_memberships" ADD CONSTRAINT "event_team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "temporary_event_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_team_memberships" ADD CONSTRAINT "event_team_memberships_staffMetaId_fkey" FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_responsibilities" ADD CONSTRAINT "event_responsibilities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_responsibilities" ADD CONSTRAINT "event_responsibilities_assignedToStaffMetaId_fkey" FOREIGN KEY ("assignedToStaffMetaId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_planner_items" ADD CONSTRAINT "event_planner_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_planner_items" ADD CONSTRAINT "event_planner_items_assignedToStaffMetaId_fkey" FOREIGN KEY ("assignedToStaffMetaId") REFERENCES "staff_meta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_planner_items" ADD CONSTRAINT "event_planner_items_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "temporary_event_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_campaigns" ADD CONSTRAINT "calling_campaigns_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_poc_assignments" ADD CONSTRAINT "calling_poc_assignments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "calling_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_poc_assignments" ADD CONSTRAINT "calling_poc_assignments_eventResponsibilityId_fkey" FOREIGN KEY ("eventResponsibilityId") REFERENCES "event_responsibilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_support_callers" ADD CONSTRAINT "external_support_callers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_support_callers" ADD CONSTRAINT "external_support_callers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "calling_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_templates" ADD CONSTRAINT "calling_templates_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_templates" ADD CONSTRAINT "calling_templates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "calling_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_template_uses" ADD CONSTRAINT "calling_template_uses_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "calling_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_template_uses" ADD CONSTRAINT "calling_template_uses_callerUserId_fkey" FOREIGN KEY ("callerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_template_uses" ADD CONSTRAINT "calling_template_uses_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "calling_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_assignments" ADD CONSTRAINT "calling_assignments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "calling_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_assignments" ADD CONSTRAINT "calling_assignments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "admission_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_assignments" ADD CONSTRAINT "calling_assignments_callerStaffMetaId_fkey" FOREIGN KEY ("callerStaffMetaId") REFERENCES "staff_meta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calling_assignments" ADD CONSTRAINT "calling_assignments_callerExternalId_fkey" FOREIGN KEY ("callerExternalId") REFERENCES "external_support_callers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_interactions" ADD CONSTRAINT "call_interactions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "calling_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_interactions" ADD CONSTRAINT "call_interactions_callerUserId_fkey" FOREIGN KEY ("callerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
