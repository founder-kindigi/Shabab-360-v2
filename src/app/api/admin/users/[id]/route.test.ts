import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  cityFindUnique: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindUnique: vi.fn(),
  transaction: vi.fn(),
  txUserUpdate: vi.fn(),
  txStaffMetaUpsert: vi.fn(),
  txStaffMetaUpdateMany: vi.fn(),
  txAuditCreate: vi.fn(),
  createAuditLogData: vi.fn((data) => data),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
    },
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    city: { findUnique: mocks.cityFindUnique },
    park: { findUnique: mocks.parkFindUnique },
    group: { findUnique: mocks.groupFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ createAuditLogData: mocks.createAuditLogData }));

import { DELETE, PATCH } from "./route";

const currentUser = { user: { id: "admin-1", role: "super_admin" } };
const oldUser = {
  name: "Park Admin",
  email: "admin@example.test",
  phone: null,
  isActive: true,
  mustResetPwd: false,
};
const oldMeta = {
  id: "staff-1",
  role: "park_admin",
  assignedCityId: "city-1",
  assignedParkId: "park-1",
  assignedGroupId: null,
  assistsMurabbiId: null,
  isActive: true,
};

function request(method: "PATCH" | "DELETE", body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/users/user-1", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function routeParams() {
  return { params: Promise.resolve({ id: "user-1" }) };
}

describe("user session invalidation mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue(currentUser);
    mocks.requireCapability.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (work) => work({
      user: { update: mocks.txUserUpdate },
      staffMeta: {
        upsert: mocks.txStaffMetaUpsert,
        updateMany: mocks.txStaffMetaUpdateMany,
      },
      auditLog: { create: mocks.txAuditCreate },
    }));
  });

  it("atomically invalidates the current JWT when a staff scope is reassigned", async () => {
    const updatedUser = { id: "user-1", name: "Park Admin", staffMeta: oldMeta };
    mocks.userFindUnique.mockResolvedValueOnce(oldUser).mockResolvedValueOnce(updatedUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);
    mocks.cityFindUnique.mockResolvedValue({ id: "city-2" });
    mocks.parkFindUnique.mockResolvedValue({ cityId: "city-2" });

    const response = await PATCH(
      request("PATCH", { assignedCityId: "city-2", assignedParkId: "park-2" }),
      routeParams()
    );

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { tokenVersion: { increment: 1 } },
    });
    expect(mocks.txStaffMetaUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      update: expect.objectContaining({ assignedCityId: "city-2", assignedParkId: "park-2" }),
    }));
    expect(mocks.txAuditCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects clearing a required park assignment before opening a transaction", async () => {
    mocks.userFindUnique.mockResolvedValue(oldUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);

    const response = await PATCH(
      request("PATCH", { assignedParkId: null }),
      routeParams()
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { assignedParkId: ["Park assignment is required for this role"] },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("accepts a Murabbi group scoped to its own park when the batch has another anchor park", async () => {
    const updatedUser = { id: "user-1", name: "Murabbi", staffMeta: { ...oldMeta, role: "murabbi", assignedParkId: "park-2", assignedGroupId: "group-2" } };
    mocks.userFindUnique.mockResolvedValueOnce(oldUser).mockResolvedValueOnce(updatedUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);
    mocks.cityFindUnique.mockResolvedValue({ id: "city-1" });
    mocks.parkFindUnique.mockResolvedValue({ cityId: "city-1" });
    mocks.groupFindUnique.mockResolvedValue({
      id: "group-2",
      parkId: "park-2",
      park: { cityId: "city-1" },
      batch: { cityId: "city-1", parkId: "batch-anchor-park", park: { cityId: "city-1" } },
    });

    const response = await PATCH(
      request("PATCH", { role: "murabbi", assignedCityId: "city-1", assignedParkId: "park-2", assignedGroupId: "group-2" }),
      routeParams()
    );

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txStaffMetaUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ assignedParkId: "park-2", assignedGroupId: "group-2" }),
    }));
  });

  it("persists a same-park active Murabbi assistance link without changing Muawin scope", async () => {
    const updatedUser = { id: "user-1", name: "Muawin", staffMeta: { ...oldMeta, role: "muawin", assignedParkId: "park-1", assistsMurabbiId: "staff-murabbi" } };
    mocks.userFindUnique.mockResolvedValueOnce(oldUser).mockResolvedValueOnce(updatedUser);
    mocks.staffMetaFindUnique
      .mockResolvedValueOnce({ ...oldMeta, role: "muawin" })
      .mockResolvedValueOnce({
        id: "staff-murabbi",
        role: "murabbi",
        isActive: true,
        assignedParkId: "park-1",
        assignedGroupId: null,
        user: { isActive: true },
        assignedGroup: null,
      });
    mocks.cityFindUnique.mockResolvedValue({ id: "city-1" });
    mocks.parkFindUnique.mockResolvedValue({ cityId: "city-1" });

    const response = await PATCH(
      request("PATCH", { role: "muawin", assignedCityId: "city-1", assignedParkId: "park-1", assistsMurabbiId: "staff-murabbi" }),
      routeParams()
    );

    expect(response.status).toBe(200);
    expect(mocks.txStaffMetaUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ role: "muawin", assistsMurabbiId: "staff-murabbi" }),
    }));
  });

  it("rejects an inactive or cross-park assistance target before opening a transaction", async () => {
    mocks.userFindUnique.mockResolvedValue(oldUser);
    mocks.staffMetaFindUnique
      .mockResolvedValueOnce({ ...oldMeta, role: "muawin" })
      .mockResolvedValueOnce({
        id: "staff-other-park",
        role: "murabbi",
        isActive: true,
        assignedParkId: "park-2",
        assignedGroupId: null,
        user: { isActive: true },
        assignedGroup: null,
      });
    mocks.cityFindUnique.mockResolvedValue({ id: "city-1" });
    mocks.parkFindUnique.mockResolvedValue({ cityId: "city-1" });

    const response = await PATCH(
      request("PATCH", { role: "muawin", assistsMurabbiId: "staff-other-park" }),
      routeParams()
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { assistsMurabbiId: ["Selected staff member must be an active Murabbi or teaching Park Lead in the assigned park"] },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies scope management before reading a user record", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await PATCH(request("PATCH", { name: "Changed name" }), routeParams());

    expect(response.status).toBe(403);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a City Head attempting to manage staff outside their assigned city", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-2" },
    });
    mocks.userFindUnique.mockResolvedValue(oldUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);

    const response = await PATCH(request("PATCH", { isActive: false }), routeParams());

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("permits a City Head to manage staff in permitted roles within their assigned city", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.userFindUnique.mockResolvedValue(oldUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);
    mocks.cityFindUnique.mockResolvedValue({ id: "city-1" });
    mocks.parkFindUnique.mockResolvedValue({ cityId: "city-1" });

    const response = await PATCH(request("PATCH", { staffMetaIsActive: false }), routeParams());

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("denies a City Head attempting to assign unmanageable roles (e.g. program_admin)", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.userFindUnique.mockResolvedValue(oldUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);

    const response = await PATCH(request("PATCH", { role: "program_admin" }), routeParams());

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a City Head attempting to assign staff to a city other than their own city scope", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.userFindUnique.mockResolvedValue(oldUser);
    mocks.staffMetaFindUnique.mockResolvedValue(oldMeta);

    const response = await PATCH(request("PATCH", { assignedCityId: "city-2" }), routeParams());

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("deactivates the account, staff access, and captured JWT in one transaction", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "user-1", ...oldUser });

    const response = await DELETE(request("DELETE"), routeParams());

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    expect(mocks.txStaffMetaUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { isActive: false },
    });
    expect(mocks.txAuditCreate).toHaveBeenCalledTimes(1);
  });
});
