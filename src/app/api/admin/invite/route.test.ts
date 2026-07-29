import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  cityFindUnique: vi.fn(),
  parkFindFirst: vi.fn(),
  groupFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  sendInviteEmail: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    city: { findUnique: mocks.cityFindUnique },
    park: { findFirst: mocks.parkFindFirst },
    group: { findFirst: mocks.groupFindFirst },
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/lib/email-service", () => ({ sendInviteEmail: mocks.sendInviteEmail }));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.sendInviteEmail.mockResolvedValue(undefined);
  });

  it("rejects a city-scoped role without a city assignment before any write", async () => {
    const response = await POST(
      request({ name: "City Head", email: "city@example.test", role: "city_head" })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: { assignedCityId: ["City assignment is required for this role"] },
    });
    expect(body.temporaryPassword).toBeUndefined();
    expect(mocks.cityFindUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a park that does not belong to the assigned city", async () => {
    mocks.cityFindUnique.mockResolvedValue({ id: "city-1" });
    mocks.parkFindFirst.mockResolvedValue(null);

    const response = await POST(
      request({
        name: "Park Admin",
        email: "park@example.test",
        role: "park_admin",
        assignedCityId: "city-1",
        assignedParkId: "park-other-city",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        assignedParkId: ["Selected park does not exist or does not belong to the selected city"],
      },
    });
    expect(mocks.parkFindFirst).toHaveBeenCalledWith({
      where: { id: "park-other-city", isActive: true, cityId: "city-1" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns the role guard response before parsing or writing the invitation", async () => {
    mocks.requireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(
      request({ name: "Blocked", email: "blocked@example.test", role: "super_admin" })
    );

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires scope administration capability before parsing or creating an account", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(
      request({ name: "Blocked", email: "blocked@example.test", role: "program_admin" })
    );

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("access.scope.manage");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a forced-reset account and returns its generated password only in the response", async () => {
    const user = {
      id: "user-1",
      name: "Program Admin",
      email: "admin@example.test",
      phone: null,
      isActive: true,
      mustResetPwd: true,
      createdAt: new Date(),
      staffMeta: null,
    };
    const createUser = vi.fn().mockResolvedValue(user);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback) => callback({
      user: {
        create: createUser,
        findUnique: vi.fn().mockResolvedValue(user),
      },
      staffMeta: { create: vi.fn().mockResolvedValue({ id: "staff-1" }) },
    }));

    const response = await POST(
      request({ name: "Program Admin", email: "admin@example.test", role: "program_admin" })
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store, no-cache, max-age=0, must-revalidate");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    const body = await response.json();
    expect(body.user).toMatchObject({
      id: user.id,
      name: user.name,
      email: user.email,
      mustResetPwd: true,
    });
    expect(body.temporaryPassword).toEqual(expect.any(String));
    expect(body.temporaryPassword.length).toBeGreaterThan(20);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ mustResetPwd: true }),
    }));
    expect(mocks.sendInviteEmail).toHaveBeenCalledWith(
      { id: user.id, email: user.email, name: user.name },
      "program_admin"
    );
    expect(JSON.stringify(mocks.sendInviteEmail.mock.calls)).not.toContain(body.temporaryPassword);
  });
});
