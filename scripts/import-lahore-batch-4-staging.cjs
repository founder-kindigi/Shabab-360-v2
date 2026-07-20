/* eslint-disable @typescript-eslint/no-require-imports -- A guarded, staging-only operational import. */
const crypto = require("node:crypto");
const path = require("node:path");
const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");
const parser = require("./lahore-batch-4-dry-run.cjs");

const STAGING_POOLER_USERNAME = "postgres.qbyvrqigbojkrjowfsru";
const IMPORT_TITLE = "Regular Session - Batch 4";
const PLACEHOLDER_EMAIL_DOMAIN = "example.invalid";

class LahoreImportError extends Error {}

function placeholderEmail(sourceRef) {
  return `staff-import+${crypto.createHash("sha256").update(sourceRef).digest("hex").slice(0, 20)}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

function firstDropoutDate(statuses, completedThrough) {
  return statuses
    .filter((status) => status.date && status.date <= completedThrough && parser.text(status.value).toLowerCase() === "dropout")
    .map((status) => status.date)
    .sort()[0] ?? null;
}

function toImportManifest(parks, completedThrough) {
  const participants = [];
  const events = new Map();
  const staff = [];
  for (const park of parks) {
    for (const sourceStaff of park.staff) {
      staff.push({
        sourceRef: sourceStaff.sourceRef,
        name: sourceStaff.name,
        phone: sourceStaff.phone || null,
        sourceResponsibility: sourceStaff.roleLabel || null,
        role: sourceStaff.canonicalRole ?? "pending_assignment",
        email: placeholderEmail(sourceStaff.sourceRef),
        park: park.parkName,
      });
    }
    for (const group of park.groups) {
      const allStudents = [...group.students, ...(park.unnumberedCandidates ?? []).filter((student) => student.group === group.name)];
      for (const student of allStudents) {
        const dropoutDate = firstDropoutDate(student.statuses, completedThrough);
        participants.push({
          sourceRef: student.sourceRef,
          name: student.name,
          phone: student.phone || null,
          age: student.age ?? null,
          gradeClass: student.grade || null,
          park: park.parkName,
          group: group.name,
          state: dropoutDate ? "dropout" : "active",
          joinedAt: "2026-05-23",
          dropoutDate,
        });
        for (const status of student.statuses) {
          if (!status.date || status.date > completedThrough || (dropoutDate && status.date >= dropoutDate)) continue;
          const classified = parser.classifyStatus(status.value);
          if (classified.kind !== "record") continue;
          const key = `${park.parkName}|${group.name}|${status.date}`;
          const event = events.get(key) ?? { park: park.parkName, group: group.name, date: status.date, records: [] };
          event.records.push({ sourceRef: student.sourceRef, status: classified.target });
          events.set(key, event);
        }
      }
    }
  }
  return {
    version: 1,
    target: "shabab360-staging",
    batchName: "Batch 4",
    batchStartDate: "2026-05-23",
    completedThrough,
    participants,
    staff,
    events: [...events.values()],
    exclusions: { malformedAttendance: "excluded", unnamedMurabbiAssignment: "unassigned" },
  };
}

function parseArgs(args) {
  const options = { execute: false, confirmStagingLahoreImport: false, input: null, completedThrough: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") { options.execute = true; continue; }
    if (argument === "--confirm-staging-lahore-import") { options.confirmStagingLahoreImport = true; continue; }
    if (argument !== "--input" && argument !== "--completed-through") throw new LahoreImportError(`Unexpected argument: ${argument}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new LahoreImportError(`Missing value for ${argument}`);
    if (argument === "--input") options.input = value;
    else options.completedThrough = value;
    index += 1;
  }
  if (!options.input || !/^\d{4}-\d{2}-\d{2}$/.test(options.completedThrough ?? "")) throw new LahoreImportError("Provide --input <workbook.xlsx> and --completed-through YYYY-MM-DD");
  if (options.confirmStagingLahoreImport && !options.execute) throw new LahoreImportError("--confirm-staging-lahore-import can only be used with --execute");
  return options;
}

function requireStagingUrl() {
  const value = process.env.DIRECT_URL;
  if (!value?.startsWith("postgres")) throw new LahoreImportError("DIRECT_URL must be a PostgreSQL connection URL");
  const url = new URL(value);
  if (url.username !== STAGING_POOLER_USERNAME || !url.hostname.endsWith("pooler.supabase.com")) throw new LahoreImportError("Refusing to import: DIRECT_URL is not the approved shabab360-staging Session Pooler target");
  return value;
}

function loadTargetPrismaClient() {
  // `db:postgres:generate` refreshes this client from the staged schema.
  // Keeping the importer on that generated client prevents it from silently
  // using the local SQLite shape when staged fields change.
  try { return require("@prisma/client").PrismaClient; }
  catch { throw new LahoreImportError("Generate the staged Postgres client first with npm run db:postgres:generate"); }
}

async function loadManifest(options) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(options.input));
  const parks = parser.PARK_SHEETS.map(([sheetName, parkName]) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new LahoreImportError(`Required sheet is missing: ${sheetName}`);
    return parser.readParkSheet(sheet, sheetName, parkName, 2026);
  });
  return toImportManifest(parks, options.completedThrough);
}

async function importManifest(client, manifest) {
  // Placeholder accounts are inactive and forced to reset before activation.
  // Build their unguessable hash outside the transaction to keep the atomic
  // data write within Prisma's interactive-transaction time limit.
  const disabledPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
  return client.$transaction(async (tx) => {
    const existing = await tx.city.findUnique({ where: { code: "LHR" }, select: { id: true } });
    if (existing) throw new LahoreImportError("Lahore (LHR) already exists; refusing a non-idempotent import");
    const cityId = crypto.randomUUID();
    const serviceUserId = crypto.randomUUID();
    const serviceStaffId = crypto.randomUUID();
    const parkIds = new Map(); const groupIds = new Map(); const participantIds = new Map();
    const batchIds = new Map();
    const parkNames = [...new Set(manifest.participants.map((participant) => participant.park))];
    for (const parkName of parkNames) { parkIds.set(parkName, crypto.randomUUID()); batchIds.set(parkName, crypto.randomUUID()); }
    for (const participant of manifest.participants) participantIds.set(participant.sourceRef, crypto.randomUUID());
    const groupRows = [];
    for (const parkName of parkNames) {
      for (const groupName of [...new Set(manifest.participants.filter((participant) => participant.park === parkName).map((participant) => participant.group))]) {
        const id = crypto.randomUUID(); groupIds.set(`${parkName}|${groupName}`, id); groupRows.push({ id, name: groupName, batchId: batchIds.get(parkName) });
      }
    }
    const staffRows = manifest.staff.map((member) => ({ ...member, userId: crypto.randomUUID(), staffId: crypto.randomUUID() }));
    const eventRows = manifest.events.map((event) => ({ ...event, id: crypto.randomUUID() }));
    const markedAt = new Date();
    await tx.city.create({ data: { id: cityId, name: "Lahore", code: "LHR" } });
    await tx.park.createMany({ data: parkNames.map((name) => ({ id: parkIds.get(name), name, cityId })) });
    await tx.batch.createMany({ data: parkNames.map((name) => ({ id: batchIds.get(name), name: manifest.batchName, parkId: parkIds.get(name), startDate: new Date(`${manifest.batchStartDate}T00:00:00.000Z`) })) });
    await tx.group.createMany({ data: groupRows });
    await tx.participant.createMany({ data: manifest.participants.map((participant) => ({ id: participantIds.get(participant.sourceRef), name: participant.name, phone: participant.phone, age: participant.age, gradeClass: participant.gradeClass, state: participant.state, joinedAt: new Date(`${participant.joinedAt}T00:00:00.000Z`), groupId: groupIds.get(`${participant.park}|${participant.group}`) })) });
    await tx.user.createMany({ data: [{ id: serviceUserId, email: `system-import+batch-4@${PLACEHOLDER_EMAIL_DOMAIN}`, name: "System Import: Lahore Batch 4", passwordHash: disabledPasswordHash, isActive: false, mustResetPwd: true }, ...staffRows.map((member) => ({ id: member.userId, email: member.email, name: member.name, phone: member.phone, passwordHash: disabledPasswordHash, isActive: false, mustResetPwd: true }))] });
    await tx.staffMeta.createMany({ data: [{ id: serviceStaffId, userId: serviceUserId, role: "system_import", isActive: false }, ...staffRows.map((member) => ({ id: member.staffId, userId: member.userId, role: member.role, assignedParkId: parkIds.get(member.park), isActive: false }))] });
    await tx.attendanceEvent.createMany({ data: eventRows.map((event) => ({ id: event.id, groupId: groupIds.get(`${event.park}|${event.group}`), title: IMPORT_TITLE, eventDate: new Date(`${event.date}T00:00:00.000Z`), isClosed: true, closedAt: markedAt })) });
    const records = eventRows.flatMap((event) => event.records.map((record) => ({ eventId: event.id, participantId: participantIds.get(record.sourceRef), status: record.status, markedBy: serviceStaffId, markedAt, editReason: "Imported from Lahore Batch 4 workbook" })));
    for (let index = 0; index < records.length; index += 500) await tx.attendanceRecord.createMany({ data: records.slice(index, index + 500) });
    await tx.auditLog.create({ data: { action: "import_lahore_batch_4", entityType: "batch", entityId: cityId, newValues: JSON.stringify({ participants: manifest.participants.length, staffPlaceholders: manifest.staff.length, attendanceEvents: manifest.events.length, stagingOnly: true }) } });
    return { cityId, participants: manifest.participants.length, staffPlaceholders: manifest.staff.length, attendanceEvents: manifest.events.length, attendanceRecords: records.length };
  // Supabase's free Session Pooler can take tens of seconds to establish an
  // interactive transaction. Keep the all-or-nothing import atomic while
  // allowing that constrained staging transport enough time to finish.
  }, { isolationLevel: "Serializable", timeout: 300000, maxWait: 30000 });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(options);
  const summary = { mode: options.execute ? "execute" : "dry-run", writesPerformed: false, target: manifest.target, participants: manifest.participants.length, staffPlaceholders: manifest.staff.length, attendanceEvents: manifest.events.length, attendanceRecords: manifest.events.reduce((total, event) => total + event.records.length, 0), exclusions: manifest.exclusions };
  if (!options.execute) { console.log(JSON.stringify(summary, null, 2)); return; }
  if (!options.confirmStagingLahoreImport) throw new LahoreImportError("Refusing to import without --confirm-staging-lahore-import");
  const PrismaClient = loadTargetPrismaClient(); const client = new PrismaClient({ datasources: { db: { url: requireStagingUrl() } } });
  try { console.log(JSON.stringify({ ...summary, ...(await importManifest(client, manifest)), writesPerformed: true }, null, 2)); }
  finally { await client.$disconnect(); }
}

module.exports = { LahoreImportError, PLACEHOLDER_EMAIL_DOMAIN, firstDropoutDate, parseArgs, placeholderEmail, toImportManifest };
if (require.main === module) main().catch((error) => { console.error(`Lahore staging import aborted: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
