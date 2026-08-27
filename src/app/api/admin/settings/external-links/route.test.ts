import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, PUT } from "./route";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize", () => ({ requireCapability: vi.fn(), requireRole: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLogData: vi.fn((data) => data) }));
vi.mock("@/lib/db", () => ({ db: { externalLinkPolicy: { findUnique: vi.fn(), upsert: vi.fn() }, $transaction: vi.fn() } }));

describe("External link policy settings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireRole).mockResolvedValue(null);
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "admin_1" } } as any);
    vi.mocked(db.externalLinkPolicy.findUnique).mockResolvedValue(null);
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({ externalLinkPolicy: { upsert: db.externalLinkPolicy.upsert }, auditLog: { create: vi.fn() } }));
  });

  it("requires the Super Admin role before returning policy", async () => {
    vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }) as any);
    const response = await GET();
    expect(response.status).toBe(403);
    expect(requireCapability).not.toHaveBeenCalled();
  });

  it("rejects unknown policy fields before transaction writes", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/admin/settings/external-links", { method: "PUT", body: JSON.stringify({ allowedDomains: ["drive.google.com"], requireInterstitialWarning: true, extra: true }) }));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("persists a valid allowlist and an audited warning setting", async () => {
    vi.mocked(db.externalLinkPolicy.upsert).mockResolvedValue({ requireInterstitialWarning: false } as any);
    const auditCreate = vi.fn();
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({ externalLinkPolicy: { upsert: db.externalLinkPolicy.upsert }, auditLog: { create: auditCreate } }));
    const response = await PUT(new NextRequest("http://localhost/api/admin/settings/external-links", { method: "PUT", body: JSON.stringify({ allowedDomains: ["drive.google.com"], requireInterstitialWarning: false }) }));
    expect(response.status).toBe(200);
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ allowedDomains: ["drive.google.com"], requireInterstitialWarning: false });
  });
});
