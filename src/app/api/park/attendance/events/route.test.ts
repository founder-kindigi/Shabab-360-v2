import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  groupFindUnique: vi.fn(),
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
    attendanceEvent: { findFirst: vi.fn(), create: vi.fn() },
    batch: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

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

  it("rejects unknown event fields before querying group scope", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId: "ckggggggggggggggggggggggg",
          title: "Park Event",
          clientSuppliedCityId: "foreign-city",
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
});
