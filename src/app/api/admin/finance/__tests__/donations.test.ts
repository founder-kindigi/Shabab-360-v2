import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as getDonations, POST as postDonation } from "../donations/route";
import { GET as getAdjustments, POST as postAdjustment } from "../adjustments/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn() },
    park: { findUnique: vi.fn() },
    feeDonation: { findMany: vi.fn(), create: vi.fn() },
    financialAdjustment: { findMany: vi.fn(), create: vi.fn() },
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

describe("V3-501 Finance Operations — Donations & Adjustments API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("GET & POST /api/admin/finance/donations", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.requireAuth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
      const req = new NextRequest("http://localhost/api/admin/finance/donations");
      const res = await getDonations(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is restricted to a different city scope", async () => {
      mocks.resolveActorCity.mockResolvedValue("city_lahore");
      mocks.db.city.findUnique.mockResolvedValue({ id: "city_karachi" });

      const req = new NextRequest("http://localhost/api/admin/finance/donations", {
        method: "POST",
        body: JSON.stringify({
          cityId: "city_karachi",
          donorName: "Anonym Donor",
          amount: 5000,
          method: "cash",
        }),
      });

      const res = await postDonation(req);
      expect(res.status).toBe(403);
    });

    it("records new donation and generates receipt number cleanly", async () => {
      mocks.db.city.findUnique.mockResolvedValue({ id: "city_lahore" });
      mocks.db.$transaction.mockImplementation(async (cb: any) => {
        return cb(mocks.db);
      });
      mocks.db.receiptSequence.upsert.mockResolvedValue({ counter: 1 });
      mocks.db.feeDonation.create.mockResolvedValue({
        id: "don_1",
        cityId: "city_lahore",
        donorName: "Ahmad Raza",
        amount: 10000,
        receiptNo: "DON-2026-0001",
      });

      const req = new NextRequest("http://localhost/api/admin/finance/donations", {
        method: "POST",
        body: JSON.stringify({
          cityId: "city_lahore",
          donorName: "Ahmad Raza",
          amount: 10000,
          method: "online",
          purpose: "Youth Sports Gear",
        }),
      });

      const res = await postDonation(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.receiptNo).toBe("DON-2026-0001");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "financial.donation.create",
          entityId: "don_1",
        })
      );
    });
  });

  describe("GET & POST /api/admin/finance/adjustments", () => {
    it("creates financial credit/debit adjustment cleanly", async () => {
      mocks.db.city.findUnique.mockResolvedValue({ id: "city_lahore" });
      mocks.db.financialAdjustment.create.mockResolvedValue({
        id: "adj_1",
        cityId: "city_lahore",
        type: "credit",
        amount: 2500,
        category: "grant",
        reason: "Annual Park Sports Grant",
      });

      const req = new NextRequest("http://localhost/api/admin/finance/adjustments", {
        method: "POST",
        body: JSON.stringify({
          cityId: "city_lahore",
          type: "credit",
          amount: 2500,
          category: "grant",
          reason: "Annual Park Sports Grant",
        }),
      });

      const res = await postAdjustment(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.id).toBe("adj_1");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "financial.adjustment.create",
        })
      );
    });
  });
});
