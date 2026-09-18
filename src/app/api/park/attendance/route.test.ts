import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  groupFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  parkFindUnique: vi.fn(),
  batchFindMany: vi.fn(),
  batchFindUnique: vi.fn(),
  attendanceEventFindFirst: vi.fn(),
  attendanceEventCreate: vi.fn(),
  attendanceEventFindMany: vi.fn(),
  participantGroupBy: vi.fn(),
  staffMetaFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    group: { findUnique: mocks.groupFindUnique, findMany: mocks.groupFindMany },
    park: { findUnique: mocks.parkFindUnique },
    batch: { findMany: mocks.batchFindMany, findUnique: mocks.batchFindUnique },
    attendanceEvent: {
      findFirst: mocks.attendanceEventFindFirst,
      create: mocks.attendanceEventCreate,
      findMany: mocks.attendanceEventFindMany,
    },
    participant: { groupBy: mocks.participantGroupBy },
    staffMeta: { findMany: mocks.staffMetaFindMany },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET, POST } from "./route";

const GROUP = {
  id: "ckggggggggggggggggggggggg",
  batchId: "ckbbbbbbbbbbbbbbbbbbbbbbb",
  parkId: "ckppppppppppppppppppppppp",
  park: { id: "ckppppppppppppppppppppppp", cityId: "ckccccccccccccccccccccccc" },
  batch: { id: "ckbbbbbbbbbbbbbbbbbbbbbbb", startDate: new Date("2026-05-23"), endDate: new Date("2027-01-31"), cityId: "ckccccccccccccccccccccccc", park: { cityId: "ckccccccccccccccccccccccc" } },
};

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/park/attendance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ groupId: GROUP.id, title: "Weekly Session", eventDate: "2026-08-02", ...body }),
  });
}

describe("POST /api/park/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-user-1", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
  });

  it("allows a City Head to list an assigned-city park and includes city scope", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.parkFindUnique.mockResolvedValue({ id: "park-1", cityId: "city-1" });
    mocks.batchFindMany.mockResolvedValue([]);
    mocks.groupFindMany.mockResolvedValue([]);
    mocks.attendanceEventFindMany.mockResolvedValue([]);
    mocks.participantGroupBy.mockResolvedValue([]);
    mocks.staffMetaFindMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/park/attendance?parkId=park-1&date=2026-08-11"));

    expect(response.status).toBe(200);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ role: "city_head" }),
      { parkId: "park-1", cityId: "city-1" },
      expect.any(Array)
    );
  });

  it("returns 400 for invalid eventDate before querying group scope", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId: "ckggggggggggggggggggggggg",
          title: "Weekly Session",
          eventDate: "not-a-date",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });

  it("denies attendance mark capability before parsing request body", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(
      new Request("http://localhost/api/park/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });

  it("denies an unassigned Murabbi before any group lookup", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "murabbi-1", role: "murabbi", assignedGroupId: null },
    });

    const response = await POST(createRequest({}));

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
    expect(mocks.attendanceEventCreate).not.toHaveBeenCalled();
  });

  it("rejects a create date that is not a scheduled class date in the batch range", async () => {
    mocks.groupFindUnique.mockResolvedValue(GROUP);
    mocks.batchFindUnique.mockResolvedValue({
      startDate: new Date("2026-05-23"),
      endDate: new Date("2027-01-31"),
      settings: { classWeekdays: "[1]" },
      extraClassDates: [],
    });

    const response = await POST(createRequest({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Attendance can only be created for a scheduled class date inside the active batch range",
    });
    expect(mocks.attendanceEventCreate).not.toHaveBeenCalled();
  });

  it("denies an inactive group before reading its batch", async () => {
    mocks.groupFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Group not found" });
    expect(mocks.groupFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: GROUP.id, isActive: true } }));
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
    expect(mocks.attendanceEventCreate).not.toHaveBeenCalled();
  });

  it("denies an inactive batch before creating a session", async () => {
    mocks.groupFindUnique.mockResolvedValue(GROUP);
    mocks.batchFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Active batch not found for this group" });
    expect(mocks.batchFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: GROUP.batchId, isActive: true } }));
    expect(mocks.attendanceEventCreate).not.toHaveBeenCalled();
  });

  it("creates a session for a scheduled class date inside the batch range", async () => {
    mocks.groupFindUnique.mockResolvedValue(GROUP);
    mocks.batchFindUnique.mockResolvedValue({
      startDate: new Date("2026-05-23"),
      endDate: new Date("2027-01-31"),
      settings: { classWeekdays: "[0,6]" },
      extraClassDates: [],
    });
    mocks.attendanceEventFindFirst.mockResolvedValue(null);
    mocks.attendanceEventCreate.mockResolvedValue({ id: "event-1", eventDate: new Date("2026-08-02"), title: "Weekly Session" });

    const response = await POST(createRequest({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(201);
    expect(mocks.attendanceEventCreate).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/park/attendance — Murabbi scope (F-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
  });

  it("denies an unassigned Murabbi before any group DB query", async () => {
    // Explicit early guard must fire before any DB lookup.
    mocks.requireAuth.mockResolvedValue({
      user: { id: "murabbi-1", role: "murabbi", assignedGroupId: null },
    });

    const response = await GET(new Request("http://localhost/api/park/attendance"));

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it("muawin is denied attendance access even if requireAuth succeeds (must remain content-only)", async () => {
    // muawin is NOT in ATTENDANCE_ROLES — scope check must deny them.
    // This test ensures that if muawin somehow reaches the park branch,
    // requireResourceScope (which enforces ATTENDANCE_ROLES) rejects them.
    mocks.requireAuth.mockResolvedValue({
      user: { id: "muawin-1", role: "muawin", assignedParkId: "park-1" },
    });
    mocks.parkFindUnique.mockResolvedValue({ id: "park-1", cityId: "city-1" });
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new Request("http://localhost/api/park/attendance?parkId=park-1"));

    expect(response.status).toBe(403);
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });
});
