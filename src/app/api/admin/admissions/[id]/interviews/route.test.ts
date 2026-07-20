import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  applicationFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: { admissionApplication: { findUnique: mocks.applicationFindUnique } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

describe("POST /api/admin/admissions/[id]/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
  });

  it("denies the admissions capability before reading the application", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(
      new NextRequest("http://localhost/api/admin/admissions/application-1/interviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scheduledDate: "2026-07-20" }),
      }),
      { params: Promise.resolve({ id: "application-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.applicationFindUnique).not.toHaveBeenCalled();
  });
});
