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

  it("denies a scoped caller when any linked child is unassigned", async () => {
    mocks.guardianFindUnique.mockResolvedValue({
      id: "guardian-3",
      children: [{
        participantId: "student-3",
        relation: null,
        participant: {
          id: "student-3", name: "Unassigned", phone: null, gender: null, state: "active",
          joinedAt: new Date("2026-01-01T00:00:00.000Z"), group: null,
        },
      }],
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/guardians/guardian-3/detail"), {
      params: Promise.resolve({ id: "guardian-3" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.canAccessResourceScope).not.toHaveBeenCalled();
    expect(mocks.feeEventFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });

  it("returns an unassigned child with a null group and excludes it from fee totals for central staff", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "central-1", role: "super_admin" } });
    mocks.canAccessResourceScope.mockReturnValue(true);
    mocks.guardianFindUnique.mockResolvedValue({
      id: "guardian-4",
      name: "Guardian",
      phone: "0300",
      cnic: null,
      address: null,
      isActive: true,
      user: null,
      children: [
        {
          participantId: "student-assigned",
          relation: "father",
          participant: {
            id: "student-assigned", name: "Assigned Child", phone: "0301", gender: "male", state: "active",
            joinedAt: new Date("2026-01-01T00:00:00.000Z"),
            group: {
              id: "group-a", name: "Group A", batchId: "batch-a",
              batch: { id: "batch-a", name: "Batch A", parkId: "park-a", park: { id: "park-a", name: "Park A", cityId: "city-a", city: { id: "city-a", name: "City A" } } },
            },
          },
        },
        {
          participantId: "student-unassigned",
          relation: "mother",
          participant: {
            id: "student-unassigned", name: "Unassigned Child", phone: null, gender: null, state: "active",
            joinedAt: new Date("2026-02-01T00:00:00.000Z"), group: null,
          },
        },
      ],
    });
    mocks.feeEventFindMany.mockResolvedValue([{ id: "fee-1", amount: 100, dueDate: new Date("2025-01-01T00:00:00.000Z") }]);
    mocks.paymentFindMany.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/admin/guardians/guardian-4/detail"), {
      params: Promise.resolve({ id: "guardian-4" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.guardian.children).toHaveLength(2);
    expect(body.guardian.children[0].group.id).toBe("group-a");
    expect(body.guardian.children[1].group).toBeNull();
    // Only the assigned child's batch is queried and counted for fees.
    expect(mocks.canAccessResourceScope).toHaveBeenCalledTimes(1);
    expect(mocks.feeEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ batchId: { in: ["batch-a"] } }) })
    );
    expect(body.feeSummary.totalExpected).toBe(100);
    expect(body.feeSummary.overdueFees).toBe(1);
    expect(body.feeSummary.totalChildren).toBe(2);
  });
});
