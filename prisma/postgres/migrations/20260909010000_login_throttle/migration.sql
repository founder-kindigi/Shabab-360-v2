CREATE TABLE "login_attempt_windows" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "resetAt" BIGINT NOT NULL
);
CREATE INDEX "login_attempt_windows_resetAt_idx" ON "login_attempt_windows"("resetAt");
