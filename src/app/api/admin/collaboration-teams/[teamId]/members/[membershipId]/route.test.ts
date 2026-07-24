import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/team-scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
}));
vi.mock("@/lib/db", () => ({
  db: {
    staffTeamMembership: { findUnique: mocks.membershipFindUnique, update: mocks.membershipUpdate },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { DELETE } from "./route";

describe("DELETE /api/admin/collaboration-teams/[teamId]/members/[membershipId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin", role: "super_admin" } });
    mocks.resolveActorCity.mockResolvedValue({ success: true, cityId: "city-lhr" });
  });

  it("returns 404 for membership belonging to another team", async () => {
    mocks.membershipFindUnique.mockResolvedValue(null);
    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members/membership-khi", { method: "DELETE" }),
      { params: Promise.resolve({ teamId: "team-lhr", membershipId: "membership-khi" }) }
    );
    expect(response.status).toBe(404);
    expect(mocks.membershipUpdate).not.toHaveBeenCalled();
  });

  it("ends an active membership while preserving its historical record", async () => {
    mocks.membershipFindUnique.mockResolvedValue({
      id: "membership-1", teamId: "team-lhr", staffMetaId: "staff-1", title: "Sports POC",
      team: { cityId: "city-lhr" },
    });
    mocks.membershipUpdate.mockResolvedValue({ id: "membership-1", isActive: false });

    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members/membership-1", { method: "DELETE" }),
      { params: Promise.resolve({ teamId: "team-lhr", membershipId: "membership-1" }) }
    );
    expect(response.status).toBe(200);
    expect(mocks.membershipUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "membership-1" },
      data: expect.objectContaining({ isActive: false, endedAt: expect.any(Date) }),
    }));
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "revoke_team_membership" }),
    });
  });
});
