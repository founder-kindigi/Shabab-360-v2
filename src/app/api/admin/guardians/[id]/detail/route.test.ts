import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  canAccessResourceScope: vi.fn(),
  guardianFindUnique: vi.fn(),
  feeEventFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  canAccessResourceScope: mocks.canAccessResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    guardian: { findUnique: mocks.guardianFindUnique },
    feeEvent: { findMany: mocks.feeEventFindMany },
    payment: { findMany: mocks.paymentFindMany },
  },
}));

import { GET } from "./route";

describe("GET /api/admin/guardians/[id]/detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({
      user: { id: "murabbi", role: "murabbi", assignedGroupId: "group-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.guardianFindUnique.mockResolvedValue({
      id: "guardian-2",
      children: [{
        participantId: "student-2",
        participant: {
          group: { id: "group-2", batchId: "batch-2", batch: { parkId: "park-2", park: { cityId: "city-2" } } },
        },
      }],
    });
    mocks.canAccessResourceScope.mockReturnValue(false);
  });

  it("denies a guardian when any linked child is outside staff scope", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/guardians/guardian-2/detail"), {
      params: Promise.resolve({ id: "guardian-2" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.canAccessResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "murabbi" }),
      { cityId: "city-2", parkId: "park-2", groupId: "group-2" }
    );
    expect(mocks.feeEventFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });

  it("denies guardian management before loading family history", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/guardians/guardian-2/detail"), {
      params: Promise.resolve({ id: "guardian-2" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.guardianFindUnique).not.toHaveBeenCalled();
  });
});
