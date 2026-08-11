import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  recordFindUnique: vi.fn(),
  recordUpdate: vi.fn(),
  staffMetaFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceRecord: {
      findUnique: mocks.recordFindUnique,
      update: mocks.recordUpdate,
    },
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { PATCH } from "./route";

describe("PATCH /api/park/attendance/[eventId]/records/[recordId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-admin", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.recordFindUnique.mockResolvedValue({
      id: "record-2",
      eventId: "event-2",
      status: "present",
      markedBy: null,
      event: { groupId: "group-2", group: { batch: { parkId: "park-2", park: { cityId: "city-2" } } } },
    });
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it("denies a cross-park attendance edit before resolving staff metadata or writing", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/park/attendance/event-2/records/record-2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "absent", editReason: "Correcting an earlier marking" }),
    }), { params: Promise.resolve({ eventId: "event-2", recordId: "record-2" }) });

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "park-admin" }),
      { cityId: "city-2", parkId: "park-2", groupId: "group-2" },
      ["super_admin", "program_admin", "city_head", "park_lead"]
    );
    expect(mocks.staffMetaFindUnique).not.toHaveBeenCalled();
    expect(mocks.recordUpdate).not.toHaveBeenCalled();
  });

  it("denies a missing correction capability before reading the record", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PATCH(new NextRequest("http://localhost/api/park/attendance/event-2/records/record-2", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "absent", editReason: "Correcting an earlier marking" }) }), { params: Promise.resolve({ eventId: "event-2", recordId: "record-2" }) });
    expect(response.status).toBe(403);
    expect(mocks.recordFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an overly long edit reason before reading the record", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/park/attendance/event-2/records/record-2", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "absent", editReason: "a".repeat(2001) }),
      }),
      { params: Promise.resolve({ eventId: "event-2", recordId: "record-2" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.recordFindUnique).not.toHaveBeenCalled();
  });
});
