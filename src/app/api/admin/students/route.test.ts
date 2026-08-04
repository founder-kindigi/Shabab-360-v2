import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
}));
vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireCapability: mocks.requireCapability, requireAuth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    participant: { findMany: mocks.findMany, count: mocks.count },
    attendanceRecord: { groupBy: mocks.groupBy },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET } from "./route";

describe("GET /api/admin/students", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockResolvedValue(null); });
  it("denies student management before querying participants", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/students"));
    expect(response.status).toBe(403);
  });

  it("uses grouped attendance counts instead of loading record rows for the student page", async () => {
    mocks.requireCapability.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([
      {
        id: "student-1", userId: null, name: "Ali", phone: null, gender: null,
        dateOfBirth: null, age: null, gradeClass: null, state: "active",
        joinedAt: new Date("2026-07-01"), createdAt: new Date("2026-07-01"),
        group: null, guardianLinks: [],
      },
    ]);
    mocks.count.mockResolvedValue(1);
    mocks.groupBy.mockResolvedValue([
      { participantId: "student-1", status: "present", _count: { _all: 3 } },
      { participantId: "student-1", status: "absent", _count: { _all: 1 } },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/admin/students"));

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.not.objectContaining({ attendanceRecords: expect.anything() }),
    }));
    expect(mocks.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ["participantId", "status"],
      where: expect.objectContaining({ participantId: { in: ["student-1"] } }),
    }));
    const body = await response.json();
    expect(body.data[0]).toMatchObject({ attendanceTotal: 4, attendancePresent: 3, attendanceRate: 75, group: null });
  });
});
