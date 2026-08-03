import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  resolveMediaCity: vi.fn(),
  requireMediaAccess: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/media/media-auth", () => ({
  resolveMediaCity: mocks.resolveMediaCity,
  requireMediaAccess: mocks.requireMediaAccess,
}));
vi.mock("@/lib/db", () => ({ db: { collaborationTeam: { findFirst: mocks.findFirst } } }));

import { GET } from "./route";

function request() { return new NextRequest("http://localhost/api/admin/media/assignees?cityId=city_lhr"); }

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuth.mockResolvedValue({ user: { id: "u1", role: "super_admin" } });
  mocks.resolveMediaCity.mockResolvedValue({ authorized: true, cityId: "city_lhr" });
  mocks.requireMediaAccess.mockResolvedValue({ authorized: true, cityId: "city_lhr" });
  mocks.findFirst.mockResolvedValue({
    memberships: [
      { staffMeta: { id: "staff_1", user: { name: "Ayesha" } } },
      { staffMeta: { id: "staff_2", user: { name: null } } },
    ],
  });
});

describe("GET /api/admin/media/assignees", () => {
  it("passes through unauthenticated responses", async () => {
    mocks.requireAuth.mockResolvedValue(new NextResponse("Unauthorized", { status: 401 }));
    expect((await GET(request())).status).toBe(401);
  });

  it("returns scope denial without querying the team", async () => {
    mocks.resolveMediaCity.mockResolvedValue({ authorized: false, status: 403, error: "Forbidden" });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("requires workspace-manage capability", async () => {
    mocks.requireMediaAccess.mockResolvedValue({ authorized: false, status: 403, error: "Missing capability" });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns only active Media assignee identifiers and display names", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { id: "staff_1", name: "Ayesha" },
        { id: "staff_2", name: "Media team member" },
      ],
    });
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ cityId: "city_lhr", code: { in: ["MEDIA", "media"] } }),
    }));
  });
});
