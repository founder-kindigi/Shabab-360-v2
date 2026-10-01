import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  logAudit: vi.fn(),
  admissionApplicationCount: vi.fn(),
  admissionApplicationGroupBy: vi.fn(),
  admissionApplicationFindMany: vi.fn(),
  feeEventCount: vi.fn(),
  paymentAggregate: vi.fn(),
  paymentGroupBy: vi.fn(),
  paymentCount: vi.fn(),
  paymentFindMany: vi.fn(),
  attendanceEventCount: vi.fn(),
  attendanceEventGroupBy: vi.fn(),
  attendanceRecordCount: vi.fn(),
  attendanceRecordGroupBy: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindUnique: vi.fn(),
  cityFindUnique: vi.fn(),
  staffMetaFindMany: vi.fn(),
}));

// Keep the real scope resolver under test and mock only the session boundary.
vi.mock("@/lib/auth/authorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorize")>();
  return {
    ...actual,
    requireAuth: mocks.requireAuth,
    requireCapability: mocks.requireCapability,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    admissionApplication: {
      count: mocks.admissionApplicationCount,
      groupBy: mocks.admissionApplicationGroupBy,
      findMany: mocks.admissionApplicationFindMany,
    },
    feeEvent: { count: mocks.feeEventCount },
    payment: {
      aggregate: mocks.paymentAggregate,
      groupBy: mocks.paymentGroupBy,
      count: mocks.paymentCount,
      findMany: mocks.paymentFindMany,
    },
    attendanceEvent: { count: mocks.attendanceEventCount, groupBy: mocks.attendanceEventGroupBy },
    attendanceRecord: {
      count: mocks.attendanceRecordCount,
      groupBy: mocks.attendanceRecordGroupBy,
      findMany: mocks.attendanceRecordFindMany,
    },
    park: { findUnique: mocks.parkFindUnique },
    group: { findUnique: mocks.groupFindUnique },
    city: { findUnique: mocks.cityFindUnique },
    staffMeta: { findMany: mocks.staffMetaFindMany },
  },
}));

vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { GET as admissionsGET } from "./admissions/route";
import { GET as feesGET } from "./fees/route";
import { GET as attendanceGET } from "./attendance/route";
import { POST as exportPOST } from "./export/route";
import { GET as attendanceReportGET } from "./attendance-report/route";

const programHead = { id: "admin-1", role: "program_admin", assignedCityId: null };
const cityHeadLahore = { id: "city-head-lhr", role: "city_head", assignedCityId: "city-lhr" };
const cityHeadNoCity = { id: "city-head-none", role: "city_head", assignedCityId: null };
const parkLead = {
  id: "park-lead-1",
  role: "park_lead",
  assignedCityId: "city-lhr",
  assignedParkId: "park-lhr",
};
const murabbi = {
  id: "murabbi-1",
  role: "murabbi",
  assignedCityId: "city-lhr",
  assignedParkId: "park-lhr",
  assignedGroupId: "group-lhr",
};
const muawin = {
  id: "muawin-1",
  role: "muawin",
  assignedCityId: "city-lhr",
  assignedParkId: "park-lhr",
};

const foreignPark = { id: "park-khi", cityId: "city-khi" };
const foreignGroup = {
  id: "group-khi",
  parkId: "park-khi",
  park: { id: "park-khi", cityId: "city-khi" },
  batch: { cityId: "city-khi", parkId: "park-khi", park: { id: "park-khi", cityId: "city-khi" } },
};

function authedAs(user: Record<string, unknown>) {
  mocks.requireAuth.mockResolvedValue({ user });
  mocks.requireCapability.mockResolvedValue({ user });
}

function url(path: string, query = "") {
  return new NextRequest(`http://localhost/api/admin/reports/${path}${query}`);
}

function exportRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/reports/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  authedAs(programHead);
  mocks.admissionApplicationCount.mockResolvedValue(0);
  mocks.admissionApplicationGroupBy.mockResolvedValue([]);
  mocks.admissionApplicationFindMany.mockResolvedValue([]);
  mocks.feeEventCount.mockResolvedValue(0);
  mocks.paymentAggregate.mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } });
  mocks.paymentGroupBy.mockResolvedValue([]);
  mocks.paymentCount.mockResolvedValue(0);
  mocks.paymentFindMany.mockResolvedValue([]);
  mocks.attendanceEventCount.mockResolvedValue(0);
  mocks.attendanceEventGroupBy.mockResolvedValue([]);
  mocks.attendanceRecordCount.mockResolvedValue(0);
  mocks.attendanceRecordGroupBy.mockResolvedValue([]);
  mocks.attendanceRecordFindMany.mockResolvedValue([]);
  mocks.parkFindUnique.mockResolvedValue(null);
  mocks.groupFindUnique.mockResolvedValue(null);
  mocks.cityFindUnique.mockResolvedValue(null);
  mocks.staffMetaFindMany.mockResolvedValue([]);
});

describe("City Head is limited to their assigned city on every report route", () => {
  it("scopes the admissions report to the City Head's city", async () => {
    authedAs(cityHeadLahore);

    const response = await admissionsGET(url("admissions"));

    expect(response.status).toBe(200);
    expect(mocks.admissionApplicationCount).toHaveBeenCalledWith({ where: { cityId: "city-lhr" } });
    expect(mocks.admissionApplicationGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cityId: "city-lhr" } })
    );
  });

  it("scopes the fees report to the City Head's city", async () => {
    authedAs(cityHeadLahore);

    const response = await feesGET(url("fees"));

    expect(response.status).toBe(200);
    expect(mocks.feeEventCount).toHaveBeenCalledWith({
      where: { batch: { park: { cityId: "city-lhr" } } },
    });
  });

  it("scopes the attendance report to the City Head's city", async () => {
    authedAs(cityHeadLahore);

    const response = await attendanceGET(url("attendance"));

    expect(response.status).toBe(200);
    expect(mocks.attendanceEventCount).toHaveBeenCalledWith({
      where: {
        group: {
          AND: [{
            OR: [
              { park: { cityId: "city-lhr" } },
              { parkId: null, batch: { park: { cityId: "city-lhr" } } },
            ],
          }],
        },
      },
    });
  });

  it("scopes the CSV attendance export to the City Head's city", async () => {
    authedAs(cityHeadLahore);

    const response = await exportPOST(exportRequest({ reportType: "attendance", format: "csv" }));

    expect(response.status).toBe(200);
    expect(mocks.attendanceRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            group: {
              AND: [{
                OR: [
                  { park: { cityId: "city-lhr" } },
                  { parkId: null, batch: { park: { cityId: "city-lhr" } } },
                ],
              }],
            },
          }),
        }),
      })
    );
  });

  it("scopes the attendance report view to the City Head's city", async () => {
    authedAs(cityHeadLahore);
    mocks.cityFindUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore" });

    const response = await attendanceReportGET(url("attendance-report"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.attendanceRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            group: {
              AND: [{
                OR: [
                  { park: { cityId: "city-lhr" } },
                  { parkId: null, batch: { park: { cityId: "city-lhr" } } },
                ],
              }],
            },
          }),
        }),
      })
    );
    expect(body.summary.scopeLabel).toBe("Lahore");
  });
});

describe("cross-city request values are denied without leaking counts or names", () => {
  it("denies a cross-city cityId on admissions and reads nothing", async () => {
    authedAs(cityHeadLahore);

    const response = await admissionsGET(url("admissions", "?cityId=city-khi"));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "Forbidden" });
    expect(mocks.admissionApplicationCount).not.toHaveBeenCalled();
    expect(mocks.admissionApplicationGroupBy).not.toHaveBeenCalled();
  });

  it("denies a cross-city parkId on fees and reads nothing", async () => {
    authedAs(cityHeadLahore);
    mocks.parkFindUnique.mockResolvedValue(foreignPark);

    const response = await feesGET(url("fees", "?parkId=park-khi"));

    expect(response.status).toBe(403);
    expect(mocks.feeEventCount).not.toHaveBeenCalled();
    expect(mocks.paymentAggregate).not.toHaveBeenCalled();
  });

  it("denies a cross-city cityId on attendance and reads nothing", async () => {
    authedAs(cityHeadLahore);

    const response = await attendanceGET(url("attendance", "?cityId=city-khi"));

    expect(response.status).toBe(403);
    expect(mocks.attendanceEventCount).not.toHaveBeenCalled();
  });

  it("denies a cross-city parkId on attendance and reads nothing", async () => {
    authedAs(cityHeadLahore);
    mocks.parkFindUnique.mockResolvedValue(foreignPark);

    const response = await attendanceGET(url("attendance", "?parkId=park-khi"));

    expect(response.status).toBe(403);
    expect(mocks.attendanceEventCount).not.toHaveBeenCalled();
  });

  it("denies a cross-city groupId on attendance and reads nothing", async () => {
    authedAs(cityHeadLahore);
    mocks.groupFindUnique.mockResolvedValue(foreignGroup);

    const response = await attendanceGET(url("attendance", "?groupId=group-khi"));

    expect(response.status).toBe(403);
    expect(mocks.attendanceEventCount).not.toHaveBeenCalled();
    expect(mocks.attendanceRecordCount).not.toHaveBeenCalled();
  });

  it("denies a cross-city export request before auditing or reading rows", async () => {
    authedAs(cityHeadLahore);

    const response = await exportPOST(
      exportRequest({ reportType: "admissions", format: "csv", cityId: "city-khi" })
    );

    expect(response.status).toBe(403);
    expect(mocks.logAudit).not.toHaveBeenCalled();
    expect(mocks.admissionApplicationFindMany).not.toHaveBeenCalled();
  });

  it("denies a cross-city cityId, parkId and groupId on the attendance report view", async () => {
    authedAs(cityHeadLahore);
    mocks.parkFindUnique.mockResolvedValue(foreignPark);
    mocks.groupFindUnique.mockResolvedValue(foreignGroup);

    const byCity = await attendanceReportGET(url("attendance-report", "?cityId=city-khi"));
    const byPark = await attendanceReportGET(url("attendance-report", "?parkId=park-khi"));
    const byGroup = await attendanceReportGET(url("attendance-report", "?groupId=group-khi"));

    expect(byCity.status).toBe(403);
    expect(byPark.status).toBe(403);
    expect(byGroup.status).toBe(403);
    expect(await byGroup.json()).toMatchObject({ error: "Forbidden" });
    expect(mocks.attendanceRecordFindMany).not.toHaveBeenCalled();
  });

  it("never echoes a cross-city city name in the attendance report label", async () => {
    authedAs(cityHeadLahore);
    mocks.cityFindUnique.mockResolvedValue({ id: "city-khi", name: "Karachi" });

    const response = await attendanceReportGET(url("attendance-report", "?cityId=city-khi"));

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("Karachi");
  });
});

describe("a City Head without a city assignment fails closed everywhere", () => {
  it.each([
    ["admissions", () => admissionsGET(url("admissions"))],
    ["fees", () => feesGET(url("fees"))],
    ["attendance", () => attendanceGET(url("attendance"))],
    ["attendance-report", () => attendanceReportGET(url("attendance-report"))],
    ["export", () => exportPOST(exportRequest({ reportType: "attendance", format: "csv" }))],
  ])("denies %s", async (_name, run) => {
    authedAs(cityHeadNoCity);

    const response = await run();

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("City scope is required");
  });

  it("performs no data read for an unassigned City Head", async () => {
    authedAs(cityHeadNoCity);

    await admissionsGET(url("admissions"));
    await feesGET(url("fees"));
    await attendanceGET(url("attendance"));
    await attendanceReportGET(url("attendance-report"));
    await exportPOST(exportRequest({ reportType: "attendance", format: "csv" }));

    expect(mocks.admissionApplicationCount).not.toHaveBeenCalled();
    expect(mocks.feeEventCount).not.toHaveBeenCalled();
    expect(mocks.attendanceEventCount).not.toHaveBeenCalled();
    expect(mocks.attendanceRecordFindMany).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});

describe("Program Head keeps approved cross-city reporting", () => {
  it("returns unscoped aggregates when no city is selected", async () => {
    authedAs(programHead);

    const response = await admissionsGET(url("admissions"));

    expect(response.status).toBe(200);
    expect(mocks.admissionApplicationCount).toHaveBeenCalledWith({ where: {} });
  });

  it("honours an explicitly selected city", async () => {
    authedAs(programHead);

    await admissionsGET(url("admissions", "?cityId=city-khi"));
    await feesGET(url("fees", "?cityId=city-khi"));

    expect(mocks.admissionApplicationCount).toHaveBeenCalledWith({ where: { cityId: "city-khi" } });
    expect(mocks.feeEventCount).toHaveBeenCalledWith({
      where: { batch: { park: { cityId: "city-khi" } } },
    });
  });
});

describe("park-scoped roles gain no city-level reporting authority", () => {
  it.each([
    ["park_lead", parkLead],
    ["murabbi", murabbi],
    ["muawin", muawin],
  ])("denies the admissions report to %s", async (_name, user) => {
    authedAs(user);

    const response = await admissionsGET(url("admissions"));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("This operation requires city-level scope");
    expect(mocks.admissionApplicationCount).not.toHaveBeenCalled();
  });

  it("keeps a Park Lead on the attendance report limited to their own park", async () => {
    authedAs(parkLead);

    const response = await attendanceReportGET(url("attendance-report"));

    expect(response.status).toBe(200);
    expect(mocks.attendanceRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            group: {
              OR: [
                { parkId: "park-lhr" },
                { parkId: null, batch: { parkId: "park-lhr" } },
              ],
            },
          }),
        }),
      })
    );
  });

  it("denies a Park Lead without a park assignment", async () => {
    authedAs({ id: "park-lead-2", role: "park_lead", assignedCityId: "city-lhr", assignedParkId: null });

    const response = await attendanceReportGET(url("attendance-report"));

    expect(response.status).toBe(403);
    expect(mocks.attendanceRecordFindMany).not.toHaveBeenCalled();
  });
});

describe("a City Head response stays truthful when the city has no data", () => {
  it("reports zero admissions without inventing rows", async () => {
    authedAs(cityHeadLahore);

    const response = await admissionsGET(url("admissions"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toEqual({
      totalApplications: 0,
      statusBreakdown: [],
      cityBreakdown: [],
    });
  });

  it("reports zero fees without inventing amounts", async () => {
    authedAs(cityHeadLahore);

    const response = await feesGET(url("fees"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toEqual({
      totalFeeEvents: 0,
      totalPayments: 0,
      totalCollected: 0,
      paymentCount: 0,
    });
    expect(body.methodBreakdown).toEqual([]);
  });

  it("returns an empty attendance report with the resolved city label", async () => {
    authedAs(cityHeadLahore);
    mocks.cityFindUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore" });

    const response = await attendanceReportGET(url("attendance-report"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.summary.totalEvents).toBe(0);
    expect(body.summary.totalRecords).toBe(0);
    expect(body.summary.presentRate).toBe(0);
    expect(body.summary.scopeLabel).toBe("Lahore");
  });
});

/* ── Authoritative group-park scope (intentionally conflicting parks) ─────
 *
 * Group.parkId is authoritative; Group.batch.park is a fallback only for a
 * legacy null group park. These fixtures deliberately contradict the two so a
 * batch-only scope filter is caught rather than passing silently.
 */

type SyntheticGroup = {
  id: string;
  parkId: string | null;
  parkCityId: string | null;
  batchParkId: string;
  batchParkCityId: string;
};

const CITY_NAMES: Record<string, string> = { "city-lhr": "Lahore", "city-khi": "Karachi" };
const PARK_NAMES: Record<string, string> = { "park-lhr": "Park Lahore", "park-khi": "Park Karachi" };

const SYNTHETIC_GROUPS: SyntheticGroup[] = [
  // own park inside Lahore, batch park inside Karachi
  { id: "g-own-lhr", parkId: "park-lhr", parkCityId: "city-lhr", batchParkId: "park-khi", batchParkCityId: "city-khi" },
  { id: "g-own-lhr-2", parkId: "park-lhr", parkCityId: "city-lhr", batchParkId: "park-khi", batchParkCityId: "city-khi" },
  // own park inside Karachi, batch park inside Lahore — the batch-only leak case
  { id: "g-own-khi", parkId: "park-khi", parkCityId: "city-khi", batchParkId: "park-lhr", batchParkCityId: "city-lhr" },
  // legacy null group park, resolved through the batch park
  { id: "g-null-lhr", parkId: null, parkCityId: null, batchParkId: "park-lhr", batchParkCityId: "city-lhr" },
  { id: "g-null-khi", parkId: null, parkCityId: null, batchParkId: "park-khi", batchParkCityId: "city-khi" },
];

// A Lahore City Head must see exactly these three groups.
const AUTHORITATIVE_LAHORE_GROUPS = ["g-own-lhr", "g-own-lhr-2", "g-null-lhr"];
const AUTHORITATIVE_LAHORE_NAMES = AUTHORITATIVE_LAHORE_GROUPS.map((id) => `Student ${id}`);

const SYNTHETIC_EVENTS = SYNTHETIC_GROUPS.map((group) => ({
  id: `event-${group.id}`,
  groupId: group.id,
  title: `Session ${group.id}`,
  eventDate: new Date("2026-07-01T04:00:00.000Z"),
}));

const groupById = new Map(SYNTHETIC_GROUPS.map((group) => [group.id, group]));
const eventGroupId = new Map(SYNTHETIC_EVENTS.map((event) => [event.id, event.groupId]));

function groupRecord(group: SyntheticGroup) {
  return {
    id: group.id,
    name: `Group ${group.id}`,
    parkId: group.parkId,
    park: group.parkId && group.parkCityId
      ? { id: group.parkId, name: PARK_NAMES[group.parkId], city: { name: CITY_NAMES[group.parkCityId] } }
      : null,
    batch: {
      name: `Batch ${group.id}`,
      park: { id: group.batchParkId, name: PARK_NAMES[group.batchParkId], city: { name: CITY_NAMES[group.batchParkCityId] } },
    },
  };
}

const SYNTHETIC_RECORDS = SYNTHETIC_GROUPS.map((group) => {
  const record = groupRecord(group);
  return {
    id: `record-${group.id}`,
    eventId: `event-${group.id}`,
    participantId: `participant-${group.id}`,
    status: "present",
    markedAt: new Date("2026-07-01T05:00:00.000Z"),
    markedBy: null,
    participant: { name: `Student ${group.id}`, group: record },
    event: {
      id: `event-${group.id}`,
      groupId: group.id,
      title: `Session ${group.id}`,
      eventDate: new Date("2026-07-01T04:00:00.000Z"),
      group: record,
    },
  };
});

function groupForEvent(eventId: string): SyntheticGroup {
  const groupId = eventGroupId.get(eventId);
  const group = groupId ? groupById.get(groupId) : undefined;
  if (!group) throw new Error(`Synthetic event ${eventId} has no group`);
  return group;
}

function unsupportedScopeKey(key: string): never {
  throw new Error(`Test scope evaluator does not model the "${key}" key`);
}

function matchesScalar(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object" && "in" in (expected as Record<string, unknown>)) {
    const list = (expected as { in: unknown[] }).in;
    return typeof actual === "string" && list.includes(actual);
  }
  return actual === expected;
}

function matchesGroupWhere(group: SyntheticGroup, where: Record<string, unknown>): boolean {
  const or = where.OR as Record<string, unknown>[] | undefined;
  if (or && !or.some((branch) => matchesGroupWhere(group, branch))) return false;
  const and = where.AND as Record<string, unknown>[] | undefined;
  if (and && !and.every((branch) => matchesGroupWhere(group, branch))) return false;

  for (const [key, expected] of Object.entries(where)) {
    if (key === "OR" || key === "AND") continue;
    if (key === "id") {
      if (!matchesScalar(group.id, expected)) return false;
    } else if (key === "parkId") {
      if (!matchesScalar(group.parkId, expected)) return false;
    } else if (key === "park") {
      const cityId = (expected as { cityId?: unknown } | null)?.cityId;
      if (cityId === undefined) unsupportedScopeKey("park");
      if (group.parkCityId !== cityId) return false;
    } else if (key === "batch") {
      const batch = expected as { parkId?: unknown; park?: { cityId?: unknown } };
      if (batch.parkId !== undefined && !matchesScalar(group.batchParkId, batch.parkId)) return false;
      const batchCityId = batch.park?.cityId;
      if (batchCityId !== undefined && group.batchParkCityId !== batchCityId) return false;
    } else {
      unsupportedScopeKey(key);
    }
  }
  return true;
}

function matchesEventWhere(eventId: string, where: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(where)) {
    if (key === "group") {
      if (!matchesGroupWhere(groupForEvent(eventId), expected as Record<string, unknown>)) return false;
    } else if (key === "groupId") {
      if (!matchesScalar(groupForEvent(eventId).id, expected)) return false;
    } else if (key === "eventDate") {
      // date bounds are not exercised by these fixtures
    } else {
      unsupportedScopeKey(key);
    }
  }
  return true;
}

function matchesRecordWhere(record: { eventId: string }, where: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(where)) {
    if (key === "event") {
      if (!matchesEventWhere(record.eventId, expected as Record<string, unknown>)) return false;
    } else {
      unsupportedScopeKey(key);
    }
  }
  return true;
}

function installAuthoritativeFakes() {
  const eventsFor = (where: Record<string, unknown>) =>
    SYNTHETIC_EVENTS.filter((event) => matchesEventWhere(event.id, where));
  const recordsFor = (where: Record<string, unknown>) =>
    SYNTHETIC_RECORDS.filter((record) => matchesRecordWhere(record, where));

  mocks.attendanceEventCount.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => eventsFor(where).length);
  mocks.attendanceEventGroupBy.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    const counts = new Map<string, number>();
    for (const event of eventsFor(where)) counts.set(event.groupId, (counts.get(event.groupId) ?? 0) + 1);
    return [...counts].map(([groupId, count]) => ({ groupId, _count: { _all: count } }));
  });
  mocks.attendanceRecordCount.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => recordsFor(where).length);
  mocks.attendanceRecordGroupBy.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    const counts = new Map<string, number>();
    for (const record of recordsFor(where)) counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
    return [...counts].map(([status, count]) => ({ status, _count: { _all: count } }));
  });
  mocks.attendanceRecordFindMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => recordsFor(where));
  mocks.staffMetaFindMany.mockResolvedValue([]);
  mocks.parkFindUnique.mockResolvedValue({
    id: "park-lhr",
    cityId: "city-lhr",
    name: PARK_NAMES["park-lhr"],
    city: { id: "city-lhr", name: CITY_NAMES["city-lhr"] },
  });
  mocks.cityFindUnique.mockResolvedValue({ id: "city-lhr", name: CITY_NAMES["city-lhr"] });
}

describe("authoritative group-park scope beats a conflicting batch park", () => {
  beforeEach(() => {
    authedAs(cityHeadLahore);
    installAuthoritativeFakes();
  });

  it("counts city-filtered sessions from the group's own park, not the batch park", async () => {
    const response = await attendanceGET(url("attendance"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.attendanceEventCount).toHaveBeenCalledWith({
      where: {
        group: {
          AND: [{
            OR: [
              { park: { cityId: "city-lhr" } },
              { parkId: null, batch: { park: { cityId: "city-lhr" } } },
            ],
          }],
        },
      },
    });
    // A batch-only filter would return 2 (the Karachi-parked group plus the
    // null-park fallback); the authoritative rule returns the 3 Lahore-parked
    // groups instead.
    expect(body.summary.totalEvents).toBe(3);
    expect(body.summary.uniqueGroups).toBe(3);
    expect(body.summary.totalRecords).toBe(3);
  });

  it("counts park-filtered sessions from the group's own park, not the batch park", async () => {
    const response = await attendanceGET(url("attendance", "?parkId=park-lhr"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.attendanceEventCount).toHaveBeenCalledWith({
      where: {
        group: {
          OR: [
            { parkId: "park-lhr" },
            { parkId: null, batch: { parkId: "park-lhr" } },
          ],
        },
      },
    });
    expect(body.summary.totalEvents).toBe(3);
    expect(body.summary.uniqueGroups).toBe(3);
  });

  it("returns only authoritative rows, parks and cities in the detailed report", async () => {
    const response = await attendanceReportGET(url("attendance-report"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((row: { participantName: string }) => row.participantName)).toEqual(
      AUTHORITATIVE_LAHORE_NAMES
    );
    // The Lahore-parked group must report its own park even though its batch
    // park is in Karachi.
    expect(body.data[0]).toMatchObject({ parkName: "Park Lahore", cityName: "Lahore" });
    expect(JSON.stringify(body)).not.toContain("Karachi");
    expect(JSON.stringify(body)).not.toContain("Park Karachi");
  });

  it("returns only authoritative rows for a City Head park filter on the detailed report", async () => {
    const response = await attendanceReportGET(url("attendance-report", "?parkId=park-lhr"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.attendanceRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            group: {
              OR: [
                { parkId: "park-lhr" },
                { parkId: null, batch: { parkId: "park-lhr" } },
              ],
            },
          }),
        }),
      })
    );
    expect(body.data.map((row: { participantName: string }) => row.participantName)).toEqual(
      AUTHORITATIVE_LAHORE_NAMES
    );
    expect(body.summary.scopeLabel).toBe("Park Lahore, Lahore");
    expect(JSON.stringify(body)).not.toContain("Karachi");
  });

  it("exports only authoritative CSV rows and audits the resolved city scope", async () => {
    const response = await exportPOST(exportRequest({ reportType: "attendance", format: "csv" }));
    const text = await response.text();

    expect(response.status).toBe(200);
    for (const name of AUTHORITATIVE_LAHORE_NAMES) expect(text).toContain(name);
    expect(text).not.toContain("Karachi");
    expect(text).not.toContain("Park Karachi");
    expect(text).not.toContain("Student g-own-khi");
    expect(text).not.toContain("Student g-null-khi");
    // The Lahore-parked group's CSV row carries its own park and city.
    expect(text).toContain("Lahore,Park Lahore,Batch g-own-lhr,Group g-own-lhr");
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "reports.export",
      newValues: expect.objectContaining({ cityId: "city-lhr", parkId: null }),
    }));
    expect(JSON.stringify(mocks.logAudit.mock.calls)).not.toContain("city-khi");
    expect(JSON.stringify(mocks.logAudit.mock.calls)).not.toContain("park-khi");
  });

  it("exports only authoritative CSV rows and audits the resolved park scope", async () => {
    const response = await exportPOST(
      exportRequest({ reportType: "attendance", format: "csv", parkId: "park-lhr" })
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(mocks.attendanceRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            group: {
              OR: [
                { parkId: "park-lhr" },
                { parkId: null, batch: { parkId: "park-lhr" } },
              ],
            },
          }),
        }),
      })
    );
    for (const name of AUTHORITATIVE_LAHORE_NAMES) expect(text).toContain(name);
    expect(text).not.toContain("Student g-own-khi");
    expect(text).not.toContain("Karachi");
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "reports.export",
      newValues: expect.objectContaining({ cityId: "city-lhr", parkId: "park-lhr" }),
    }));
  });

  it("denies a cross-city park on the export before reading rows or auditing", async () => {
    mocks.parkFindUnique.mockResolvedValue({ id: "park-khi", cityId: "city-khi" });

    const response = await exportPOST(
      exportRequest({ reportType: "attendance", format: "csv", parkId: "park-khi" })
    );

    expect(response.status).toBe(403);
    expect(mocks.attendanceRecordFindMany).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
