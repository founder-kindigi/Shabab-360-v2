/**
 * Transactional PostgreSQL import for the approved Lahore Batch 4 dataset.
 *
 * The write plan is derived from the same reviewed manifest the SQLite refresh
 * uses, so the business-key and normalization rules exist once. Unlike the local
 * refresh, this path never resets a target and never creates synthetic users,
 * staff placeholders or credentials: it writes only the approved parks, groups,
 * participants, attendance events and attendance records into a database that has
 * already been proven fresh and compatible.
 *
 * All inserts run in one transaction. A failing statement or a failed post-import
 * verification rolls the whole batch back, so a partial import can never be
 * mistaken for a completed one.
 */
import { LAHORE_REFRESH } from "./constants";
import { pktDayStart, pktDayEndEpoch } from "./pkt-date";
import { PostgresRefusedError, type PostgresQueryPort } from "./postgres-port";
import type { ImportCounts, RefreshManifest, VerificationCheck, VerificationReport } from "./types";

/** A deliberate refusal carrying a safe diagnostic code, never a connection value. */
export class PostgresImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostgresImportError";
  }
}

export interface PostgresImportTable {
  readonly table: string;
  readonly rows: readonly Record<string, unknown>[];
}

export interface PostgresImportPlan {
  readonly tables: readonly PostgresImportTable[];
  readonly counts: ImportCounts;
}

/**
 * A workbook date is the exact instant the attendance API uses for a session
 * day, stored by Prisma as a UTC wall-clock `timestamp(3)`. Formatting the
 * instant without an offset keeps the same stored value Prisma would write.
 */
export function toPgTimestamp(instant: Date): string {
  return instant.toISOString().slice(0, 23).replace("T", " ");
}

/** Builds the insert plan. Pure: no connection, no I/O, deterministic ordering. */
export function planPostgresImport(manifest: RefreshManifest, importedAt: Date = new Date()): PostgresImportPlan {
  const stamp = toPgTimestamp(importedAt);
  const cityId = `att01-city-${manifest.city.code.toLowerCase()}`;
  const parkIdBy = new Map(manifest.parks.map((name, index) => [name, `att01-park-${index + 1}`]));
  const batchId = "att01-batch-1";
  const groupKey = (parkName: string, groupName: string) => `${parkName}|${groupName}`;
  const eventKey = (parkName: string, groupName: string, date: string) => `${parkName}|${groupName}|${date}`;

  const groupIdBy = new Map(
    manifest.groups.map((group, index) => [groupKey(group.parkName, group.name), `att01-group-${index + 1}`])
  );
  const participantIdBy = new Map(
    manifest.participants.map((participant, index) => [participant.sourceRef, `att01-participant-${index + 1}`])
  );
  const eventIdBy = new Map(
    manifest.events.map((event, index) => [eventKey(event.parkName, event.groupName, event.date), `att01-event-${index + 1}`])
  );

  const anchorParkId = parkIdBy.get(manifest.parks[0]) ?? null;

  const tables: PostgresImportTable[] = [
    {
      table: "cities",
      rows: [
        {
          id: cityId,
          name: manifest.city.name,
          code: manifest.city.code,
          isActive: true,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
    },
    {
      table: "parks",
      rows: manifest.parks.map((name) => ({
        id: parkIdBy.get(name),
        name,
        cityId,
        isActive: true,
        createdAt: stamp,
        updatedAt: stamp,
      })),
    },
    {
      table: "batches",
      rows: [
        {
          id: batchId,
          name: manifest.batch.name,
          parkId: anchorParkId,
          cityId,
          startDate: toPgTimestamp(pktDayStart(manifest.batch.startDate)),
          endDate: toPgTimestamp(pktDayStart(manifest.batch.endDate)),
          isActive: true,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
    },
    {
      table: "batch_settings",
      rows: [
        {
          id: "att01-batch-settings-1",
          batchId,
          classWeekdays: LAHORE_REFRESH.classWeekdays,
          automaticDropoutEnabled: false,
          warningConsecutiveWeeks: 2,
          dropoutConsecutiveWeeks: 3,
          warningAbsents: 3,
          dropoutAbsents: 6,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ],
    },
    {
      table: "groups",
      rows: manifest.groups.map((group) => ({
        id: groupIdBy.get(groupKey(group.parkName, group.name)),
        name: group.name,
        batchId,
        parkId: parkIdBy.get(group.parkName),
        isActive: true,
        createdAt: stamp,
        updatedAt: stamp,
      })),
    },
    {
      table: "participants",
      rows: manifest.participants.map((participant) => ({
        id: participantIdBy.get(participant.sourceRef),
        name: participant.name,
        phone: participant.phone,
        age: participant.age,
        gradeClass: participant.gradeClass,
        state: participant.state,
        dropoutAt: participant.dropoutAt ? toPgTimestamp(pktDayStart(participant.dropoutAt)) : null,
        dropoutReason: participant.dropoutReason,
        dropoutSource: participant.dropoutSource,
        reactivatedAt: participant.reactivatedAt ? toPgTimestamp(pktDayStart(participant.reactivatedAt)) : null,
        joinedAt: toPgTimestamp(pktDayStart(participant.joinedAt)),
        groupId: groupIdBy.get(groupKey(participant.parkName, participant.groupName)),
        createdAt: stamp,
        updatedAt: stamp,
      })),
    },
    {
      table: "attendance_events",
      rows: manifest.events.map((event) => ({
        id: eventIdBy.get(eventKey(event.parkName, event.groupName, event.date)),
        groupId: groupIdBy.get(groupKey(event.parkName, event.groupName)),
        title: event.title,
        eventDate: toPgTimestamp(pktDayStart(event.date)),
        resetVersion: 0,
        isClosed: true,
        closedAt: toPgTimestamp(pktDayStart(event.date)),
        closedBy: null,
        createdAt: stamp,
        updatedAt: stamp,
      })),
    },
    {
      table: "attendance_records",
      rows: manifest.events.flatMap((event) =>
        event.records.map((record) => ({
          id: `${eventIdBy.get(eventKey(event.parkName, event.groupName, event.date))}:${participantIdBy.get(record.participantSourceRef)}`,
          eventId: eventIdBy.get(eventKey(event.parkName, event.groupName, event.date)),
          participantId: participantIdBy.get(record.participantSourceRef),
          status: record.status,
          markedBy: null,
          markedAt: toPgTimestamp(pktDayStart(event.date)),
          editReason: "Imported from Lahore Batch 4 workbook",
          createdAt: stamp,
          updatedAt: stamp,
        }))
      ),
    },
    {
      table: "batch_class_dates",
      rows: manifest.calendarDates.map((date, index) => ({
        id: `att01-class-date-${index + 1}`,
        batchId,
        classDate: toPgTimestamp(pktDayStart(date)),
        createdAt: stamp,
      })),
    },
  ];

  const counts: ImportCounts = {
    parks: manifest.counts.parks,
    groups: manifest.counts.groups,
    participants: manifest.counts.participants,
    staffPlaceholders: 0,
    attendanceEvents: manifest.counts.attendanceEvents,
    attendanceRecords: manifest.counts.attendanceRecords,
    calendarDates: manifest.counts.calendarDates,
  };

  return { tables, counts };
}

/** Rows per multi-row statement, kept well under the PostgreSQL parameter limit. */
const INSERT_CHUNK = 500;

async function insertTable(port: PostgresQueryPort, table: PostgresImportTable): Promise<number> {
  if (table.rows.length === 0) return 0;
  const columns = Object.keys(table.rows[0]);
  let inserted = 0;
  for (let start = 0; start < table.rows.length; start += INSERT_CHUNK) {
    const chunk = table.rows.slice(start, start + INSERT_CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map(
      (row) => `(${columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      }).join(",")})`
    );
    const sql = `INSERT INTO "${table.table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES ${tuples.join(",")}`;
    inserted += await port.execute(sql, values);
  }
  return inserted;
}

async function scalar(port: PostgresQueryPort, sql: string, params: readonly unknown[] = []): Promise<number> {
  const rows = await port.query<{ count: number }>(sql, params);
  return Number(rows[0]?.count ?? 0);
}

function countCheck(name: string, expected: number, actual: number): VerificationCheck {
  return { name, ok: expected === actual, expected, actual };
}

function check(name: string, ok: boolean, expected?: number | string, actual?: number | string): VerificationCheck {
  return { name, ok, expected, actual };
}

/**
 * Post-import aggregate verification. It asserts the approved totals, that the
 * city/park/group structure is Lahore-only and fully linked, and that the import
 * created no user or staff identity at all. Every read is an aggregate.
 */
export async function verifyPostgresImport(port: PostgresQueryPort, manifest: RefreshManifest): Promise<VerificationReport> {
  const expected = manifest.counts;
  // Queries run one at a time: inside a transaction the port holds a single
  // client, and PostgreSQL will not execute two statements on it concurrently.
  const cities = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "cities"');
  const parks = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "parks"');
  const groups = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "groups"');
  const participants = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "participants"');
  const events = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "attendance_events"');
  const records = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "attendance_records"');
  const calendarDates = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "batch_class_dates"');
  const foreignCities = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "cities" WHERE "code" <> $1', [
    manifest.city.code,
  ]);
  const foreignParks = await scalar(
    port,
    'SELECT COUNT(*)::int AS "count" FROM "parks" p JOIN "cities" c ON c."id" = p."cityId" WHERE c."code" <> $1',
    [manifest.city.code]
  );
  const participantsWithoutGroup = await scalar(
    port,
    'SELECT COUNT(*)::int AS "count" FROM "participants" WHERE "groupId" IS NULL'
  );
  const groupsWithoutBatch = await scalar(
    port,
    'SELECT COUNT(*)::int AS "count" FROM "groups" g WHERE NOT EXISTS (SELECT 1 FROM "batches" b WHERE b."id" = g."batchId")'
  );
  const users = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "users"');
  const staff = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "staff_meta"');
  const recordsAfterCutoff = await scalar(
    port,
    'SELECT COUNT(*)::int AS "count" FROM "attendance_records" r JOIN "attendance_events" e ON e."id" = r."eventId" WHERE e."eventDate" > $1',
    [toPgTimestamp(new Date(pktDayEndEpoch(manifest.attendanceThrough)))]
  );

  const checks: VerificationCheck[] = [
    countCheck("parks", expected.parks, parks),
    countCheck("groups", expected.groups, groups),
    countCheck("participants", expected.participants, participants),
    countCheck("attendanceEvents", expected.attendanceEvents, events),
    countCheck("attendanceRecords", expected.attendanceRecords, records),
    countCheck("calendarDates", expected.calendarDates, calendarDates),
    check("expectedParks", LAHORE_REFRESH.expectedParks === parks, LAHORE_REFRESH.expectedParks, parks),
    check("expectedGroups", LAHORE_REFRESH.expectedGroups === groups, LAHORE_REFRESH.expectedGroups, groups),
    check("cityIsLahoreOnly", cities === 1 && foreignCities === 0, 1, cities),
    check("noForeignParks", foreignParks === 0, 0, foreignParks),
    check("participantsAllGrouped", participantsWithoutGroup === 0, 0, participantsWithoutGroup),
    check("groupsAllBatched", groupsWithoutBatch === 0, 0, groupsWithoutBatch),
    check("noUsersCreated", users === 0, 0, users),
    check("noStaffCreated", staff === 0, 0, staff),
    check("noRecordsAfterCutoff", recordsAfterCutoff === 0, 0, recordsAfterCutoff),
  ];

  const failures = checks.filter((entry) => !entry.ok).map((entry) => entry.name);
  return { ok: failures.length === 0, checks, failures };
}

export interface PostgresImportResult {
  readonly mode: "execute";
  readonly writesPerformed: true;
  readonly counts: ImportCounts;
  readonly verification: VerificationReport;
}

/**
 * Writes the plan and verifies it in one transaction. Any failing statement or
 * failed verification rolls the whole batch back before the error is rethrown.
 */
export async function runPostgresImport(port: PostgresQueryPort, manifest: RefreshManifest): Promise<PostgresImportResult> {
  const plan = planPostgresImport(manifest);
  try {
    return await port.transaction(async (tx) => {
      for (const table of plan.tables) await insertTable(tx, table);
      const verification = await verifyPostgresImport(tx, manifest);
      if (!verification.ok) {
        throw new PostgresImportError(`post_import_verification_failed:${verification.failures.join("+")}`);
      }
      return { mode: "execute" as const, writesPerformed: true as const, counts: plan.counts, verification };
    });
  } catch (error) {
    if (error instanceof PostgresImportError || error instanceof PostgresRefusedError) throw error;
    throw new PostgresImportError("import_failed_and_rolled_back");
  }
}
