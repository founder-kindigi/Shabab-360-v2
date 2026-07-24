-- Additive migration: TeamChatMessage, TeamDocumentLink models, and
-- back-relation fields on CollaborationTeam and StaffMeta.

CREATE TABLE "team_chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_chat_messages_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_chat_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "team_document_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_document_links_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "collaboration_teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_document_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "team_chat_messages_teamId_createdAt_idx" ON "team_chat_messages"("teamId", "createdAt");
CREATE INDEX "team_document_links_teamId_isActive_idx" ON "team_document_links"("teamId", "isActive");
