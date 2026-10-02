import { beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ db: {}, events: [], participants: [], snapshots: new Map(), writes: 0 }));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: async () => ({ user: { id: "actor", role: "park_admin" } }),
  requireCapability: async () => ({ user: { id: "actor", role: "park_admin" } }),
  requireResourceScope: () => null, ATTENDANCE_ROLES: ["park_admin"],
}));
import * as schedule from "@c1-schedule";
import * as policy from "@c1-policy";
const main = process.env.C1_VARIANT === "main";
beforeEach(() => {
  h.events = []; h.participants = [{ id: "p1", groupId: "g1" }]; h.snapshots = new Map(); h.writes = 0;
  Object.assign(h.db, {
    participant: {
      findUnique: async () => ({ id: "p1", state: "active", groupId: "g1", group: { batch: { settings: { automaticDropoutEnabled: true, dropoutConsecutiveWeeks: 3 } } } }),
      findMany: async () => h.participants,
      update: async () => { h.writes++; return {}; },
    },
    attendanceEvent: {
      findMany: async () => h.events,
      findUnique: async () => ({ id: "event", groupId: "g1", isClosed: true, group: { batch: { parkId: "park", park: { cityId: "city" } } } }),
    },
    staffMeta: { findUnique: async () => ({ id: "staff", isActive: true, assignedCityId: "city" }) },
    staffAttendanceRecord: { upsert: async () => { h.writes++; return { id: "record" }; } },
    attendanceRosterSnapshot: { upsert: async ({ create, update }) => { const prev = h.snapshots.get(create.participantId); h.snapshots.set(create.participantId, prev ? { ...prev, ...update } : create); return {}; } },
    auditLog: { create: async () => ({ id: "audit" }) },
    $transaction: async fn => fn(h.db),
  });
});
const scheduled = (date, extra = false) => main
  ? schedule.isScheduledAttendanceSession(new Date(`${date}T05:00:00Z`), { startDate: new Date("2026-09-01T00:00:00Z"), endDate: null })
  : schedule.isBatchClassDate({ date, startDate: new Date("2026-09-01T00:00:00Z"), endDate: null, extraClassDates: extra ? [new Date(`${date}T05:00:00Z`)] : [] });
it.each([["2026-09-12", true], ["2026-09-13", true], ["2026-09-14", false]])("compares default scheduled date %s", (date, expected) => expect(scheduled(date)).toBe(expected));
it("exposes v2 extra weekday class capability absent from main helper", () => expect(scheduled("2026-09-14", true)).toBe(!main));
async function dropout(records) {
  if (!main) return policy.evaluateConsecutiveAbsenceWeeks(records, { warningConsecutiveWeeks: 2, dropoutConsecutiveWeeks: 3 }).shouldDropout;
  h.events = records.map((r, i) => ({ id: `e${i}`, eventDate: new Date(r.eventDate), records: [{ status: r.status }] }));
  return (await policy.evaluateAutomaticDropout("p1")).droppedOut;
}
it("recognizes three contiguous absent weeks", async () => {
  expect(await dropout(["2026-09-05", "2026-09-12", "2026-09-19"].map(eventDate => ({ eventDate: `${eventDate}T05:00:00Z`, status: "absent" })))).toBe(true);
});
it("exposes policy difference for a gap between absent weeks", async () => {
  expect(await dropout(["2026-08-01", "2026-08-15", "2026-09-19"].map(eventDate => ({ eventDate: `${eventDate}T05:00:00Z`, status: "absent" })))).toBe(!main);
});
it("exposes policy difference for an excused week", async () => {
  expect(await dropout(["2026-09-05", "2026-09-12", "2026-09-19", "2026-09-26"].map((date, i) => ({ eventDate: `${date}T05:00:00Z`, status: i === 2 ? "excused" : "absent" })))).toBe(!main);
});
if (main) {
  it("exposes roster snapshot expansion on a repeated call", async () => {
    const { createRosterSnapshot } = await import("@c1-summaries");
    await createRosterSnapshot("event");
    h.participants.push({ id: "p2", groupId: "g1" });
    await createRosterSnapshot("event");
    expect(h.snapshots.size).toBe(2);
  });
  it("exposes staff mark accepted for a closed normal attendance session", async () => {
    const { POST } = await import("@c1-staff");
    const response = await POST(new Request("http://localhost/staff", { method: "POST", body: JSON.stringify({ staffId: "staff", status: "present" }) }), { params: Promise.resolve({ eventId: "event" }) });
    expect(response.status).toBe(200); expect(h.writes).toBe(1);
  });
}
