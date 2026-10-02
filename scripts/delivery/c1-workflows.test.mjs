// Real routes/parsers, synthetic DB/auth boundary. No native concurrency claim.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const h = vi.hoisted(() => ({ db: {}, actor: {}, deny: null, staff: null, participants: [], application: {}, race: false }));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: async () => h.deny ?? { user: h.actor },
  requireCapability: async () => h.deny ?? { user: h.actor },
  requireRole: async () => h.deny,
}));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: async () => true }));
vi.mock("@/lib/calling/template-hmac", () => ({ computeValuesHmac: () => "synthetic-hmac-no-secret" }));
import { GET, POST } from "@c1-mashwara";
import { POST as convert } from "@c1-convert";
import { POST as useTemplate } from "@c1-template-use";
import { createAuditLogData } from "@/lib/audit";
import { parseSheet } from "@c1-parser";
import { readWorkbook } from "@c1-workbook";

const v2 = process.env.C1_VARIANT === "v2";
const request = (body, path = "mashwara") => new NextRequest(`http://localhost/api/admin/${path}`, { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  h.actor = { id: "actor-a", role: "city_head", assignedCityId: "city-a" };
  h.deny = null;
  h.staff = { id: "staff-a", isActive: true, assignedCityId: "city-a" };
  h.participants = []; h.race = false;
  h.application = { id: "application-a", status: "accepted", convertedParticipantId: null, applicantName: "Synthetic learner", applicantDOB: new Date("2012-01-01"), gender: "male" };
  Object.assign(h.db, {
    staffMeta: { findFirst: vi.fn(async ({ where }) => where.id && where.id !== h.staff?.id ? null : h.staff) },
    city: { findFirst: vi.fn(async () => ({ id: "city-a" })) },
    mashwaraMeeting: {
      findMany: vi.fn(async ({ where }) => [{ id: "meeting-b", cityId: "city-b" }].filter(r => !where.cityId || where.cityId === r.cityId)),
      count: vi.fn(async () => 1),
      create: vi.fn(async ({ data }) => ({ id: "new-meeting", ...data })),
    },
    auditLog: { create: vi.fn(async () => ({ id: "audit" })) },
    admissionApplication: {
      findUnique: vi.fn(async () => structuredClone(h.application)),
      update: vi.fn(async ({ data }) => Object.assign(h.application, data)),
      updateMany: vi.fn(async ({ where, data }) => {
        const matches = h.application.status === where.status && h.application.convertedParticipantId === where.convertedParticipantId;
        if (matches) Object.assign(h.application, data);
        return { count: matches ? 1 : 0 };
      }),
    },
    group: { findUnique: vi.fn(async () => ({ id: "group-a", isActive: true })) },
    callingTemplate: { findUnique: vi.fn(async () => ({ id: "template-a", status: "approved", version: 1, cityId: "city-a", campaignId: "campaign-a" })) },
    callingAssignment: { findUnique: vi.fn(async () => ({ id: "assignment-a", isActive: true, callerStaffMetaId: "foreign-staff", campaignId: "campaign-a", campaign: { cityId: "city-a" } })) },
    callingTemplateUse: { create: vi.fn(async ({ data }) => ({ id: "use-a", ...data })) },
    participant: { create: vi.fn(async ({ data }) => { const row = { id: "new-person", ...data }; h.participants.push(row); return row; }) },
    $transaction: vi.fn(async fn => {
      if (h.race) h.application = { ...h.application, status: "enrolled", convertedParticipantId: "winner" };
      const before = structuredClone(h.participants);
      try { return await fn(h.db); } catch (error) { h.participants = before; throw error; }
    }),
  });
});

describe(`C1 ${process.env.C1_VARIANT} workflow comparison`, () => {
  it.each([401, 403])("honors Mashwara boundary denial %s without a query", async status => {
    h.deny = NextResponse.json({ error: "Synthetic denial" }, { status });
    expect((await GET(new NextRequest("http://localhost/api/admin/mashwara"))).status).toBe(status);
    expect(h.db.mashwaraMeeting.findMany).not.toHaveBeenCalled();
  });
  it("exposes missing-city collection scope in v2", async () => {
    h.actor.assignedCityId = null; h.staff.assignedCityId = null;
    const response = await GET(new NextRequest("http://localhost/api/admin/mashwara"));
    expect(response.status).toBe(v2 ? 200 : 403);
    if (v2) expect((await response.json()).data[0].cityId).toBe("city-b");
  });
  it("exposes foreign-city meeting creation in v2", async () => {
    const response = await POST(request({ cityId: "city-b", title: "Synthetic meeting", scheduledAt: "2026-09-12T12:00:00Z" }));
    expect(response.status).toBe(v2 ? 201 : 403);
    expect(h.db.mashwaraMeeting.create).toHaveBeenCalledTimes(v2 ? 1 : 0);
  });
  it("permits same-city meeting creation", async () => {
    expect((await POST(request({ cityId: "city-a", title: "Synthetic meeting", scheduledAt: "2026-09-12T12:00:00Z" }))).status).toBe(201);
  });
  it("rejects invalid meeting title", async () => {
    expect((await POST(request({ cityId: "city-a", title: "", scheduledAt: "2026-09-12T12:00:00Z" }))).status).toBe(400);
  });
  it("preserves a concurrent conversion winner only on main", async () => {
    h.actor.role = "super_admin"; h.race = true;
    const response = await convert(request({ groupId: "group-a", createGuardian: false }, "admissions/application-a/convert"), { params: Promise.resolve({ id: "application-a" }) });
    expect(response.status).toBe(v2 ? 201 : 409);
    expect(h.participants).toHaveLength(v2 ? 1 : 0);
    expect(h.application.convertedParticipantId).toBe(v2 ? "new-person" : "winner");
  });
  it("permits uncontended conversion", async () => {
    h.actor.role = "super_admin";
    expect((await convert(request({ groupId: "group-a", createGuardian: false }), { params: Promise.resolve({ id: "application-a" }) })).status).toBe(201);
    expect(h.participants).toHaveLength(1);
  });
  it("exposes template-use write by an unrelated caller in v2", async () => {
    const response = await useTemplate(request({ templateId: "template-a", assignmentId: "assignment-a", variablesUsed: [], valuesUsed: {} }));
    expect(response.status).toBe(v2 ? 201 : 403);
    expect(h.db.callingTemplateUse.create).toHaveBeenCalledTimes(v2 ? 1 : 0);
  });
  it("compares nested free-text audit redaction", () => {
    const result = createAuditLogData({ action: "synthetic", entityType: "Synthetic", newValues: { applicantName: "Synthetic name", nested: { message: "Synthetic private note", reason: "Synthetic sensitive reason" } } });
    expect(JSON.parse(result.newValues)).toEqual(v2
      ? { applicantName: "Synthetic name", nested: { message: "Synthetic private note", reason: "Synthetic sensitive reason" } }
      : { applicantName: "[REDACTED]", nested: { message: "[REDACTED]", reason: "[REDACTED]" } });
  });
  it.each([["Week 1", "Day 1"], ["12", "24"]])("compares source programme labels %s/%s", (week, day) => {
    const result = parseSheet("All Parks", [{ Week: week, Day: day, Date: "2026-09-12", Exercises: "Synthetic exercise", Sports: null, Skills: null, Tadreeb: null, "Areas to Focus": null }], { cityName: "Synthetic city", batchName: "Synthetic batch", parkName: null });
    expect(result.errors.length > 0).toBe(v2);
  });
  it("compares rich text and hyperlink extraction without private workbook data", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("All Parks");
    sheet.addRow(["Week", "Day", "Date", "Exercises", "Sports", "Skills", "Tadreeb", "Areas to Focus"]);
    sheet.addRow([1, 1, "2026-09-12"]);
    sheet.getCell("D2").value = { richText: [{ text: "Warmup\n" }, { text: "Synthetic exercise" }] };
    sheet.getCell("E2").value = { text: "Guide", hyperlink: "https://example.com/synthetic" };
    const result = await readWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), { cityName: "Synthetic city", batchName: "Synthetic batch", parkName: null });
    expect(result.errors).toEqual([]);
    const row = result.sheets[0].rawRows[0];
    expect(row.Exercises).toBe(v2 ? "[object Object]" : "Warmup\nSynthetic exercise");
    expect(row.Sports).toBe(v2 ? "Guide" : "Guide\nhttps://example.com/synthetic");
  });
});
