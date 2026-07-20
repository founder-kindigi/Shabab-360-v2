import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: { auditLog: { findMany: mocks.findMany, count: mocks.count } },
}));

import { GET } from "./route";

const request = () => new NextRequest("http://localhost/api/notifications/history?page=1&pageSize=20");

describe("activity history privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "park-user-1", role: "park_admin" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "hq-user", role: "super_admin" } });
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
  });

  it("limits non-HQ activity to the caller's own audit rows", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.requireCapability).not.toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "park-user-1" },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }));
  });

  it("requires audit capability before HQ can read global activity", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "hq-user", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("audit.view");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns generic metadata without actor email, entity id, or stored values", async () => {
    mocks.findMany.mockResolvedValue([{
      id: "audit-1",
      action: "update",
      entityType: "PARTICIPANT",
      createdAt: new Date("2026-07-18T10:00:00.000Z"),
      user: { name: "Current User" },
    }]);
    mocks.count.mockResolvedValue(1);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0]).toEqual(expect.objectContaining({
      id: "audit-1",
      actorName: "Current User",
      entityId: null,
    }));
    expect(body.data[0]).not.toHaveProperty("actorEmail");
    expect(body.data[0]).not.toHaveProperty("details");
  });
});
