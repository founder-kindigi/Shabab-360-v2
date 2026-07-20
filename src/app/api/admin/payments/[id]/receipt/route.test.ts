import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  paymentFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    payment: { findUnique: mocks.paymentFindUnique },
    user: { findUnique: mocks.userFindUnique },
  },
}));

import { GET } from "./route";

const request = new NextRequest("http://localhost/api/admin/payments/payment-1/receipt");
const params = { params: Promise.resolve({ id: "payment-1" }) };

describe("payment receipt authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.paymentFindUnique.mockResolvedValue({
      id: "payment-1",
      feeEvent: { batch: { parkId: "park-1", park: { city: { id: "city-1" } } } },
      participant: { groupId: "group-1" },
    });
  });

  it("requires fees capability before loading a receipt", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(request, params);

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("fees.manage");
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled();
  });

  it("denies a receipt outside resource scope", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(request, params);

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "city-head-1" }),
      { cityId: "city-1", parkId: "park-1", groupId: "group-1" }
    );
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });
});
