CREATE TABLE "training_cohorts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "eligibilityText" TEXT,
  "feeText" TEXT,
  "privacyNotice" TEXT,
  "registrationStart" DATETIME,
  "registrationEnd" DATETIME,
  "capacity" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "policyVersion" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "training_cohorts_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "training_cohorts_slug_key" ON "training_cohorts"("slug");
CREATE INDEX "training_cohorts_cityId_status_idx" ON "training_cohorts"("cityId", "status");

CREATE TABLE "training_applications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cohortId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "dateOfBirth" DATETIME,
  "locality" TEXT NOT NULL,
  "background" TEXT NOT NULL,
  "connection" TEXT NOT NULL,
  "motivation" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "privacyVersion" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "training_applications_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "training_cohorts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "training_applications_reference_key" ON "training_applications"("reference");
CREATE UNIQUE INDEX "training_applications_cohortId_requestKey_key" ON "training_applications"("cohortId", "requestKey");
CREATE INDEX "training_applications_cohortId_status_createdAt_idx" ON "training_applications"("cohortId", "status", "createdAt");

CREATE TABLE "training_application_actions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_application_actions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "training_applications" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "training_application_actions_applicationId_createdAt_idx" ON "training_application_actions"("applicationId", "createdAt");
