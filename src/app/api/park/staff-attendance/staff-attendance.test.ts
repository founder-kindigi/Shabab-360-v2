import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  parkFindUnique: vi.fn(),
  offDateFindFirst: vi.fn(),
  batchFindMany: vi.fn(),
  eventFindUnique: vi.fn(),
  staffFindMany: vi.fn(),
  staffFindUnique: vi.fn(),
  recordFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["super_admin", "program_admin", "city_head", "park_lead", "park_admin", "murabbi"],
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  park: { findUnique: mocks.parkFindUnique },
  operationalOffDate: { findFirst: mocks.offDateFindFirst },
  batch: { findMany: mocks.batchFindMany },
  staffAttendanceEvent: { findUnique: mocks.eventFindUnique },
  staffAttendanceRecord: { findMany: mocks.recordFindMany },
  staffMeta: { findMany: mocks.staffFindMany, findUnique: mocks.staffFindUnique },
  $transaction: mocks.transaction,
} }));

import { POST } from "./route";
import { GET as GET_DETAIL, PATCH as MARK } from "./[eventId]/route";

const parkId = "ckggggggggggggggggggggggg";
const staffMetaId = "ckhhhhhhhhhhhhhhhhhhhhhhh";
const request = () => new Request("http://localhost/api/park/staff-attendance", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ parkId, date: "2026-08-01" }),
});

describe("park staff attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "user-1", role: "park_lead", assignedParkId: parkId } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.parkFindUnique.mockResolvedValue({ id: parkId, name: "Gulberg", cityId: "city-1" });
    mocks.offDateFindFirst.mockResolvedValue(null);
    mocks.batchFindMany.mockResolvedValue([{ startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] }]);
  });

  it("denies before database reads when staff-attendance capability is missing", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await POST(request())).status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  it("refuses staff roll-call on a shared operational off date", async () => {
    mocks.offDateFindFirst.mockResolvedValue({ label: "Public holiday" });
    expect((await POST(request())).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns an existing roll-call without duplicate writes", async () => {
    const tx = { staffAttendanceEvent: { findUnique: vi.fn().mockResolvedValue({ id: "event-1" }), create: vi.fn() }, auditLog: { create: vi.fn() } };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(tx.staffAttendanceEvent.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns only active park staff and their existing status", async () => {
    mocks.eventFindUnique.mockResolvedValue({ id: "event-1", parkId, title: "Roll-call", eventDate: new Date(), isClosed: false, closedAt: null });
    mocks.staffFindMany.mockResolvedValue([{ id: staffMetaId, role: "murabbi", user: { name: "Murabbi One" } }]);
    mocks.recordFindMany.mockResolvedValue([{ id: "record-1", staffMetaId, status: "present", markedAt: new Date() }]);
    const response = await GET_DETAIL(new Request("http://localhost"), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ roster: [{ staffMetaId, name: "Murabbi One", status: "present" }] });
    expect(mocks.staffFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isActive: true, user: { isActive: true } }) }));
  });

  it("rejects marking an inactive or foreign-park staff member", async () => {
    mocks.eventFindUnique.mockResolvedValue({ id: "event-1", parkId, title: "Roll-call", eventDate: new Date(), isClosed: false, closedAt: null });
    mocks.staffFindUnique.mockResolvedValue({ id: staffMetaId, isActive: false, user: { isActive: true }, assignedParkId: parkId, assignedGroup: null });
    const response = await MARK(new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffMetaId, status: "present" }),
    }), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
