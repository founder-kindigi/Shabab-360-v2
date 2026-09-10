-- A reset invalidates all older queued marks, including marks against an empty roster.
ALTER TABLE "attendance_events" ADD COLUMN "resetVersion" INTEGER NOT NULL DEFAULT 0;
