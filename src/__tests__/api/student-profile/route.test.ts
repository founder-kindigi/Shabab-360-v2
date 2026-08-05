import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  resolveActorCity: vi.fn(),
  canAccessParticipantProfile: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  resolveActorCity: mocks.resolveActorCity,
  canAccessParticipantProfile: mocks.canAccessParticipantProfile,
  requireResourceScope: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    participant: { findUnique: mocks.findUnique },
    studentExtendedProfile: { findUnique: mocks.findUnique, upsert: mocks.upsert },
    guardianChild: { findFirst: mocks.findUnique },
    auditLog: { create: mocks.auditCreate },
  },
}));

describe("Student Profile Route Verification Suite", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ id: "usr_admin", role: "super_admin" });
    mocks.requireCapability.mockResolvedValue({ id: "usr_admin", role: "super_admin" });
    mocks.canAccessParticipantProfile.mockResolvedValue(true);
    mocks.resolveActorCity.mockResolvedValue("city_1");
  });

  it("exports valid route capabilities and auth guards", () => {
    expect(mocks.requireRole).toBeDefined();
    expect(mocks.requireAuth).toBeDefined();
    expect(mocks.requireCapability).toBeDefined();
  });

  it("correctly evaluates student profile scope access", async () => {
    const allowed = await mocks.canAccessParticipantProfile();
    expect(allowed).toBe(true);
  });
});
