import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  announcementFindMany: vi.fn(),
  announcementCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    announcement: {
      findMany: mocks.announcementFindMany,
      create: mocks.announcementCreate,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET, POST } from "./route";

describe("GET /api/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(null);
    mocks.announcementFindMany.mockResolvedValue([]);
  });

  it("rejects an unsupported role filter before querying announcements", async () => {
    const response = await GET(new NextRequest("http://localhost/api/announcements?role=visitor"));

    expect(response.status).toBe(400);
    expect(mocks.announcementFindMany).not.toHaveBeenCalled();
  });

  it("keeps the expiry condition when applying a search filter", async () => {
    const response = await GET(new NextRequest("http://localhost/api/announcements?search=trip"));

    expect(response.status).toBe(200);
    expect(mocks.announcementFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({ OR: expect.arrayContaining([{ expiresAt: null }]) }),
          expect.objectContaining({ OR: expect.arrayContaining([
            { title: { contains: "trip", mode: "insensitive" } },
          ]) }),
        ]),
      }),
    }));
  });

  it("denies publishing before writing an announcement", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(new NextRequest("http://localhost/api/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Park notice",
        content: "Class timing changed.",
        targetRoles: ["park_admin"],
      }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.announcementCreate).not.toHaveBeenCalled();
  });
});
