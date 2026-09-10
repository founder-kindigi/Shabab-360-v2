import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const state = vi.hoisted(() => ({
  user: { id: "actor", role: "city_head", assignedCityId: "city-a" },
  capability: true,
  application: null as any,
  campaign: null as any,
  auditFails: false,
  auditCount: 0,
  verified: {} as any,
}));
vi.mock("@/lib/auth/authorize", async (original) => ({
  ...await original<typeof import("@/lib/auth/authorize")>(),
  requireRole: vi.fn(async () => null),
  requireCapability: vi.fn(async () => state.capability ? { user: state.user } : NextResponse.json({ error: "Forbidden" }, { status: 403 })),
}));
vi.mock("@/lib/calling/poc-auth", () => ({ verifyCallingManagerOrPoc: vi.fn(async () => state.verified) }));
vi.mock("@/lib/db", () => ({ db: {
  $transaction: async (work: any) => {
    const before = { application: state.application, campaign: state.campaign, auditCount: state.auditCount };
    try {
      return await work({
        admissionApplication: {
          findUnique: async () => state.application,
          delete: async () => { state.application = null; },
        },
        callingCampaign: { delete: async () => { state.campaign = null; } },
        auditLog: { create: async () => { if (state.auditFails) throw new Error("synthetic audit failure"); state.auditCount++; } },
      });
    } catch (error) { Object.assign(state, before); throw error; }
  },
} }));
import { DELETE as deleteAdmission } from "@/app/api/admin/admissions/[id]/route";
import { DELETE as deleteCampaign } from "@/app/api/calling/campaigns/[id]/route";

const request = new NextRequest("http://localhost/api/record", { method: "DELETE" });
const context = { params: Promise.resolve({ id: "record" }) };
describe("v2 deletion truthfulness and authorization", () => {
  beforeEach(() => {
    state.application = { id: "record", cityId: "city-a", status: "submitted" };
    state.campaign = { id: "record", cityId: "city-a" };
    state.verified = { campaign: state.campaign, isManager: true, error: null };
    state.capability = true;
    state.auditFails = false;
    state.auditCount = 0;
  });
  it.each([["admission", deleteAdmission], ["campaign", deleteCampaign]] as const)("acknowledges a committed %s deletion", async (_, handler) => {
    expect((await handler(request, context)).status).toBe(200);
    expect(state.auditCount).toBe(1);
    expect(_ === "admission" ? state.application : state.campaign).toBeNull();
  });
  it.each([["admission", deleteAdmission], ["campaign", deleteCampaign]] as const)("rolls back %s deletion if required audit fails", async (_, handler) => {
    state.auditFails = true;
    expect((await handler(request, context)).status).toBe(503);
    expect(_ === "admission" ? state.application : state.campaign).not.toBeNull();
    expect(state.auditCount).toBe(0);
  });
  it("returns 404 only for an absent application", async () => {
    state.application = null;
    expect((await deleteAdmission(request, context)).status).toBe(404);
    expect(state.auditCount).toBe(0);
  });
  it("preserves foreign-city applications", async () => {
    state.application.cityId = "city-b";
    expect((await deleteAdmission(request, context)).status).toBe(403);
    expect(state.application).not.toBeNull();
  });
  it("preserves enrolled applications", async () => {
    state.application.status = "enrolled";
    expect((await deleteAdmission(request, context)).status).toBe(409);
  });
  it("honors campaign verifier denial", async () => {
    state.verified = { error: "Forbidden", status: 403, campaign: null };
    expect((await deleteCampaign(request, context)).status).toBe(403);
    expect(state.campaign).not.toBeNull();
  });
  it("does not let a temporary POC delete a campaign", async () => {
    state.verified.isManager = false;
    expect((await deleteCampaign(request, context)).status).toBe(403);
  });
  it.each([deleteAdmission, deleteCampaign])("honors capability revocation", async (handler) => {
    state.capability = false;
    expect((await handler(request, context)).status).toBe(403);
    expect(state.auditCount).toBe(0);
  });
});
