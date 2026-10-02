import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ reviewer: vi.fn(), cityScope: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/training/access", () => ({ requireTrainingReviewer: mocks.reviewer, requireTrainingCity: mocks.cityScope }));
vi.mock("@/lib/db", () => ({ db: {
  trainingCohort: { findUnique: mocks.find },
  $transaction: mocks.transaction,
} }));
import { PATCH } from "./route";

const url = "http://localhost/api/admin/murabbi-training/cohorts/cohort-1";
const context = { params: Promise.resolve({ id: "cohort-1" }) };
function request(body: unknown) { return new Request(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
const cohort = { id: "cohort-1", cityId: "city-1", status: "draft", version: 1, policyVersion: 1, registrationStart: null, registrationEnd: null };

describe("training draft editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reviewer.mockResolvedValue({ user: { id: "admin-1", role: "city_head", assignedCityId: "city-1" } });
    mocks.cityScope.mockReturnValue(null);
    mocks.find.mockResolvedValue(cohort);
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) => callback({ trainingCohort: { updateMany: mocks.update }, auditLog: { create: mocks.audit } }));
  });

  it("hides another city's cohort", async () => {
    mocks.cityScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await PATCH(request({ version: 1, title: "Updated training" }), context)).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not permit a publication field in the draft patch", async () => {
    expect((await PATCH(request({ version: 1, status: "published" }), context)).status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("denies stale or already published edits", async () => {
    expect((await PATCH(request({ version: 2, title: "Updated training" }), context)).status).toBe(409);
    mocks.find.mockResolvedValue({ ...cohort, status: "published" });
    expect((await PATCH(request({ version: 1, title: "Updated training" }), context)).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates draft copy and advances the policy version atomically", async () => {
    const response = await PATCH(request({ version: 1, eligibilityText: "Applicants aged 18 or above" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 2, policyVersion: 2 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "cohort-1", version: 1, status: "draft" }, data: expect.objectContaining({ policyVersion: { increment: 1 } }) }));
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it("changes summary without changing the policy version", async () => {
    const response = await PATCH(request({ version: 1, summary: "New summary" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 2, policyVersion: 1 });
  });

  it("rejects an invalid final registration window", async () => {
    mocks.find.mockResolvedValue({ ...cohort, registrationStart: new Date("2026-11-02T00:00:00Z") });
    const response = await PATCH(request({ version: 1, registrationEnd: "2026-11-01T00:00:00Z" }), context);
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
