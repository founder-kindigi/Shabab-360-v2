import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST as importGuardians } from "./guardians/route";
import { POST as importParticipants } from "./participants/route";
import { POST as importUsers } from "./users/route";

const request = () => new NextRequest("http://localhost/api/admin/import", { method: "POST" });

describe("bulk import capability gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it.each([
    ["staff", importUsers, "access.scope.manage"],
    ["participants", importParticipants, "students.manage"],
    ["guardians", importGuardians, "guardians.manage"],
  ])("blocks %s imports without %s capability", async (_name, handler, capability) => {
    const response = await handler(request());

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith(capability);
  });
});
