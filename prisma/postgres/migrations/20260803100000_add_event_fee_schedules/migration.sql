CREATE TABLE "event_fee_schedules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "feeEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_fee_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_fee_schedules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_fee_schedules_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_fee_schedules_feeEventId_fkey" FOREIGN KEY ("feeEventId") REFERENCES "fee_events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "event_fee_schedules_eventId_batchId_key" ON "event_fee_schedules"("eventId", "batchId");
CREATE UNIQUE INDEX "event_fee_schedules_feeEventId_key" ON "event_fee_schedules"("feeEventId");
CREATE INDEX "event_fee_schedules_batchId_idx" ON "event_fee_schedules"("batchId");
ALTER TABLE "event_registrations" ADD COLUMN "eventFeeScheduleId" TEXT;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventFeeScheduleId_fkey" FOREIGN KEY ("eventFeeScheduleId") REFERENCES "event_fee_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "event_registrations_eventFeeScheduleId_idx" ON "event_registrations"("eventFeeScheduleId");
