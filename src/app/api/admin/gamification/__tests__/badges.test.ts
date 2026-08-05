import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getBadges, POST as postBadge } from "../../../gamification/badges/route";
import { POST as checkBadges } from "../../../gamification/badges/check/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    badge: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    participant: { findUnique: vi.fn() },
    studentBadge: { create: vi.fn() },
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

describe("V3-602 Gamification Badges & Milestone Unlock API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue(null);
  });

  describe("POST /api/gamification/badges", () => {
    it("creates new achievement badge cleanly", async () => {
      mocks.db.badge.findUnique.mockResolvedValue(null);
      mocks.db.badge.create.mockResolvedValue({
        id: "badge_1",
        code: "ATT-100",
        name: "Century Scholar",
        description: "Awarded for 100 attendance points",
        category: "attendance",
        requiredPoints: 100,
      });

      const req = new NextRequest("http://localhost/api/gamification/badges", {
        method: "POST",
        body: JSON.stringify({
          code: "ATT-100",
          name: "Century Scholar",
          description: "Awarded for 100 attendance points",
          category: "attendance",
          requiredPoints: 100,
        }),
      });

      const res = await postBadge(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.code).toBe("ATT-100");
    });
  });

  describe("POST /api/gamification/badges/check", () => {
    it("evaluates student points and unlocks eligible badges automatically", async () => {
      mocks.db.participant.findUnique.mockResolvedValue({
        id: "std_1",
        name: "Ali Ahmed",
        group: { park: { cityId: "city_lahore" } },
        unlockedBadges: [],
        pointTransactions: [{ points: 120 }], // 120 total points
      });

      mocks.db.badge.findMany.mockResolvedValue([
        { id: "badge_1", code: "ATT-100", name: "Century Scholar", requiredPoints: 100 },
      ]);

      mocks.db.$transaction.mockImplementation(async (cb: any) => cb(mocks.db));
      mocks.db.studentBadge.create.mockResolvedValue({
        id: "sb_1",
        studentId: "std_1",
        badgeId: "badge_1",
        badge: { id: "badge_1", code: "ATT-100", name: "Century Scholar" },
      });

      const req = new NextRequest("http://localhost/api/gamification/badges/check", {
        method: "POST",
        body: JSON.stringify({ studentId: "std_1" }),
      });

      const res = await checkBadges(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.newlyUnlockedCount).toBe(1);
      expect(data.newlyUnlockedBadges[0].code).toBe("ATT-100");
    });
  });
});
