import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  auditLogFindMany: vi.fn(),
  auditLogCount: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    auditLog: {
      findMany: mocks.auditLogFindMany,
      count: mocks.auditLogCount,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/admin/audit-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("rejects non-privileged users before querying the audit trail", async () => {
    mocks.requireRole.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/audit-log"));

    expect(response.status).toBe(403);
    expect(mocks.requireRole).toHaveBeenCalledWith(["super_admin", "program_admin"]);
    expect(mocks.auditLogFindMany).not.toHaveBeenCalled();
    expect(mocks.auditLogCount).not.toHaveBeenCalled();
  });

  it("denies audit access when the capability is removed", async () => {
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/audit-log"));

    expect(response.status).toBe(403);
    expect(mocks.auditLogFindMany).not.toHaveBeenCalled();
    expect(mocks.auditLogCount).not.toHaveBeenCalled();
  });
});
