ALTER TABLE "batch_settings" ADD COLUMN "classWeekdays" TEXT NOT NULL DEFAULT '[0,6]';

CREATE TABLE "batch_class_dates" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "classDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_class_dates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_off_dates" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "offDate" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operational_off_dates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "batch_class_dates_batchId_classDate_key" ON "batch_class_dates"("batchId", "classDate");
CREATE INDEX "batch_class_dates_classDate_idx" ON "batch_class_dates"("classDate");
CREATE UNIQUE INDEX "operational_off_dates_cityId_offDate_key" ON "operational_off_dates"("cityId", "offDate");
CREATE INDEX "operational_off_dates_offDate_idx" ON "operational_off_dates"("offDate");
ALTER TABLE "batch_class_dates" ADD CONSTRAINT "batch_class_dates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_off_dates" ADD CONSTRAINT "operational_off_dates_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
