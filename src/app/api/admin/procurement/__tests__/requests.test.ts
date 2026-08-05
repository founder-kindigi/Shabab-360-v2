import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as getRequests, POST as postRequest } from "../requests/route";
import { PATCH as patchRequest } from "../requests/[id]/route";
import { GET as getOrders, POST as postOrder } from "../orders/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn() },
    park: { findUnique: vi.fn() },
    procurementItem: { findUnique: vi.fn() },
    stockRequest: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    purchaseOrder: { findMany: vi.fn(), create: vi.fn() },
    parkStock: { upsert: vi.fn() },
    receiptSequence: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  resolveActorCity: mocks.resolveActorCity,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

describe("V3-503 Stock Requests & Purchase Orders API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("GET & POST /api/admin/procurement/requests", () => {
    it("submits stock request cleanly", async () => {
      mocks.db.park.findUnique.mockResolvedValue({ id: "park_1", cityId: "city_lahore" });
      mocks.db.procurementItem.findUnique.mockResolvedValue({ id: "item_1" });
      mocks.db.stockRequest.create.mockResolvedValue({
        id: "req_1",
        parkId: "park_1",
        itemId: "item_1",
        quantity: 10,
        reason: "Need extra footballs for tournament",
        status: "pending",
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/requests", {
        method: "POST",
        body: JSON.stringify({
          parkId: "park_1",
          itemId: "item_1",
          quantity: 10,
          reason: "Need extra footballs for tournament",
        }),
      });

      const res = await postRequest(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.status).toBe("pending");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "procurement.request.create",
        })
      );
    });

    it("fulfills stock request and increments park stock atomically", async () => {
      mocks.db.stockRequest.findUnique.mockResolvedValue({
        id: "req_1",
        parkId: "park_1",
        itemId: "item_1",
        quantity: 10,
        status: "pending",
        park: { cityId: "city_lahore" },
      });
      mocks.db.$transaction.mockImplementation(async (cb: any) => cb(mocks.db));
      mocks.db.stockRequest.update.mockResolvedValue({
        id: "req_1",
        status: "fulfilled",
        notes: "Delivered to park lead",
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/requests/req_1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "fulfilled",
          notes: "Delivered to park lead",
        }),
      });

      const res = await patchRequest(req, { params: Promise.resolve({ id: "req_1" }) });
      expect(res.status).toBe(200);

      expect(mocks.db.parkStock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parkId_itemId: { parkId: "park_1", itemId: "item_1" } },
          update: { quantity: { increment: 10 } },
        })
      );
    });
  });

  describe("GET & POST /api/admin/procurement/orders", () => {
    it("issues purchase order and generates PO number cleanly", async () => {
      mocks.db.city.findUnique.mockResolvedValue({ id: "city_lahore" });
      mocks.db.park.findUnique.mockResolvedValue({ id: "park_1", cityId: "city_lahore" });
      mocks.db.procurementItem.findUnique.mockResolvedValue({ id: "item_1" });
      mocks.db.$transaction.mockImplementation(async (cb: any) => cb(mocks.db));
      mocks.db.receiptSequence.upsert.mockResolvedValue({ counter: 1 });
      mocks.db.purchaseOrder.create.mockResolvedValue({
        id: "po_1",
        poNumber: "PO-2026-0001",
        cityId: "city_lahore",
        parkId: "park_1",
        quantity: 50,
        totalCost: 75000,
        supplierName: "Sports Goods Ltd",
        status: "issued",
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/orders", {
        method: "POST",
        body: JSON.stringify({
          cityId: "city_lahore",
          parkId: "park_1",
          itemId: "item_1",
          quantity: 50,
          unitCost: 1500,
          supplierName: "Sports Goods Ltd",
        }),
      });

      const res = await postOrder(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.poNumber).toBe("PO-2026-0001");
      expect(mocks.db.parkStock.upsert).toHaveBeenCalled();
    });
  });
});
