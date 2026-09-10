import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getPoints, POST as postPoints } from "../points/route";
import { GET as getStudentPoints } from "../../students/[id]/points/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
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
  requireResourceScope: mocks.requireResourceScope,
  resolveActorCity: mocks.resolveActorCity,
  isHqRole: (role: string) => ["super_admin", "program_admin"].includes(role),
  isStaffRole: (role: string) => ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"].includes(role),
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
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("POST /api/admin/gamification/points", () => {
    it("does not expose a point-award write until an approved policy exists", async () => {
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
      expect(res.status).toBe(503);
      expect(mocks.db.pointTransaction.create).not.toHaveBeenCalled();
      expect(mocks.logAudit).not.toHaveBeenCalled();
    });

    it("does not parse or write a zero-point request while awards are unavailable", async () => {
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
      expect(res.status).toBe(503);
      expect(mocks.db.pointTransaction.create).not.toHaveBeenCalled();
    });

    it("does not let a student use the default students.manage capability to award points", async () => {
      mocks.requireAuth.mockResolvedValue({ user: { id: "student-1", role: "student" } });
      const res = await postPoints(new NextRequest("http://localhost/api/admin/gamification/points", {
        method: "POST",
        body: JSON.stringify({ studentId: "student-2", points: 50, category: "manual_bonus", reason: "Synthetic attempt" }),
      }));

      expect(res.status).toBe(503);
      expect(mocks.db.pointTransaction.create).not.toHaveBeenCalled();
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
