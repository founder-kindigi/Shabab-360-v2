-- Access Management: version-controlled role defaults remain in application
-- code. These tables store audited exceptions only; no free-text capability
-- is accepted by the application layer.
CREATE TABLE "role_capability_overrides" (
  "id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "role_capability_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_capability_overrides" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_capability_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_capability_overrides_role_capability_key"
ON "role_capability_overrides"("role", "capability");

CREATE INDEX "role_capability_overrides_role_idx"
ON "role_capability_overrides"("role");

CREATE UNIQUE INDEX "user_capability_overrides_userId_capability_key"
ON "user_capability_overrides"("userId", "capability");

CREATE INDEX "user_capability_overrides_userId_isActive_expiresAt_idx"
ON "user_capability_overrides"("userId", "isActive", "expiresAt");

ALTER TABLE "user_capability_overrides"
ADD CONSTRAINT "user_capability_overrides_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
