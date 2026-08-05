import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST as postTransfer } from "../../procurement/transfers/route";
import { POST as postAudit } from "../../procurement/audit/route";
import { GET as getReconciliation } from "../reconciliation/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn() },
    park: { findUnique: vi.fn() },
    procurementItem: { findUnique: vi.fn() },
    parkStock: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    stockTransfer: { create: vi.fn() },
    stockAuditLog: { create: vi.fn() },
    payment: { findMany: vi.fn() },
    feeDonation: { findMany: vi.fn() },
    financialAdjustment: { findMany: vi.fn() },
    purchaseOrder: { findMany: vi.fn() },
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

describe("V3-504 Inter-Park Transfers, Physical Audits & Reconciled Financial Reporting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("POST /api/admin/procurement/transfers", () => {
    it("transfers stock between parks atomically and updates balances", async () => {
      mocks.db.park.findUnique
        .mockResolvedValueOnce({ id: "park_1", cityId: "city_lahore" })
        .mockResolvedValueOnce({ id: "park_2", cityId: "city_lahore" });

      mocks.db.parkStock.findUnique.mockResolvedValue({
        id: "stock_1",
        parkId: "park_1",
        itemId: "item_1",
        quantity: 15,
      });

      mocks.db.$transaction.mockImplementation(async (cb: any) => cb(mocks.db));
      mocks.db.stockTransfer.create.mockResolvedValue({
        id: "trans_1",
        fromParkId: "park_1",
        toParkId: "park_2",
        itemId: "item_1",
        quantity: 5,
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromParkId: "park_1",
          toParkId: "park_2",
          itemId: "item_1",
          quantity: 5,
          reason: "Reallocating equipment for event",
        }),
      });

      const res = await postTransfer(req);
      expect(res.status).toBe(201);

      expect(mocks.db.parkStock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parkId_itemId: { parkId: "park_1", itemId: "item_1" } },
          data: { quantity: { decrement: 5 } },
        })
      );
      expect(mocks.db.parkStock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parkId_itemId: { parkId: "park_2", itemId: "item_1" } },
          update: { quantity: { increment: 5 } },
        })
      );
    });

    it("rejects transfer when source park has insufficient stock", async () => {
      mocks.db.park.findUnique
        .mockResolvedValueOnce({ id: "park_1", cityId: "city_lahore" })
        .mockResolvedValueOnce({ id: "park_2", cityId: "city_lahore" });

      mocks.db.parkStock.findUnique.mockResolvedValue({
        id: "stock_1",
        parkId: "park_1",
        itemId: "item_1",
        quantity: 2, // only 2 available
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromParkId: "park_1",
          toParkId: "park_2",
          itemId: "item_1",
          quantity: 10,
        }),
      });

      const res = await postTransfer(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Insufficient stock");
    });
  });

  describe("POST /api/admin/procurement/audit", () => {
    it("records physical count audit and reconciles discrepancy", async () => {
      mocks.db.park.findUnique.mockResolvedValue({ id: "park_1", cityId: "city_lahore" });
      mocks.db.procurementItem.findUnique.mockResolvedValue({ id: "item_1" });
      mocks.db.parkStock.findUnique.mockResolvedValue({ quantity: 20 });
      mocks.db.$transaction.mockImplementation(async (cb: any) => cb(mocks.db));

      mocks.db.stockAuditLog.create.mockResolvedValue({
        id: "audit_1",
        parkId: "park_1",
        itemId: "item_1",
        systemCount: 20,
        actualCount: 18,
        discrepancy: -2,
        reason: "2 damaged items discarded",
      });

      const req = new NextRequest("http://localhost/api/admin/procurement/audit", {
        method: "POST",
        body: JSON.stringify({
          parkId: "park_1",
          itemId: "item_1",
          actualCount: 18,
          reason: "2 damaged items discarded",
        }),
      });

      const res = await postAudit(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.discrepancy).toBe(-2);
    });
  });

  describe("GET /api/admin/finance/reconciliation", () => {
    it("calculates exact reconciled financial totals and net balance", async () => {
      mocks.db.payment.findMany.mockResolvedValue([
        { amount: 5000, waivedAmount: 1000 },
        { amount: 3000, waivedAmount: 0 },
      ]);
      mocks.db.feeDonation.findMany.mockResolvedValue([
        { amount: 2000 },
      ]);
      mocks.db.financialAdjustment.findMany.mockResolvedValue([
        { type: "credit", amount: 500 },
        { type: "debit", amount: 200 },
      ]);
      mocks.db.purchaseOrder.findMany.mockResolvedValue([
        { totalCost: 4000, status: "issued" },
        { totalCost: 1000, status: "cancelled" }, // cancelled PO excluded
      ]);

      const req = new NextRequest("http://localhost/api/admin/finance/reconciliation?cityId=city_lahore");
      const res = await getReconciliation(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.summary.feesCollected).toBe(8000);
      expect(data.summary.feeWaivers).toBe(1000);
      expect(data.summary.donationsCollected).toBe(2000);
      expect(data.summary.creditsAdjusted).toBe(500);
      expect(data.summary.debitsAdjusted).toBe(200);
      expect(data.summary.procurementExpenses).toBe(4000);
      expect(data.summary.grossRevenue).toBe(10500); // 8000 + 2000 + 500
      expect(data.summary.grossExpenses).toBe(4200); // 200 + 4000
      expect(data.summary.netBalance).toBe(6300); // 10500 - 4200
    });
  });
});
