import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ reviewer: vi.fn(), cityScope: vi.fn(), find: vi.fn(), update: vi.fn(), action: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/training/access", () => ({ requireTrainingReviewer: mocks.reviewer, requireTrainingCity: mocks.cityScope }));
vi.mock("@/lib/db", () => ({ db: {
  trainingApplication: { findUnique: mocks.find },
  $transaction: mocks.transaction,
} }));
import { POST } from "./route";

const url = "http://localhost/api/admin/murabbi-training/applications/application-1/actions";
const context = { params: Promise.resolve({ id: "application-1" }) };
function request(body: unknown) { return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
const application = { id: "application-1", cohort: { cityId: "city-1" }, status: "submitted", version: 1 };

describe("training application review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reviewer.mockResolvedValue({ user: { id: "admin-1", role: "city_head", assignedCityId: "city-1" } });
    mocks.cityScope.mockReturnValue(null);
    mocks.find.mockResolvedValue(application);
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) => callback({ trainingApplication: { updateMany: mocks.update }, trainingApplicationAction: { create: mocks.action }, auditLog: { create: mocks.audit } }));
  });

  it("hides an application from a different city", async () => {
    mocks.cityScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await POST(request({ version: 1, status: "under_review" }), context)).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a stale review and never writes", async () => {
    expect((await POST(request({ version: 2, status: "under_review" }), context)).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires an allowed transition", async () => {
    expect((await POST(request({ version: 1, status: "accepted" }), context)).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates, appends a review action and audits atomically", async () => {
    const response = await POST(request({ version: 1, status: "under_review" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "under_review", version: 2 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "application-1", version: 1, status: "submitted" } }));
    expect(mocks.action).toHaveBeenCalledTimes(1);
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it("reports a competing review as conflict", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await POST(request({ version: 1, status: "under_review" }), context)).status).toBe(409);
    expect(mocks.action).not.toHaveBeenCalled();
  });
});
