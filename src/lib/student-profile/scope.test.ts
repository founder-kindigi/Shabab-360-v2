import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveActorCity, canAccessParticipantProfile } from "./scope";
import { db } from "@/lib/db";
import { SessionUser } from "@/lib/auth/scope";

vi.mock("@/lib/db", () => ({
  db: {
    staffMeta: { findUnique: vi.fn() },
    park: { findUnique: vi.fn() },
    group: { findUnique: vi.fn() },
    participant: { findUnique: vi.fn() },
    city: { findUnique: vi.fn() },
    guardianChild: { findFirst: vi.fn() },
  },
}));

describe("Student Profile Scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveActorCity", () => {
    it("returns null for inactive StaffMeta", async () => {
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedCityId: "city-1",
        assignedParkId: null,
        assignedGroupId: null,
        isActive: false,
      } as any);

      const user = { id: "staff-1", role: "city_head" } as SessionUser;
      const result = await resolveActorCity(user, "city-1");
      expect(result).toBeNull();
    });

    it("returns cityId for active StaffMeta", async () => {
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedCityId: "city-1",
        assignedParkId: null,
        assignedGroupId: null,
        isActive: true,
      } as any);

      const user = { id: "staff-1", role: "city_head" } as SessionUser;
      const result = await resolveActorCity(user, "city-1");
      expect(result).toBe("city-1");
    });
  });

  describe("canAccessParticipantProfile", () => {
    it("Park Lead own park 200, sibling park 403, and stale session cannot override DB", async () => {
      // 1. Participant is in park-1
      vi.mocked(db.participant.findUnique).mockResolvedValue({
        userId: "student-1",
        groupId: "group-1",
        group: {
          parkId: "park-1",
          batch: { cityId: "city-1", parkId: "park-1" },
        },
      } as any);

      const user = {
        id: "staff-1",
        role: "park_lead",
        // The session says park-1, but the DB might say otherwise (stale session)
        assignedParkId: "park-1",
      } as SessionUser;

      // Sibling park in DB -> 403
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedParkId: "park-2", // Sibling park
        assignedGroupId: null,
        isActive: true,
      } as any);

      const access1 = await canAccessParticipantProfile(user, "p-1", "city-1");
      expect(access1).toBe(false);

      // Own park in DB -> 200
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedParkId: "park-1", // Own park
        assignedGroupId: null,
        isActive: true,
      } as any);

      const access2 = await canAccessParticipantProfile(user, "p-1", "city-1");
      expect(access2).toBe(true);
    });

    it("Murabbi own group 200, sibling group 403", async () => {
      vi.mocked(db.participant.findUnique).mockResolvedValue({
        userId: "student-1",
        groupId: "group-1",
        group: {
          parkId: "park-1",
          batch: { cityId: "city-1", parkId: "park-1" },
        },
      } as any);

      const user = {
        id: "staff-1",
        role: "murabbi",
        assignedGroupId: "group-1",
      } as SessionUser;

      // Sibling group -> 403
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedParkId: "park-1",
        assignedGroupId: "group-2",
        isActive: true,
      } as any);

      const access1 = await canAccessParticipantProfile(user, "p-1", "city-1");
      expect(access1).toBe(false);

      // Own group -> 200
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedParkId: "park-1",
        assignedGroupId: "group-1",
        isActive: true,
      } as any);

      const access2 = await canAccessParticipantProfile(user, "p-1", "city-1");
      expect(access2).toBe(true);
    });

    it("denies access for inactive StaffMeta (403)", async () => {
      vi.mocked(db.participant.findUnique).mockResolvedValue({
        userId: "student-1",
        groupId: "group-1",
        group: {
          parkId: "park-1",
          batch: { cityId: "city-1", parkId: "park-1" },
        },
      } as any);

      const user = {
        id: "staff-1",
        role: "murabbi",
      } as SessionUser;

      vi.mocked(db.staffMeta.findUnique).mockResolvedValue({
        assignedParkId: "park-1",
        assignedGroupId: "group-1",
        isActive: false, // inactive
      } as any);

      const access = await canAccessParticipantProfile(user, "p-1", "city-1");
      expect(access).toBe(false);
    });
  });
});
