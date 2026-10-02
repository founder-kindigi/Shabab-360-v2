import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  capability: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  cityFind: vi.fn(),
  formCreate: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", async () => {
  const { NextResponse } = await import("next/server");
  const { canAccessResourceScope } = await import("@/lib/auth/scope");
  return {
    requireAuth: mocks.auth,
    requireCapability: mocks.capability,
    requireResourceScope: (user: unknown, scope: unknown, roles: readonly string[]) =>
      canAccessResourceScope(user as never, scope as never, roles as never)
        ? null
        : NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
});

vi.mock("@/lib/db", () => ({ db: {
  registrationForm: { findMany: mocks.findMany, count: mocks.count },
  city: { findUnique: mocks.cityFind },
  $transaction: mocks.transaction,
} }));

import { NextResponse } from "next/server";
import { GET, POST } from "./route";

const hq = { id: "hq-1", role: "super_admin", assignedCityId: null };
const head = { id: "head-1", role: "city_head", assignedCityId: "city-1" };
const listUrl = (query = "") => new Request(`http://localhost/api/admin/registration-forms${query}`);
const createRequest = (body: unknown) =>
  new Request("http://localhost/api/admin/registration-forms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const draft = { slug: "murabbi-training-2026", ownerCityId: "city-1", title: "Murabbi Training 2026", intro: "Welcome", template: "atfal_style" };

describe("admin registration forms list and create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: hq });
    mocks.capability.mockImplementation(async (_capability: string, user: unknown) => ({ user }));
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.cityFind.mockResolvedValue({ isActive: true });
    mocks.formCreate.mockResolvedValue({ id: "form-1", slug: draft.slug, status: "draft", version: 1 });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        registrationForm: { create: mocks.formCreate },
        auditLog: { create: mocks.audit },
      }));
  });

  it("denies an unauthenticated caller before querying", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const response = await GET(listUrl());
    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("denies a role that is not a form manager", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "pa-1", role: "park_admin", assignedParkId: "park-1" } });
    const response = await GET(listUrl());
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("denies a manager without the admissions capability", async () => {
    mocks.capability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(listUrl());
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects a malformed list query", async () => {
    const response = await GET(listUrl("?page=0"));
    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("denies a city head with no assigned city scope", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "head-2", role: "city_head", assignedCityId: null } });
    const response = await GET(listUrl());
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("denies a city head requesting another city before querying", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    const response = await GET(listUrl("?cityId=city-2"));
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("scopes the list query to the city head's own city", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    const response = await GET(listUrl("?cityId=city-1"));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerCityId: "city-1" } }));
    expect(mocks.count).toHaveBeenCalledWith({ where: { ownerCityId: "city-1" } });
  });

  it("lets headquarters list across cities when none is requested", async () => {
    const response = await GET(listUrl());
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("rejects invalid create details without touching the database", async () => {
    const response = await POST(createRequest({ ownerCityId: "city-1", title: "No slug" }));
    expect(response.status).toBe(400);
    expect(mocks.cityFind).not.toHaveBeenCalled();
    expect(mocks.formCreate).not.toHaveBeenCalled();
  });

  it("denies a city head creating a form owned by another city", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    const response = await POST(createRequest({ ...draft, ownerCityId: "city-2" }));
    expect(response.status).toBe(403);
    expect(mocks.cityFind).not.toHaveBeenCalled();
    expect(mocks.formCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown or inactive owner city", async () => {
    mocks.cityFind.mockResolvedValue({ isActive: false });
    const response = await POST(createRequest(draft));
    expect(response.status).toBe(404);
    expect(mocks.formCreate).not.toHaveBeenCalled();
  });

  it("creates a draft with the Atfal starter and writes an audit record", async () => {
    const response = await POST(createRequest(draft));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "form-1", slug: draft.slug, status: "draft", version: 1 });
    const createArgs = mocks.formCreate.mock.calls[0][0].data;
    expect(JSON.parse(createArgs.draftSchemaJson).length).toBeGreaterThan(0);
    expect(createArgs.ownerCityId).toBe("city-1");
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "registration_form_create" }) }));
  });

  it("starts a blank form with an empty draft schema", async () => {
    await POST(createRequest({ ...draft, template: "blank" }));
    expect(mocks.formCreate.mock.calls[0][0].data.draftSchemaJson).toBe("[]");
  });

  it("returns a conflict when the slug already exists", async () => {
    mocks.transaction.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const response = await POST(createRequest(draft));
    expect(response.status).toBe(409);
  });
});
