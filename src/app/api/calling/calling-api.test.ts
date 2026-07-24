import { describe, expect, it, vi } from "vitest";
import { computeValuesHmac } from "@/lib/calling/template-hmac";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import {
  createCampaignSchema,
  createTemplateSchema,
  assignLeadsSchema,
  logInteractionSchema,
  useTemplateSchema,
} from "@/lib/validations/calling";

vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: vi.fn().mockImplementation(async (user: any, cap: string) => {
    if ((user.role === "city_head" || user.role === "super_admin") && cap === "calling.poc.manage") return true;
    return false;
  }),
}));

describe("CALL-003: Core Calling Validation, Security & Authorization Matrix", () => {
  describe("1. Campaign & Template Schema Validation", () => {
    it("requires startDate <= endDate in createCampaignSchema", () => {
      const invalid = createCampaignSchema.safeParse({
        name: "Admissions Calling Campaign",
        startDate: "2026-08-10T00:00:00.000Z",
        endDate: "2026-08-01T00:00:00.000Z",
      });
      expect(invalid.success).toBe(false);

      const valid = createCampaignSchema.safeParse({
        name: "Admissions Calling Campaign",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-08-10T00:00:00.000Z",
      });
      expect(valid.success).toBe(true);
    });

    it("validates template creation fields", () => {
      const valid = createTemplateSchema.safeParse({
        title: "Welcome Calling Script",
        body: "Hello {parentName}, this is Shabab 360 calling regarding your applicant {applicantName}.",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("2. Lead Assignment Schema (Staff XOR External Caller)", () => {
    it("rejects payload with both or neither caller specified", () => {
      // Both specified -> fail
      const both = assignLeadsSchema.safeParse({
        campaignId: "c111111111111111111111111",
        applicationIds: ["c222222222222222222222222"],
        callerStaffMetaId: "c333333333333333333333333",
        callerExternalId: "c444444444444444444444444",
      });
      expect(both.success).toBe(false);

      // Neither specified -> fail
      const neither = assignLeadsSchema.safeParse({
        campaignId: "c111111111111111111111111",
        applicationIds: ["c222222222222222222222222"],
      });
      expect(neither.success).toBe(false);

      // Exactly one -> pass
      const valid = assignLeadsSchema.safeParse({
        campaignId: "c111111111111111111111111",
        applicationIds: ["c222222222222222222222222"],
        callerStaffMetaId: "c333333333333333333333333",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("3. Call Interaction Outcome Validation", () => {
    it("requires scheduledFor datetime when outcome is callback_requested", () => {
      const missingDate = logInteractionSchema.safeParse({
        assignmentId: "c111111111111111111111111",
        outcome: "callback_requested",
        notes: "Parent requested callback tomorrow afternoon",
      });
      expect(missingDate.success).toBe(false);

      const validWithDate = logInteractionSchema.safeParse({
        assignmentId: "c111111111111111111111111",
        outcome: "callback_requested",
        notes: "Parent requested callback tomorrow afternoon",
        scheduledFor: "2026-08-02T14:00:00.000Z",
      });
      expect(validWithDate.success).toBe(true);
    });
  });

  describe("4. PII-Safe Template Usage HMAC Computation", () => {
    it("computes deterministic SHA-256 HMAC for key-value inputs without exposing raw PII", () => {
      const hmac1 = computeValuesHmac({ parentName: "Ahmad", applicantName: "Bilal" });
      const hmac2 = computeValuesHmac({ applicantName: "Bilal", parentName: "Ahmad" });
      expect(hmac1).toEqual(hmac2);
      expect(hmac1.length).toBe(64); // Hex SHA-256
    });
  });

  describe("5. Calling POC & Manager Scope Resolution", () => {
    it("returns 404 when campaign is missing", async () => {
      const mockPrisma = { callingCampaign: { findUnique: vi.fn().mockResolvedValue(null) } };
      const res = await verifyCallingManagerOrPoc({ id: "u1", role: "city_head" }, "cmp_missing", mockPrisma);
      expect(res.status).toBe(404);
    });

    it("authorizes manager with calling.poc.manage capability", async () => {
      const mockCampaign = { id: "cmp_1", cityId: "city_lahore" };
      const mockPrisma = {
        callingCampaign: { findUnique: vi.fn().mockResolvedValue(mockCampaign) },
        staffMeta: { findUnique: vi.fn().mockResolvedValue({ assignedCityId: "city_lahore", isActive: true }) },
        callingPOCAssignment: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      const res = await verifyCallingManagerOrPoc({ id: "u1", role: "city_head" }, "cmp_1", mockPrisma);
      expect(res.isManager).toBe(true);
      expect(res.cityId).toBe("city_lahore");
    });
  });
});
