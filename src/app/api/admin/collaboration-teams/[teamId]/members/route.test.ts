import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  teamFindUnique: vi.fn(),
  staffFindUnique: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipCreate: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/events-scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
}));
vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: { findUnique: mocks.teamFindUnique },
    staffMeta: { findUnique: mocks.staffFindUnique },
    staffTeamMembership: { findFirst: mocks.membershipFindFirst, create: mocks.membershipCreate },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { POST } from "./route";

describe("POST /api/admin/collaboration-teams/[teamId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin", role: "super_admin" } });
    mocks.resolveActorCity.mockResolvedValue({ cityId: "city-lhr", isHQ: true });
  });

  it("denies access when organisation.manage capability is missing", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffMetaId: "staff-1" }),
    }), { params: Promise.resolve({ teamId: "team-lhr" }) });

    expect(response.status).toBe(403);
    expect(mocks.teamFindUnique).not.toHaveBeenCalled();
    expect(mocks.staffFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a staff member assigned outside the team city without writing", async () => {
    mocks.teamFindUnique.mockResolvedValue({ id: "team-lhr", cityId: "city-lhr" });
    mocks.staffFindUnique.mockResolvedValue({
      id: "staff-1",
      isActive: true,
      assignedCityId: "city-khi",
      assignedPark: null,
      assignedGroup: null,
    });

    const response = await POST(new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffMetaId: "staff-1" }),
    }), { params: Promise.resolve({ teamId: "team-lhr" }) });

    expect(response.status).toBe(400);
    expect(mocks.membershipFindFirst).not.toHaveBeenCalled();
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });

  it("creates an auditable same-city membership without changing staff scope", async () => {
    mocks.teamFindUnique.mockResolvedValue({ id: "team-lhr", cityId: "city-lhr" });
    mocks.staffFindUnique.mockResolvedValue({
      id: "staff-1",
      isActive: true,
      assignedCityId: null,
      assignedPark: { cityId: "city-lhr" },
      assignedGroup: null,
    });
    mocks.membershipFindFirst.mockResolvedValue(null);
    mocks.membershipCreate.mockResolvedValue({
      id: "membership-1", teamId: "team-lhr", staffMetaId: "staff-1", title: "Sports POC", startedAt: new Date(),
    });

    const response = await POST(new NextRequest("http://localhost/api/admin/collaboration-teams/team-lhr/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffMetaId: "staff-1", title: "Sports POC" }),
    }), { params: Promise.resolve({ teamId: "team-lhr" }) });

    expect(response.status).toBe(201);
    expect(mocks.membershipCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: { teamId: "team-lhr", staffMetaId: "staff-1", title: "Sports POC", isActive: true, startedAt: expect.any(Date) },
    }));
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "team_membership.assign",
      entityType: "StaffTeamMembership",
      newValues: { teamId: "team-lhr", staffMetaId: "staff-1", title: "Sports POC" },
    }));
  });
});
