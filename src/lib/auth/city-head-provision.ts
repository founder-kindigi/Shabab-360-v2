/**
 * Local-only creation of a single City Head test account.
 *
 * This mirrors the reviewed `/api/admin/invite` creation contract — normalized
 * email, bcrypt(12) temporary password, forced password reset, an active User and
 * an active StaffMeta with the city assignment — but runs against one explicit
 * local SQLite file, because the invite API itself needs an authenticated Super
 * Admin session. It never touches PostgreSQL, `.env`, production settings or any
 * table other than `users` and `staff_meta`, and it takes a verified file backup
 * before the single insert.
 *
 * The temporary password is only ever handed over through the established DPAPI
 * protected handoff; it is never logged, returned in the summary, or written in
 * plaintext to disk.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { createSqliteFileBackup, openSqliteDatabase, verifySqliteBackupFile } from "../attendance/sqlite-support";
import { writeDpapiHandoff, type ProtectedHandoffWriter } from "../attendance/team-access/provision";

/** The only city this local tool provisions, matched by code and name. */
export const LOCAL_CITY_HEAD_CITY = Object.freeze({ code: "LHR", name: "Lahore" });
export const LOCAL_CITY_HEAD_ROLE = "city_head";

export function normalizeLocalEmail(value: string): string {
  return value.trim().toLowerCase();
}

export type CityHeadPreflightStatus = "absent" | "already-provisioned" | "conflict";

export interface CityHeadPreflight {
  readonly email: string;
  readonly status: CityHeadPreflightStatus;
  /** Populated only when `status` is `conflict`. */
  readonly conflict: string | null;
  readonly cityId: string | null;
  readonly cityName: string | null;
  readonly userCount: number;
  readonly staffCount: number;
  readonly cityHeadCount: number;
}

interface Counts {
  readonly userCount: number;
  readonly staffCount: number;
  readonly cityHeadCount: number;
}

function countRows(db: DatabaseSync): Counts {
  const count = (sql: string) => Number((db.prepare(sql).get() as { c?: number })?.c ?? 0);
  return {
    userCount: count('SELECT COUNT(*) AS c FROM "users"'),
    staffCount: count('SELECT COUNT(*) AS c FROM "staff_meta"'),
    cityHeadCount: count('SELECT COUNT(*) AS c FROM "users" u JOIN "staff_meta" s ON s."userId"=u."id" WHERE s."role"=\'city_head\' AND u."isActive"=1 AND s."isActive"=1'),
  };
}

interface ExistingAccountRow {
  readonly userId: string;
  readonly userActive: number;
  readonly mustResetPwd: number;
  readonly role: string | null;
  readonly assignedCityId: string | null;
  readonly assignedParkId: string | null;
  readonly assignedGroupId: string | null;
  readonly staffActive: number | null;
}

function readExisting(db: DatabaseSync, email: string): ExistingAccountRow[] {
  return db.prepare(
    'SELECT u."id" AS userId, u."isActive" AS userActive, u."mustResetPwd" AS mustResetPwd, s."role" AS role, s."assignedCityId" AS assignedCityId, s."assignedParkId" AS assignedParkId, s."assignedGroupId" AS assignedGroupId, s."isActive" AS staffActive FROM "users" u LEFT JOIN "staff_meta" s ON s."userId"=u."id" WHERE lower(u."email")=?'
  ).all(email) as unknown as ExistingAccountRow[];
}

/** Read-only account and scope check. Never writes and never prints credentials. */
export function readCityHeadPreflight(dbPath: string, email: string): CityHeadPreflight {
  const normalized = normalizeLocalEmail(email);
  const db = openSqliteDatabase(dbPath, true);
  try {
    const counts = countRows(db);
    const city = db.prepare('SELECT "id","name" FROM "cities" WHERE "code"=? AND "name"=? AND "isActive"=1').get(
      LOCAL_CITY_HEAD_CITY.code,
      LOCAL_CITY_HEAD_CITY.name
    ) as { id: string; name: string } | undefined;
    const rows = readExisting(db, normalized);
    const base = { email: normalized, cityId: city?.id ?? null, cityName: city?.name ?? null, ...counts };

    if (!city) {
      return { ...base, status: "conflict", conflict: `${LOCAL_CITY_HEAD_CITY.name} (${LOCAL_CITY_HEAD_CITY.code}) is missing or inactive in the target database` };
    }
    if (rows.length === 0) return { ...base, status: "absent", conflict: null };
    if (rows.length > 1) return { ...base, status: "conflict", conflict: `${rows.length} user rows already use this email` };

    const row = rows[0];
    if (row.role !== LOCAL_CITY_HEAD_ROLE) {
      return { ...base, status: "conflict", conflict: `existing account role is "${row.role ?? "none"}", not ${LOCAL_CITY_HEAD_ROLE}` };
    }
    if (row.assignedCityId !== city.id) {
      return { ...base, status: "conflict", conflict: `existing account city is "${row.assignedCityId ?? "none"}", not ${city.id}` };
    }
    if (row.assignedParkId || row.assignedGroupId) {
      return { ...base, status: "conflict", conflict: "existing account unexpectedly holds a park or group assignment" };
    }
    if (row.userActive !== 1 || row.staffActive !== 1) {
      return { ...base, status: "conflict", conflict: "existing account is inactive" };
    }
    return { ...base, status: "already-provisioned", conflict: null };
  } finally {
    db.close();
  }
}

export interface LocalCityHeadResult {
  readonly mode: "preflight" | "execute";
  readonly writesPerformed: boolean;
  readonly outcome: "preflight" | "created" | "already-provisioned";
  readonly email: string;
  readonly role: typeof LOCAL_CITY_HEAD_ROLE;
  readonly isActive: number;
  readonly mustResetPwd: number;
  readonly assignedCityId: string | null;
  readonly assignedCityName: string | null;
  readonly assignedParkId: null;
  readonly assignedGroupId: null;
  readonly userCount: number;
  readonly staffCount: number;
  readonly cityHeadCount: number;
  readonly backupPath?: string;
  readonly handoffPath?: string;
  readonly preflight: CityHeadPreflight;
}

export interface LocalCityHeadInput {
  readonly dbPath: string;
  readonly email: string;
  readonly name: string;
  readonly backupDir: string;
  readonly handoffPath: string;
  readonly execute: boolean;
  readonly acknowledged: boolean;
  readonly writeHandoff?: ProtectedHandoffWriter;
}

export function assertLocalCityHeadTarget(dbPath: string): void {
  if (!dbPath || /^[a-z][a-z0-9+.-]*:\/\//i.test(dbPath) || /^(\\\\|\/\/)/.test(dbPath)) {
    throw new Error("Refusing to provision: --sqlite-path must be an explicit local file path");
  }
  if (!fs.existsSync(dbPath)) throw new Error("Refusing to provision: the local SQLite file does not exist");
}

/** Verifies the exact created account and that nothing else changed. */
function assertCreatedAccount(db: DatabaseSync, email: string, cityId: string, before: Counts): Counts {
  const rows = readExisting(db, email);
  if (rows.length !== 1) throw new Error(`Post-write verification failed: expected exactly one account for the email, found ${rows.length}`);
  const row = rows[0];
  const checks: Array<[string, boolean]> = [
    ["role", row.role === LOCAL_CITY_HEAD_ROLE],
    ["userActive", row.userActive === 1],
    ["staffActive", row.staffActive === 1],
    ["mustResetPwd", row.mustResetPwd === 1],
    ["assignedCityId", row.assignedCityId === cityId],
    ["assignedParkId", row.assignedParkId === null],
    ["assignedGroupId", row.assignedGroupId === null],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) throw new Error(`Post-write verification failed: ${failed.join(", ")}`);

  const after = countRows(db);
  if (after.userCount !== before.userCount + 1) throw new Error("Post-write verification failed: unexpected user count change");
  if (after.staffCount !== before.staffCount + 1) throw new Error("Post-write verification failed: unexpected staff count change");
  if (after.cityHeadCount !== before.cityHeadCount + 1) throw new Error("Post-write verification failed: unexpected active City Head count change");
  return after;
}

export async function provisionLocalCityHead(input: LocalCityHeadInput): Promise<LocalCityHeadResult> {
  assertLocalCityHeadTarget(input.dbPath);
  const preflight = readCityHeadPreflight(input.dbPath, input.email);
  const base = {
    email: preflight.email,
    role: LOCAL_CITY_HEAD_ROLE,
    assignedCityId: preflight.cityId,
    assignedCityName: preflight.cityName,
    assignedParkId: null,
    assignedGroupId: null,
    preflight,
  } as const;

  if (!input.execute) {
    return {
      ...base,
      mode: "preflight",
      writesPerformed: false,
      outcome: "preflight",
      isActive: 0,
      mustResetPwd: 0,
      userCount: preflight.userCount,
      staffCount: preflight.staffCount,
      cityHeadCount: preflight.cityHeadCount,
    };
  }

  if (!input.acknowledged) throw new Error("Refusing to provision without --confirm-local-city-head");
  if (!input.backupDir) throw new Error("Refusing to provision without a verified --backup-dir");
  if (!input.handoffPath) throw new Error("Refusing to provision without a protected --handoff path");
  if (preflight.status === "conflict") throw new Error(`Refusing to provision: ${preflight.conflict}`);
  if (!preflight.cityId) throw new Error("Refusing to provision: the target city was not resolved");
  if (preflight.status === "already-provisioned") {
    const db = openSqliteDatabase(input.dbPath, true);
    try {
      const row = readExisting(db, preflight.email)[0];
      return {
        ...base,
        mode: "execute",
        writesPerformed: false,
        outcome: "already-provisioned",
        isActive: row.userActive,
        mustResetPwd: row.mustResetPwd,
        userCount: preflight.userCount,
        staffCount: preflight.staffCount,
        cityHeadCount: preflight.cityHeadCount,
      };
    } finally {
      db.close();
    }
  }

  const backup = await createSqliteFileBackup({ path: input.dbPath, backupDir: input.backupDir }, "city-head-provision");
  await verifySqliteBackupFile(backup);

  const password = crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  const now = Date.now();
  const userId = crypto.randomUUID();
  const staffId = crypto.randomUUID();

  // The protected handoff exists before the account does; a failed write removes it.
  (input.writeHandoff ?? writeDpapiHandoff)(input.handoffPath, [{ email: preflight.email, password }]);

  const db = new DatabaseSync(input.dbPath);
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare('INSERT INTO "users" ("id","email","passwordHash","name","phone","mustResetPwd","tokenVersion","isActive","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(userId, preflight.email, passwordHash, input.name, null, 1, 0, 1, now, now);
      db.prepare('INSERT INTO "staff_meta" ("id","userId","role","assignedCityId","assignedParkId","assignedGroupId","isActive","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?)')
        .run(staffId, userId, LOCAL_CITY_HEAD_ROLE, preflight.cityId, null, null, 1, now, now);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    const after = assertCreatedAccount(db, preflight.email, preflight.cityId, {
      userCount: preflight.userCount,
      staffCount: preflight.staffCount,
      cityHeadCount: preflight.cityHeadCount,
    });
    return {
      ...base,
      mode: "execute",
      writesPerformed: true,
      outcome: "created",
      isActive: 1,
      mustResetPwd: 1,
      userCount: after.userCount,
      staffCount: after.staffCount,
      cityHeadCount: after.cityHeadCount,
      backupPath: backup.path,
      handoffPath: input.handoffPath,
    };
  } catch (error) {
    fs.copyFileSync(backup.path, input.dbPath);
    fs.rmSync(input.handoffPath, { force: true });
    throw error;
  } finally {
    db.close();
  }
}
