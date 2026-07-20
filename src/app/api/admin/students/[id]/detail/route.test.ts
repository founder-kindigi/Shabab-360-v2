import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  participantFindUnique: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  feeEventFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    participant: { findUnique: mocks.participantFindUnique },
    attendanceRecord: { findMany: mocks.attendanceRecordFindMany },
    feeEvent: { findMany: mocks.feeEventFindMany },
    payment: { findMany: mocks.paymentFindMany },
    user: { findMany: mocks.userFindMany },
  },
}));

import { GET } from "./route";

describe("GET /api/admin/students/[id]/detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({
      user: { id: "murabbi", role: "murabbi", assignedGroupId: "group-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.participantFindUnique.mockResolvedValue({
      id: "student-2",
      groupId: "group-2",
      group: { batchId: "batch-2", batch: { parkId: "park-2", park: { cityId: "city-2" } } },
    });
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it("does not expose attendance or payment history across group scope", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/students/student-2/detail"), {
      params: Promise.resolve({ id: "student-2" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "murabbi" }),
      { cityId: "city-2", parkId: "park-2", groupId: "group-2" }
    );
    expect(mocks.attendanceRecordFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });

  it("denies student management before loading personal history", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/students/student-2/detail"), {
      params: Promise.resolve({ id: "student-2" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.participantFindUnique).not.toHaveBeenCalled();
  });
});
