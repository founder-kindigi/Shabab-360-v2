import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cohort: vi.fn(), existing: vi.fn(), create: vi.fn(), current: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  trainingCohort: { findUnique: mocks.cohort },
  trainingApplication: { findUnique: mocks.existing },
  $transaction: mocks.transaction,
} }));

import { POST } from "./route";

const url = "http://localhost/api/public/murabbi-training/lahore-1/applications";
const context = { params: Promise.resolve({ slug: "lahore-1" }) };
const application = {
  requestKey: "4f697d34-0d89-4bea-a689-2251c3ca3db0", fullName: "Example Applicant", phone: "03001234567",
  locality: "Lahore", background: "Teacher", connection: "new", motivation: "I want to mentor young people.",
  availability: "available", privacyVersion: 1, declaration: true,
};
const cohort = {
  id: "cohort-1", status: "published", city: { isActive: true }, registrationStart: null, registrationEnd: null,
  eligibilityText: "Approved eligibility", feeText: "Approved fee policy", privacyNotice: "Approved notice", policyVersion: 1,
};
function request(body: unknown, origin = "http://localhost") {
  return new Request(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("Murabbi training public application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cohort.mockResolvedValue(cohort);
    mocks.existing.mockResolvedValue(null);
    mocks.current.mockResolvedValue(cohort);
    mocks.create.mockResolvedValue({ reference: "MTI-SYNTHETIC" });
    mocks.transaction.mockImplementation(async (callback) => callback({
      trainingCohort: { findUnique: mocks.current }, trainingApplication: { create: mocks.create },
    }));
  });

  it("denies a cross-origin form post", async () => {
    const response = await POST(request(application, "https://other.example"), context);
    expect(response.status).toBe(403);
    expect(mocks.cohort).not.toHaveBeenCalled();
  });

  it("does not expose a draft cohort", async () => {
    mocks.cohort.mockResolvedValue({ ...cohort, status: "draft" });
    const response = await POST(request(application), context);
    expect(response.status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects invalid fields before writing", async () => {
    const response = await POST(request({ ...application, role: "super_admin" }), context);
    expect(response.status).toBe(400);
    expect(mocks.cohort).not.toHaveBeenCalled();
  });

  it("creates one durable application and returns only its reference", async () => {
    const response = await POST(request(application), context);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ reference: "MTI-SYNTHETIC" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cohortId: "cohort-1", fullName: "Example Applicant" }) }));
  });

  it("returns the original reference for a same-key retry", async () => {
    const first = await POST(request(application), context);
    expect(first.status).toBe(201);
    const hash = mocks.create.mock.calls[0][0].data.requestHash;
    mocks.existing.mockResolvedValue({ reference: "MTI-SYNTHETIC", requestHash: hash });
    const retry = await POST(request(application), context);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ reference: "MTI-SYNTHETIC" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("recovers a receipt after the intake closes", async () => {
    const first = await POST(request(application), context);
    expect(first.status).toBe(201);
    const hash = mocks.create.mock.calls[0][0].data.requestHash;
    mocks.cohort.mockResolvedValue({ ...cohort, status: "closed" });
    mocks.existing.mockResolvedValue({ reference: "MTI-SYNTHETIC", requestHash: hash });
    const retry = await POST(request(application), context);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ reference: "MTI-SYNTHETIC" });
  });

  it("rejects a changed payload under a reused key", async () => {
    mocks.existing.mockResolvedValue({ reference: "MTI-OTHER", requestHash: "different" });
    const response = await POST(request(application), context);
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("stops if the cohort closes during submission", async () => {
    mocks.current.mockResolvedValue({ ...cohort, status: "closed" });
    const response = await POST(request(application), context);
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
