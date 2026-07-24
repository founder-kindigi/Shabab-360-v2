import { describe, expect, it, vi } from "vitest";
import { resolveActorCity, verifyEventCityAccess } from "./events-scope";

describe("resolveActorCity & verifyEventCityAccess", () => {
  const mockCity = { id: "city_lahore", name: "Lahore", isActive: true };

  it("returns 400 when HQ actor does not supply cityId", async () => {
    const mockPrisma = {
      city: { findUnique: vi.fn() },
    };
    const result = await resolveActorCity(
      { id: "user_hq", role: "super_admin" },
      undefined,
      mockPrisma
    );
    expect(result).toEqual({ error: "HQ actor must supply a valid cityId", status: 400 });
  });

  it("returns 400 when HQ actor supplies non-existent or inactive cityId", async () => {
    const mockPrisma = {
      city: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const result = await resolveActorCity(
      { id: "user_hq", role: "program_admin" },
      "city_invalid",
      mockPrisma
    );
    expect(result).toEqual({ error: "City not found or inactive", status: 400 });
  });

  it("returns resolved city for HQ actor with valid cityId", async () => {
    const mockPrisma = {
      city: { findUnique: vi.fn().mockResolvedValue(mockCity) },
    };
    const result = await resolveActorCity(
      { id: "user_hq", role: "super_admin" },
      "city_lahore",
      mockPrisma
    );
    expect(result).toEqual({ cityId: "city_lahore", isHQ: true });
  });

  it("returns 403 when scoped actor has no staff assignment", async () => {
    const mockPrisma = {
      staffMeta: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const result = await resolveActorCity(
      { id: "user_ch", role: "city_head" },
      undefined,
      mockPrisma
    );
    expect(result).toEqual({ error: "Actor staff assignment is inactive or missing", status: 403 });
  });

  it("returns 403 when scoped actor requests a foreign cityId", async () => {
    const mockPrisma = {
      staffMeta: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sm_1",
          userId: "user_ch",
          assignedCityId: "city_lahore",
          isActive: true,
        }),
      },
    };
    const result = await resolveActorCity(
      { id: "user_ch", role: "city_head" },
      "city_karachi",
      mockPrisma
    );
    expect(result).toEqual({
      error: "Forbidden: requested cityId does not match actor city scope",
      status: 403,
    });
  });

  it("returns resolved derived city for scoped actor when valid or matching", async () => {
    const mockPrisma = {
      staffMeta: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sm_1",
          userId: "user_ch",
          assignedCityId: "city_lahore",
          isActive: true,
        }),
      },
    };
    const result = await resolveActorCity(
      { id: "user_ch", role: "city_head" },
      "city_lahore",
      mockPrisma
    );
    expect(result).toEqual({ cityId: "city_lahore", isHQ: false });
  });

  it("verifyEventCityAccess returns 404 for missing event", async () => {
    const mockPrisma = {
      event: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const result = await verifyEventCityAccess(
      { id: "user_hq", role: "super_admin" },
      "event_missing",
      mockPrisma
    );
    expect(result).toEqual({ error: "Event not found", status: 404, event: null });
  });

  it("verifyEventCityAccess returns 403 for cross-city event access", async () => {
    const mockPrisma = {
      event: { findUnique: vi.fn().mockResolvedValue({ id: "event_1", cityId: "city_karachi" }) },
      staffMeta: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sm_1",
          userId: "user_ch",
          assignedCityId: "city_lahore",
          isActive: true,
        }),
      },
    };
    const result = await verifyEventCityAccess(
      { id: "user_ch", role: "city_head" },
      "event_1",
      mockPrisma
    );
    expect(result.status).toBe(403);
    expect(result.error).toContain("Forbidden");
  });
});
