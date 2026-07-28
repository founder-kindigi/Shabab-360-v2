import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  resolveMashwaraActorCity,
  resolveMashwaraAccess,
} from "./mashwara-scope";
import { db } from "@/lib/db";
import { userHasCapability } from "@/lib/auth/capability-access";

vi.mock("@/lib/db", () => ({
  db: {
    city: { findFirst: vi.fn() },
    staffMeta: { findFirst: vi.fn() },
    mashwaraMeetingShare: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: vi.fn(),
}));

describe("Mashwara Scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveMashwaraActorCity", () => {
    it("returns error if HQ user provides invalid or inactive city", async () => {
      vi.mocked(db.city.findFirst).mockResolvedValue(null);
      const user = {
        id: "hq",
        role: "super_admin" as const,
        assignedCityId: null,
      };

      const result = await resolveMashwaraActorCity(user, "invalid-city");

      expect(result).toEqual({
        error: "Requested city does not exist or is inactive",
        status: 404,
      });
      expect(db.city.findFirst).toHaveBeenCalledWith({
        where: { id: "invalid-city", isActive: true },
        select: { id: true },
      });
    });

    it("returns cityId if HQ user provides valid active city", async () => {
      vi.mocked(db.city.findFirst).mockResolvedValue({
        id: "valid-city",
      } as any);
      const user = {
        id: "hq",
        role: "program_admin" as const,
        assignedCityId: null,
      };

      const result = await resolveMashwaraActorCity(user, "valid-city");

      expect(result).toEqual({ cityId: "valid-city" });
    });
  });
});
