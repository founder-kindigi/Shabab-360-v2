import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { trainingCohort: { findUnique: mocks.find } } }));
import { GET } from "./route";

const request = new Request("http://localhost/api/public/murabbi-training/lahore-1");
const context = { params: Promise.resolve({ slug: "lahore-1" }) };
const cohort = {
  slug: "lahore-1", title: "Murabbi Training", summary: "Induction", city: { name: "Lahore", isActive: true },
  eligibilityText: "Approved eligibility", feeText: "Approved fee policy", privacyNotice: "Approved notice",
  policyVersion: 1, registrationStart: null, registrationEnd: null, status: "published", requestKey: "internal-value",
};

describe("public training cohort projection", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue(cohort); });

  it("hides draft cohorts", async () => {
    mocks.find.mockResolvedValue({ ...cohort, status: "draft" });
    expect((await GET(request, context)).status).toBe(404);
  });

  it("returns only public cohort fields", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.city).toBe("Lahore");
    expect(body.isOpen).toBe(true);
    expect(body.requestKey).toBeUndefined();
  });
});
