import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: { staffMeta: { findMany: mocks.findMany } } }));

import { GET } from "./route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/admin/parks/[id]/eligible-assistants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "hq-1", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "hq-1", role: "super_admin" } });
  });

  it("denies unauthenticated callers without querying staff", async () => {
    mocks.requireAuth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const response = await GET(new Request("http://localhost/api/admin/parks/p1/eligible-assistants"), context("p1"));

    expect(response.status).toBe(401);
    expect(mocks.requireCapability).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("denies scoped staff even if they have a park assignment", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "staff-1", role: "park_lead", assignedParkId: "p1" } });

    const response = await GET(new Request("http://localhost/api/admin/parks/p1/eligible-assistants"), context("p1"));

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("requires access scope management capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(new Request("http://localhost/api/admin/parks/p1/eligible-assistants"), context("p1"));

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("access.scope.manage", expect.any(Object));
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects an empty park identifier before querying staff", async () => {
    const response = await GET(new Request("http://localhost/api/admin/parks//eligible-assistants"), context(" "));

    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns only active same-park Murabbis and teaching Park Leads", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "m1", role: "murabbi", user: { name: "Murabbi One" } },
      { id: "l1", role: "park_lead", user: { name: "Lead Two" } },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/parks/p1/eligible-assistants"), context("p1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { id: "m1", name: "Murabbi One", role: "murabbi" },
        { id: "l1", name: "Lead Two", role: "park_lead" },
      ],
    });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        assignedParkId: "p1",
        user: { isActive: true },
        OR: [
          { role: "murabbi" },
          { role: "park_lead", assignedGroupId: { not: null }, assignedGroup: { parkId: "p1" } },
        ],
      },
      select: { id: true, role: true, user: { select: { name: true } } },
    }));
  });
});
