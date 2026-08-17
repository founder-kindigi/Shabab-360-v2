ALTER TABLE "batch_settings" ADD COLUMN "automaticDropoutEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "batch_settings" ADD COLUMN "warningConsecutiveWeeks" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "batch_settings" ADD COLUMN "dropoutConsecutiveWeeks" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "participants" ADD COLUMN "dropoutAt" DATETIME;
ALTER TABLE "participants" ADD COLUMN "dropoutReason" TEXT;
ALTER TABLE "participants" ADD COLUMN "dropoutSource" TEXT;
ALTER TABLE "participants" ADD COLUMN "reactivatedAt" DATETIME;
