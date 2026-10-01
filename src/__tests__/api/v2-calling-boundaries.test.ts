import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const m = vi.hoisted(() => ({ actor: null as any, allowed: true, manager: true, staff: vi.fn(), campaign: vi.fn(), campaignsLock: vi.fn(), external: vi.fn(), poc: vi.fn(), applications: vi.fn(), assignment: vi.fn(), assignments: vi.fn(), create: vi.fn(), change: vi.fn(), interaction: vi.fn(), audit: vi.fn(), city: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: async () => !m.actor ? NextResponse.json({}, { status: 401 }) : m.actor.mustResetPwd ? NextResponse.json({}, { status: 403 }) : { user: m.actor },
  requireCapability: async () => !m.actor ? NextResponse.json({}, { status: 401 }) : !m.allowed || m.actor.mustResetPwd ? NextResponse.json({}, { status: 403 }) : { user: m.actor },
}));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: async () => m.manager }));
vi.mock("@/lib/db", () => { const db = {
  staffMeta: { findUnique: m.staff, findFirst: m.staff }, city: { findUnique: m.city },
  callingCampaign: { findUnique: m.campaign, updateMany: m.campaignsLock }, externalSupportCaller: { findFirst: m.external }, callingPOCAssignment: { findFirst: m.poc },
  admissionApplication: { findMany: m.applications }, callingAssignment: { findUnique: m.assignment, findMany: m.assignments, create: m.create, updateMany: m.change },
  callInteraction: { create: m.interaction }, auditLog: { create: m.audit },
}; return { db: { ...db, $transaction: async (fn: any) => fn(db) } }; });
import { POST as assign } from "@/app/api/calling/assignments/route";
import { POST as interact } from "@/app/api/calling/interactions/route";
import { GET as leads } from "@/app/api/calling/campaigns/[id]/leads/route";

const campaign = () => ({ id: "campaign", cityId: "city", status: "active", startDate: new Date("2020-01-01"), endDate: new Date("2099-01-01") });
const payload = { campaignId: "campaign", applicationIds: ["application"], callerStaffMetaId: "staff" };
const request = (body: unknown) => new NextRequest("http://localhost/api/calling", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const get = (query = "") => leads(new NextRequest("http://localhost/api/calling/campaigns/campaign/leads" + query), { params: Promise.resolve({ id: "campaign" }) });
beforeEach(() => {
  vi.resetAllMocks(); m.allowed = true; m.manager = true; m.actor = { id: "actor", role: "super_admin" };
  m.campaign.mockResolvedValue(campaign()); m.city.mockResolvedValue({ id: "city", isActive: true });
  m.staff.mockResolvedValue({ id: "staff", userId: "actor", role: "city_head", isActive: true, assignedCityId: "city", user: { isActive: true } });
  m.applications.mockResolvedValue([{ id: "application" }]); m.create.mockResolvedValue({ id: "assignment" }); m.change.mockResolvedValue({ count: 1 }); m.campaignsLock.mockResolvedValue({ count: 1 });
  m.assignment.mockResolvedValue({ id: "assignment", campaignId: "campaign", campaign: campaign(), application: { cityId: "city" }, callerStaffMetaId: "staff", isActive: true });
  m.assignments.mockResolvedValue([]); m.interaction.mockResolvedValue({ id: "interaction" });
});
it.each(["assign", "interact", "leads"])("%s denies unauthenticated and reset-required actors before data access", async operation => {
  const call = () => operation === "assign" ? assign(request(payload)) : operation === "interact" ? interact(request({ assignmentId: "assignment", outcome: "reached" })) : get();
  m.actor = null; expect((await call()).status).toBe(401);
  m.actor = { id: "actor", role: "super_admin", mustResetPwd: true }; expect((await call()).status).toBe(403);
  expect(m.campaign).not.toHaveBeenCalled(); expect(m.assignment).not.toHaveBeenCalled();
});
it("commits an own-city assignment through the campaign lock and required audit", async () => {
  expect((await assign(request(payload))).status).toBe(200); expect(m.campaignsLock).toHaveBeenCalled(); expect(m.audit).toHaveBeenCalledTimes(1);
});
it.each([null, { id: "staff", isActive: false }, { id: "staff", isActive: true, assignedCityId: "foreign" }, { id: "staff", isActive: true }])("denies missing, inactive, foreign and unscoped calling managers", async staff => {
  m.actor = { id: "actor", role: "city_head" }; m.staff.mockResolvedValue(staff);
  expect((await assign(request(payload))).status).toBe(403); expect(m.create).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
});
it.each(["inactive", "foreign-application", "expired-external", "invalid-caller", "capability"])("denies %s assignments without replacing existing work", async reason => {
  if (reason === "inactive") m.campaign.mockResolvedValue({ ...campaign(), status: "completed" });
  if (reason === "foreign-application") m.applications.mockResolvedValue([]);
  if (reason === "expired-external") m.external.mockResolvedValue(null);
  if (reason === "invalid-caller") m.staff.mockResolvedValue(null);
  if (reason === "capability") { m.manager = false; m.poc.mockResolvedValue(null); }
  const body = reason === "expired-external" ? { campaignId: "campaign", applicationIds: ["application"], callerExternalId: "expired" } : payload;
  expect((await assign(request(body))).status).toBe(reason === "inactive" ? 409 : 403); expect(m.create).not.toHaveBeenCalled(); expect(m.change).not.toHaveBeenCalled();
});
it("rejects duplicate applications and excessive batches before querying", async () => {
  for (const ids of [["a", "a"], Array.from({ length: 101 }, (_, i) => String(i))]) expect((await assign(request({ ...payload, applicationIds: ids }))).status).toBe(400);
  expect(m.campaign).not.toHaveBeenCalled();
});
it("fails the assignment request when its required audit fails", async () => {
  m.audit.mockRejectedValue(Error("unavailable")); expect((await assign(request(payload))).status).toBe(503);
});
it("logs an owned active assignment with audit", async () => {
  m.actor.role = "park_lead"; m.manager = false; m.poc.mockResolvedValue(null);
  expect((await interact(request({ assignmentId: "assignment", outcome: "no_answer" }))).status).toBe(200); expect(m.audit).toHaveBeenCalledTimes(1);
});
it.each(["foreign-owner", "cross-city-link", "closed", "missing", "malformed", "denied"])("interaction rejects %s without creating a history row", async reason => {
  m.manager = false; m.poc.mockResolvedValue(null); m.actor.role = "park_lead";
  if (reason === "foreign-owner") m.assignment.mockResolvedValue({ ...(await m.assignment()), callerStaffMetaId: "other" });
  if (reason === "cross-city-link") m.assignment.mockResolvedValue({ ...(await m.assignment()), application: { cityId: "other" } });
  if (reason === "closed") m.assignment.mockResolvedValue({ ...(await m.assignment()), isActive: false });
  if (reason === "missing") m.assignment.mockResolvedValue(null);
  if (reason === "denied") m.allowed = false;
  const response = await interact(request({ assignmentId: "assignment", outcome: reason === "malformed" ? "invented" : "reached" }));
  expect(response.status).toBe({ "foreign-owner": 403, "cross-city-link": 409, closed: 409, missing: 404, malformed: 400, denied: 403 }[reason]); expect(m.interaction).not.toHaveBeenCalled();
});
it("bounds, scopes and paginates lead reads with actual principal ownership", async () => {
  m.actor.role = "park_lead"; m.manager = false; m.poc.mockResolvedValue(null);
  expect((await get("?page=2&pageSize=20" )).status).toBe(200);
  expect(m.assignments).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "campaign", isActive: true, application: { cityId: "city" }, callerStaffMetaId: "staff" }, take: 20, skip: 20 }));
  expect((await get("?callerId=other")).status).toBe(403);
  expect((await get("?page=2junk")).status).toBe(400);
});
it("returns an explicit unavailable response when lead storage fails", async () => {
  m.assignments.mockRejectedValue(Error("unavailable")); expect((await get()).status).toBe(503);
});
