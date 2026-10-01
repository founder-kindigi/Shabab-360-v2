import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: vi.fn() }));
vi.mock("@/lib/auth/events-scope", () => ({ resolveActorCity: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLogData: vi.fn((data) => data) }));
vi.mock("@/lib/db", () => ({ db: { collaborationTeam: { findUnique: vi.fn() }, staffTeamMembership: { findFirst: vi.fn() }, teamDocumentLink: { findMany: vi.fn(), create: vi.fn() }, externalLinkPolicy: { findUnique: vi.fn() }, $transaction: vi.fn() } }));

const params = { params: Promise.resolve({ id: "team_1" }) };

describe("Team document links API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "user_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({ cityId: "city_1", isActive: true } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_1" } as any);
    vi.mocked(userHasCapability).mockResolvedValue(true);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ staffMetaId: "staff_1" } as any);
    vi.mocked(db.externalLinkPolicy.findUnique).mockResolvedValue({ allowedDomains: JSON.stringify(["drive.google.com"]), requireInterstitialWarning: true } as any);
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({ teamDocumentLink: { create: db.teamDocumentLink.create }, auditLog: { create: vi.fn() } }));
  });

  it("returns 401 before any team lookup", async () => {
    vi.mocked(requireAuth).mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any);
    const response = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/documents"), params);
    expect(response.status).toBe(401);
    expect(db.collaborationTeam.findUnique).not.toHaveBeenCalled();
  });

  it("denies foreign city access before listing links", async () => {
    vi.mocked(resolveActorCity).mockResolvedValue({ error: "City mismatch", cityId: "city_2" } as any);
    const response = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/documents"), params);
    expect(response.status).toBe(403);
    expect(db.teamDocumentLink.findMany).not.toHaveBeenCalled();
  });

  it("returns links and the persisted warning control to active members", async () => {
    vi.mocked(userHasCapability).mockResolvedValue(false);
    vi.mocked(db.teamDocumentLink.findMany).mockResolvedValue([{ id: "doc_1", label: "Guide", url: "https://drive.google.com/guide", createdAt: new Date() }] as any);
    const response = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/documents"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ requireInterstitialWarning: true, data: [{ id: "doc_1", label: "Guide" }] });
  });

  it("rejects an unapproved domain before opening a transaction", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/teams/team_1/documents", { method: "POST", body: JSON.stringify({ label: "Unsafe", url: "https://evil.example/file" }) }), params);
    expect(response.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("creates an approved link and audit record atomically", async () => {
    vi.mocked(db.teamDocumentLink.create).mockResolvedValue({ id: "doc_1", label: "Guide", url: "https://drive.google.com/guide" } as any);
    const auditCreate = vi.fn();
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({ teamDocumentLink: { create: db.teamDocumentLink.create }, auditLog: { create: auditCreate } }));
    const response = await POST(new NextRequest("http://localhost/api/admin/teams/team_1/documents", { method: "POST", body: JSON.stringify({ label: "Guide", url: "https://drive.google.com/guide" }) }), params);
    expect(response.status).toBe(201);
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });
});
