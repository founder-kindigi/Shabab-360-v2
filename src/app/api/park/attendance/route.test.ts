import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  groupFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  batchFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  participantGroupBy: vi.fn(),
  staffMetaFindMany: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    group: { findUnique: mocks.groupFindUnique, findMany: mocks.groupFindMany },
    batch: { findMany: mocks.batchFindMany },
    attendanceEvent: { findFirst: vi.fn(), create: mocks.eventCreate, findMany: mocks.eventFindMany },
    participant: { groupBy: mocks.participantGroupBy },
    staffMeta: { findMany: mocks.staffMetaFindMany },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET, POST } from "./route";

describe("POST /api/park/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-user-1", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.batchFindMany.mockResolvedValue([{ id: "batch-1" }]);
    mocks.groupFindMany.mockResolvedValue([
      {
        id: "group-1",
        name: "Group 1",
        batch: {
          name: "Batch 4",
          startDate: new Date("2026-07-31T19:00:00.000Z"),
          endDate: null,
          settings: null,
        },
      },
      {
        id: "group-2",
        name: "Group 2",
        batch: {
          name: "Batch 4",
          startDate: new Date("2026-07-31T19:00:00.000Z"),
          endDate: null,
          settings: null,
        },
      },
    ]);
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.participantGroupBy.mockResolvedValue([
      { groupId: "group-1", _count: 12 },
      { groupId: "group-2", _count: 10 },
    ]);
    mocks.staffMetaFindMany.mockResolvedValue([]);
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

  it("returns every eligible group for the selected Saturday without shifting the date", async () => {
    const response = await GET(
      new Request("http://localhost/api/park/attendance?date=2026-08-08")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      date: "2026-08-08",
      events: [
        { groupId: "group-1", groupName: "Group 1", isScheduled: true, participantCount: 12 },
        { groupId: "group-2", groupName: "Group 2", isScheduled: true, participantCount: 10 },
      ],
    });
    expect(mocks.eventFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        eventDate: {
          gte: new Date("2026-08-07T19:00:00.000Z"),
          lt: new Date("2026-08-08T19:00:00.000Z"),
        },
      }),
    }));
  });

  it("returns 409 when a concurrent attendance event insert hits the database uniqueness rule", async () => {
    mocks.groupFindUnique.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      batch: { parkId: "park-1" },
    });
    mocks.eventCreate.mockRejectedValue({ code: "P2002" });

    const response = await POST(new Request("http://localhost/api/park/attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        groupId: "11111111-1111-4111-8111-111111111111",
        title: "Group 1 attendance",
        eventDate: "2026-08-01T12:00:00+05:00",
      }),
    }));

    expect(response.status).toBe(409);
  });
});
