import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ reviewer: vi.fn(), city: vi.fn(), find: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/training/access", () => ({ requireTrainingReviewer: mocks.reviewer, reviewerCity: mocks.city }));
vi.mock("@/lib/db", () => ({ db: { trainingApplication: { findMany: mocks.find, count: mocks.count } } }));
import { GET } from "./route";

describe("training application list scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reviewer.mockResolvedValue({ user: { id: "head", role: "city_head", assignedCityId: "city-1" } });
    mocks.city.mockReturnValue("city-1");
    mocks.find.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
  });

  it("denies a conflicting city before query", async () => {
    mocks.city.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new Request("http://localhost/api/admin/murabbi-training/applications?cityId=city-2"));
    expect(response.status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("applies city scope inside the database filter", async () => {
    const response = await GET(new Request("http://localhost/api/admin/murabbi-training/applications?status=submitted&pageSize=10"));
    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "submitted", cohort: { cityId: "city-1" } }, take: 10 }));
    expect(mocks.count).toHaveBeenCalledWith({ where: { status: "submitted", cohort: { cityId: "city-1" } } });
  });
});
