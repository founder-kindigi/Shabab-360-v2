import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  logAudit: vi.fn(),
  guardianFindFirst: vi.fn(),
  guardianChildFindMany: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  feeEventFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
  attendanceEventFindMany: vi.fn(),
  participantCount: vi.fn(),
  announcementCount: vi.fn(),
  announcementFindMany: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/lib/db", () => ({
  db: {
    guardian: { findFirst: mocks.guardianFindFirst },
    guardianChild: { findMany: mocks.guardianChildFindMany },
    attendanceRecord: { findMany: mocks.attendanceRecordFindMany },
    feeEvent: { findMany: mocks.feeEventFindMany },
    payment: { findMany: mocks.paymentFindMany },
    attendanceEvent: { findMany: mocks.attendanceEventFindMany },
    participant: { count: mocks.participantCount },
    announcement: { count: mocks.announcementCount, findMany: mocks.announcementFindMany },
  },
}));

import { GET } from "./route";

describe("GET /api/guardian/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "u-1", role: "guardian" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.guardianFindFirst.mockResolvedValue({ id: "guardian-1", name: "Guardian", phone: "0300" });
    mocks.attendanceEventFindMany.mockResolvedValue([]);
    mocks.announcementCount.mockResolvedValue(0);
    mocks.announcementFindMany.mockResolvedValue([]);
  });

  it("retains an unassigned child with null/empty group-derived data", async () => {
    mocks.guardianChildFindMany.mockResolvedValue([
      { participant: { id: "p-unassigned", name: "Unassigned Child", groupId: null, group: null } },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.children).toHaveLength(1);
    const child = body.children[0];
    expect(child.id).toBe("p-unassigned");
    expect(child.groupId).toBeNull();
    expect(child.groupName).toBeNull();
    expect(child.batchName).toBeNull();
    expect(child.parkName).toBeNull();
    expect(child.cityName).toBeNull();
    expect(child.todayStatus).toBeNull();
    expect(child.sparkline7Day).toEqual([]);
    expect(child.attendance).toEqual({ totalEvents30: 0, present30: 0, absent30: 0, late30: 0, excused30: 0, rate30: 0, rate7: 0, last5: [] });
    expect(child.fees).toEqual({ totalExpected: 0, totalPaid: 0, outstanding: 0, upcomingFees: 0, overdueFees: 0 });
    expect(body.todayEvents).toEqual([]);
    // No group-scoped attendance or fee-event query is issued for it.
    expect(mocks.attendanceRecordFindMany).not.toHaveBeenCalled();
    expect(mocks.feeEventFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });

  it("keeps group attendance for an assigned child", async () => {
    mocks.guardianChildFindMany.mockResolvedValue([
      {
        participant: {
          id: "p-1",
          name: "Assigned Child",
          groupId: "group-1",
          group: {
            id: "group-1",
            name: "Group A",
            batchId: "batch-1",
            batch: { name: "Batch A", park: { name: "Park A", city: { name: "City A" } } },
          },
        },
      },
    ]);
    mocks.attendanceRecordFindMany.mockResolvedValue([
      { eventId: "e-1", status: "present", event: { title: "Class", eventDate: new Date() } },
    ]);
    mocks.feeEventFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const child = body.children[0];
    expect(child.groupId).toBe("group-1");
    expect(child.groupName).toBe("Group A");
    expect(child.parkName).toBe("Park A");
    expect(child.attendance.totalEvents30).toBe(1);
    expect(child.attendance.rate30).toBe(100);
  });
});
