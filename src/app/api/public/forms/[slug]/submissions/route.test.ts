import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  formFind: vi.fn(),
  revisionFind: vi.fn(),
  existing: vi.fn(),
  submissionCreate: vi.fn(),
  audit: vi.fn(),
  txFormFind: vi.fn(),
  transaction: vi.fn(),
  quota: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: {
  registrationForm: { findUnique: mocks.formFind },
  registrationFormRevision: { findUnique: mocks.revisionFind },
  registrationFormSubmission: { findUnique: mocks.existing },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/registration-forms/quota", () => ({ consumeFormSubmissionQuota: mocks.quota }));

import { POST } from "./route";

const fields = [{ key: "fullName", label: "Full Name", type: "short_text", required: true }];
const baseSettings = { eligibilityText: "", feeText: "", privacyNotice: "Notice", contactConsentText: "Consent", successText: "Received" };
const form = { id: "form-1", slug: "murabbi-training-2026", status: "published", publishedVersion: 1, ownerCity: { isActive: true } };
const revision = { id: "rev-1", version: 1, title: "Murabbi Training", intro: "", schemaJson: JSON.stringify(fields), settingsJson: JSON.stringify(baseSettings) };
const answers = { fullName: "Synthetic Applicant" };
const payload = { requestKey: "4f697d34-0d89-4bea-a689-2251c3ca3db0", publishedVersion: 1, answers, consent: true };
const url = "http://localhost/api/public/forms/murabbi-training-2026/submissions";
const context = { params: Promise.resolve({ slug: "murabbi-training-2026" }) };
const request = (body: unknown, origin = "http://localhost") =>
  new Request(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const expectedHash = createHash("sha256").update(JSON.stringify({ publishedVersion: 1, answers, consent: true })).digest("hex");

describe("public registration form submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.formFind.mockResolvedValue(form);
    mocks.revisionFind.mockResolvedValue(revision);
    mocks.existing.mockResolvedValue(null);
    mocks.submissionCreate.mockResolvedValue({ id: "sub-1", reference: "REG-SYNTHETIC" });
    mocks.txFormFind.mockResolvedValue({ status: "published", publishedVersion: 1 });
    mocks.quota.mockResolvedValue(true);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        registrationForm: { findUnique: mocks.txFormFind },
        registrationFormSubmission: { create: mocks.submissionCreate },
        auditLog: { create: mocks.audit },
      }));
  });

  it("denies a cross-origin post before reading anything", async () => {
    const response = await POST(request(payload, "https://other.example"), context);
    expect(response.status).toBe(403);
    expect(mocks.formFind).not.toHaveBeenCalled();
  });

  it("rejects missing consent or an unknown request key", async () => {
    expect((await POST(request({ ...payload, consent: false }), context)).status).toBe(400);
    expect((await POST(request({ ...payload, requestKey: "not-a-uuid" }), context)).status).toBe(400);
    expect((await POST(request({ ...payload, extra: "x" }), context)).status).toBe(400);
    expect(mocks.formFind).not.toHaveBeenCalled();
  });

  it("hides an unpublished form", async () => {
    mocks.formFind.mockResolvedValue({ ...form, publishedVersion: 0 });
    expect((await POST(request(payload), context)).status).toBe(404);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("rejects a submission for a revision the form has moved past", async () => {
    mocks.revisionFind.mockResolvedValue(null);
    expect((await POST(request(payload), context)).status).toBe(409);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid or ineligible answers", async () => {
    const response = await POST(request({ ...payload, answers: { fullName: "" } }), context);
    expect(response.status).toBe(400);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("refuses a closed form", async () => {
    mocks.formFind.mockResolvedValue({ ...form, status: "closed" });
    expect((await POST(request(payload), context)).status).toBe(409);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("refuses a submission outside the configured window", async () => {
    mocks.revisionFind.mockResolvedValue({ ...revision, settingsJson: JSON.stringify({ ...baseSettings, registrationEnd: "2000-01-01T00:00:00+00:00" }) });
    expect((await POST(request(payload), context)).status).toBe(409);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("rate-limits when the per-form quota is exhausted", async () => {
    mocks.quota.mockResolvedValue(false);
    const response = await POST(request(payload), context);
    expect(response.status).toBe(429);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("stores one durable submission and returns only a receipt", async () => {
    const response = await POST(request(payload), context);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ reference: "REG-SYNTHETIC" });
    const created = mocks.submissionCreate.mock.calls[0][0].data;
    expect(created).toMatchObject({ formId: "form-1", revisionId: "rev-1", requestKey: payload.requestKey, requestHash: expectedHash });
    expect(JSON.parse(created.answersJson)).toEqual(answers);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "registration_form_submit" }) }));
  });

  it("returns the original receipt for a same-key, same-answer retry without writing again", async () => {
    const first = await POST(request(payload), context);
    expect(first.status).toBe(201);
    const storedHash = mocks.submissionCreate.mock.calls[0][0].data.requestHash;
    mocks.existing.mockResolvedValue({ reference: "REG-SYNTHETIC", requestHash: storedHash });
    const retry = await POST(request(payload), context);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ reference: "REG-SYNTHETIC" });
    expect(mocks.submissionCreate).toHaveBeenCalledTimes(1);
  });

  it("returns a saved receipt on a retry after intake closes", async () => {
    mocks.existing.mockResolvedValue({ reference: "REG-SYNTHETIC", requestHash: expectedHash });
    mocks.formFind.mockResolvedValue({ ...form, status: "closed" });
    const response = await POST(request(payload), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reference: "REG-SYNTHETIC" });
    expect(mocks.quota).not.toHaveBeenCalled();
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("rejects a body beyond the configured size bound before any database access", async () => {
    const oversized = { ...payload, answers: { fullName: "X".repeat(33_000) } };
    const response = await POST(request(oversized), context);
    expect(response.status).toBe(400);
    expect(mocks.formFind).not.toHaveBeenCalled();
  });

  it("rejects a reused request key carrying different answers", async () => {
    mocks.existing.mockResolvedValue({ reference: "REG-OTHER", requestHash: "different" });
    const response = await POST(request(payload), context);
    expect(response.status).toBe(409);
    expect(mocks.submissionCreate).not.toHaveBeenCalled();
  });

  it("stops if the form closes between validation and the write", async () => {
    mocks.txFormFind.mockResolvedValue({ status: "closed", publishedVersion: 1 });
    const response = await POST(request(payload), context);
    expect(response.status).toBe(409);
  });

  it("recovers the receipt when a unique-key race is lost", async () => {
    mocks.existing.mockResolvedValueOnce(null).mockResolvedValueOnce({ reference: "REG-ORIGINAL", requestHash: expectedHash });
    mocks.transaction.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const response = await POST(request(payload), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reference: "REG-ORIGINAL" });
  });
});
