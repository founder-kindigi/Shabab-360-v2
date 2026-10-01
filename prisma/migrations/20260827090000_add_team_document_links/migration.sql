CREATE TABLE "team_document_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "createdByStaffMetaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_document_links_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_document_links_createdByStaffMetaId_fkey" FOREIGN KEY ("createdByStaffMetaId") REFERENCES "staff_meta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "team_document_links_teamId_createdAt_idx" ON "team_document_links"("teamId", "createdAt");
CREATE INDEX "team_document_links_createdByStaffMetaId_idx" ON "team_document_links"("createdByStaffMetaId");

CREATE TABLE "external_link_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allowedDomains" TEXT NOT NULL,
    "requireInterstitialWarning" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
