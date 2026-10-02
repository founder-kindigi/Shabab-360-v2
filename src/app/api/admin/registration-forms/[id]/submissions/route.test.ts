import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  capability: vi.fn(),
  formFind: vi.fn(),
  submissionFindMany: vi.fn(),
  submissionCount: vi.fn(),
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
  registrationForm: { findUnique: mocks.formFind },
  registrationFormSubmission: { findMany: mocks.submissionFindMany, count: mocks.submissionCount },
} }));

import { NextResponse } from "next/server";
import { GET } from "./route";

const hq = { id: "hq-1", role: "super_admin", assignedCityId: null };
const head = { id: "head-1", role: "city_head", assignedCityId: "city-1" };
const context = { params: Promise.resolve({ id: "form-1" }) };
const request = (query = "") => new Request(`http://localhost/api/admin/registration-forms/form-1/submissions${query}`);

describe("admin registration form submissions list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: hq });
    mocks.capability.mockImplementation(async (_capability: string, user: unknown) => ({ user }));
    mocks.formFind.mockResolvedValue({ ownerCityId: "city-1" });
    mocks.submissionFindMany.mockResolvedValue([{ id: "sub-1", reference: "REG-1", status: "submitted", createdAt: new Date("2026-09-29T00:00:00Z"), revision: { version: 1 } }]);
    mocks.submissionCount.mockResolvedValue(1);
  });

  it("denies an unauthenticated caller", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await GET(request(), context)).status).toBe(401);
    expect(mocks.formFind).not.toHaveBeenCalled();
  });

  it("rejects an invalid pagination query", async () => {
    expect((await GET(request("?page=0"), context)).status).toBe(400);
    expect(mocks.submissionFindMany).not.toHaveBeenCalled();
  });

  it("hides another city's form from a city head", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    mocks.formFind.mockResolvedValue({ ownerCityId: "city-2" });
    expect((await GET(request(), context)).status).toBe(404);
    expect(mocks.submissionFindMany).not.toHaveBeenCalled();
  });

  it("scopes the submission query to the form", async () => {
    const response = await GET(request("?page=2&pageSize=10"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "sub-1", reference: "REG-1", status: "submitted", createdAt: expect.any(String), revision: { version: 1 } }], total: 1, page: 2, pageSize: 10 });
    expect(mocks.submissionFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { formId: "form-1" }, skip: 10, take: 10 }));
    expect(mocks.submissionCount).toHaveBeenCalledWith({ where: { formId: "form-1" } });
  });
});
