import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const m = vi.hoisted(() => ({ capability: vi.fn(), scope: vi.fn(), city: vi.fn(), session: vi.fn(), transaction: vi.fn(), participant: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: m.capability }));
vi.mock("@/lib/student-profile/scope", () => ({ resolveActorCity: m.city, canAccessParticipantProfile: m.scope }));
vi.mock("@/lib/db", () => ({ db: { participant: { findUnique: m.participant }, $transaction: m.transaction } }));
import { PUT } from "@/app/api/admin/students/[id]/profile/route";

describe("profile save integrity through the actual handler", () => {
  let stored: any;
  let failAudit: boolean;
  let audits: any[];
  const version = "2026-09-01T00:00:00.000Z";
  const save = (body: unknown, match: string | null = version) => PUT(new Request("http://localhost/api/admin/students/p/profile?cityId=c", {
    method: "PUT", headers: { "Content-Type": "application/json", ...(match ? { "If-Match": match } : {}) }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: "p" }) });
  beforeEach(() => {
    vi.resetAllMocks(); failAudit = false; audits = [];
    stored = { id: "profile", participantId: "p", school: "Old", hobbies: "Reading", disability: "private", updatedAt: new Date(version) };
    m.session.mockResolvedValue({ user: { id: "actor", role: "super_admin" } });
    m.capability.mockResolvedValue({}); m.city.mockResolvedValue("c"); m.scope.mockResolvedValue(true); m.participant.mockResolvedValue({ id: "p" });
    m.transaction.mockImplementation(async (run) => {
      const before = structuredClone(stored);
      try { return await run({ studentExtendedProfile: {
        findUnique: async () => stored,
        update: async ({ where, data }: any) => {
          if (stored.updatedAt.getTime() !== where.updatedAt.getTime()) throw { code: "P2025" };
          stored = { ...stored, ...data }; return stored;
        },
        create: async ({ data }: any) => { stored = { id: "profile", ...data, updatedAt: new Date() }; return stored; },
      }, auditLog: { create: async ({ data }: any) => { if (failAudit) throw Error("audit unavailable"); audits.push(data); } } });
      } catch (e) { stored = before; throw e; }
    });
  });
  it("clears only the submitted field and preserves omitted values", async () => {
    const response = await save({ school: null }); expect(response.status).toBe(200);
    expect(stored.school).toBeNull(); expect(stored.hobbies).toBe("Reading"); expect(audits).toHaveLength(1);
  });
  it("creates a first profile with an explicit new precondition", async () => {
    stored = null; expect((await save({ school: "New" }, "new")).status).toBe(201);
  });
  it("rejects stale and missing preconditions without a write", async () => {
    expect((await save({ school: "Changed" }, "2026-08-01T00:00:00Z")).status).toBe(409);
    expect((await save({ school: "Changed" }, null)).status).toBe(428);
    expect(stored.school).toBe("Old"); expect(audits).toHaveLength(0);
  });
  it("rejects a second edit against an already consumed version", async () => {
    expect((await save({ school: "First" })).status).toBe(200);
    expect((await save({ school: "Second" })).status).toBe(409); expect(stored.school).toBe("First");
  });
  it("rolls back the profile if the mandatory audit fails", async () => {
    failAudit = true; expect((await save({ school: "Changed" })).status).toBe(503); expect(stored.school).toBe("Old");
  });
  it("checks sensitive management even for null clears", async () => {
    m.capability.mockImplementation(async (cap) => cap === "students.profile.sensitive.manage" ? NextResponse.json({}, { status: 403 }) : {});
    expect((await save({ disability: null })).status).toBe(403); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("redacts sensitive values in audit and in a response without view permission", async () => {
    m.capability.mockImplementation(async (cap) => cap === "students.profile.sensitive.view" ? NextResponse.json({}, { status: 403 }) : {});
    const response = await save({ disability: "secret change" }); expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty("disability"); expect(JSON.stringify(audits)).not.toContain("secret change");
  });
  it("rejects metadata copied from a GET response", async () => {
    expect((await save({ id: "profile", school: "Changed" })).status).toBe(400); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("denies a foreign participant before any transaction", async () => {
    m.scope.mockResolvedValue(false); expect((await save({ school: "Changed" })).status).toBe(403); expect(m.transaction).not.toHaveBeenCalled();
  });
});
