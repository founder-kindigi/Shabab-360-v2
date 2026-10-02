import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ reviewer: vi.fn(), cityScope: vi.fn(), city: vi.fn(), create: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/training/access", () => ({ requireTrainingReviewer: mocks.reviewer, requireTrainingCity: mocks.cityScope, reviewerCity: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  city: { findUnique: mocks.city },
  $transaction: mocks.transaction,
} }));
import { POST } from "./route";

const url = "http://localhost/api/admin/murabbi-training/cohorts";
function request(body: unknown) { return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
const draft = { slug: "lahore-autumn", cityId: "city-1", title: "Murabbi Training", summary: "Induction for prospective Murabbis." };

describe("training draft cohort creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reviewer.mockResolvedValue({ user: { id: "admin-1", role: "city_head", assignedCityId: "city-1" } });
    mocks.cityScope.mockReturnValue(null);
    mocks.city.mockResolvedValue({ isActive: true });
    mocks.create.mockResolvedValue({ id: "cohort-1", slug: draft.slug, status: "draft", cityId: "city-1" });
    mocks.audit.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback({ trainingCohort: { create: mocks.create }, auditLog: { create: mocks.audit } }));
  });

  it("rejects an unauthenticated caller before parsing or writing", async () => {
    mocks.reviewer.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await POST(request(draft))).status).toBe(401);
    expect(mocks.city).not.toHaveBeenCalled();
  });

  it("denies a different city", async () => {
    mocks.cityScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await POST(request(draft))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates an unpublished cohort with an audit entry", async () => {
    const response = await POST(request(draft));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "cohort-1", slug: draft.slug, status: "draft" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cityId: "city-1", createdBy: "admin-1" }) }));
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });
});
