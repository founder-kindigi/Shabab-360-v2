import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  capability: vi.fn(),
  formFind: vi.fn(),
  submissionFindFirst: vi.fn(),
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
  registrationFormSubmission: { findFirst: mocks.submissionFindFirst },
} }));

import { NextResponse } from "next/server";
import { GET } from "./route";

const hq = { id: "hq-1", role: "super_admin", assignedCityId: null };
const head = { id: "head-1", role: "city_head", assignedCityId: "city-1" };
const context = { params: Promise.resolve({ id: "form-1", submissionId: "sub-1" }) };
const request = new Request("http://localhost/api/admin/registration-forms/form-1/submissions/sub-1");
const submission = {
  id: "sub-1", reference: "REG-1", status: "submitted", createdAt: new Date("2026-09-29T00:00:00Z"),
  answersJson: JSON.stringify({ fullName: "Synthetic Applicant" }),
  revision: { version: 1, title: "Murabbi Training", schemaJson: JSON.stringify([{ key: "fullName", label: "Full Name", type: "short_text", required: true }]), settingsJson: "{}" },
};

describe("admin registration form submission detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: hq });
    mocks.capability.mockImplementation(async (_capability: string, user: unknown) => ({ user }));
    mocks.formFind.mockResolvedValue({ ownerCityId: "city-1" });
    mocks.submissionFindFirst.mockResolvedValue(submission);
  });

  it("hides another city's submission from a city head", async () => {
    mocks.auth.mockResolvedValue({ user: head });
    mocks.formFind.mockResolvedValue({ ownerCityId: "city-2" });
    expect((await GET(request, context)).status).toBe(404);
    expect(mocks.submissionFindFirst).not.toHaveBeenCalled();
  });

  it("returns not found when the submission is missing", async () => {
    mocks.submissionFindFirst.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(404);
  });

  it("scopes the submission lookup to its form and parses answers", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.answers).toEqual({ fullName: "Synthetic Applicant" });
    expect(body.data.formVersion).toBe(1);
    expect(body.data.formTitle).toBe("Murabbi Training");
    expect(mocks.submissionFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "sub-1", formId: "form-1" } }));
  });
});
