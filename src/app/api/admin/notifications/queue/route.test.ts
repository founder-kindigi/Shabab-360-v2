import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: { notification: { findMany: mocks.findMany, count: mocks.count, updateMany: mocks.updateMany } },
}));

import { GET, PATCH } from "./route";

describe("notification queue capability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  });

  it.each([
    ["read", () => GET(new NextRequest("http://localhost/api/admin/notifications/queue"))],
    ["update", () => PATCH(new NextRequest("http://localhost/api/admin/notifications/queue", { method: "PATCH" }))],
  ])("requires settings capability before queue %s", async (_name, run) => {
    const response = await run();

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("settings.manage");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
