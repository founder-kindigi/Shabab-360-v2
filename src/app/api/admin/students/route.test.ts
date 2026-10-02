import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(), requireCapability: vi.fn(),
  resolveRequestedHierarchy: vi.fn(),
  participantFindMany: vi.fn(), participantCount: vi.fn(), participantCreate: vi.fn(),
  groupFindFirst: vi.fn(), logAudit: vi.fn(),
}));
vi.mock("@/lib/auth/authorize", () => ({ requireAuth: mocks.requireAuth, requireCapability: mocks.requireCapability }));
vi.mock("@/lib/auth/hierarchy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/hierarchy")>()),
  resolveRequestedHierarchy: mocks.resolveRequestedHierarchy,
}));
vi.mock("@/lib/db", () => ({
  db: {
    participant: { findMany: mocks.participantFindMany, count: mocks.participantCount, create: mocks.participantCreate },
    group: { findFirst: mocks.groupFindFirst },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { GET, POST } from "./route";

const HQ_SCOPE = { kind: "hq", cityId: null, parkId: null, groupId: null };
const CITY_SCOPE = { kind: "city", cityId: "city-central", parkId: null, groupId: null };

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/students", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/admin/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "hq", role: "program_admin" } });
    mocks.resolveRequestedHierarchy.mockResolvedValue(HQ_SCOPE);
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.participantCount.mockResolvedValue(0);
  });

  it("denies student management before querying participants", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/students"));
    expect(response.status).toBe(403);
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });

  it("returns no private participant or guardian fields", async () => {
    const park = { id: "park", name: "Park", city: { id: "city", name: "City" } };
    mocks.participantFindMany.mockResolvedValue([{
      id: "participant", name: "Student", state: "active",
      group: { id: "group", name: "Group", parkId: "park", park, batch: { id: "batch", name: "Batch", park } },
      attendanceRecords: [],
    }]);
    mocks.participantCount.mockResolvedValue(1);
    const response = await GET(new NextRequest("http://localhost/api/admin/students"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0]).toEqual(expect.objectContaining({ id: "participant", name: "Student", state: "active" }));
    expect(body.data[0]).not.toHaveProperty("phone");
    expect(body.data[0]).not.toHaveProperty("dateOfBirth");
    expect(body.data[0]).not.toHaveProperty("guardians");
    expect(mocks.participantFindMany.mock.calls[0][0].include).not.toHaveProperty("guardianLinks");
  });

  it("keeps unassigned participants out of the normal listing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/students"));

    expect(response.status).toBe(200);
    expect(mocks.participantFindMany.mock.calls[0][0].where.groupId).toEqual({ not: null });
  });

  it("returns the group-less projection for the central-only unassigned filter", async () => {
    mocks.participantFindMany.mockResolvedValue([{
      id: "unassigned", name: "Unplaced", state: "active", group: null, attendanceRecords: [],
    }]);
    mocks.participantCount.mockResolvedValue(1);

    const response = await GET(new NextRequest("http://localhost/api/admin/students?unassigned=true"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mocks.participantFindMany.mock.calls[0][0].where.groupId).toBeNull();
    expect(body.data).toEqual([{
      id: "unassigned", name: "Unplaced", state: "active", group: null,
      attendanceRate: null, attendanceTotal: 0, attendancePresent: 0,
    }]);
    expect(body.data[0]).not.toHaveProperty("phone");
  });

  it("denies the unassigned filter to a scoped caller", async () => {
    mocks.resolveRequestedHierarchy.mockResolvedValue(CITY_SCOPE);

    const response = await GET(new NextRequest("http://localhost/api/admin/students?unassigned=true"));

    expect(response.status).toBe(403);
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });

  it("forwards the requested filter to the scope resolver for the unassigned listing", async () => {
    await GET(
      new NextRequest("http://localhost/api/admin/students?unassigned=true&cityId=city-central")
    );

    expect(mocks.resolveRequestedHierarchy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cityId: "city-central" })
    );
  });
});

describe("POST /api/admin/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "hq", role: "program_admin" } });
    mocks.resolveRequestedHierarchy.mockResolvedValue(HQ_SCOPE);
    mocks.participantCreate.mockImplementation(async ({ data }: any) => ({ id: "participant", ...data }));
  });

  it("creates an unassigned participant for central staff without a group", async () => {
    const response = await POST(postRequest({ name: "Unplaced Student" }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.unassigned).toBe(true);
    expect(body.groupId).toBeNull();
    expect(mocks.participantCreate.mock.calls[0][0].data.groupId).toBeNull();
    expect(mocks.groupFindFirst).not.toHaveBeenCalled();
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        entityType: "participant",
        newValues: expect.objectContaining({ groupId: null }),
      })
    );
  });

  it("denies an unassigned create to scoped staff", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "murabbi", role: "murabbi" } });

    const response = await POST(postRequest({ name: "Unplaced Student" }));

    expect(response.status).toBe(403);
    expect(mocks.participantCreate).not.toHaveBeenCalled();
  });

  it("creates an in-scope participant when an active group is selected", async () => {
    mocks.groupFindFirst.mockResolvedValue({ id: "group-1", isActive: true });

    const response = await POST(postRequest({ name: "Placed Student", groupId: "group-1" }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.unassigned).toBe(false);
    expect(body.groupId).toBe("group-1");
    expect(mocks.groupFindFirst).toHaveBeenCalledWith({ where: { id: "group-1", isActive: true } });
    expect(mocks.resolveRequestedHierarchy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "hq" }),
      { groupId: "group-1" }
    );
  });

  it("denies an unknown or inactive group without creating a record", async () => {
    mocks.groupFindFirst.mockResolvedValue(null);

    const response = await POST(postRequest({ name: "Placed Student", groupId: "group-gone" }));

    expect(response.status).toBe(400);
    expect(mocks.participantCreate).not.toHaveBeenCalled();
  });

  it("denies a cross-scope group without creating a record", async () => {
    mocks.groupFindFirst.mockResolvedValue({ id: "group-2", isActive: true });
    mocks.resolveRequestedHierarchy.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(postRequest({ name: "Placed Student", groupId: "group-2" }));

    expect(response.status).toBe(403);
    expect(mocks.participantCreate).not.toHaveBeenCalled();
  });

  it("rejects a blank group id instead of treating it as unassigned", async () => {
    const response = await POST(postRequest({ name: "Placed Student", groupId: "   " }));

    expect(response.status).toBe(400);
    expect(mocks.groupFindFirst).not.toHaveBeenCalled();
    expect(mocks.participantCreate).not.toHaveBeenCalled();
  });
});
