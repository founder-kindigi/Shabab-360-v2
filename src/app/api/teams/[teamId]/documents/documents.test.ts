import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { GET as listDocuments, POST as registerDocument } from "./route";

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

describe("Team Document Link Registry APIs (TEAM-007 / TEAM-009)", () => {
  const mockTeamId = "c323456789012345678901234";

  const mockStaffMetaUser = {
    id: "c523456789012345678901234",
    userId: "u123456789012345678901234",
    role: "city_head",
    assignedCityId: "c123456789012345678901234",
    isActive: true,
  };

  const mockUserCityHead = {
    id: mockStaffMetaUser.userId,
    role: "city_head",
    assignedCityId: "c123456789012345678901234",
    mustResetPwd: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/teams/[teamId]/documents (Fail-Closed Safety Policy)", () => {
    it("returns HTTP 403 Forbidden explaining the disabled security policy (TC-DOC-002)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserCityHead } as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaUser as any);
      vi.spyOn(db.staffTeamMembership, "findFirst").mockResolvedValue({ id: "mem-1" } as any);

      const request = new Request(`http://localhost/api/teams/${mockTeamId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          title: "Drive Folder Link",
          url: "https://drive.google.com/drive/folders/test",
        }),
      });

      const response = await registerDocument(request, { params: Promise.resolve({ teamId: mockTeamId }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toMatch(/disabled pending security domain allowlist/i);
    });
  });
});
