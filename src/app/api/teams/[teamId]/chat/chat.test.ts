import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { GET as listChatMessages, POST as sendChatMessage } from "./route";
import { DELETE as deleteChatMessage } from "./[messageId]/route";

vi.mock("@/lib/auth/authorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorize")>();
  return {
    ...actual,
    requireAuth: vi.fn(),
    requireCapability: vi.fn(),
  };
});

import { requireCapability } from "@/lib/auth/authorize";

const mockRequireCapability = vi.mocked(requireCapability);

describe("Team Chat APIs (TEAM-006 / TEAM-009)", () => {
  const mockTeamId = "c323456789012345678901234";

  const mockStaffMetaUser = {
    id: "c523456789012345678901234",
    userId: "u123456789012345678901234",
    role: "murabbi",
    assignedCityId: "c123456789012345678901234",
    isActive: true,
  };

  const mockUserMurabbi = {
    id: mockStaffMetaUser.userId,
    role: "murabbi",
    assignedCityId: "c123456789012345678901234",
    mustResetPwd: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/teams/[teamId]/chat", () => {
    it("allows active team member to send chat message (HTTP 201 - TC-CHT-001)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserMurabbi } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);
      vi.spyOn(db.staffTeamMembership, "findFirst").mockResolvedValue({ id: "mem-1" } as any);

      const mockMsg = {
        id: "msg-123456789012345678901234",
        teamId: mockTeamId,
        authorId: mockStaffMetaUser.id,
        content: "Hello team!",
        createdAt: new Date(),
        isDeleted: false,
      };

      vi.spyOn(db.teamChatMessage, "create").mockResolvedValue(mockMsg as any);
      const auditSpy = vi.spyOn(db.auditLog, "create").mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/chat`, {
        method: "POST",
        body: JSON.stringify({ content: "Hello team!" }),
      });

      const response = await sendChatMessage(request, { params: Promise.resolve({ teamId: mockTeamId }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.id).toBe(mockMsg.id);
      expect(auditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "send_team_chat_message",
        }),
      });
    });
  });

  describe("DELETE /api/teams/[teamId]/chat/[messageId]", () => {
    it("allows author to soft-delete message within 10 minutes (HTTP 200 - TC-CHT-002)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserMurabbi } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);
      vi.spyOn(db.staffTeamMembership, "findFirst").mockResolvedValue({ id: "mem-1" } as any);

      const mockMsgRecent = {
        id: "msg-123456789012345678901234",
        teamId: mockTeamId,
        authorId: mockStaffMetaUser.id,
        content: "Typo msg",
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        isDeleted: false,
      };

      vi.spyOn(db.teamChatMessage, "findUnique").mockResolvedValue(mockMsgRecent as any);
      vi.spyOn(db.teamChatMessage, "update").mockResolvedValue({ ...mockMsgRecent, isDeleted: true } as any);
      const auditSpy = vi.spyOn(db.auditLog, "create").mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/chat/${mockMsgRecent.id}`, {
        method: "DELETE",
      });

      const response = await deleteChatMessage(request, {
        params: Promise.resolve({ teamId: mockTeamId, messageId: mockMsgRecent.id }),
      });

      expect(response.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "delete_own_chat_message",
        }),
      });
    });

    it("denies author soft-delete if 10 minute window has expired (HTTP 403 - TC-CHT-003)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserMurabbi } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);
      vi.spyOn(db.staffTeamMembership, "findFirst").mockResolvedValue({ id: "mem-1" } as any);

      const mockMsgOld = {
        id: "msg-123456789012345678901234",
        teamId: mockTeamId,
        authorId: mockStaffMetaUser.id,
        content: "Old msg",
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        isDeleted: false,
      };

      vi.spyOn(db.teamChatMessage, "findUnique").mockResolvedValue(mockMsgOld as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/chat/${mockMsgOld.id}`, {
        method: "DELETE",
      });

      const response = await deleteChatMessage(request, {
        params: Promise.resolve({ teamId: mockTeamId, messageId: mockMsgOld.id }),
      });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toMatch(/10 minutes has expired/i);
    });
  });
});
