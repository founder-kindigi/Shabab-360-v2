ALTER TABLE "batch_settings" ADD COLUMN IF NOT EXISTS "automaticDropoutEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "batch_settings" ADD COLUMN IF NOT EXISTS "warningConsecutiveWeeks" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "batch_settings" ADD COLUMN IF NOT EXISTS "dropoutConsecutiveWeeks" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "dropoutAt" TIMESTAMP(3);
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "dropoutReason" TEXT;
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "dropoutSource" TEXT;
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "reactivatedAt" TIMESTAMP(3);
