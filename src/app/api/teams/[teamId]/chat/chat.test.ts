import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mock db ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  userHasCapability: vi.fn(),
  staffFindUnique: vi.fn(),
  membershipFindFirst: vi.fn(),
  chatMessageFindUnique: vi.fn(),
  chatMessageFindMany: vi.fn(),
  chatMessageCreate: vi.fn(),
  chatMessageUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: mocks.userHasCapability,
}));

vi.mock("@/lib/db", () => ({
  db: {
    staffMeta: { findUnique: mocks.staffFindUnique },
    staffTeamMembership: { findFirst: mocks.membershipFindFirst },
    teamChatMessage: {
      findUnique: mocks.chatMessageFindUnique,
      findMany: mocks.chatMessageFindMany,
      create: mocks.chatMessageCreate,
      update: mocks.chatMessageUpdate,
    },
    auditLog: { create: mocks.auditLogCreate },
  },
}));

import { GET as listChatMessages, POST as sendChatMessage } from "./route";
import { DELETE as deleteChatMessage } from "./[messageId]/route";

describe("Team Chat APIs (TEAM-006 / TEAM-009)", () => {
  const mockTeamId = "c323456789012345678901234";
  const mockStaffMetaId = "c523456789012345678901234";

  const mockUserMurabbi = {
    id: "u123456789012345678901234",
    role: "murabbi",
    assignedCityId: "c123456789012345678901234",
    mustResetPwd: false,
  };

  const mockStaffMeta = {
    id: mockStaffMetaId,
    userId: mockUserMurabbi.id,
    role: "murabbi",
    assignedCityId: "c123456789012345678901234",
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: mockUserMurabbi } as any);
    mocks.staffFindUnique.mockResolvedValue(mockStaffMeta as any);
    mocks.membershipFindFirst.mockResolvedValue({ id: "mem-1" } as any);
  });

  describe("POST /api/teams/[teamId]/chat", () => {
    it("allows active team member to send chat message (HTTP 201 - TC-CHT-001)", async () => {
      const mockMsg = {
        id: "msg-123456789012345678901234",
        teamId: mockTeamId,
        authorId: mockStaffMetaId,
        content: "Hello team!",
        createdAt: new Date(),
        isDeleted: false,
      };

      mocks.chatMessageCreate.mockResolvedValue(mockMsg as any);
      mocks.auditLogCreate.mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/chat`, {
        method: "POST",
        body: JSON.stringify({ content: "Hello team!" }),
      });

      const response = await sendChatMessage(request, { params: Promise.resolve({ teamId: mockTeamId }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.id).toBe(mockMsg.id);
      expect(mocks.chatMessageCreate).toHaveBeenCalled();
      expect(mocks.auditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "send_team_chat_message" }),
      });
    });
  });

  describe("DELETE /api/teams/[teamId]/chat/[messageId]", () => {
    it("allows author to soft-delete message within 10 minutes (HTTP 200 - TC-CHT-002)", async () => {
      const mockMsgRecent = {
        id: "msg-123456789012345678901234",
        teamId: mockTeamId,
        authorId: mockStaffMetaId,
        content: "Typo msg",
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
        isDeleted: false,
      };

      mocks.chatMessageFindUnique.mockResolvedValue(mockMsgRecent as any);
      mocks.chatMessageUpdate.mockResolvedValue({ ...mockMsgRecent, isDeleted: true } as any);
      mocks.auditLogCreate.mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/chat/${mockMsgRecent.id}`, {
        method: "DELETE",
      });

      const response = await deleteChatMessage(request, {
        params: Promise.resolve({ teamId: mockTeamId, messageId: mockMsgRecent.id }),
      });

      expect(response.status).toBe(200);
      expect(mocks.chatMessageUpdate).toHaveBeenCalled();
      expect(mocks.auditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "delete_own_chat_message" }),
      });
    });

    it("denies author soft-delete if 10 minute window has expired (HTTP 403 - TC-CHT-003)", async () => {
      const mockMsgOld = {
        id: "msg-123456789012345678901234",
        teamId: mockTeamId,
        authorId: mockStaffMetaId,
        content: "Old msg",
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        isDeleted: false,
      };

      mocks.chatMessageFindUnique.mockResolvedValue(mockMsgOld as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/chat/${mockMsgOld.id}`, {
        method: "DELETE",
      });

      const response = await deleteChatMessage(request, {
        params: Promise.resolve({ teamId: mockTeamId, messageId: mockMsgOld.id }),
      });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toMatch(/10 minutes/i);
    });
  });
});
