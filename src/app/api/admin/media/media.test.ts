import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockDb = vi.hoisted(() => ({
  city: { findUnique: vi.fn() },
  staffMeta: { findUnique: vi.fn() },
  collaborationTeam: { findFirst: vi.fn() },
  mediaBrief: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn((fn: any) => fn(mockDb)),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: vi.fn(), requireCapability: vi.fn() }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(), createAuditLogData: vi.fn().mockImplementation((p: any) => p) }));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import * as auth from "@/lib/auth/authorize";
import * as caps from "@/lib/auth/capability-access";

const USER = { id: "u1", role: "super_admin" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.requireAuth).mockResolvedValue({ user: USER } as any);
  vi.mocked(caps.userHasCapability).mockResolvedValue(true);
  mockDb.city.findUnique.mockResolvedValue({ id: "city_lhr", name: "Lahore", isActive: true });
  mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm1", isActive: true, assignedCityId: "city_lhr", assignedCity: { id: "city_lhr", isActive: true }, assignedPark: null, assignedGroup: null });
  mockDb.collaborationTeam.findFirst.mockResolvedValue({ id: "team_media" });
});

function makeBody(b: unknown, u = "http://l/api/admin/media/briefs") { return new NextRequest(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); }
function makeGet(u: string) { return new NextRequest(u, { method: "GET" }); }

// ── Auth helpers ──────────────────────────────────────────────────────
describe("resolveMediaCity", () => {
  it("400 when HQ omits cityId", async () => {
    const { resolveMediaCity } = await import("@/lib/media/media-auth");
    const r = await resolveMediaCity({ id: "u1", role: "super_admin" }, undefined);
    expect(!r.authorized && r.status).toBe(400);
  });
  it("403 scoped foreign cityId", async () => {
    const { resolveMediaCity } = await import("@/lib/media/media-auth");
    const r = await resolveMediaCity({ id: "u1", role: "city_head", assignedCityId: "city_lhr" }, "city_khi");
    expect(!r.authorized && r.status).toBe(403);
  });
});
describe("hasActiveMediaMembership", () => {
  it("false no membership", async () => {
    mockDb.collaborationTeam.findFirst.mockResolvedValue(null);
    const { hasActiveMediaMembership } = await import("@/lib/media/media-auth");
    expect(await hasActiveMediaMembership({ id: "u1" }, "city_lhr")).toBe(false);
  });
  it("true active member", async () => {
    const { hasActiveMediaMembership } = await import("@/lib/media/media-auth");
    expect(await hasActiveMediaMembership({ id: "u1" }, "city_lhr")).toBe(true);
  });
});

describe("requireMediaAccess", () => {
  it("allows an HQ user with capability without a personal Media membership", async () => {
    mockDb.collaborationTeam.findFirst.mockResolvedValue(null);
    const { requireMediaAccess } = await import("@/lib/media/media-auth");
    await expect(requireMediaAccess({ id: "u1", role: "super_admin" }, "media.workspace.view", "city_lhr"))
      .resolves.toMatchObject({ authorized: true, cityId: "city_lhr" });
  });

  it("still requires an active Media membership for scoped staff", async () => {
    mockDb.collaborationTeam.findFirst.mockResolvedValue(null);
    const { requireMediaAccess } = await import("@/lib/media/media-auth");
    await expect(requireMediaAccess({ id: "u1", role: "city_head" }, "media.workspace.view", "city_lhr"))
      .resolves.toMatchObject({ authorized: false, status: 403 });
  });
});

// ── Schema tests ──────────────────────────────────────────────────────
describe("sanitizeMediaAuditData", () => {
  it("removes rejectionReason", async () => {
    const { sanitizeMediaAuditData: s } = await import("@/lib/media/media-schemas");
    expect(s({ status: "ok", rejectionReason: "X" })).not.toHaveProperty("rejectionReason");
  });
  it("removes cancellationReason", async () => {
    const { sanitizeMediaAuditData: s } = await import("@/lib/media/media-schemas");
    expect(s({ s: "c", cancellationReason: "X" })).not.toHaveProperty("cancellationReason");
  });
  it("redacts URLs", async () => {
    const { sanitizeMediaAuditData: s } = await import("@/lib/media/media-schemas");
    expect(s({ u: "https://e.com/f", l: "r" }).u).toBe("[REDACTED]");
  });
  it("redacts URLs in assetMetadata", async () => {
    const { sanitizeMediaAuditData: s } = await import("@/lib/media/media-schemas");
    const r = s({ assetMetadata: { externalStorageUrl: "https://s3.e/f", thumbnailUrl: "https://cdn.e/t" } });
    expect(r.assetMetadata.externalStorageUrl).toBe("[REDACTED]");
    expect(r.assetMetadata.thumbnailUrl).toBe("[REDACTED]");
  });
});

// ── GET list ──────────────────────────────────────────────────────────
describe("GET /api/admin/media/briefs", () => {
  async function list(p = "") { return (await import("./briefs/route")).GET(makeGet(`http://l?${p}`)); }
  it("401", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue(new NextResponse("U", { status: 401 }) as any);
    expect((await list("cityId=city_lhr")).status).toBe(401);
  });
  it("403 missing cap", async () => {
    vi.mocked(caps.userHasCapability).mockResolvedValue(false);
    expect((await list("cityId=city_lhr")).status).toBe(403);
  });
  it("400 no cityId", async () => expect((await list("")).status).toBe(400));
  it("200", async () => {
    mockDb.mediaBrief.findMany.mockResolvedValue([]);
    mockDb.mediaBrief.count.mockResolvedValue(0);
    expect((await list("cityId=city_lhr")).status).toBe(200);
  });
});

// ── POST create ───────────────────────────────────────────────────────
describe("POST /api/admin/media/briefs", () => {
  async function post(b: any) { return (await import("./briefs/route")).POST(makeBody(b)); }
  beforeEach(() => {
    mockDb.mediaBrief.create.mockResolvedValue({ id: "b1", cityId: "city_lhr", teamId: "t1", title: "T", status: "draft", createdById: "u1" });
    mockDb.$transaction.mockImplementation(async (fn: any) => fn(mockDb));
  });
  it("401", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue(new NextResponse("U", { status: 401 }) as any);
    expect((await post({ teamId: "t1", title: "T" })).status).toBe(401);
  });
  it("403 missing cap", async () => {
    vi.mocked(caps.userHasCapability).mockResolvedValue(false);
    expect((await post({ cityId: "city_lhr", teamId: "t1", title: "T" })).status).toBe(403);
  });
  it("403 no membership", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue({ user: { id: "u1", role: "city_head" } } as any);
    mockDb.collaborationTeam.findFirst.mockResolvedValue(null);
    expect((await post({ cityId: "city_lhr", teamId: "t1", title: "T" })).status).toBe(403);
  });
  it("403 URL in desc", async () => expect((await post({ cityId: "city_lhr", teamId: "t1", title: "T", description: "https://e.com" })).status).toBe(403));
  it("400 malformed", async () => {
    const { POST } = await import("./briefs/route");
    expect((await POST(new NextRequest("http://l/", { method: "POST", body: "{{" }))).status).toBe(400);
  });
  it("400 unknown approvedAt", async () => expect((await post({ cityId: "city_lhr", teamId: "t1", title: "T", approvedAt: "now" })).status).toBe(400));
  it("201", async () => expect((await post({ cityId: "city_lhr", teamId: "t1", title: "N" })).status).toBe(201));
  it("audit in tx", async () => { await post({ cityId: "city_lhr", teamId: "t1", title: "T" }); expect(mockDb.auditLog.create).toHaveBeenCalled(); });
});

// ── GET detail ────────────────────────────────────────────────────────
describe("GET [id]", () => {
  async function get(id = "b1") { return (await import("./briefs/[id]/route")).GET(makeGet(`http://l/${id}`), { params: Promise.resolve({ id }) }); }
  beforeEach(() => {
    mockDb.mediaBrief.findUnique.mockImplementation(async ({ where: { id } }: any) =>
      id === "nonexistent" ? null : { id: "b1", cityId: "city_lhr", title: "T", status: "draft", version: 1, team: { id: "t1", name: "M", code: "media" }, createdBy: { id: "u1", name: "U", email: "u@t" }, assignedToStaff: null, approvedByStaff: null }
    );
  });
  it("404", async () => expect((await get("nonexistent")).status).toBe(404));
  it("403 foreign city", async () => {
    mockDb.mediaBrief.findUnique.mockResolvedValue({ id: "b1", cityId: "city_khi", title: "F", status: "draft", version: 1 });
    vi.mocked(auth.requireAuth).mockResolvedValue({ user: { id: "u1", role: "city_head" } } as any);
    mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm1", isActive: true, assignedCityId: "city_lhr", assignedCity: { id: "city_lhr", isActive: true }, assignedPark: null, assignedGroup: null });
    expect((await get()).status).toBe(403);
  });
  it("200", async () => expect((await get()).status).toBe(200));
});

// ── PATCH update ──────────────────────────────────────────────────────
describe("PATCH [id]", () => {
  let fc = 0;
  async function pat(b: any, id = "b1") { return (await import("./briefs/[id]/route")).PATCH(makeBody(b, `http://l/${id}`), { params: Promise.resolve({ id }) }); }
  beforeEach(() => {
    fc = 0;
    mockDb.mediaBrief.updateMany.mockResolvedValue({ count: 1 });
    mockDb.mediaBrief.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      fc++;
      if (id === "nonexistent") return null;
      if (fc === 1) return { id: "b1", cityId: "city_lhr", version: 1, status: "draft", title: "O", description: null, approvalState: null, assignedToStaffMetaId: null };
      return { id: "b1", cityId: "city_lhr", version: 2, status: "open", title: "U", description: null, approvalState: null, team: { id: "t1", name: "M", code: "media" }, createdBy: { id: "u1", name: "U", email: "u@t" }, assignedToStaff: null, approvedByStaff: null };
    });
  });

  it("404", async () => expect((await pat({ title: "U", version: 1 }, "nonexistent")).status).toBe(404));
  it("403 foreign city", async () => {
    mockDb.mediaBrief.findUnique.mockImplementation(async () => ({ id: "b1", cityId: "city_khi", version: 1, status: "draft", title: "O", description: null, approvalState: null, assignedToStaffMetaId: null }));
    vi.mocked(auth.requireAuth).mockResolvedValue({ user: { id: "u1", role: "city_head" } } as any);
    mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm1", isActive: true, assignedCityId: "city_lhr", assignedCity: { id: "city_lhr", isActive: true }, assignedPark: null, assignedGroup: null });
    expect((await pat({ title: "U", version: 1 })).status).toBe(403);
  });
  it("409 stale", async () => {
    mockDb.mediaBrief.findUnique.mockImplementation(async () => ({ id: "b1", cityId: "city_lhr", version: 2, status: "draft", title: "O", description: null, approvalState: null, assignedToStaffMetaId: null }));
    expect((await pat({ title: "U", version: 1 })).status).toBe(409);
  });
  it("409 atomic", async () => {
    mockDb.mediaBrief.updateMany.mockResolvedValue({ count: 0 });
    expect((await pat({ status: "open", version: 1 })).status).toBe(409);
  });
  it("409 invalid transition", async () => expect((await pat({ status: "approved", version: 1 })).status).toBe(409));
  it("200 HQ transition without a personal Media membership", async () => {
    mockDb.collaborationTeam.findFirst.mockResolvedValue(null);
    expect((await pat({ status: "open", version: 1 })).status).toBe(200);
  });
  it("200 draft->open", async () => expect((await pat({ status: "open", version: 1 })).status).toBe(200));
  it("400 rejects approvedAt", async () => expect((await pat({ status: "open", version: 1, approvedAt: "now" })).status).toBe(400));
  it("403 URL desc", async () => expect((await pat({ description: "https://e.com", version: 1 })).status).toBe(403));
  it("audit in tx", async () => { await pat({ status: "open", version: 1 }); expect(mockDb.auditLog.create).toHaveBeenCalled(); });
  it("200 draft->cancelled", async () => expect((await pat({ status: "cancelled", cancellationReason: "X", version: 1 })).status).toBe(200));

  // ── Regression tests ─────────────────────────────────────────────
  it("400 rejects approvalState", async () => expect((await pat({ status: "open", version: 1, approvalState: "approved" })).status).toBe(400));
  it("403 asset ext url", async () => expect((await pat({ assetMetadata: { externalStorageUrl: "https://s3.e/f" }, version: 1 })).status).toBe(403));
  it("403 asset thumb url", async () => expect((await pat({ assetMetadata: { thumbnailUrl: "https://cdn.e/t" }, version: 1 })).status).toBe(403));
  it("404 assignee not found", async () => {
    mockDb.staffMeta.findUnique.mockImplementation(async ({ where }: any) => where.userId ? { id: "sm1", isActive: true, assignedCityId: "city_lhr", assignedPark: null, assignedGroup: null } : null);
    expect((await pat({ assignedToStaffMetaId: "bad", version: 1 })).status).toBe(404);
  });
  it("403 assignee wrong city", async () => {
    mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm_x", isActive: true, assignedCityId: "city_khi", assignedPark: null, assignedGroup: null });
    mockDb.collaborationTeam.findFirst.mockResolvedValue({ id: "t1" });
    expect((await pat({ assignedToStaffMetaId: "sm_x", version: 1 })).status).toBe(403);
  });
  it("400 assignee inactive", async () => {
    mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm_i", isActive: false, assignedCityId: "city_lhr", assignedPark: null, assignedGroup: null });
    expect((await pat({ assignedToStaffMetaId: "sm_i", version: 1 })).status).toBe(400);
  });
  it("403 assignee no membership", async () => {
    mockDb.staffMeta.findUnique.mockResolvedValue({ id: "sm_nm", isActive: true, assignedCityId: "city_lhr", assignedPark: null, assignedGroup: null });
    mockDb.collaborationTeam.findFirst.mockResolvedValue(null);
    expect((await pat({ assignedToStaffMetaId: "sm_nm", version: 1 })).status).toBe(403);
  });
  it("403 URL in title", async () => expect((await pat({ title: "https://e.com", version: 1 })).status).toBe(403));
  it("no DB mutation on URL denial", async () => {
    mockDb.mediaBrief.updateMany.mockClear();
    await pat({ description: "https://e.com", version: 1 });
    expect(mockDb.mediaBrief.updateMany).not.toHaveBeenCalled();
  });
  it("no DB mutation on asset URL denial", async () => {
    mockDb.mediaBrief.updateMany.mockClear();
    await pat({ assetMetadata: { thumbnailUrl: "https://cdn.e/t" }, version: 1 });
    expect(mockDb.mediaBrief.updateMany).not.toHaveBeenCalled();
  });
  it("403 view-only cannot manage fields", async () => {
    vi.mocked(caps.userHasCapability).mockImplementation(async (_: any, cap: string) => cap === "media.workspace.view");
    expect((await pat({ title: "Hijack", version: 1 })).status).toBe(403);
  });
});
