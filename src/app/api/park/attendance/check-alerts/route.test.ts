import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  eventFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { findUnique: mocks.eventFindUnique },
  },
}));
vi.mock("@/lib/attendance-alerts", () => ({ checkAttendanceAlerts: vi.fn() }));

import { POST } from "./route";

describe("POST /api/park/attendance/check-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-1", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("rejects a missing eventId before querying the event", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance/check-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantId: "ckaaaaaaaaaaaaaaaaaaaaaaa" }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing participantId before querying the event", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance/check-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "ckccccccccccccccccccccccc" }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an empty body before querying the event", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance/check-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("denies attendance mark capability before parsing the request body", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(
      new Request("http://localhost/api/park/attendance/check-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });
});
