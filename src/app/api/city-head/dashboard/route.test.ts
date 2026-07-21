import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn() },
    park: { findMany: vi.fn() },
    batch: { count: vi.fn(), findMany: vi.fn() },
    group: { count: vi.fn(), findMany: vi.fn() },
    participant: { count: vi.fn(), groupBy: vi.fn() },
    staffMeta: { count: vi.fn(), findMany: vi.fn() },
    attendanceEvent: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    feeEvent: { findMany: vi.fn() },
    payment: { aggregate: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET } from "./route";

describe("GET /api/city-head/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("denies non-city_head roles", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedCityId: "city-1" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("denies city_head with missing assignedCityId", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "city_head", assignedCityId: null },
    });
    mocks.requireCapability.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No city assigned");
  });

  it("returns city dashboard data for authorized city head", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);

    mocks.db.city.findUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore", code: "LHR" });
    mocks.db.park.findMany.mockResolvedValue([{ id: "park-1", name: "Iqbal Park" }]);
    mocks.db.batch.count.mockResolvedValue(1);
    mocks.db.group.count.mockResolvedValue(2);
    mocks.db.participant.count.mockResolvedValue(50);
    mocks.db.staffMeta.count.mockResolvedValue(5);
    mocks.db.group.findMany.mockResolvedValue([
      { id: "g-1", name: "Group 1", batchId: "b-1" },
      { id: "g-2", name: "Group 2", batchId: "b-1" },
    ]);
    mocks.db.batch.findMany.mockResolvedValue([{ id: "b-1", name: "Batch 4", parkId: "park-1" }]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([
      { groupId: "g-1", _count: 25 },
      { groupId: "g-2", _count: 25 },
    ]);
    mocks.db.staffMeta.findMany.mockResolvedValue([{ userId: "ch-1" }]);
    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        action: "login",
        entityType: "city",
        entityId: "city-lhr",
        createdAt: new Date(),
        user: { name: "City Head", email: "ch@example.com" },
      },
    ]);
    mocks.db.feeEvent.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city.name).toBe("Lahore");
    expect(data.metrics.parkCount).toBe(1);
    expect(data.metrics.batchCount).toBe(1);
    expect(data.metrics.groupCount).toBe(2);
    expect(data.metrics.totalParticipants).toBe(50);
  });

  it("derives city staff via assignedCityId, assignedParkId in parkIds, and assignedGroupId in groupIds", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);

    mocks.db.city.findUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore", code: "LHR" });
    mocks.db.park.findMany.mockResolvedValue([{ id: "park-lhr-1", name: "Iqbal Park" }]);
    mocks.db.batch.count.mockResolvedValue(1);
    mocks.db.group.count.mockResolvedValue(1);
    mocks.db.participant.count.mockResolvedValue(20);
    mocks.db.staffMeta.count.mockResolvedValue(3);
    mocks.db.group.findMany.mockResolvedValue([
      { id: "group-lhr-1", name: "Group 1", batchId: "b-1" },
    ]);
    mocks.db.batch.findMany.mockResolvedValue([{ id: "b-1", name: "Batch 4", parkId: "park-lhr-1" }]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([
      { groupId: "group-lhr-1", _count: 20 },
    ]);

    // Return Park Admin and Murabbi staff assigned within the city
    mocks.db.staffMeta.findMany.mockResolvedValue([
      { userId: "ch-1" },
      { userId: "pa-lhr-1" },
      { userId: "m-lhr-1" },
    ]);

    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        action: "mark_attendance",
        entityType: "group",
        entityId: "group-lhr-1",
        createdAt: new Date(),
        user: { name: "Lahore Murabbi", email: "m1@example.com" },
      },
    ]);
    mocks.db.feeEvent.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify staffMeta.findMany was called with 3-assignment OR query constrained to city parkIds and groupIds
    expect(mocks.db.staffMeta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { assignedCityId: "city-lhr" },
            { assignedParkId: { in: ["park-lhr-1"] } },
            { assignedGroupId: { in: ["group-lhr-1"] } },
          ],
        },
      })
    );

    // Verify recent activity output contains the staff audit record
    expect(data.recentActivity).toHaveLength(1);
    expect(data.recentActivity[0].userName).toBe("Lahore Murabbi");
  });
});
