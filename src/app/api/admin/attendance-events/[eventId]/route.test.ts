import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  eventFindUnique: vi.fn(),
  participantCount: vi.fn(),
  staffFindUnique: vi.fn(),
  staffFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { findUnique: mocks.eventFindUnique },
    participant: { count: mocks.participantCount },
    staffMeta: { findUnique: mocks.staffFindUnique, findMany: mocks.staffFindMany },
  },
}));

import { GET } from "./route";

const params = { params: Promise.resolve({ eventId: "event-1" }) };
const event = {
  id: "event-1",
  title: "Weekly class",
  groupId: "group-1",
  eventDate: new Date("2026-07-18T08:00:00.000Z"),
  isClosed: false,
  closedAt: null,
  closedBy: null,
  records: [],
  group: {
    name: "Group A",
    batch: {
      name: "Batch 4",
      parkId: "park-1",
      park: {
        id: "park-1",
        name: "Model Town",
        cityId: "city-1",
        city: { id: "city-1", name: "Lahore" },
      },
    },
  },
};

describe("GET /api/admin/attendance-events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({
      user: { id: "park-admin-1", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.eventFindUnique.mockResolvedValue(event);
    mocks.participantCount.mockResolvedValue(3);
    mocks.staffFindMany.mockResolvedValue([]);
  });

  it("requires attendance capability before loading event records", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(new Request("http://localhost"), params);

    expect(response.status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("denies an event outside the caller's resource scope", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(new Request("http://localhost"), params);

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "park-admin-1" }),
      { cityId: "city-1", parkId: "park-1", groupId: "group-1" }
    );
    expect(mocks.participantCount).not.toHaveBeenCalled();
  });

  it("returns scoped event details for an authorized caller", async () => {
    const response = await GET(new Request("http://localhost"), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      event: { id: "event-1", participantCount: 3 },
      records: [],
    });
  });
});
