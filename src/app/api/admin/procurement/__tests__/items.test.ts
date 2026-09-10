import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as getItems, POST as postItem } from "../items/route";
import { GET as getStock, POST as postStock } from "../stock/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    park: { findUnique: vi.fn(), updateMany: vi.fn() },
    procurementItem: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    parkStock: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() }, $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/authorize", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/auth/authorize")>(),
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  resolveActorCity: mocks.resolveActorCity,
}));

vi.mock("@/lib/audit", async (original) => ({
  ...await original<typeof import("@/lib/audit")>(),
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

describe("V3-502 Procurement Catalogue & Park Stock API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.$transaction.mockImplementation(async run => run(mocks.db));
    mocks.db.park.updateMany.mockResolvedValue({ count: 1 });
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("GET & POST /api/admin/procurement/items", () => {
    it("creates procurement catalogue item cleanly", async () => {
      mocks.db.procurementItem.findUnique.mockResolvedValue(null);
      mocks.db.procurementItem.create.mockResolvedValue({
        id: "item_1",
        sku: "SP-BALL-01",
        name: "Football (Size 5)",
        category: "sports_equipment",
        unit: "piece",
        unitCost: 1500,
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/items", {
        method: "POST", headers: { "If-Match": "new" },
        body: JSON.stringify({
          sku: "SP-BALL-01",
          name: "Football (Size 5)",
          category: "sports_equipment",
          unit: "piece",
          unitCost: 1500,
        }),
      });

      const res = await postItem(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.sku).toBe("SP-BALL-01");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "procurement.item.create",
        })
      );
    });

    it("rejects duplicate SKU creation", async () => {
      mocks.db.procurementItem.findUnique.mockResolvedValue({ id: "item_existing" });

      const req = new NextRequest("http://localhost/api/admin/procurement/items", {
        method: "POST", headers: { "If-Match": "new" },
        body: JSON.stringify({
          sku: "SP-BALL-01",
          name: "Football (Size 5)",
          category: "sports_equipment",
          unit: "piece",
          unitCost: 1500,
        }),
      });

      const res = await postItem(req);
      expect(res.status).toBe(409);
    });
  });

  describe("GET & POST /api/admin/procurement/stock", () => {
    it("sets park stock balance and safety thresholds cleanly", async () => {
      mocks.db.park.findUnique.mockResolvedValue({ id: "park_1", cityId: "city_lahore" });
      mocks.db.procurementItem.findUnique.mockResolvedValue({ id: "item_1", isActive: true });
      mocks.db.parkStock.create.mockResolvedValue({
        id: "stock_1",
        parkId: "park_1",
        itemId: "item_1",
        quantity: 20,
        minThreshold: 5,
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/stock", {
        method: "POST", headers: { "If-Match": "new" },
        body: JSON.stringify({
          parkId: "park_1",
          itemId: "item_1",
          quantity: 20,
          minThreshold: 5,
        }),
      });

      const res = await postStock(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.quantity).toBe(20);
      expect(mocks.db.auditLog.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          action: "procurement.stock.update",
        })
      );
    });
  });
});
