import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { computeValuesHmac } from "@/lib/calling/template-hmac";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import {
  createCampaignSchema,
  createTemplateSchema,
  assignLeadsSchema,
  logInteractionSchema,
  useTemplateSchema,
  updateCampaignSchema,
  isValidTemplateTransition,
  ALLOWED_MERGE_VARIABLES,
} from "@/lib/validations/calling";
import { resolveActorCity } from "@/lib/auth/events-scope";

// ── Module mocks ──────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  callingTemplate: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  callingCampaign: { findUnique: vi.fn() },
  callingAssignment: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  callInteraction: { create: vi.fn() },
  externalSupportCaller: { findFirst: vi.fn(), findUnique: vi.fn() },
  staffMeta: { findFirst: vi.fn(), findUnique: vi.fn() },
  admissionApplication: { findMany: vi.fn() },
  callingTemplateUse: { create: vi.fn() },
  callingPOCAssignment: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  city: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
}));
vi.mock("@/lib/calling/poc-auth", () => ({
  verifyCallingManagerOrPoc: vi.fn(),
}));
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: vi.fn().mockImplementation(async (user: any, cap: string) => {
    if ((user.role === "city_head" || user.role === "super_admin") && cap === "calling.poc.manage") return true;
    if ((user.role === "city_head" || user.role === "super_admin") && cap === "calling.view") return true;
    if ((user.role === "super_admin") && cap === "calling.templates.manage") return true;
    return false;
  }),
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
  createAuditLogData: vi.fn().mockReturnValue({}),
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));

// Prisma client error class is used by the assignment route for concurrency guard.
// Spy the constructor so it can be instantiated in tests.
import { Prisma } from "@prisma/client";

import * as auth from "@/lib/auth/authorize";
import * as callingAuth from "@/lib/calling/poc-auth";

const CITY_HEAD = { id: "u1", role: "city_head" };
const CAMPAIGN = { id: "cmp_1", cityId: "city_lhr" };
const ASSIGNMENT = {
  id: "a1", campaignId: "cmp_1", applicationId: "app_1",
  callerStaffMetaId: "sm1", callerExternalId: null,
  isActive: true, status: "pending",
  campaign: { id: "cmp_1", cityId: "city_lhr" },
};
const TEMPLATE_APPROVED = {
  id: "t1", cityId: "city_lhr", campaignId: null,
  status: "approved", version: 1, title: "Script", body: "...",
};

beforeEach(() => {
  // Reset all mockDb functions (these are vi.fn() from vi.hoisted)
  for (const key of Object.keys(mockDb)) {
    const val = (mockDb as any)[key];
    if (typeof val === "function") {
      val.mockReset();
    } else if (typeof val === "object" && val !== null) {
      for (const subKey of Object.keys(val)) {
        val[subKey].mockReset();
      }
    }
  }
  vi.mocked(auth.requireAuth).mockResolvedValue({ user: CITY_HEAD } as any);
  vi.mocked(auth.requireCapability).mockResolvedValue({ user: CITY_HEAD } as any);
  mockDb.city.findUnique.mockResolvedValue({ id: "city_lhr", name: "Lahore", isActive: true });
  mockDb.callingCampaign.findUnique.mockResolvedValue(CAMPAIGN);
  mockDb.callingAssignment.findUnique.mockResolvedValue(ASSIGNMENT);
  mockDb.callingTemplate.findUnique.mockResolvedValue(TEMPLATE_APPROVED);
});

function makeBody(body: unknown) {
  return new NextRequest("http://localhost/api/calling", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ══════════════════════════════════════════════════════════════════════
//  CALL-003: Existing schema/helper tests
// ══════════════════════════════════════════════════════════════════════

describe("CALL-003: Core Calling Validation & Helpers", () => {
  describe("1. Campaign & Template Schema", () => {
    it("requires startDate <= endDate", () => {
      expect(createCampaignSchema.safeParse({ name: "Campaign", startDate: "2026-08-10T00:00:00.000Z", endDate: "2026-08-01T00:00:00.000Z" }).success).toBe(false);
      expect(createCampaignSchema.safeParse({ name: "Campaign", startDate: "2026-08-01T00:00:00.000Z", endDate: "2026-08-10T00:00:00.000Z" }).success).toBe(true);
    });
    it("validates template creation fields", () => {
      expect(createTemplateSchema.safeParse({ title: "Welcome Script", body: "Hello {parentName}." }).success).toBe(true);
    });
  });

  describe("2. Lead Assignment XOR", () => {
    it("rejects both/neither, accepts exactly one", () => {
      expect(assignLeadsSchema.safeParse({ campaignId: "c1", applicationIds: ["c2"], callerStaffMetaId: "c3", callerExternalId: "c4" }).success).toBe(false);
      expect(assignLeadsSchema.safeParse({ campaignId: "c1", applicationIds: ["c2"] }).success).toBe(false);
      expect(assignLeadsSchema.safeParse({ campaignId: "c1", applicationIds: ["c2"], callerStaffMetaId: "c3" }).success).toBe(true);
    });
  });

  describe("3. Interaction Outcome", () => {
    it("requires scheduledFor for callback_requested", () => {
      expect(logInteractionSchema.safeParse({ assignmentId: "a1", outcome: "callback_requested" }).success).toBe(false);
      expect(logInteractionSchema.safeParse({ assignmentId: "a1", outcome: "callback_requested", scheduledFor: "2026-08-02T14:00:00.000Z" }).success).toBe(true);
    });
  });

  describe("4. HMAC Computation", () => {
    it("produces deterministic 64-char hex", () => {
      const h1 = computeValuesHmac({ parentName: "A", applicantName: "B" });
      const h2 = computeValuesHmac({ applicantName: "B", parentName: "A" });
      expect(h1).toEqual(h2);
      expect(h1.length).toBe(64);
    });
  });

  describe("5. POC/Manager Resolution", () => {
    it("404 on missing campaign", async () => {
      const { verifyCallingManagerOrPoc: realVerify } = await vi.importActual("@/lib/calling/poc-auth");
      const r = await realVerify({ id: "u1", role: "city_head" }, "missing", { callingCampaign: { findUnique: vi.fn().mockResolvedValue(null) } });
      expect(r.status).toBe(404);
    });
  });

  describe("6. Template Lifecycle", () => {
    it("enforces draft->approved->retired", () => {
      expect(isValidTemplateTransition("draft", "approved")).toBe(true);
      expect(isValidTemplateTransition("approved", "retired")).toBe(true);
      expect(isValidTemplateTransition("retired", "approved")).toBe(false);
      expect(isValidTemplateTransition("approved", "draft")).toBe(false);
    });
  });

  describe("7. Update Campaign Schema", () => {
    it("rejects unknown fields", () => expect(updateCampaignSchema.safeParse({ name: "Update", unknownField: "x" }).success).toBe(false));
    it("allows partial", () => expect(updateCampaignSchema.safeParse({ name: "Update" }).success).toBe(true));
    it("accepts empty", () => expect(updateCampaignSchema.safeParse({}).success).toBe(true));
  });

  describe("8. Merge variable allowlist", () => {
    it("has 3 approved vars", () => expect(ALLOWED_MERGE_VARIABLES).toEqual(["parentName", "applicantName", "trackingCode"]));
    it("rejects unapproved keys", () => expect(useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1", variablesUsed: ["phoneNumber"] }).success).toBe(false));
    it("accepts approved keys with matching valuesUsed", () => expect(useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } }).success).toBe(true));
  });

  describe("9. valuesUsed bounded input", () => {
    it("rejects unapproved value keys", () => expect(useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { phoneNumber: "x" } }).success).toBe(false));
    it("rejects mismatched keys vs variablesUsed", () => expect(useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "A", applicantName: "B" } }).success).toBe(false));
    it("rejects non-string value", () => expect(useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: { nested: "x" } } }).success).toBe(false));
    it("accepts matching keys with string values", () => {
      const r = useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName", "applicantName"], valuesUsed: { parentName: "A", applicantName: "B" } });
      if (!r.success) expect(r.error!.message).toBe("SKIP_SHOWING_ERROR");
      expect(r.success).toBe(true);
    });
    it("accepts empty vars and values", () => expect(useTemplateSchema.safeParse({ templateId: "t1", assignmentId: "a1" }).success).toBe(true));
  });
});

// ══════════════════════════════════════════════════════════════════════
//  CALL-004: Route-level authorization tests
// ══════════════════════════════════════════════════════════════════════

describe("CALL-004: Template Use Route", () => {
  async function post(body: any) {
    const { POST } = await import("./templates/use/route");
    return POST(makeBody(body));
  }

  it("denies when caller is not the assigned caller", async () => {
    // requireCapability("calling.view") passes (mocked in beforeEach),
    // but the caller check denies because the assigned staff meta differs
    mockDb.callingAssignment.findUnique.mockResolvedValue({ ...ASSIGNMENT, callerStaffMetaId: "sm_other" });
    mockDb.staffMeta.findFirst.mockResolvedValue(null);
    const res = await post({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } });
    expect(res.status).toBe(403);
    expect(mockDb.callingTemplateUse.create).not.toHaveBeenCalled();
  });

  it("allows when caller is the assigned staff caller", async () => {
    mockDb.staffMeta.findFirst.mockResolvedValue({ id: "sm1", userId: "u1", isActive: true });
    mockDb.$transaction.mockImplementation(async (cb: any) => cb({
      callingTemplateUse: { create: vi.fn().mockResolvedValue({ id: "use_1" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }));
    const res = await post({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } });
    expect(res.status).toBe(201);
  });

  it("denies template campaign mismatch", async () => {
    mockDb.callingTemplate.findUnique.mockResolvedValue({ ...TEMPLATE_APPROVED, campaignId: "cmp_other" });
    const res = await post({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } });
    expect(res.status).toBe(403);
  });

  it("denies template city mismatch", async () => {
    mockDb.callingTemplate.findUnique.mockResolvedValue({ ...TEMPLATE_APPROVED, cityId: "city_khi" });
    const res = await post({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } });
    expect(res.status).toBe(403);
  });

  it("denies retired template", async () => {
    mockDb.callingTemplate.findUnique.mockResolvedValue({ ...TEMPLATE_APPROVED, status: "retired" });
    const res = await post({ templateId: "t1", assignmentId: "a1", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for inactive assignment", async () => {
    mockDb.callingAssignment.findUnique.mockResolvedValue(null);
    const res = await post({ templateId: "t1", assignmentId: "missing", variablesUsed: ["parentName"], valuesUsed: { parentName: "Ahmed" } });
    expect(res.status).toBe(404);
  });
});

describe("CALL-004: Assignment Reassignment & Concurrency", () => {
  async function post(body: any) {
    const { POST } = await import("./assignments/route");
    return POST(makeBody(body));
  }

  beforeEach(() => {
    vi.mocked(auth.requireAuth).mockResolvedValue({ user: { id: "u_admin", role: "super_admin", assignedCityId: "city_lhr" } } as any);
    vi.mocked(callingAuth.verifyCallingManagerOrPoc).mockResolvedValue({
      campaign: { id: "cmp_1", cityId: "city_lhr", name: "Test", status: "active", startDate: new Date(), endDate: new Date() },
      isPoc: false, isManager: true, cityId: "city_lhr", error: null, status: 200,
    } as any);
    mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm1", isActive: true, assignedCityId: "city_lhr", assignedPark: null, assignedGroup: null, assignedCity: { id: "city_lhr", isActive: true } });
    mockDb.admissionApplication.findMany.mockResolvedValue([{ id: "app_1", cityId: "city_lhr" }]);
  });

  it("closes existing assignments before creating new ones", async () => {
    const closeCall = vi.fn().mockResolvedValue({ count: 1 });
    const createCall = vi.fn().mockResolvedValue({ id: "new_1" });
    const countCall = vi.fn().mockResolvedValue(1);
    let callOrder: string[] = [];

    mockDb.$transaction.mockImplementation(async (cb: any, opts: any) => {
      expect(opts).toEqual({ isolationLevel: "Serializable" });
      const tx = {
        callingAssignment: {
          updateMany: (...args: any[]) => { callOrder.push("updateMany"); return closeCall(...args); },
          create: (...args: any[]) => { callOrder.push("create"); return createCall(...args); },
          count: (...args: any[]) => { callOrder.push("count"); return countCall(...args); },
        },
      };
      return cb(tx);
    });

    const res = await post({ campaignId: "cmp_1", applicationIds: ["app_1"], callerStaffMetaId: "sm1" });
    expect(res.status).toBe(201);
    expect(callOrder).toEqual(["updateMany", "create", "count"]);
    expect(closeCall).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true }),
      data: expect.objectContaining({ isActive: false, status: "reassigned" }),
    }));
  });

  it("counts per application after insert", async () => {
    mockDb.admissionApplication.findMany.mockResolvedValue([{ id: "app_1", cityId: "city_lhr" }, { id: "app_2", cityId: "city_lhr" }]);
    const countCall = vi.fn().mockResolvedValue(1);
    mockDb.$transaction.mockImplementation(async (cb: any, opts: any) => {
      expect(opts).toEqual({ isolationLevel: "Serializable" });
      const tx = {
        callingAssignment: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({ id: "new_1" }),
          count: countCall,
        },
      };
      return cb(tx);
    });

    await post({ campaignId: "cmp_1", applicationIds: ["app_1", "app_2"], callerStaffMetaId: "sm1" });
    // Two applications → two count calls
    expect(countCall).toHaveBeenCalledTimes(2);
    expect(countCall).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ applicationId: "app_1", isActive: true }),
    }));
    expect(countCall).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ applicationId: "app_2", isActive: true }),
    }));
  });

  it("returns 409 when count mismatch detected per application", async () => {
    mockDb.admissionApplication.findMany.mockResolvedValue([{ id: "app_1", cityId: "city_lhr" }, { id: "app_2", cityId: "city_lhr" }]);
    let countInvocations = 0;
    mockDb.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        callingAssignment: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({ id: "new_1" }),
          count: vi.fn().mockImplementation(() => {
            countInvocations++;
            // First app gets count=1 (ok), second app gets count=2 (mismatch)
            return Promise.resolve(countInvocations === 1 ? 1 : 2);
          }),
        },
      };
      return cb(tx);
    });

    const res = await post({ campaignId: "cmp_1", applicationIds: ["app_1", "app_2"], callerStaffMetaId: "sm1" });
    // Should have thrown CountMismatchError on the second app → 409
    expect(res.status).toBe(409);
  });

  it("returns 201 with correct transaction isolation", async () => {
    let capturedOpts: any = null;
    mockDb.$transaction.mockImplementation(async (cb: any, opts: any) => {
      capturedOpts = opts;
      const tx = {
        callingAssignment: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({ id: "new_1" }),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      return cb(tx);
    });

    const res = await post({ campaignId: "cmp_1", applicationIds: ["app_1"], callerStaffMetaId: "sm1" });
    expect(res.status).toBe(201);
    expect(capturedOpts).toEqual({ isolationLevel: "Serializable" });
  });

  it("maps serialization failure (P2034) to 409", async () => {
    const prismaErr = new Prisma.PrismaClientKnownRequestError("Serialization failure", {
      code: "P2034",
      clientVersion: "6.11",
    });
    mockDb.$transaction.mockRejectedValue(prismaErr);
    const res = await post({ campaignId: "cmp_1", applicationIds: ["app_1"], callerStaffMetaId: "sm1" });
    expect(res.status).toBe(409);
  });
});

describe("CALL-004: Interaction Atomicity & Authorization", () => {
  async function post(body: any) {
    const { POST } = await import("./interactions/route");
    return POST(makeBody(body));
  }

  it("allows directly assigned staff caller", async () => {
    mockDb.staffMeta.findFirst.mockResolvedValue({ id: "sm1", userId: "u1", isActive: true });
    mockDb.$transaction.mockImplementation(async (cb: any) => cb({
      callInteraction: { create: vi.fn().mockResolvedValue({ id: "int_1" }) },
      callingAssignment: { update: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }));
    const res = await post({ assignmentId: "a1", outcome: "reached" });
    expect(res.status).toBe(201);
  });

  it("denies manager without direct assignment", async () => {
    mockDb.callingAssignment.findUnique.mockResolvedValue({ ...ASSIGNMENT, callerStaffMetaId: "sm_other" });
    mockDb.staffMeta.findFirst.mockResolvedValue(null);
    mockDb.externalSupportCaller.findFirst.mockResolvedValue(null);
    const res = await post({ assignmentId: "a1", outcome: "reached" });
    expect(res.status).toBe(403);
  });

  it("audit log is inside the same transaction", async () => {
    mockDb.staffMeta.findFirst.mockResolvedValue({ id: "sm1", userId: "u1", isActive: true });
    let audited = false;
    mockDb.$transaction.mockImplementation(async (cb: any) => cb({
      callInteraction: { create: vi.fn().mockResolvedValue({ id: "int_1" }) },
      callingAssignment: { update: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockImplementation(() => { audited = true; return {}; }) },
    }));
    await post({ assignmentId: "a1", outcome: "no_answer" });
    expect(audited).toBe(true);
  });
});
