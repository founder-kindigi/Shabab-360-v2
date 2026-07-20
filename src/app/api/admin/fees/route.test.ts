import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  feeEvent: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  payment: {
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  group: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    feeEvent: mocks.feeEvent,
    payment: mocks.payment,
    group: mocks.group,
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET } from "./route";

const pageFeeEvent = {
  id: "fee-1",
  batchId: "batch-1",
  title: "Monthly tuition",
  feeType: "tuition",
  amount: 100,
  dueDate: null,
  isActive: true,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  batch: {
    id: "batch-1",
    name: "Batch 1",
    park: { id: "park-1", name: "Park 1", city: { id: "city-1", name: "City 1" } },
  },
};

function request(query = "") {
  return new NextRequest(`http://localhost/api/admin/fees${query}`);
}

describe("GET /api/admin/fees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.feeEvent.findMany.mockResolvedValue([pageFeeEvent]);
    mocks.feeEvent.groupBy.mockResolvedValue([
      { batchId: "batch-1", _count: { _all: 1 }, _sum: { amount: 100 } },
    ]);
    mocks.payment.aggregate.mockResolvedValue({ _sum: { amount: 75 } });
    mocks.group.findMany.mockResolvedValue([
      { batchId: "batch-1", _count: { participants: 3 } },
    ]);
    mocks.payment.groupBy.mockResolvedValue([
      { feeEventId: "fee-1", _count: { _all: 2 }, _sum: { amount: 75 } },
    ]);
  });

  it("uses bounded page data and database aggregates instead of loading all related records", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: [{ id: "fee-1", totalPaid: 75, totalExpected: 300, paidCount: 2 }],
      pagination: { page: 1, limit: 20, total: 1 },
      summary: { totalFeeEvents: 1, totalExpected: 300, totalCollected: 75 },
    });
    expect(mocks.feeEvent.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.feeEvent.findMany.mock.calls[0][0]).toMatchObject({
      skip: 0,
      take: 20,
      select: { batch: expect.any(Object) },
    });
    expect(mocks.feeEvent.findMany.mock.calls[0][0].select.payments).toBeUndefined();
    expect(mocks.feeEvent.groupBy).toHaveBeenCalledWith({
      by: ["batchId"],
      where: { isActive: true },
      _count: { _all: true },
      _sum: { amount: true },
    });
    expect(mocks.payment.aggregate).toHaveBeenCalledWith({
      where: { feeEvent: { is: { isActive: true } } },
      _sum: { amount: true },
    });
  });

  it("denies fee access before querying financial records", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.feeEvent.findMany).not.toHaveBeenCalled();
    expect(mocks.feeEvent.groupBy).not.toHaveBeenCalled();
  });

  it("keeps the all-status summary aligned with the list results", async () => {
    mocks.feeEvent.groupBy.mockResolvedValue([
      { batchId: "batch-1", _count: { _all: 1 }, _sum: { amount: 100 } },
      { batchId: "batch-2", _count: { _all: 1 }, _sum: { amount: 200 } },
    ]);
    mocks.group.findMany.mockResolvedValue([
      { batchId: "batch-1", _count: { participants: 2 } },
      { batchId: "batch-2", _count: { participants: 4 } },
    ]);
    mocks.payment.aggregate.mockResolvedValue({ _sum: { amount: 350 } });

    const response = await GET(request("?status=all"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toEqual({
      totalFeeEvents: 2,
      totalExpected: 1_000,
      totalCollected: 350,
      collectionRate: 35,
    });
    expect(mocks.feeEvent.groupBy.mock.calls[0][0].where).toEqual({});
    expect(mocks.payment.aggregate.mock.calls[0][0].where).toEqual({ feeEvent: { is: {} } });
  });

  it("validates pagination before issuing database queries", async () => {
    const response = await GET(request("?page=0"));

    expect(response.status).toBe(400);
    expect(mocks.feeEvent.findMany).not.toHaveBeenCalled();
    expect(mocks.feeEvent.groupBy).not.toHaveBeenCalled();
  });

  it("keeps city and park filters together when both are supplied", async () => {
    await GET(request("?cityId=city-1&parkId=park-1"));

    expect(mocks.feeEvent.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      batch: { park: { cityId: "city-1", id: "park-1" } },
    });
  });
});
