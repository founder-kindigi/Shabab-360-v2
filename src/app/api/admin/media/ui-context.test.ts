import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  resolveMediaCity: vi.fn(),
  requireMediaAccess: vi.fn(),
  cityFindMany: vi.fn(),
  teamFindFirst: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/media/media-auth", () => ({
  resolveMediaCity: mocks.resolveMediaCity,
  requireMediaAccess: mocks.requireMediaAccess,
}));
vi.mock("@/lib/db", () => ({
  db: {
    city: { findMany: mocks.cityFindMany },
    collaborationTeam: { findFirst: mocks.teamFindFirst },
  },
}));

import { GET } from "./ui-context/route";

const hqUser = { id: "user_1", role: "super_admin" };

function request(query = "") {
  return new NextRequest(`http://localhost/api/admin/media/ui-context${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuth.mockResolvedValue({ user: hqUser });
  mocks.resolveMediaCity.mockResolvedValue({ authorized: true, cityId: "city_lhr" });
  mocks.requireMediaAccess.mockResolvedValue({ authorized: true, cityId: "city_lhr" });
  mocks.cityFindMany.mockResolvedValue([{ id: "city_lhr", name: "Lahore" }]);
  mocks.teamFindFirst.mockResolvedValue({ id: "team_media", name: "Media" });
});

describe("GET /api/admin/media/ui-context", () => {
  it("passes through unauthenticated responses", async () => {
    mocks.requireAuth.mockResolvedValue(new NextResponse("Unauthorized", { status: 401 }));
    expect((await GET(request())).status).toBe(401);
  });

  it("returns city selection only for HQ before a city is selected", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      canView: false,
      canCreate: false,
      isHq: true,
      cityId: null,
      cities: [{ id: "city_lhr", name: "Lahore" }],
      mediaTeam: null,
    });
    expect(mocks.resolveMediaCity).not.toHaveBeenCalled();
    expect(mocks.teamFindFirst).not.toHaveBeenCalled();
  });

  it("propagates city-scope denials", async () => {
    mocks.resolveMediaCity.mockResolvedValue({ authorized: false, status: 403, error: "Forbidden" });
    const response = await GET(request("?cityId=city_khi"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("denies a selected city without media view access", async () => {
    mocks.requireMediaAccess
      .mockResolvedValueOnce({ authorized: false, status: 403, error: "Missing view capability" })
      .mockResolvedValueOnce({ authorized: true, cityId: "city_lhr" });
    expect((await GET(request("?cityId=city_lhr"))).status).toBe(403);
  });

  it("returns server-derived capability flags after validated city access", async () => {
    mocks.requireMediaAccess
      .mockResolvedValueOnce({ authorized: true, cityId: "city_lhr" })
      .mockResolvedValueOnce({ authorized: false, status: 403, error: "Missing manage capability" });
    const response = await GET(request("?cityId=city_lhr"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      canView: true,
      canCreate: false,
      isHq: true,
      cityId: "city_lhr",
      cities: [{ id: "city_lhr", name: "Selected city" }],
      mediaTeam: { id: "team_media", name: "Media" },
    });
  });
});
