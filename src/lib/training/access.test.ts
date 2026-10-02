import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), capability: vi.fn() }));
vi.mock("@/lib/auth/authorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorize")>();
  return { ...actual, requireAuth: mocks.auth, requireCapability: mocks.capability };
});

import { requireTrainingReviewer, requireTrainingCity, reviewerCity } from "./access";

describe("training review authority", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.capability.mockResolvedValue({ user: { id: "staff", role: "city_head", assignedCityId: "city-1" } }); });

  it("requires an authenticated user", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await requireTrainingReviewer() as NextResponse).status).toBe(401);
  });

  it("denies park staff even with a capability override", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "staff", role: "park_lead", assignedParkId: "park-1" } });
    expect((await requireTrainingReviewer() as NextResponse).status).toBe(403);
    expect(mocks.capability).not.toHaveBeenCalled();
  });

  it("requires capability for a city head", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "staff", role: "city_head", assignedCityId: "city-1" } });
    await requireTrainingReviewer();
    expect(mocks.capability).toHaveBeenCalledWith("admissions.manage", expect.objectContaining({ id: "staff" }));
  });

  it("denies missing or conflicting city assignments", () => {
    expect(reviewerCity({ id: "staff", role: "city_head" })).toBeInstanceOf(NextResponse);
    expect(reviewerCity({ id: "staff", role: "city_head", assignedCityId: "city-1" }, "city-2")).toBeInstanceOf(NextResponse);
    expect(requireTrainingCity({ id: "staff", role: "city_head", assignedCityId: "city-1" }, "city-2")?.status).toBe(403);
    expect(reviewerCity({ id: "staff", role: "city_head", assignedCityId: "city-1" })).toBe("city-1");
  });
});
