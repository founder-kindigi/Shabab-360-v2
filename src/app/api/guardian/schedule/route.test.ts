import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  guardianFindFirst: vi.fn(),
  guardianChildFindMany: vi.fn(),
  attendanceEventFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    guardian: { findFirst: mocks.guardianFindFirst },
    guardianChild: { findMany: mocks.guardianChildFindMany },
    attendanceEvent: { findMany: mocks.attendanceEventFindMany },
  },
}));

import { GET } from "./route";

const request = () => new Request("http://localhost/api/guardian/schedule");

describe("GET /api/guardian/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: { id: "u-1" } });
    mocks.guardianFindFirst.mockResolvedValue({ id: "guardian-1" });
  });

  it("retains an unassigned child with a null group and no events", async () => {
    mocks.guardianChildFindMany.mockResolvedValue([
      { participant: { id: "p-unassigned", name: "Unassigned Child", groupId: null, group: null } },
    ]);
    mocks.attendanceEventFindMany.mockResolvedValue([]);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.children).toHaveLength(1);
    expect(body.children[0].participant).toEqual({ id: "p-unassigned", name: "Unassigned Child" });
    expect(body.children[0].group).toBeNull();
    expect(body.children[0].events).toEqual([]);
    // The group filter never receives a null identifier.
    expect(mocks.attendanceEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ groupId: { in: [] } }) })
    );
  });

  it("keeps the group schedule for an assigned child", async () => {
    mocks.guardianChildFindMany.mockResolvedValue([
      {
        participant: {
          id: "p-1",
          name: "Assigned Child",
          groupId: "group-1",
          group: { id: "group-1", name: "Group A", batch: { name: "Batch A", park: { name: "Park A" } } },
        },
      },
    ]);
    mocks.attendanceEventFindMany.mockResolvedValue([
      { id: "e-1", groupId: "group-1", title: "Class", eventDate: new Date(), isClosed: false, _count: { records: 2 } },
    ]);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.children[0].group).toEqual({ id: "group-1", name: "Group A", batchName: "Batch A", parkName: "Park A" });
    expect(body.children[0].events).toHaveLength(1);
    expect(body.children[0].events[0].markedCount).toBe(2);
  });
});
