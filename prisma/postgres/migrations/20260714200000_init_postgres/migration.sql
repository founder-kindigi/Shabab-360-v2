-- This baseline is generated from prisma/postgres/schema.prisma using
-- `prisma migrate diff --from-empty --to-schema-datamodel ... --script`.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "ParticipantState" AS ENUM ('active', 'inactive', 'warning', 'dropout', 'graduated');
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank', 'online', 'other', 'bank_transfer', 'easypaisa', 'jazzcash');
CREATE TYPE "NotificationType" AS ENUM ('email', 'in_app', 'push');
CREATE TYPE "NotificationChannel" AS ENUM ('password_reset', 'password_changed', 'invite', 'fee_reminder', 'absence_alert', 'admission_status');
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE "users" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT,
  "phone" TEXT, "mustResetPwd" BOOLEAN NOT NULL DEFAULT true, "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "audit_log" (
  "id" TEXT NOT NULL, "userId" TEXT, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL,
  "entityId" TEXT, "oldValues" TEXT, "newValues" TEXT, "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "cities" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "parks" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "cityId" TEXT NOT NULL, "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "parks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "batches" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "parkId" TEXT NOT NULL, "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "groups" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "batchId" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "staff_meta" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL, "assignedCityId" TEXT,
  "assignedParkId" TEXT, "assignedGroupId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staff_meta_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "guardians" (
  "id" TEXT NOT NULL, "userId" TEXT, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "cnic" TEXT,
  "address" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "guardian_children" (
  "id" TEXT NOT NULL, "guardianId" TEXT NOT NULL, "participantId" TEXT NOT NULL, "relation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "guardian_children_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "participants" (
  "id" TEXT NOT NULL, "userId" TEXT, "name" TEXT NOT NULL, "phone" TEXT, "dateOfBirth" TIMESTAMP(3),
  "gender" TEXT, "address" TEXT, "groupId" TEXT NOT NULL, "state" "ParticipantState" NOT NULL DEFAULT 'active',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "batch_settings" (
  "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "warningAbsents" INTEGER NOT NULL DEFAULT 3,
  "dropoutAbsents" INTEGER NOT NULL DEFAULT 6, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "batch_settings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "attendance_events" (
  "id" TEXT NOT NULL, "groupId" TEXT NOT NULL, "title" TEXT NOT NULL, "eventDate" TIMESTAMP(3) NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false, "closedAt" TIMESTAMP(3), "closedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "attendance_records" (
  "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "participantId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL, "markedBy" TEXT,
  "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "editReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "fee_events" (
  "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "title" TEXT NOT NULL, "feeType" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "dueDate" TIMESTAMP(3), "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "waiverReason" TEXT, "waivedBy" TEXT, "waivedAt" TIMESTAMP(3), "reminderSentAt" TIMESTAMP(3),
  "reminderCount" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fee_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "payments" (
  "id" TEXT NOT NULL, "feeEventId" TEXT NOT NULL, "participantId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "method" "PaymentMethod" NOT NULL, "receiptNo" TEXT,
  "recordedBy" TEXT, "notes" TEXT, "isPartial" BOOLEAN NOT NULL DEFAULT false,
  "waivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "receipt_sequences" (
  "id" TEXT NOT NULL, "prefix" TEXT NOT NULL, "year" INTEGER NOT NULL, "counter" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "admission_applications" (
  "id" TEXT NOT NULL, "trackingCode" TEXT NOT NULL, "applicantName" TEXT NOT NULL, "applicantDOB" TIMESTAMP(3),
  "gender" TEXT, "guardianName" TEXT NOT NULL, "guardianPhone" TEXT NOT NULL, "guardianRelation" TEXT,
  "cityId" TEXT, "preferredParkId" TEXT, "status" TEXT NOT NULL DEFAULT 'submitted', "notes" TEXT,
  "convertedParticipantId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "admission_interviews" (
  "id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "scheduledDate" TIMESTAMP(3), "scheduledTime" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled', "score1" INTEGER, "score2" INTEGER, "score3" INTEGER,
  "totalScore" INTEGER, "notes" TEXT, "conductedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admission_interviews_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "announcements" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL, "priority" TEXT NOT NULL DEFAULT 'normal',
  "targetRoles" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3),
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL, "type" "NotificationType" NOT NULL DEFAULT 'in_app',
  "channel" "NotificationChannel" NOT NULL, "recipientId" TEXT, "recipientEmail" TEXT,
  "subject" TEXT NOT NULL, "body" TEXT NOT NULL, "data" TEXT,
  "status" "NotificationStatus" NOT NULL DEFAULT 'pending', "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "report_presets" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "reportType" TEXT NOT NULL,
  "filters" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "report_presets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "cities_code_key" ON "cities"("code");
CREATE INDEX "groups_batchId_isActive_idx" ON "groups"("batchId", "isActive");
CREATE UNIQUE INDEX "staff_meta_userId_key" ON "staff_meta"("userId");
CREATE UNIQUE INDEX "guardians_userId_key" ON "guardians"("userId");
CREATE INDEX "guardians_phone_idx" ON "guardians"("phone");
CREATE UNIQUE INDEX "guardian_children_guardianId_participantId_key" ON "guardian_children"("guardianId", "participantId");
CREATE UNIQUE INDEX "participants_userId_key" ON "participants"("userId");
CREATE INDEX "participants_groupId_state_idx" ON "participants"("groupId", "state");
CREATE UNIQUE INDEX "batch_settings_batchId_key" ON "batch_settings"("batchId");
CREATE INDEX "attendance_events_groupId_eventDate_idx" ON "attendance_events"("groupId", "eventDate");
CREATE INDEX "attendance_events_eventDate_idx" ON "attendance_events"("eventDate");
CREATE INDEX "attendance_records_eventId_idx" ON "attendance_records"("eventId");
CREATE INDEX "attendance_records_participantId_idx" ON "attendance_records"("participantId");
CREATE INDEX "attendance_records_markedAt_idx" ON "attendance_records"("markedAt");
CREATE UNIQUE INDEX "attendance_records_eventId_participantId_key" ON "attendance_records"("eventId", "participantId");
CREATE INDEX "fee_events_batchId_isActive_createdAt_idx" ON "fee_events"("batchId", "isActive", "createdAt");
CREATE INDEX "fee_events_isActive_createdAt_idx" ON "fee_events"("isActive", "createdAt");
CREATE UNIQUE INDEX "payments_receiptNo_key" ON "payments"("receiptNo");
CREATE INDEX "payments_feeEventId_participantId_idx" ON "payments"("feeEventId", "participantId");
CREATE UNIQUE INDEX "receipt_sequences_prefix_year_key" ON "receipt_sequences"("prefix", "year");
CREATE UNIQUE INDEX "admission_applications_trackingCode_key" ON "admission_applications"("trackingCode");
CREATE UNIQUE INDEX "admission_applications_convertedParticipantId_key" ON "admission_applications"("convertedParticipantId");
CREATE INDEX "announcements_expiresAt_idx" ON "announcements"("expiresAt");
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "parks" ADD CONSTRAINT "parks_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_assignedCityId_fkey" FOREIGN KEY ("assignedCityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_assignedParkId_fkey" FOREIGN KEY ("assignedParkId") REFERENCES "parks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guardian_children" ADD CONSTRAINT "guardian_children_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guardian_children" ADD CONSTRAINT "guardian_children_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "participants" ADD CONSTRAINT "participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_settings" ADD CONSTRAINT "batch_settings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "attendance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_events" ADD CONSTRAINT "fee_events_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_feeEventId_fkey" FOREIGN KEY ("feeEventId") REFERENCES "fee_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_preferredParkId_fkey" FOREIGN KEY ("preferredParkId") REFERENCES "parks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_convertedParticipantId_fkey" FOREIGN KEY ("convertedParticipantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "admission_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
