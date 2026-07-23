import { describe, expect, it, vi } from "vitest";
import { resolveActorCity, verifyEventCityAccess, isResponsibilityActive } from "@/lib/auth/events-scope";
import { createEventSchema, updateEventSchema } from "@/lib/validations/event";
import { createResponsibilitySchema, createEventResponsibilityBodySchema } from "@/lib/validations/event-responsibility";
import { createEventTeamSchema, createPlannerItemSchema } from "@/lib/validations/event-team-planner";

describe("EVENT-007: Event Test Matrix & Security Hardening", () => {
  describe("1. HQ City Selection & Scope Resolution", () => {
    it("rejects HQ request without cityId (returns 400)", async () => {
      const mockPrisma = { city: { findUnique: vi.fn() } };
      const res = await resolveActorCity({ id: "hq_user", role: "super_admin" }, undefined, mockPrisma);
      expect(res).toEqual({ error: "HQ actor must supply a valid cityId", status: 400 });
    });

    it("rejects HQ request with malformed or non-existent cityId (returns 400)", async () => {
      const mockPrisma = { city: { findUnique: vi.fn().mockResolvedValue(null) } };
      const res = await resolveActorCity({ id: "hq_user", role: "program_admin" }, "invalid_cuid", mockPrisma);
      expect(res).toEqual({ error: "City not found or inactive", status: 400 });
    });

    it("accepts HQ request with valid active cityId", async () => {
      const mockPrisma = { city: { findUnique: vi.fn().mockResolvedValue({ id: "city_lahore", isActive: true }) } };
      const res = await resolveActorCity({ id: "hq_user", role: "super_admin" }, "city_lahore", mockPrisma);
      expect(res).toEqual({ cityId: "city_lahore", isHQ: true });
    });
  });

  describe("2. Foreign City Denial & Scoped Access", () => {
    it("denies scoped actor attempting to request a foreign city (returns 403)", async () => {
      const mockPrisma = {
        staffMeta: {
          findUnique: vi.fn().mockResolvedValue({ id: "sm_1", userId: "user_ch", assignedCityId: "city_lahore", isActive: true }),
        },
      };
      const res = await resolveActorCity({ id: "user_ch", role: "city_head" }, "city_karachi", mockPrisma);
      expect(res).toEqual({
        error: "Forbidden: requested cityId does not match actor city scope",
        status: 403,
      });
    });

    it("denies access when event cityId does not match actor scope in verifyEventCityAccess", async () => {
      const mockPrisma = {
        event: { findUnique: vi.fn().mockResolvedValue({ id: "evt_1", cityId: "city_karachi" }) },
        staffMeta: {
          findUnique: vi.fn().mockResolvedValue({ id: "sm_1", userId: "user_ch", assignedCityId: "city_lahore", isActive: true }),
        },
      };
      const res = await verifyEventCityAccess({ id: "user_ch", role: "city_head" }, "evt_1", mockPrisma);
      expect(res.status).toBe(403);
    });
  });

  describe("3. Immutable Event City Verification", () => {
    it("rejects invalid event updates or immutable cityId changes", () => {
      const updatePayload = { title: "Updated Title", cityId: "city_karachi" };
      // Zod schema with strict() strip or reject unexpected keys, or application route check
      const parsed = updateEventSchema.safeParse(updatePayload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("4. Responsibilities Parent XOR & Mandatory Expiry", () => {
    it("requires exactly one parent: eventId XOR mashwaraId", () => {
      // Both provided -> fail
      const both = createResponsibilitySchema.safeParse({
        eventId: "c111111111111111111111111",
        mashwaraId: "c222222222222222222222222",
        title: "Lead Calling POC",
        assignedToStaffMetaId: "c333333333333333333333333",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-08-10T00:00:00.000Z",
      });
      expect(both.success).toBe(false);

      // Neither provided -> fail
      const neither = createResponsibilitySchema.safeParse({
        title: "Lead Calling POC",
        assignedToStaffMetaId: "c333333333333333333333333",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-08-10T00:00:00.000Z",
      });
      expect(neither.success).toBe(false);

      // Exactly one -> pass
      const valid = createResponsibilitySchema.safeParse({
        eventId: "c111111111111111111111111",
        title: "Lead Calling POC",
        assignedToStaffMetaId: "c333333333333333333333333",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-08-10T00:00:00.000Z",
      });
      expect(valid.success).toBe(true);
    });

    it("requires mandatory endDate and endDate > startDate", () => {
      const invalidDates = createEventResponsibilityBodySchema.safeParse({
        title: "Lead Calling POC",
        assignedToStaffMetaId: "c333333333333333333333333",
        startDate: "2026-08-10T00:00:00.000Z",
        endDate: "2026-08-01T00:00:00.000Z",
      });
      expect(invalidDates.success).toBe(false);
    });

    it("evaluates active predicate correctly (isResponsibilityActive)", () => {
      const now = new Date("2026-08-05T00:00:00.000Z");

      // Active
      expect(
        isResponsibilityActive(
          { isActive: true, startDate: "2026-08-01T00:00:00.000Z", endDate: "2026-08-10T00:00:00.000Z", revokedAt: null },
          now
        )
      ).toBe(true);

      // Expired
      expect(
        isResponsibilityActive(
          { isActive: true, startDate: "2026-07-01T00:00:00.000Z", endDate: "2026-08-01T00:00:00.000Z", revokedAt: null },
          now
        )
      ).toBe(false);

      // Revoked
      expect(
        isResponsibilityActive(
          { isActive: true, startDate: "2026-08-01T00:00:00.000Z", endDate: "2026-08-10T00:00:00.000Z", revokedAt: new Date("2026-08-03T00:00:00.000Z") },
          now
        )
      ).toBe(false);
    });
  });

  describe("5. Event Schema Validations", () => {
    it("validates createEventSchema with strict types and date ranges", () => {
      const valid = createEventSchema.safeParse({
        title: "Annual Sports Gala",
        eventType: "sports_day",
        startDate: "2026-09-01T08:00:00.000Z",
        endDate: "2026-09-01T17:00:00.000Z",
        capacity: 200,
        cost: 0,
      });
      expect(valid.success).toBe(true);
    });

    it("validates createPlannerItemSchema and createEventTeamSchema", () => {
      expect(createEventTeamSchema.safeParse({ title: "Security Team" }).success).toBe(true);
      expect(createPlannerItemSchema.safeParse({ title: "Setup Sound System", priority: "high" }).success).toBe(true);
    });
  });
});
