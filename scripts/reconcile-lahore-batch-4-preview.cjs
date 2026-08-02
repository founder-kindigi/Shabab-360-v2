/* eslint-disable @typescript-eslint/no-require-imports -- guarded operational reconciliation. */
const path = require("node:path");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");
const parser = require("./lahore-batch-4-dry-run.cjs");
const importer = require("./import-lahore-batch-4-staging.cjs");

class ReconciliationError extends Error {}

function normalise(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en-PK").replace(/\s+/g, " ");
}

function normalisePhone(value) {
  return String(value ?? "").replace(/\D/g, "").replace(/^92/, "0");
}

function sourceKey(person) {
  const name = normalise(person.name);
  const phone = normalisePhone(person.phone);
  return phone ? `${name}|${phone}` : name;
}

function parseArgs(args) {
  const options = { execute: false, confirmed: false, input: null, completedThrough: null };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--execute") { options.execute = true; continue; }
    if (arg === "--confirm-preview-lahore-reconciliation") { options.confirmed = true; continue; }
    if (arg !== "--input" && arg !== "--completed-through") throw new ReconciliationError(`Unexpected argument: ${arg}`);
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new ReconciliationError(`Missing value for ${arg}`);
    if (arg === "--input") options.input = value;
    else options.completedThrough = value;
  }
  if (!options.input || !/^\d{4}-\d{2}-\d{2}$/.test(options.completedThrough ?? "")) {
    throw new ReconciliationError("Provide --input <workbook.xlsx> and --completed-through YYYY-MM-DD");
  }
  if (options.execute !== options.confirmed) {
    throw new ReconciliationError("Execution requires both --execute and --confirm-preview-lahore-reconciliation");
  }
  return options;
}

function requirePreviewUrl() {
  const value = process.env.DIRECT_URL;
  if (!value?.startsWith("postgres")) throw new ReconciliationError("DIRECT_URL must be a PostgreSQL Preview connection URL");
  const url = new URL(value);
  const isSupabasePooler = url.hostname.endsWith("pooler.supabase.com");
  const isSupabaseDirect = /^db\.[a-z0-9-]+\.supabase\.co$/i.test(url.hostname);
  if (!isSupabasePooler && !isSupabaseDirect) {
    throw new ReconciliationError("Refusing non-Supabase Preview target");
  }
  return value;
}

async function loadManifest(options) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(options.input));
  const parks = parser.PARK_SHEETS.map(([sheetName, parkName]) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new ReconciliationError(`Required sheet is missing: ${sheetName}`);
    return parser.readParkSheet(sheet, sheetName, parkName, 2026);
  });
  return importer.toImportManifest(parks, options.completedThrough);
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

async function buildPlan(client, manifest) {
  const city = await client.city.findUnique({ where: { code: "LHR" }, select: { id: true } });
  if (!city) throw new ReconciliationError("Lahore (LHR) does not exist; use the empty-database importer instead");

  const groups = await client.group.findMany({
    where: { batch: { park: { cityId: city.id } } },
    select: { id: true, name: true, batch: { select: { name: true, park: { select: { name: true } } } }, participants: { select: { id: true, name: true, phone: true } } },
  });
  const groupBySource = new Map(groups.map((group) => [`${normalise(group.batch.park.name)}|${normalise(group.name)}`, group]));
  const sourceParticipants = new Map(manifest.participants.map((person) => [`${normalise(person.park)}|${normalise(person.group)}|${sourceKey(person)}`, person]));
  const matches = new Map();
  const conflicts = [];

  for (const [key, person] of sourceParticipants) {
    const [park, groupName] = key.split("|");
    const group = groupBySource.get(`${park}|${groupName}`);
    if (!group) { conflicts.push("missing_group"); continue; }
    const candidates = group.participants.filter((candidate) => sourceKey(candidate) === sourceKey(person));
    if (candidates.length === 1) matches.set(person.sourceRef, { participantId: candidates[0].id, groupId: group.id });
    else conflicts.push(candidates.length ? "ambiguous_participant" : "unmatched_participant");
  }

  const groupIds = [...new Set([...matches.values()].map((match) => match.groupId))];
  const existingEvents = await client.attendanceEvent.findMany({ where: { groupId: { in: groupIds } }, select: { id: true, groupId: true, eventDate: true } });
  const eventByKey = new Map(existingEvents.map((event) => [`${event.groupId}|${dateKey(event.eventDate)}`, event]));
  const eventCreates = [];
  const recordCandidates = [];

  for (const sourceEvent of manifest.events) {
    const sourceGroup = groupBySource.get(`${normalise(sourceEvent.park)}|${normalise(sourceEvent.group)}`);
    if (!sourceGroup) { conflicts.push("missing_group"); continue; }
    const key = `${sourceGroup.id}|${sourceEvent.date}`;
    let event = eventByKey.get(key);
    if (!event) {
      event = { id: `planned:${key}`, groupId: sourceGroup.id, eventDate: new Date(`${sourceEvent.date}T00:00:00.000Z`) };
      eventCreates.push({ key, groupId: sourceGroup.id, eventDate: event.eventDate });
      eventByKey.set(key, event);
    }
    for (const record of sourceEvent.records) {
      const sourcePerson = manifest.participants.find((person) => person.sourceRef === record.sourceRef);
      const match = sourcePerson ? matches.get(sourcePerson.sourceRef) : null;
      if (!match) { conflicts.push("unmatched_attendance_record"); continue; }
      recordCandidates.push({ eventKey: key, participantId: match.participantId, status: record.status });
    }
  }

  const existingEventIds = existingEvents.map((event) => event.id);
  const existingRecords = existingEventIds.length
    ? await client.attendanceRecord.findMany({ where: { eventId: { in: existingEventIds } }, select: { eventId: true, participantId: true, status: true } })
    : [];
  const recordByKey = new Map(existingRecords.map((record) => [`${record.eventId}|${record.participantId}`, record]));
  let recordsCreate = 0; let recordsNoop = 0;
  for (const candidate of recordCandidates) {
    const event = eventByKey.get(candidate.eventKey);
    const existing = event?.id.startsWith("planned:") ? null : recordByKey.get(`${event?.id}|${candidate.participantId}`);
    if (!existing) recordsCreate++;
    else if (existing.status === candidate.status) recordsNoop++;
    else conflicts.push("attendance_status_conflict");
  }
  return { cityId: city.id, matches, conflicts, eventCreates, recordCandidates, eventByKey, recordsCreate, recordsNoop, sourceParticipants: sourceParticipants.size };
}

async function executePlan(client, plan) {
  if (plan.conflicts.length) throw new ReconciliationError("Refusing execution while reconciliation conflicts remain");
  return client.$transaction(async (tx) => {
    const createdEvents = new Map();
    for (const event of plan.eventCreates) {
      const created = await tx.attendanceEvent.create({ data: { groupId: event.groupId, title: "Regular Session - Batch 4", eventDate: event.eventDate, isClosed: true, closedAt: new Date() } });
      createdEvents.set(event.key, created.id);
    }
    const existingRecords = await tx.attendanceRecord.findMany({ where: { event: { group: { batch: { park: { cityId: plan.cityId } } } } }, select: { eventId: true, participantId: true } });
    const existing = new Set(existingRecords.map((record) => `${record.eventId}|${record.participantId}`));
    const rows = plan.recordCandidates.flatMap((candidate) => {
      const event = plan.eventByKey.get(candidate.eventKey);
      const eventId = createdEvents.get(candidate.eventKey) ?? event?.id;
      return eventId && !existing.has(`${eventId}|${candidate.participantId}`) ? [{ eventId, participantId: candidate.participantId, status: candidate.status, markedAt: new Date(), editReason: "Reconciled from Lahore Batch 4 workbook" }] : [];
    });
    if (rows.length) await tx.attendanceRecord.createMany({ data: rows });
    await tx.auditLog.create({ data: { action: "reconcile_lahore_batch_4", entityType: "city", entityId: plan.cityId, newValues: JSON.stringify({ createdEvents: createdEvents.size, createdRecords: rows.length, sourceParticipants: plan.sourceParticipants }) } });
    return { createdEvents: createdEvents.size, createdRecords: rows.length };
  }, { isolationLevel: "Serializable", timeout: 300000, maxWait: 30000 });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = new PrismaClient({ datasources: { db: { url: requirePreviewUrl() } } });
  try {
    const plan = await buildPlan(client, await loadManifest(options));
    const summary = { mode: options.execute ? "execute" : "dry-run", writesPerformed: false, sourceParticipants: plan.sourceParticipants, matchedParticipants: plan.matches.size, conflicts: plan.conflicts.reduce((counts, code) => ({ ...counts, [code]: (counts[code] ?? 0) + 1 }), {}), createEvents: plan.eventCreates.length, createRecords: plan.recordsCreate, unchangedRecords: plan.recordsNoop };
    if (!options.execute) { console.log(JSON.stringify(summary, null, 2)); return; }
    const result = await executePlan(client, plan);
    console.log(JSON.stringify({ ...summary, ...result, writesPerformed: true }, null, 2));
  } finally { await client.$disconnect(); }
}

module.exports = { ReconciliationError, parseArgs, normalise, normalisePhone, sourceKey };
if (require.main === module) main().catch((error) => { console.error(`Lahore Preview reconciliation aborted: ${error.message}`); process.exitCode = 1; });
