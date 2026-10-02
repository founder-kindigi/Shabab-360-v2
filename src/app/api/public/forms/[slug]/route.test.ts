import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ formFind: vi.fn(), revisionFind: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  registrationForm: { findUnique: mocks.formFind },
  registrationFormRevision: { findUnique: mocks.revisionFind },
} }));

import { GET } from "./route";

const fields = [{ key: "fullName", label: "Full Name", type: "short_text", required: true }];
const settings = { eligibilityText: "Open to all", feeText: "Free", privacyNotice: "Notice", contactConsentText: "Consent", successText: "Received" };
const form = { id: "form-1", slug: "murabbi-training-2026", status: "published", publishedVersion: 1, ownerCityId: "city-1", createdBy: "hq-1", ownerCity: { isActive: true } };
const revision = { version: 1, title: "Murabbi Training", intro: "Welcome", schemaJson: JSON.stringify(fields), settingsJson: JSON.stringify(settings) };
const context = { params: Promise.resolve({ slug: "murabbi-training-2026" }) };
const request = new Request("http://localhost/api/public/forms/murabbi-training-2026");

describe("public registration form projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.formFind.mockResolvedValue(form);
    mocks.revisionFind.mockResolvedValue(revision);
  });

  it("rejects a malformed slug before querying", async () => {
    const response = await GET(request, { params: Promise.resolve({ slug: "Bad Slug" }) });
    expect(response.status).toBe(404);
    expect(mocks.formFind).not.toHaveBeenCalled();
  });

  it("hides an unpublished form", async () => {
    mocks.formFind.mockResolvedValue({ ...form, publishedVersion: 0 });
    expect((await GET(request, context)).status).toBe(404);
  });

  it("hides a draft form", async () => {
    mocks.formFind.mockResolvedValue({ ...form, status: "draft" });
    expect((await GET(request, context)).status).toBe(404);
  });

  it("hides a form whose owning city is inactive", async () => {
    mocks.formFind.mockResolvedValue({ ...form, ownerCity: { isActive: false } });
    expect((await GET(request, context)).status).toBe(404);
  });

  it("reports a missing published revision as temporarily unavailable", async () => {
    mocks.revisionFind.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(503);
  });

  it("returns only the current published revision without internal fields", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ slug: "murabbi-training-2026", title: "Murabbi Training", publishedVersion: 1, isOpen: true });
    expect(body.fields).toEqual(fields);
    expect(body.id).toBeUndefined();
    expect(body.ownerCityId).toBeUndefined();
    expect(body.createdBy).toBeUndefined();
    expect(body.ownerCity).toBeUndefined();
  });

  it("keeps a closed form readable but not open", async () => {
    mocks.formFind.mockResolvedValue({ ...form, status: "closed" });
    const response = await GET(request, context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.isOpen).toBe(false);
    expect(body.fields).toEqual(fields);
  });
});
