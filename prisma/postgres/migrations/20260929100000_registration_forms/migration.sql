CREATE TABLE "registration_forms" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "ownerCityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "intro" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedVersion" INTEGER NOT NULL DEFAULT 0,
  "draftSchemaJson" TEXT NOT NULL,
  "draftSettingsJson" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registration_forms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registration_forms_slug_key" ON "registration_forms"("slug");
CREATE INDEX "registration_forms_ownerCityId_status_idx" ON "registration_forms"("ownerCityId", "status");
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_ownerCityId_fkey" FOREIGN KEY ("ownerCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "registration_form_revisions" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "intro" TEXT NOT NULL,
  "schemaJson" TEXT NOT NULL,
  "settingsJson" TEXT NOT NULL,
  "publishedBy" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_form_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registration_form_revisions_formId_version_key" ON "registration_form_revisions"("formId", "version");
ALTER TABLE "registration_form_revisions" ADD CONSTRAINT "registration_form_revisions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "registration_form_submissions" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "answersJson" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_form_submissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "registration_form_submissions_reference_key" ON "registration_form_submissions"("reference");
CREATE UNIQUE INDEX "registration_form_submissions_formId_requestKey_key" ON "registration_form_submissions"("formId", "requestKey");
CREATE INDEX "registration_form_submissions_formId_createdAt_idx" ON "registration_form_submissions"("formId", "createdAt");
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "registration_form_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
