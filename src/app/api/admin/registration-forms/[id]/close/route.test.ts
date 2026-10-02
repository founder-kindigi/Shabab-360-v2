import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  capability: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", async () => {
  const { NextResponse } = await import("next/server");
  const { canAccessResourceScope } = await import("@/lib/auth/scope");
  return {
    requireAuth: mocks.auth,
    requireCapability: mocks.capability,
    requireResourceScope: (user: never, scope: never, roles: never) =>
      canAccessResourceScope(user, scope, roles)
        ? null
        : NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
});

vi.mock("@/lib/db", () => ({ db: {
  registrationForm: { findUnique: mocks.findUnique, updateMany: mocks.updateMany },
  $transaction: mocks.transaction,
} }));

import { NextResponse } from "next/server";
import { POST } from "./route";

const hq = { id: "hq-1", role: "super_admin", assignedCityId: null };
const head = { id: "head-1", role: "city_head", assignedCityId: "city-1" };
const context = { params: Promise.resolve({ id: "form-1" }) };
const request = (body: unknown) =>
  new Request("http://localhost/api/admin/registration-forms/form-1/close", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });

describe("admin registration form close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: hq });
    mocks.capability.mockImplementation(async (_capability: string, user: unknown) => ({ user }));
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-1", status: "published", version: 4 });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({ registrationForm: { updateMany: mocks.updateMany }, auditLog: { create: mocks.audit } }));
  });

  it("rejects a malformed close request", async () => {
    expect((await POST(request({}), context)).status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("hides a form owned by another city from a city head", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-2", status: "published", version: 4 });
    expect((await POST(request({ version: 4 }), context)).status).toBe(404);
  });

  it("rejects a stale version", async () => {
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-1", status: "published", version: 4 });
    const response = await POST(request({ version: 3 }), context);
    expect(response.status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("does not close a form that is not published", async () => {
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-1", status: "closed", version: 4 });
    const response = await POST(request({ version: 4 }), context);
    expect(response.status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("closes a published form and audits the new status", async () => {
    const response = await POST(request({ version: 4 }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "closed", version: 5 });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "form-1", version: 4, status: "published" } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "registration_form_close" }) }));
  });

  it("returns a conflict if the row changed between read and write", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request({ version: 4 }), context);
    expect(response.status).toBe(409);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
