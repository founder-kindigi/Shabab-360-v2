import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  capability: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  revisionCreate: vi.fn(),
  revisionUpdate: vi.fn(),
  revisionDelete: vi.fn(),
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
  registrationFormRevision: { create: mocks.revisionCreate, update: mocks.revisionUpdate, delete: mocks.revisionDelete },
  $transaction: mocks.transaction,
} }));

import { NextResponse } from "next/server";
import { POST } from "./route";

const hq = { id: "hq-1", role: "super_admin", assignedCityId: null };
const head = { id: "head-1", role: "city_head", assignedCityId: "city-1" };
const fields = [{ key: "fullName", label: "Full Name", type: "short_text", required: true }];
const settings = { eligibilityText: "Open to all", feeText: "Free", privacyNotice: "Notice", contactConsentText: "Consent", successText: "Received" };
const publishableForm = {
  id: "form-1", slug: "murabbi-training-2026", ownerCityId: "city-1", title: "Murabbi Training", intro: "Welcome",
  status: "draft", version: 2, publishedVersion: 0, ownerCity: { isActive: true },
  draftSchemaJson: JSON.stringify(fields), draftSettingsJson: JSON.stringify(settings),
};
const context = { params: Promise.resolve({ id: "form-1" }) };
const request = (body: unknown) =>
  new Request("http://localhost/api/admin/registration-forms/form-1/publish", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });

describe("admin registration form publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: hq });
    mocks.capability.mockImplementation(async (_capability: string, user: unknown) => ({ user }));
    mocks.findUnique.mockResolvedValue(publishableForm);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.revisionCreate.mockResolvedValue({ id: "rev-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        registrationForm: { updateMany: mocks.updateMany },
        registrationFormRevision: { create: mocks.revisionCreate },
        auditLog: { create: mocks.audit },
      }));
  });

  it("rejects a malformed publish request", async () => {
    expect((await POST(request({}), context)).status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("hides a form owned by another city from a city head", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    mocks.findUnique.mockResolvedValue({ ...publishableForm, ownerCityId: "city-2" });
    expect((await POST(request({ version: 2 }), context)).status).toBe(404);
  });

  it("refuses to publish while the owning city is inactive", async () => {
    mocks.findUnique.mockResolvedValue({ ...publishableForm, ownerCity: { isActive: false } });
    expect((await POST(request({ version: 2 }), context)).status).toBe(409);
  });

  it("rejects a stale version", async () => {
    expect((await POST(request({ version: 1 }), context)).status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid saved draft", async () => {
    mocks.findUnique.mockResolvedValue({ ...publishableForm, draftSchemaJson: JSON.stringify([{ key: "fullName" }]) });
    const response = await POST(request({ version: 2 }), context);
    expect(response.status).toBe(400);
    expect(mocks.revisionCreate).not.toHaveBeenCalled();
  });

  it("rejects a draft that fails publication requirements", async () => {
    mocks.findUnique.mockResolvedValue({ ...publishableForm, draftSettingsJson: JSON.stringify({ ...settings, privacyNotice: "" }) });
    const response = await POST(request({ version: 2 }), context);
    expect(response.status).toBe(400);
    expect(mocks.revisionCreate).not.toHaveBeenCalled();
  });

  it("freezes the first revision and returns the public path", async () => {
    const response = await POST(request({ version: 2 }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "published", version: 3, publishedVersion: 1, publicPath: "/register/forms/murabbi-training-2026" });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "form-1", version: 2 } }));
    const revision = mocks.revisionCreate.mock.calls[0][0].data;
    expect(revision).toMatchObject({ formId: "form-1", version: 1, title: "Murabbi Training" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "registration_form_publish" }) }));
  });

  it("keeps earlier revisions immutable when republishing", async () => {
    mocks.findUnique
      .mockResolvedValueOnce(publishableForm)
      .mockResolvedValueOnce({ ...publishableForm, version: 3, publishedVersion: 1, title: "Updated Training" });
    await POST(request({ version: 2 }), context);
    await POST(request({ version: 3 }), context);
    expect(mocks.revisionCreate.mock.calls.map((call) => call[0].data.version)).toEqual([1, 2]);
    expect(mocks.revisionCreate.mock.calls.map((call) => call[0].data.title)).toEqual(["Murabbi Training", "Updated Training"]);
    expect(mocks.revisionUpdate).not.toHaveBeenCalled();
    expect(mocks.revisionDelete).not.toHaveBeenCalled();
  });

  it("returns a conflict if the row changed between read and write", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request({ version: 2 }), context);
    expect(response.status).toBe(409);
    expect(mocks.revisionCreate).not.toHaveBeenCalled();
  });
});
