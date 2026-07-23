import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { GET as listActivities, POST as createActivity } from "./route";
import { PATCH as updateActivity } from "./[id]/route";

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

describe("Team Activity Planner APIs (TEAM-005 / TEAM-009)", () => {
  const mockTeamId = "c323456789012345678901234";

  const mockStaffMetaUser = {
    id: "c523456789012345678901234",
    userId: "u123456789012345678901234",
    role: "park_lead",
    assignedCityId: "c123456789012345678901234",
    isActive: true,
  };

  const mockAssigneeMeta = {
    id: "c823456789012345678901234",
    userId: "u823456789012345678901234",
    role: "murabbi",
    assignedCityId: "c123456789012345678901234",
    isActive: true,
  };

  const mockUserLead = {
    id: mockStaffMetaUser.userId,
    role: "park_lead",
    assignedCityId: "c123456789012345678901234",
    mustResetPwd: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/teams/[teamId]/activities", () => {
    it("allows active team member with teams.workspace.manage to create activity (HTTP 201 - TC-ACT-001)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLead } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);

      // Membership checks
      vi.spyOn(db.staffTeamMembership, "findFirst")
        .mockResolvedValueOnce({ id: "mem-1" } as any) // caller active member
        .mockResolvedValueOnce({ id: "mem-2" } as any); // assignee active member

      const mockCreated = {
        id: "act-123456789012345678901234",
        teamId: mockTeamId,
        title: "Curriculum Session",
        description: null,
        status: "planned",
        assignedStaffMetaId: mockAssigneeMeta.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db.activityPlanItem, "create").mockResolvedValue(mockCreated as any);
      const auditSpy = vi.spyOn(db.auditLog, "create").mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/activities`, {
        method: "POST",
        body: JSON.stringify({
          title: "Curriculum Session",
          assignedStaffMetaId: mockAssigneeMeta.id,
        }),
      });

      const response = await createActivity(request, { params: Promise.resolve({ teamId: mockTeamId }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.id).toBe(mockCreated.id);
      expect(auditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "create_activity_plan_item",
        }),
      });
    });

    it("denies creating activity if assignee is not an active team member (HTTP 400 - TC-ACT-003)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLead } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);

      vi.spyOn(db.staffTeamMembership, "findFirst")
        .mockResolvedValueOnce({ id: "mem-1" } as any) // caller active member
        .mockResolvedValueOnce(null); // assignee NOT active member

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/activities`, {
        method: "POST",
        body: JSON.stringify({
          title: "Curriculum Session",
          assignedStaffMetaId: "c999999999999999999999999",
        }),
      });

      const response = await createActivity(request, { params: Promise.resolve({ teamId: mockTeamId }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/assignee is not an active member/i);
    });
  });

  describe("PATCH /api/teams/[teamId]/activities/[id]", () => {
    it("allows direct assignee with teams.workspace.view to transition from planned to in_progress (HTTP 200 - TC-ACT-004)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLead } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);
      vi.spyOn(db.staffTeamMembership, "findFirst").mockResolvedValue({ id: "mem-1" } as any);

      const mockExistingItem = {
        id: "act-123456789012345678901234",
        teamId: mockTeamId,
        title: "Task",
        status: "planned",
        assignedStaffMetaId: mockStaffMetaUser.id,
      };

      vi.spyOn(db.activityPlanItem, "findUnique").mockResolvedValue(mockExistingItem as any);
      vi.spyOn(db.activityPlanItem, "update").mockResolvedValue({
        ...mockExistingItem,
        status: "in_progress",
      } as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/activities/${mockExistingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      });

      const response = await updateActivity(request, {
        params: Promise.resolve({ teamId: mockTeamId, id: mockExistingItem.id }),
      });

      expect(response.status).toBe(200);
    });
  });
});
