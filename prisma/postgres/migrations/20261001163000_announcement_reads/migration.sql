CREATE TABLE "announcement_reads" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "announcement_reads_announcementId_userId_key"
    ON "announcement_reads"("announcementId", "userId");

CREATE INDEX "announcement_reads_userId_createdAt_idx"
    ON "announcement_reads"("userId", "createdAt");

ALTER TABLE "announcement_reads"
    ADD CONSTRAINT "announcement_reads_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "announcements"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_reads"
    ADD CONSTRAINT "announcement_reads_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
