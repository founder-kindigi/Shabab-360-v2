import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  attendanceEventCount: vi.fn(),
  attendanceRecordCount: vi.fn(),
  attendanceRecordGroupBy: vi.fn(),
  attendanceEventGroupBy: vi.fn(),
  admissionApplicationCount: vi.fn(),
  admissionApplicationGroupBy: vi.fn(),
  feeEventCount: vi.fn(),
  paymentAggregate: vi.fn(),
  paymentGroupBy: vi.fn(),
  paymentCount: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  admissionApplicationFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { count: mocks.attendanceEventCount, groupBy: mocks.attendanceEventGroupBy },
    attendanceRecord: { count: mocks.attendanceRecordCount, groupBy: mocks.attendanceRecordGroupBy, findMany: mocks.attendanceRecordFindMany },
    admissionApplication: { count: mocks.admissionApplicationCount, groupBy: mocks.admissionApplicationGroupBy, findMany: mocks.admissionApplicationFindMany },
    feeEvent: { count: mocks.feeEventCount },
    payment: { aggregate: mocks.paymentAggregate, groupBy: mocks.paymentGroupBy, count: mocks.paymentCount, findMany: mocks.paymentFindMany },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { GET as attendanceGET } from "@/app/api/admin/reports/attendance/route";
import { GET as admissionsGET } from "@/app/api/admin/reports/admissions/route";
import { GET as feesGET } from "@/app/api/admin/reports/fees/route";
import { POST as exportPOST } from "@/app/api/admin/reports/export/route";

const hqUser = { id: "admin-1", role: "super_admin", assignedCityId: null };
const cityHeadUser = { id: "city-head", role: "city_head", assignedCityId: "city-lhr" };

function withSearchParams(url: string) {
  return new NextRequest(url);
}

function jsonBody(data: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/reports/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  } as any);
}

/* ── Attendance Report ───────────────────────────────────────────────── */

describe("GET /api/admin/reports/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.attendanceEventCount.mockResolvedValue(10);
    mocks.attendanceRecordCount.mockResolvedValue(200);
    mocks.attendanceRecordGroupBy.mockResolvedValue([
      { status: "present", _count: { _all: 150 } },
      { status: "absent", _count: { _all: 30 } },
      { status: "late", _count: { _all: 15 } },
      { status: "excused", _count: { _all: 5 } },
    ]);
    mocks.attendanceEventGroupBy.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ groupId: `group-${i}`, _count: { _all: 2 } }))
    );
  });

  it("returns attendance summary when authorized", async () => {
    const response = await attendanceGET(withSearchParams("http://localhost/api/admin/reports/attendance"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.totalEvents).toBe(10);
    expect(body.summary.totalRecords).toBe(200);
    expect(body.summary.overallRate).toBe(75);
    expect(body.summary.uniqueGroups).toBe(5);
    expect(body.statusBreakdown).toHaveLength(4);
  });

  it("denies without reports.view capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await attendanceGET(withSearchParams("http://localhost/api/admin/reports/attendance"));

    expect(response.status).toBe(403);
    expect(mocks.attendanceEventCount).not.toHaveBeenCalled();
  });

  it("denies when not authenticated", async () => {
    mocks.requireAuth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const response = await attendanceGET(withSearchParams("http://localhost/api/admin/reports/attendance"));

    expect(response.status).toBe(401);
    expect(mocks.attendanceEventCount).not.toHaveBeenCalled();
  });

  it("scopes city_head to their assigned city", async () => {
    mocks.requireAuth.mockResolvedValue({ user: cityHeadUser });
    mocks.requireCapability.mockResolvedValue({ user: cityHeadUser });

    await attendanceGET(withSearchParams("http://localhost/api/admin/reports/attendance"));

    expect(mocks.attendanceEventCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ group: expect.objectContaining({ batch: expect.objectContaining({ park: { cityId: "city-lhr" } }) }) }) })
    );
  });
});

/* ── Admissions Report ───────────────────────────────────────────────── */

describe("GET /api/admin/reports/admissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.admissionApplicationCount.mockResolvedValue(50);
    mocks.admissionApplicationGroupBy
      .mockResolvedValueOnce([
        { status: "submitted", _count: { _all: 20 } },
        { status: "accepted", _count: { _all: 15 } },
        { status: "rejected", _count: { _all: 15 } },
      ])
      .mockResolvedValueOnce([
        { cityId: "city-lhr", _count: { _all: 30 } },
        { cityId: "city-khi", _count: { _all: 20 } },
      ]);
  });

  it("returns admissions funnel when authorized", async () => {
    const response = await admissionsGET(withSearchParams("http://localhost/api/admin/reports/admissions"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.totalApplications).toBe(50);
    expect(body.summary.statusBreakdown).toHaveLength(3);
    expect(body.summary.cityBreakdown).toHaveLength(2);
  });

  it("denies without reports.view capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await admissionsGET(withSearchParams("http://localhost/api/admin/reports/admissions"));

    expect(response.status).toBe(403);
    expect(mocks.admissionApplicationCount).not.toHaveBeenCalled();
  });
});

/* ── Fees Report ─────────────────────────────────────────────────────── */

describe("GET /api/admin/reports/fees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.feeEventCount.mockResolvedValue(15);
    mocks.paymentAggregate.mockResolvedValue({ _sum: { amount: 50000 }, _count: { _all: 100 } });
    mocks.paymentGroupBy.mockResolvedValue([
      { method: "cash", _sum: { amount: 30000 }, _count: { _all: 60 } },
      { method: "bank", _sum: { amount: 15000 }, _count: { _all: 30 } },
      { method: "online", _sum: { amount: 5000 }, _count: { _all: 10 } },
    ]);
    mocks.paymentCount.mockResolvedValue(100);
  });

  it("returns fees summary when authorized", async () => {
    const response = await feesGET(withSearchParams("http://localhost/api/admin/reports/fees"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.totalFeeEvents).toBe(15);
    expect(body.summary.totalCollected).toBe(50000);
    expect(body.methodBreakdown).toHaveLength(3);
  });

  it("denies without reports.view capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await feesGET(withSearchParams("http://localhost/api/admin/reports/fees"));

    expect(response.status).toBe(403);
    expect(mocks.feeEventCount).not.toHaveBeenCalled();
  });
});

/* ── CSV Export ──────────────────────────────────────────────────────── */

describe("POST /api/admin/reports/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.attendanceRecordFindMany.mockResolvedValue([
      {
        status: "present", markedAt: new Date("2026-07-01T10:00:00Z"),
        participant: { name: "Ali", group: { name: "Group A", batch: { name: "Batch 1", park: { name: "Park 1", city: { name: "Lahore" } } } } },
        event: { title: "Daily Class", eventDate: new Date("2026-07-01") },
      },
    ]);
    mocks.admissionApplicationFindMany.mockResolvedValue([
      {
        trackingCode: "SHB-2026-0001", applicantName: "Ali", guardianName: "Ahmed",
        guardianPhone: "03001234567", status: "submitted", createdAt: new Date("2026-07-01"),
      },
    ]);
    mocks.paymentFindMany.mockResolvedValue([
      {
        receiptNo: "RCP-2026-0001", amount: 1000, method: "cash",
        createdAt: new Date("2026-07-01"),
        feeEvent: { title: "Tuition", batch: { name: "Batch 1", park: { name: "Park 1", city: { name: "Lahore" } } } },
        participant: { name: "Ali" },
      },
    ]);
  });

  it("denies without reports.export capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await exportPOST(jsonBody({ reportType: "attendance", format: "csv" }));

    expect(response.status).toBe(403);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("generates attendance CSV and audits the export", async () => {
    const response = await exportPOST(jsonBody({ reportType: "attendance", format: "csv" }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(text).toContain("Participant,Status");
    expect(text).toContain("Ali,present");
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "reports.export",
      entityType: "report",
      newValues: expect.objectContaining({ reportType: "attendance", format: "csv" }),
    }));
  });

  it("generates admissions CSV and audits the export", async () => {
    const response = await exportPOST(jsonBody({ reportType: "admissions", format: "csv" }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("TrackingCode,Applicant");
    expect(text).toContain("SHB-2026-0001");
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "reports.export",
      entityType: "report",
    }));
  });

  it("generates fees CSV and audits the export", async () => {
    const response = await exportPOST(jsonBody({ reportType: "fees", format: "csv" }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("ReceiptNo");
    expect(text).toContain("RCP-2026-0001");
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "reports.export",
      entityType: "report",
    }));
  });

  it("rejects invalid report type", async () => {
    const response = await exportPOST(jsonBody({ reportType: "invalid", format: "csv" } as any));

    expect(response.status).toBe(400);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("rejects missing body fields", async () => {
    const response = await exportPOST(jsonBody({} as any));

    expect(response.status).toBe(400);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
