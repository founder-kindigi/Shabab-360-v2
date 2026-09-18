import { DatabaseSync } from "node:sqlite";
import { buildRefreshManifest } from "./manifest";
import type { ParsedPark, ParsedStudent, RefreshManifest } from "./types";

/**
 * Synthetic, disposable SQLite fixture for the refresh rehearsal.
 *
 * This is never `prisma/dev.db`: tests create it in a temp directory and copy it
 * before running any destructive path. It mirrors the table and foreign-key
 * shape the reset plan and importer touch, so `PRAGMA foreign_key_check` is
 * meaningful. It contains no real people, phones or credentials.
 */
export const REFRESH_FIXTURE_DDL: readonly string[] = [
  `CREATE TABLE "cities" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "code" TEXT NOT NULL, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "parks" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "cityId" TEXT NOT NULL REFERENCES "cities"("id") ON DELETE CASCADE, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "batches" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE CASCADE, "cityId" TEXT, "startDate" INTEGER NOT NULL, "endDate" INTEGER, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "groups" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "batchId" TEXT NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE, "parkId" TEXT REFERENCES "parks"("id") ON DELETE CASCADE, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "participants" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT, "age" INTEGER, "gradeClass" TEXT, "state" TEXT NOT NULL, "dropoutAt" INTEGER, "dropoutReason" TEXT, "dropoutSource" TEXT, "reactivatedAt" INTEGER, "joinedAt" INTEGER NOT NULL, "groupId" TEXT REFERENCES "groups"("id") ON DELETE SET NULL)`,
  `CREATE TABLE "users" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT, "phone" TEXT, "mustResetPwd" INTEGER NOT NULL DEFAULT 1, "tokenVersion" INTEGER NOT NULL DEFAULT 0, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "staff_meta" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL, "assignedParkId" TEXT REFERENCES "parks"("id") ON DELETE SET NULL, "assignedCityId" TEXT, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "attendance_events" ("id" TEXT PRIMARY KEY, "groupId" TEXT NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE, "title" TEXT NOT NULL, "eventDate" INTEGER NOT NULL, "resetVersion" INTEGER NOT NULL DEFAULT 0, "isClosed" INTEGER NOT NULL DEFAULT 0, "closedAt" INTEGER)`,
  `CREATE TABLE "attendance_records" ("id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "attendance_events"("id") ON DELETE CASCADE, "participantId" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE, "status" TEXT NOT NULL, "markedBy" TEXT, "markedAt" INTEGER NOT NULL, "editReason" TEXT)`,
  `CREATE TABLE "batch_settings" ("id" TEXT PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE, "classWeekdays" TEXT, "automaticDropoutEnabled" INTEGER, "warningConsecutiveWeeks" INTEGER, "dropoutConsecutiveWeeks" INTEGER, "warningAbsents" INTEGER, "dropoutAbsents" INTEGER)`,
  `CREATE TABLE "batch_class_dates" ("id" TEXT PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE, "classDate" INTEGER NOT NULL)`,
  `CREATE TABLE "operational_off_dates" ("id" TEXT PRIMARY KEY, "cityId" TEXT NOT NULL REFERENCES "cities"("id") ON DELETE CASCADE, "offDate" INTEGER NOT NULL, "label" TEXT)`,
  `CREATE TABLE "audit_log" ("id" TEXT PRIMARY KEY, "userId" TEXT, "action" TEXT, "entityType" TEXT, "entityId" TEXT, "oldValues" TEXT, "newValues" TEXT, "reason" TEXT)`,
  `CREATE TABLE "staff_attendance_events" ("id" TEXT PRIMARY KEY, "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE CASCADE, "title" TEXT, "eventDate" INTEGER, "isClosed" INTEGER, "closedAt" INTEGER, "closedBy" TEXT)`,
  `CREATE TABLE "staff_attendance_records" ("id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "staff_attendance_events"("id") ON DELETE CASCADE, "staffId" TEXT NOT NULL REFERENCES "staff_meta"("id") ON DELETE CASCADE, "status" TEXT, "markedBy" TEXT, "markedAt" INTEGER, "editReason" TEXT)`,
  `CREATE TABLE "_prisma_migrations" ("id" TEXT PRIMARY KEY, "migration_name" TEXT NOT NULL, "checksum" TEXT, "finished_at" INTEGER)`,
  `CREATE TABLE "role_capability_overrides" ("id" TEXT PRIMARY KEY, "role" TEXT NOT NULL, "capability" TEXT NOT NULL, "effect" TEXT, "reason" TEXT)`,
  `CREATE TABLE "user_capability_overrides" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "capability" TEXT NOT NULL, "effect" TEXT, "isActive" INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE "payments" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "fee_events" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "receipt_sequences" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "fee_donations" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "financial_adjustments" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "admission_interviews" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "admission_applications" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "guardian_children" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "guardians" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "notifications" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "announcements" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
  `CREATE TABLE "report_presets" ("id" TEXT PRIMARY KEY, "note" TEXT)`,
];

/** Auxiliary tables seeded with one row so the reset can be proven complete. */
export const FIXTURE_SEEDED_TABLES: readonly string[] = [
  "payments",
  "fee_events",
  "receipt_sequences",
  "fee_donations",
  "financial_adjustments",
  "admission_interviews",
  "admission_applications",
  "guardian_children",
  "guardians",
  "notifications",
  "announcements",
  "report_presets",
];

export const FIXTURE_SUPER_ADMIN_USER_ID = "fixture-user-super";
export const FIXTURE_SUPER_ADMIN_STAFF_ID = "fixture-staff-super";

function seed(db: DatabaseSync): void {
  db.exec(`
    INSERT INTO "cities" ("id","name","code","isActive") VALUES ('fixture-city','Fixture City','FIX',1);
    INSERT INTO "parks" ("id","name","cityId","isActive") VALUES ('fixture-park','Fixture Park','fixture-city',1);
    INSERT INTO "batches" ("id","name","parkId","cityId","startDate","endDate","isActive") VALUES ('fixture-batch','Fixture Batch','fixture-park','fixture-city',1,2,1);
    INSERT INTO "groups" ("id","name","batchId","parkId","isActive") VALUES ('fixture-group','Fixture Group','fixture-batch','fixture-park',1);
    INSERT INTO "participants" ("id","name","state","joinedAt","groupId") VALUES ('fixture-participant','Fixture Participant','active',1,'fixture-group');
    INSERT INTO "users" ("id","email","passwordHash","name","isActive") VALUES ('fixture-user-super','fixture-super@example.invalid','hash','Fixture Super Admin',1);
    INSERT INTO "users" ("id","email","passwordHash","name","isActive") VALUES ('fixture-user-other','fixture-other@example.invalid','hash','Fixture Other',1);
    INSERT INTO "staff_meta" ("id","userId","role","assignedCityId","isActive") VALUES ('fixture-staff-super','fixture-user-super','super_admin','fixture-city',1);
    INSERT INTO "staff_meta" ("id","userId","role","assignedCityId","isActive") VALUES ('fixture-staff-other','fixture-user-other','murabbi','fixture-city',1);
    INSERT INTO "attendance_events" ("id","groupId","title","eventDate") VALUES ('fixture-event','fixture-group','Fixture Session',1);
    INSERT INTO "attendance_records" ("id","eventId","participantId","status","markedAt") VALUES ('fixture-record','fixture-event','fixture-participant','present',1);
    INSERT INTO "batch_settings" ("id","batchId") VALUES ('fixture-settings','fixture-batch');
    INSERT INTO "batch_class_dates" ("id","batchId","classDate") VALUES ('fixture-class-date','fixture-batch',1);
    INSERT INTO "operational_off_dates" ("id","cityId","offDate","label") VALUES ('fixture-off-date','fixture-city',1,'Fixture Off');
    INSERT INTO "audit_log" ("id","action","entityType") VALUES ('fixture-audit','fixture','fixture');
    INSERT INTO "staff_attendance_events" ("id","parkId","eventDate") VALUES ('fixture-staff-event','fixture-park',1);
    INSERT INTO "staff_attendance_records" ("id","eventId","staffId","markedAt") VALUES ('fixture-staff-record','fixture-staff-event','fixture-staff-other',1);
    INSERT INTO "_prisma_migrations" ("id","migration_name") VALUES ('fixture-migration','0000_fixture');
    INSERT INTO "role_capability_overrides" ("id","role","capability","effect") VALUES ('fixture-role-override','murabbi','attendance.mark','grant');
    INSERT INTO "user_capability_overrides" ("id","userId","capability","effect") VALUES ('fixture-user-override','fixture-user-super','attendance.correct','grant');
  `);
  for (const table of FIXTURE_SEEDED_TABLES) {
    db.prepare(`INSERT INTO "${table}" ("id","note") VALUES (?,?)`).run(`fixture-${table}`, "fixture");
  }
}

/** Creates and seeds the fixture at `filePath`. Callers must use a temp path. */
export function createRefreshFixtureDatabase(filePath: string): void {
  const db = new DatabaseSync(filePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const statement of REFRESH_FIXTURE_DDL) db.exec(statement);
    seed(db);
  } finally {
    db.close();
  }
}

export function fixtureScalar(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count?: number } | undefined;
  return typeof row?.count === "number" ? row.count : 0;
}

function syntheticStudent(sourceRef: string, name: string, phone: string, statuses: ParsedStudent["statuses"]): ParsedStudent {
  return { sourceRef, name, phone, fingerprint: sourceRef, hasPhone: Boolean(phone), age: null, grade: "", statuses };
}

/** Six parks × three groups, with a dropout cell and dates on both sides of the cutoff. */
export function syntheticRefreshParks(): ParsedPark[] {
  const parkNames = ["Park A", "Park B", "Park C", "Park D", "Park E", "Park F"];
  return parkNames.map((parkName, parkIndex) => ({
    sheetName: `Sheet ${parkIndex + 1}`,
    parkName,
    sessionDates: ["2026-06-01", "2026-09-13", "2026-09-14", "2026-10-01", "2027-01-31"],
    groups: [1, 2, 3].map((groupIndex) => ({
      name: `Group ${parkIndex * 3 + groupIndex}`,
      murabbiLabel: "Murabbi",
      sourceRef: `${parkName}!A${groupIndex + 1}`,
      students: [
        syntheticStudent(`${parkName}!${groupIndex}-1`, `Student ${parkIndex}-${groupIndex}-A`, "0300-0000000", [
          { date: "2026-06-01", value: "present" },
          { date: "2026-09-13", value: "absent" },
          { date: "2026-09-14", value: "present" },
        ]),
        syntheticStudent(`${parkName}!${groupIndex}-2`, `Student ${parkIndex}-${groupIndex}-B`, "", [
          { date: "2026-08-01", value: "Dropout" },
          { date: "2026-08-02", value: "present" },
        ]),
      ],
    })),
    staff: [{ sourceRef: `${parkName}!S1`, name: `Murabbi ${parkIndex}`, phone: "", roleLabel: "Murabbi", canonicalRole: "murabbi" }],
    unnumberedCandidates: [],
  }));
}

/** The synthetic manifest used by the rehearsal and multi-park scope tests. */
export function buildSyntheticRefreshManifest(): RefreshManifest {
  return buildRefreshManifest(syntheticRefreshParks());
}
