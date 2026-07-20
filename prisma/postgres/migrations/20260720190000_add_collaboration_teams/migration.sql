-- Collaboration teams are city-scoped operational groups. They do not grant
-- application capabilities or hierarchy access; those remain on StaffMeta.
CREATE TABLE "collaboration_teams" (
  "id" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "collaboration_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_team_memberships" (
  "id" TEXT NOT NULL,
  "staffMetaId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "title" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staff_team_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collaboration_teams_cityId_code_key"
ON "collaboration_teams"("cityId", "code");
CREATE INDEX "collaboration_teams_cityId_isActive_idx"
ON "collaboration_teams"("cityId", "isActive");
CREATE UNIQUE INDEX "staff_team_memberships_staffMetaId_teamId_startedAt_key"
ON "staff_team_memberships"("staffMetaId", "teamId", "startedAt");
CREATE INDEX "staff_team_memberships_staffMetaId_isActive_idx"
ON "staff_team_memberships"("staffMetaId", "isActive");
CREATE INDEX "staff_team_memberships_teamId_isActive_idx"
ON "staff_team_memberships"("teamId", "isActive");

ALTER TABLE "collaboration_teams"
ADD CONSTRAINT "collaboration_teams_cityId_fkey"
FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_team_memberships"
ADD CONSTRAINT "staff_team_memberships_staffMetaId_fkey"
FOREIGN KEY ("staffMetaId") REFERENCES "staff_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_team_memberships"
ADD CONSTRAINT "staff_team_memberships_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "collaboration_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
