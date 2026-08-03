import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userHasCapability: vi.fn(),
  verifyEventCityAccess: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: mocks.userHasCapability }));
vi.mock("@/lib/auth/events-scope", () => ({ verifyEventCityAccess: mocks.verifyEventCityAccess }));
vi.mock("@/lib/db", () => ({ db: { staffMeta: { findMany: mocks.findMany } } }));

import { GET } from "./route";

describe("Event responsibility assignees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.userHasCapability.mockResolvedValue(true);
    mocks.verifyEventCityAccess.mockResolvedValue({ event: { id: "event-1", cityId: "city-1" }, status: 200 });
  });

  it("returns only active staff whose database assignment resolves to the event city", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "staff-city", role: "city_head", assignedCityId: "city-1", assignedPark: null, assignedGroup: null, user: { name: "City Staff" } },
      { id: "staff-group", role: "murabbi", assignedCityId: null, assignedPark: null, assignedGroup: { park: { cityId: "city-1" }, batch: null }, user: { name: "Group Staff" } },
      { id: "staff-foreign", role: "murabbi", assignedCityId: "city-2", assignedPark: null, assignedGroup: null, user: { name: "Foreign Staff" } },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/admin/events/event-1/assignees"), {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { id: "staff-city", name: "City Staff", role: "city_head" },
        { id: "staff-group", name: "Group Staff", role: "murabbi" },
      ],
    });
  });

  it("denies users without either responsibility-management capability", async () => {
    mocks.userHasCapability.mockResolvedValue(false);

    const response = await GET(new NextRequest("http://localhost/api/admin/events/event-1/assignees"), {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("propagates event scope denial without listing staff", async () => {
    mocks.verifyEventCityAccess.mockResolvedValue({ error: "Forbidden", status: 403 });

    const response = await GET(new NextRequest("http://localhost/api/admin/events/event-1/assignees"), {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
