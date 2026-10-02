import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  parkFindUnique: vi.fn(),
  batchFindMany: vi.fn(),
  groupFindMany: vi.fn(),
  participantCount: vi.fn(),
  participantFindMany: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  attendanceEventGroupBy: vi.fn(),
  attendanceEventFindMany: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({
  db: {
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    park: { findUnique: mocks.parkFindUnique },
    batch: { findMany: mocks.batchFindMany },
    group: { findMany: mocks.groupFindMany },
    participant: { count: mocks.participantCount, findMany: mocks.participantFindMany },
    attendanceRecord: { findMany: mocks.attendanceRecordFindMany },
    attendanceEvent: { groupBy: mocks.attendanceEventGroupBy, findMany: mocks.attendanceEventFindMany },
  },
}));

import { GET } from "./route";

describe("GET /api/park/roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
  });
  it("denies roster access before querying member data", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/park/roster"));
    expect(response.status).toBe(403);
  });

  it("excludes an unassigned participant from the roster", async () => {
    mocks.requireCapability.mockResolvedValue(null);
    mocks.staffMetaFindUnique.mockResolvedValue({ role: "park_admin", assignedParkId: "park-1", assignedGroupId: null });
    mocks.parkFindUnique.mockResolvedValue({ id: "park-1", name: "Park", city: { name: "Lahore" } });
    mocks.batchFindMany.mockResolvedValue([{ id: "b-1", name: "Batch 1", groups: [{ id: "g-1", name: "Group 1" }] }]);
    mocks.groupFindMany.mockResolvedValue([{ id: "g-1" }]);
    mocks.participantCount.mockResolvedValue(1);
    mocks.participantFindMany.mockResolvedValue([
      { id: "p-assigned", name: "Assigned", phone: "0300", gender: "male", dateOfBirth: null, address: null, state: "active", joinedAt: new Date("2026-01-01"), groupId: "g-1", guardianLinks: [] },
      { id: "p-unassigned", name: "Unassigned", phone: null, gender: null, dateOfBirth: null, address: null, state: "active", joinedAt: new Date("2026-01-01"), groupId: null, guardianLinks: [] },
    ]);
    mocks.attendanceRecordFindMany.mockResolvedValue([]);
    mocks.attendanceEventGroupBy.mockResolvedValue([]);
    mocks.attendanceEventFindMany.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/park/roster"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.batches[0].groups[0].participants.map((p: any) => p.id)).toEqual(["p-assigned"]);
  });
});
