import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  announcementFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: { announcement: { findUnique: mocks.announcementFindUnique } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { DELETE } from "./route";

describe("DELETE /api/announcements/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("denies deletion before reading the announcement", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await DELETE(
      new NextRequest("http://localhost/api/announcements/announcement-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "announcement-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.announcementFindUnique).not.toHaveBeenCalled();
  });
});
