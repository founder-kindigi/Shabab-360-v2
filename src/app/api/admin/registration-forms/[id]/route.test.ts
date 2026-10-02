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
import { GET, PATCH } from "./route";

const hq = { id: "hq-1", role: "super_admin", assignedCityId: null };
const head = { id: "head-1", role: "city_head", assignedCityId: "city-1" };
const fields = [{ key: "fullName", label: "Full Name", type: "short_text", required: true }];
const settings = { eligibilityText: "", feeText: "", privacyNotice: "Notice", contactConsentText: "Consent", successText: "Received" };
const formRow = {
  id: "form-1", slug: "murabbi-training-2026", ownerCityId: "city-1", title: "Murabbi Training", intro: "Welcome",
  status: "draft", version: 2, publishedVersion: 0,
  draftSchemaJson: JSON.stringify(fields), draftSettingsJson: JSON.stringify(settings),
  createdAt: new Date("2026-09-29T00:00:00Z"), updatedAt: new Date("2026-09-29T00:00:00Z"),
};
const context = { params: Promise.resolve({ id: "form-1" }) };
const getRequest = new Request("http://localhost/api/admin/registration-forms/form-1");
const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/admin/registration-forms/form-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("admin registration form detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: hq });
    mocks.capability.mockImplementation(async (_capability: string, user: unknown) => ({ user }));
    mocks.findUnique.mockResolvedValue(formRow);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({ registrationForm: { updateMany: mocks.updateMany }, auditLog: { create: mocks.audit } }));
  });

  it("denies an unauthenticated caller", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await GET(getRequest, context)).status).toBe(401);
  });

  it("hides a form owned by another city from a city head", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    mocks.findUnique.mockResolvedValue({ ...formRow, ownerCityId: "city-2" });
    expect((await GET(getRequest, context)).status).toBe(404);
  });

  it("returns a normal draft with parsed fields and settings", async () => {
    const response = await GET(getRequest, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.fields).toEqual(fields);
    expect(body.data.settings.privacyNotice).toBe("Notice");
    expect(body.data.publishedVersion).toBe(0);
  });

  it("returns an empty draft without treating it as corrupt", async () => {
    mocks.findUnique.mockResolvedValue({ ...formRow, draftSchemaJson: "[]" });
    const response = await GET(getRequest, context);
    expect(response.status).toBe(200);
    expect((await response.json()).data.fields).toEqual([]);
  });

  it("reports a malformed saved draft as temporarily unavailable", async () => {
    mocks.findUnique.mockResolvedValue({ ...formRow, draftSchemaJson: JSON.stringify([{ key: "fullName" }]) });
    expect((await GET(getRequest, context)).status).toBe(503);
  });

  it("rejects an update with no changed fields", async () => {
    const response = await PATCH(patchRequest({ version: 2 }), context);
    expect(response.status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("hides a form owned by another city from a city head update", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-2", version: 2, status: "draft" });
    const response = await PATCH(patchRequest({ version: 2, title: "Changed" }), context);
    expect(response.status).toBe(404);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a stale version before writing", async () => {
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-1", version: 5, status: "draft" });
    const response = await PATCH(patchRequest({ version: 2, title: "Changed" }), context);
    expect(response.status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("increments the optimistic version and audits the changed fields", async () => {
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-1", version: 2, status: "draft" });
    const response = await PATCH(patchRequest({ version: 2, title: "Changed" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 3, status: "draft" });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "form-1", version: 2 } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "registration_form_draft_update" }) }));
  });

  it("returns a conflict if the row changed between read and write", async () => {
    mocks.findUnique.mockResolvedValue({ ownerCityId: "city-1", version: 2, status: "draft" });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(patchRequest({ version: 2, title: "Changed" }), context);
    expect(response.status).toBe(409);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
