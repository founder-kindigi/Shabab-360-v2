import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  groupFindUnique: vi.fn(),
  batchFindUnique: vi.fn(),
  eventFindFirst: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    group: { findUnique: mocks.groupFindUnique },
    attendanceEvent: { findFirst: mocks.eventFindFirst, create: mocks.eventCreate },
    batch: { findMany: vi.fn(), findUnique: mocks.batchFindUnique },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

const GROUP = {
  id: "ckggggggggggggggggggggggg",
  batchId: "ckbbbbbbbbbbbbbbbbbbbbbbb",
  parkId: "ckppppppppppppppppppppppp",
  park: { id: "ckppppppppppppppppppppppp", cityId: "ckccccccccccccccccccccccc" },
  batch: { id: "ckbbbbbbbbbbbbbbbbbbbbbbb", cityId: "ckccccccccccccccccccccccc", park: { cityId: "ckccccccccccccccccccccccc" } },
};

const request = (body: Record<string, unknown>) => new Request("http://localhost/api/park/attendance/events", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ groupId: GROUP.id, title: "Park Event", eventDate: "2026-08-02", ...body }),
});

describe("POST /api/park/attendance/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-user-1", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("returns 400 for invalid eventDate before querying group scope", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId: "ckggggggggggggggggggggggg",
          title: "Park Event",
          eventDate: "bad-date",
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
      new Request("http://localhost/api/park/attendance/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });

  it("denies an unassigned Murabbi before any group lookup", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "murabbi-1", role: "murabbi", assignedGroupId: null } });

    const response = await POST(request({}));

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a create date that is not a scheduled class date in the batch range", async () => {
    mocks.groupFindUnique.mockResolvedValue(GROUP);
    mocks.batchFindUnique.mockResolvedValue({
      startDate: new Date("2026-05-23"),
      endDate: new Date("2027-01-31"),
      settings: { classWeekdays: "[1]" },
      extraClassDates: [],
    });

    const response = await POST(request({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(400);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("denies an inactive group before reading its batch", async () => {
    mocks.groupFindUnique.mockResolvedValue(null);

    const response = await POST(request({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Group not found" });
    expect(mocks.groupFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: GROUP.id, isActive: true } }));
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("denies an inactive batch before creating a session", async () => {
    mocks.groupFindUnique.mockResolvedValue(GROUP);
    mocks.batchFindUnique.mockResolvedValue(null);

    const response = await POST(request({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Active batch not found for this group" });
    expect(mocks.batchFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: GROUP.batchId, isActive: true } }));
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("creates a session for a scheduled class date inside the batch range", async () => {
    mocks.groupFindUnique.mockResolvedValue(GROUP);
    mocks.batchFindUnique.mockResolvedValue({
      startDate: new Date("2026-05-23"),
      endDate: new Date("2027-01-31"),
      settings: { classWeekdays: "[0,6]" },
      extraClassDates: [],
    });
    mocks.eventFindFirst.mockResolvedValue(null);
    mocks.eventCreate.mockResolvedValue({ id: "event-1", eventDate: new Date("2026-08-02"), title: "Park Event" });

    const response = await POST(request({ eventDate: "2026-08-02" }));

    expect(response.status).toBe(201);
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
  });
});
