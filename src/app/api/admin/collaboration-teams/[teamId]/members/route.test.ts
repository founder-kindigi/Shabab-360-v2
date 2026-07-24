import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const CUID = "c123456789012345678901234";
const CUID_TEAM = "c223456789012345678901234";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  getStaffMetaDerivedCity: vi.fn(),
  teamFindUnique: vi.fn(),
  staffFindUnique: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipCreate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/team-scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
  getStaffMetaDerivedCity: mocks.getStaffMetaDerivedCity,
}));
vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: { findUnique: mocks.teamFindUnique },
    staffMeta: { findUnique: mocks.staffFindUnique },
    staffTeamMembership: { findFirst: mocks.membershipFindFirst, create: mocks.membershipCreate },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { POST } from "./route";

describe("POST /api/admin/collaboration-teams/[teamId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin", role: "super_admin" } });
    mocks.resolveActorCity.mockResolvedValue({ success: true, cityId: "city-lhr" });
    mocks.teamFindUnique.mockResolvedValue({ id: CUID_TEAM, cityId: "city-lhr", isActive: true });
    mocks.staffFindUnique.mockResolvedValue({
      id: CUID, isActive: true,
      assignedCityId: "city-lhr", assignedPark: null, assignedGroup: null,
    });
    mocks.getStaffMetaDerivedCity.mockImplementation((id: string) => {
      if (id === CUID) return Promise.resolve("city-lhr");
      return Promise.resolve(null);
    });
  });

  it("returns 403 without teams.memberships.manage", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await POST(
      new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: CUID }),
      }),
      { params: Promise.resolve({ teamId: CUID_TEAM }) }
    );
    expect(response.status).toBe(403);
    expect(mocks.teamFindUnique).not.toHaveBeenCalled();
  });

  it("rejects staff outside team city", async () => {
    mocks.staffFindUnique.mockResolvedValue({
      id: CUID, isActive: true,
      assignedCityId: "city-khi", assignedPark: null, assignedGroup: null,
    });
    mocks.getStaffMetaDerivedCity.mockImplementation((id: string) => {
      if (id === CUID) return Promise.resolve("city-khi");
      return Promise.resolve(null);
    });
    const response = await POST(
      new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: CUID }),
      }),
      { params: Promise.resolve({ teamId: CUID_TEAM }) }
    );
    expect(response.status).toBe(400);
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });

  it("creates an auditable same-city membership", async () => {
    mocks.membershipFindFirst.mockResolvedValue(null);
    mocks.membershipCreate.mockResolvedValue({
      id: "membership-1", teamId: CUID_TEAM, staffMetaId: CUID, title: "Sports POC", startedAt: new Date(),
    });
    const response = await POST(
      new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: CUID, title: "Sports POC" }),
      }),
      { params: Promise.resolve({ teamId: CUID_TEAM }) }
    );
    expect(response.status).toBe(201);
    expect(mocks.membershipCreate).toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "create_team_membership" }),
    });
  });
});
