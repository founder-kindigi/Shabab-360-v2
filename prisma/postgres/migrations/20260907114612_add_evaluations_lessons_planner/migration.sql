CREATE TABLE "student_evaluations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "participantId" TEXT NOT NULL,
  "murabbiUserId" TEXT NOT NULL,
  "parkId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "discipline" INTEGER NOT NULL,
  "farmabardari" INTEGER NOT NULL,
  "islah" INTEGER NOT NULL,
  "ibadah" INTEGER NOT NULL,
  "participation" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_evaluations_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "student_evaluations_participantId_month_year_key" ON "student_evaluations"("participantId", "month", "year");
CREATE INDEX "student_evaluations_parkId_month_year_idx" ON "student_evaluations"("parkId", "month", "year");

CREATE TABLE "park_lessons" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parkId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "lessonDate" TIMESTAMP(3) NOT NULL,
  "driveLink" TEXT,
  "fileKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "park_lessons_parkId_lessonDate_idx" ON "park_lessons"("parkId", "lessonDate");

CREATE TABLE "park_routine_slots" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parkId" TEXT NOT NULL,
  "timeStart" TEXT NOT NULL,
  "timeEnd" TEXT NOT NULL,
  "activity" TEXT NOT NULL,
  "pdfLink" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isSpecialEvent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "park_routine_slots_parkId_idx" ON "park_routine_slots"("parkId");
