// Paired route-level defect characterization using real handlers/scope/audit and
// synthetic in-memory persistence. This does not establish native DB isolation.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const h = vi.hoisted(() => ({ db: {}, actor: null, deny: null, event: null, staff: null, rows: [], failAudit: false, writes: 0 }));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: vi.fn(async () => h.deny ?? { user: h.actor }) }));
import { GET, POST } from "@c1-registration";

const variant = process.env.C1_VARIANT;
const isV2 = variant === "v2";
const params = { params: Promise.resolve({ id: "event-a" }) };
const send = (body) => POST(new NextRequest("http://localhost/api/events/event-a/registrations", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), params);
const target = (id) => ({ id, name: "Synthetic participant", state: "active", group: { batchId: "batch-a", batch: { park: { cityId: id === "foreign" ? "city-b" : "city-a" } } } });

beforeEach(() => {
  h.actor = { id: "actor-a", role: "city_head" };
  h.deny = null;
  h.event = { id: "event-a", cityId: "city-a", title: "Synthetic event", capacity: 1, cost: 0, status: "planned", startDate: new Date("2026-09-12T05:00:00Z"), requiresConsent: false, requiresMedical: false };
  h.staff = { isActive: true, assignedCityId: "city-a" };
  h.rows = [];
  h.failAudit = false;
  h.writes = 0;
  Object.assign(h.db, {
    event: { findUnique: vi.fn(async () => h.event) },
    staffMeta: { findUnique: vi.fn(async () => h.staff) },
    participant: {
      findUnique: vi.fn(async ({ where }) => target(where.id)),
      findFirst: vi.fn(async ({ where }) => {
        const row = target(where.id);
        return row.group.batch.park.cityId === where.group.batch.park.cityId ? row : null;
      }),
    },
    eventRegistration: {
      findMany: vi.fn(async () => h.rows),
      findUnique: vi.fn(async ({ where }) => h.rows.find(r => r.participantId === where.eventId_participantId.participantId) ?? null),
      count: vi.fn(async () => h.rows.filter(r => ["registered", "confirmed", "checked_in"].includes(r.status)).length),
      create: vi.fn(async ({ data }) => {
        const row = { id: `r-${h.rows.length}`, status: "registered", ...data };
        h.rows.push(row); h.writes++; return row;
      }),
      upsert: vi.fn(async ({ create, update }) => {
        let row = h.rows.find(r => r.participantId === create.participantId);
        if (row) Object.assign(row, update);
        else { row = { id: `r-${h.rows.length}`, ...create }; h.rows.push(row); }
        h.writes++; return row;
      }),
    },
    auditLog: { create: vi.fn(async () => { if (h.failAudit) throw new Error("SYNTHETIC_AUDIT_FAILURE"); return { id: "audit" }; }) },
    payment: { groupBy: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn) => {
      const before = structuredClone(h.rows);
      try { return await fn(h.db); } catch (error) { h.rows = before; throw error; }
    }),
  });
});

describe(`C1 ${variant} event registration characterization`, () => {
  it("permits an authorized same-city registration", async () => {
    expect((await send({ participantId: "local" })).status).toBe(201);
    expect(h.rows).toHaveLength(1);
  });
  it.each([401, 403])("returns authorization boundary denial %s without persistence", async status => {
    h.deny = NextResponse.json({ error: "Synthetic auth denial" }, { status });
    expect((await send({ participantId: "local" })).status).toBe(status);
    expect(h.writes).toBe(0);
  });
  it("denies missing staff assignment", async () => {
    h.staff = null;
    expect((await send({ participantId: "local" })).status).toBe(403);
    expect(h.writes).toBe(0);
  });
  it("denies an event in another assigned city", async () => {
    h.staff.assignedCityId = "city-b";
    expect((await send({ participantId: "local" })).status).toBe(403);
    expect(h.writes).toBe(0);
  });
  it("rejects missing participant input", async () => {
    expect((await send({})).status).toBe(400);
    expect(h.writes).toBe(0);
  });
  it("handles missing event", async () => {
    h.event = null;
    expect((await send({ participantId: "local" })).status).toBe(404);
    expect(h.writes).toBe(0);
  });
  it("exposes the cross-city participant difference", async () => {
    expect((await send({ participantId: "foreign" })).status).toBe(isV2 ? 201 : 404);
    expect(h.writes).toBe(isV2 ? 1 : 0);
  });
  it("exposes repeat registration demotion at capacity in v2", async () => {
    await send({ participantId: "local" });
    expect((await send({ participantId: "local" })).status).toBe(isV2 ? 201 : 409);
    expect(h.rows[0].status).toBe(isV2 ? "waitlisted" : "registered");
  });
  it("exposes caller-controlled payment/consent/medical approval in v2", async () => {
    h.event.requiresConsent = true; h.event.requiresMedical = true;
    expect((await send({ participantId: "local", feeStatus: "paid", hasConsent: true, hasMedical: true })).status).toBe(isV2 ? 201 : 400);
    if (isV2) expect(h.rows[0]).toMatchObject({ feeStatus: "paid", hasConsent: true, hasMedical: true });
    expect(h.db.payment.groupBy).not.toHaveBeenCalled();
  });
  it("exposes direct check-in bypassing zero capacity and required safety flags", async () => {
    h.event.capacity = 0; h.event.requiresConsent = true; h.event.requiresMedical = true;
    expect((await send({ participantId: "local", action: "check_in" })).status).toBe(isV2 ? 201 : 400);
    if (isV2) expect(h.rows[0]).toMatchObject({ status: "checked_in", hasConsent: false, hasMedical: false });
  });
  it("exposes registration of a cancelled event on both branches", async () => {
    h.event.status = "cancelled";
    expect((await send({ participantId: "local" })).status).toBe(201);
  });
  it("exposes capacity check outside atomic reservation on both branches", async () => {
    let release;
    let arrivals = 0;
    const barrier = new Promise(resolve => { release = resolve; });
    h.db.eventRegistration.count.mockImplementation(async () => {
      arrivals++; if (arrivals === 2) release();
      await barrier; return 0;
    });
    const responses = await Promise.all([send({ participantId: "local-1" }), send({ participantId: "local-2" })]);
    expect(responses.map(r => r.status)).toEqual([201, 201]);
    expect(h.rows.filter(r => r.status === "registered")).toHaveLength(2);
  });
  it("exposes audit failure persistence in v2 versus main transaction rollback", async () => {
    h.failAudit = true;
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      if (isV2) expect((await send({ participantId: "local" })).status).toBe(201);
      else await expect(send({ participantId: "local" })).rejects.toThrow("SYNTHETIC_AUDIT_FAILURE");
      expect(h.rows).toHaveLength(isV2 ? 1 : 0);
    } finally { stderr.mockRestore(); }
  });
  it("exposes the read contract difference", async () => {
    const result = await (await GET(new NextRequest("http://localhost/api/events/event-a/registrations"), params)).json();
    expect(Object.keys(result).sort()).toEqual(isV2 ? ["counts", "event", "registrations"] : ["data"]);
  });
});
