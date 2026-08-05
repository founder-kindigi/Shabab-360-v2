import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getPoints, POST as postPoints } from "../points/route";
import { GET as getStudentPoints } from "../../students/[id]/points/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    participant: { findUnique: vi.fn() },
    pointTransaction: { findMany: vi.fn(), create: vi.fn() },
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

describe("V3-601 Gamification Engine & Student Points Ledger API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_murabbi", role: "murabbi" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("POST /api/admin/gamification/points", () => {
    it("awards points to student cleanly and logs audit", async () => {
      mocks.db.participant.findUnique.mockResolvedValue({
        id: "std_1",
        name: "Ali Ahmed",
        group: { park: { cityId: "city_lahore" } },
      });

      mocks.db.pointTransaction.create.mockResolvedValue({
        id: "pts_1",
        studentId: "std_1",
        points: 50,
        category: "attendance",
        reason: "Perfect monthly attendance bonus",
        awardedBy: "usr_murabbi",
      });

      const req = new NextRequest("http://localhost/api/admin/gamification/points", {
        method: "POST",
        body: JSON.stringify({
          studentId: "std_1",
          points: 50,
          category: "attendance",
          reason: "Perfect monthly attendance bonus",
        }),
      });

      const res = await postPoints(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.points).toBe(50);
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "gamification.points.award",
        })
      );
    });

    it("rejects zero point awards", async () => {
      const req = new NextRequest("http://localhost/api/admin/gamification/points", {
        method: "POST",
        body: JSON.stringify({
          studentId: "std_1",
          points: 0,
          category: "attendance",
          reason: "Zero test",
        }),
      });

      const res = await postPoints(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/admin/students/[id]/points", () => {
    it("calculates student total point balance correctly", async () => {
      mocks.db.participant.findUnique.mockResolvedValue({
        id: "std_1",
        name: "Ali Ahmed",
        group: { park: { cityId: "city_lahore" } },
      });

      mocks.db.pointTransaction.findMany.mockResolvedValue([
        { id: "p1", points: 50, category: "attendance" },
        { id: "p2", points: 30, category: "quiz" },
        { id: "p3", points: -10, category: "conduct" },
      ]);

      const req = new NextRequest("http://localhost/api/admin/students/std_1/points");
      const res = await getStudentPoints(req, { params: Promise.resolve({ id: "std_1" }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalPoints).toBe(70); // 50 + 30 - 10
      expect(data.transactionCount).toBe(3);
    });
  });
});
