ALTER TABLE "batch_settings" ADD COLUMN "classWeekdays" TEXT NOT NULL DEFAULT '[0,6]';

CREATE TABLE "batch_class_dates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "classDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_class_dates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "operational_off_dates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "offDate" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "operational_off_dates_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "batch_class_dates_batchId_classDate_key" ON "batch_class_dates"("batchId", "classDate");
CREATE INDEX "batch_class_dates_classDate_idx" ON "batch_class_dates"("classDate");
CREATE UNIQUE INDEX "operational_off_dates_cityId_offDate_key" ON "operational_off_dates"("cityId", "offDate");
CREATE INDEX "operational_off_dates_offDate_idx" ON "operational_off_dates"("offDate");
