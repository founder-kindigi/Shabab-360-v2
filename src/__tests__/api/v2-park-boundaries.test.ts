import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const m = vi.hoisted(() => ({
  capability: vi.fn(),
  db: {
    park: { findUnique: vi.fn() }, group: { findUnique: vi.fn(), findMany: vi.fn() },
    participant: { findUnique: vi.fn(), findMany: vi.fn() },
    parkLesson: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    parkRoutineSlot: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    studentEvaluation: { upsert: vi.fn() }, auditLog: { create: vi.fn() }, $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth/authorize", async original => ({ ...await original<typeof import("@/lib/auth/authorize")>(), requireCapability: m.capability }));
vi.mock("@/lib/db", () => ({ db: m.db }));
import * as lessons from "@/app/api/park/lessons/route";
import * as planner from "@/app/api/park/planner/route";
import * as evaluations from "@/app/api/park/evaluations/route";
const actor = { id: "actor", role: "park_lead", assignedParkId: "own" };
const group = { id: "group", parkId: "own", park: { id: "own", cityId: "city" }, batch: { cityId: "city", parkId: "anchor", park: { id: "anchor", cityId: "city" } } };
const cases = [
  { name: "lessons", route: lessons, query: "parkId=own", body: { parkId: "own", title: "Synthetic lesson", type: "Tarbiyah", lessonDate: "2026-09-01T00:00:00.000Z" } },
  { name: "planner", route: planner, query: "parkId=own", body: { parkId: "own", timeStart: "07:00", timeEnd: "08:00", activity: "Synthetic activity" } },
  { name: "evaluations", route: evaluations, query: "parkId=own&month=9&year=2026", body: { parkId: "own", participantId: "participant", month: 9, year: 2026, discipline: 5, farmabardari: 5, islah: 5, ibadah: 5, participation: 5, comment: "Synthetic evaluation comment" } },
];
const post = (body: unknown) => new Request("http://localhost/api/park/test", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); m.capability.mockResolvedValue({ user: actor });
  m.db.park.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, cityId: "city", isActive: true }));
  m.db.group.findUnique.mockResolvedValue(group); m.db.group.findMany.mockResolvedValue([{ id: "group" }]);
  m.db.participant.findUnique.mockResolvedValue({ id: "participant", group }); m.db.participant.findMany.mockResolvedValue([]);
  m.db.parkLesson.findMany.mockResolvedValue([]); m.db.parkRoutineSlot.findMany.mockResolvedValue([]);
  m.db.parkLesson.create.mockResolvedValue({ id: "lesson" }); m.db.parkRoutineSlot.create.mockResolvedValue({ id: "slot" }); m.db.studentEvaluation.upsert.mockResolvedValue({ id: "evaluation" });
  m.db.$transaction.mockImplementation(async run => run(m.db));
});
describe.each(cases)("$name actual route boundaries", ({ route, body, query }) => {
  it.each([401, 403])("preserves capability/auth denial %s without data access", async status => {
    m.capability.mockResolvedValue(NextResponse.json({}, { status }));
    expect((await route.GET(new Request("http://localhost/?" + query))).status).toBe(status);
    expect((await route.POST(post(body))).status).toBe(status); expect(m.db.park.findUnique).not.toHaveBeenCalled(); expect(m.db.$transaction).not.toHaveBeenCalled();
  });
  it("allows assigned-park empty reads and persists an audited valid write", async () => {
    expect((await route.GET(new Request("http://localhost/?" + query))).status).toBe(200);
    expect((await route.POST(post(body))).status).toBe(201); expect(m.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it("does not allow a capability grant to expand the assigned park", async () => {
    expect((await route.GET(new Request("http://localhost/?" + query.replace("own", "foreign")))).status).toBe(403);
    expect((await route.POST(post({ ...body, parkId: "foreign" }))).status).toBe(403); expect(m.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("denies missing scope and forced reset even when capability resolution is mocked as granted", async () => {
    m.capability.mockResolvedValue({ user: { id: "actor", role: "park_lead" } });
    expect((await route.POST(post(body))).status).toBe(403);
    m.capability.mockResolvedValue({ user: { ...actor, mustResetPwd: true } }); expect((await route.POST(post(body))).status).toBe(403);
  });
  it("returns failure when required audit storage fails", async () => {
    m.db.auditLog.create.mockRejectedValue(Error("Synthetic audit failure"));
    expect((await route.POST(post(body))).status).toBeGreaterThanOrEqual(500);
    // Real transactional rollback is verified in the disposable database suite.
  });
});
it("requires valid ordered planner times", async () => {
  for (const timeEnd of ["99:99", "06:00", "07:00"]) expect((await planner.POST(post({ ...cases[1].body, timeEnd }))).status).toBe(400);
  expect(m.db.$transaction).not.toHaveBeenCalled();
});
it("rejects partially numeric evaluation query values", async () => {
  expect((await evaluations.GET(new Request("http://localhost/?parkId=own&month=9junk&year=2026"))).status).toBe(400);
  expect(m.db.participant.findMany).not.toHaveBeenCalled();
});
it("does not allow group-only assignments to change park-wide content", async () => {
  m.capability.mockResolvedValue({ user: { id: "actor", role: "murabbi", assignedGroupId: "group" } });
  expect((await lessons.POST(post(cases[0].body))).status).toBe(403);
  expect((await planner.POST(post(cases[1].body))).status).toBe(403);
});
