import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  planSqliteTeamAccess,
  preflightSqliteTeamAccess,
  provisionSqliteTeamAccess,
  readTeamAccessWorkbook,
  reissueSqliteTeamAccessPasswords,
  runTeamAccessProvision,
} from "./provision";

const root = process.cwd();
const source = path.join(root, "prisma", "dev.db");
const workbook = path.join(root, "docs", "sheets", "Shabab360_Team_Access.xlsx");
const cli = path.join(root, "scripts", "provision-lahore-team-access.ts");
const ready = fs.existsSync(source) && fs.existsSync(workbook);
function run(args: string[]) { return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 }); }

describe.skipIf(!ready)("local-only Team Access provisioning preflight", () => {
  it("reports only aggregate workbook scope violations in dry run", () => {
    const result = run(["--input", workbook]);
    expect(result.status).toBe(0);
    expect(result.stderr).not.toMatch(/aborted/i);
    // Muawin never carries a group; a teaching Park Lead legitimately does.
    expect(JSON.parse(result.stdout)).toMatchObject({ mode: "dry-run", writesPerformed: false, counts: { supported: 52, unassigned: 15, murabbi: 34, muawin: 12, parkLead: 6, ungroupedMurabbi: 18, roleGroupCodeViolations: 0 } });
  }, 120_000);

  it("reports non-PII exact-match diagnostics and refuses execution before backup, handoff, or target writes", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "lahore-team-access-"));
    const target = path.join(temp, "copy.db"); const backups = path.join(temp, "backups"); const handoff = path.join(temp, "credentials.dpapi");
    try {
      fs.copyFileSync(source, target); const sourceBefore = fs.statSync(source); const targetBefore = fs.statSync(target);
      const diagnostic = run(["--input", workbook, "--preflight", "--sqlite-path", target]);
      expect(diagnostic.status).toBe(0);
      expect(JSON.parse(diagnostic.stdout)).toEqual({ mode: "preflight", writesPerformed: false, diagnostics: { roleGroupCodeViolations: 0, exactPlaceholderMismatches: 52 } });
      const refused = run(["--input", workbook, "--execute", "--confirm-team-access-provision", "--target", "sqlite", "--sqlite-path", target, "--backup-dir", backups, "--handoff", handoff]);
      expect(refused.status).toBe(1); expect(refused.stderr).toMatch(/aborted: Expected exactly one inactive local staff placeholder per supported row/i);
      expect(fs.existsSync(backups)).toBe(false); expect(fs.existsSync(handoff)).toBe(false);
      const targetAfter = fs.statSync(target); const sourceAfter = fs.statSync(source);
      expect(targetAfter.size).toBe(targetBefore.size); expect(targetAfter.mtimeMs).toBe(targetBefore.mtimeMs); expect(sourceAfter.size).toBe(sourceBefore.size); expect(sourceAfter.mtimeMs).toBe(sourceBefore.mtimeMs);
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }, 120_000);
});

/** A workbook whose only row is Unassigned, so plan validation passes and the schema gate is reached. */
async function writeUnassignedWorkbook(file: string): Promise<void> {
  await writeWorkbook(file, ["Name", "Work Email", "Role", "Park", "Group Code"], [["", "", "Unassigned", "", ""]]);
}

async function writeWorkbook(file: string, headers: readonly string[], rows: readonly (readonly string[])[]): Promise<void> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Team Access");
  sheet.addRow([...headers]);
  for (const row of rows) sheet.addRow([...row]);
  await book.xlsx.writeFile(file);
}

describe.skipIf(!ready)("Team Access provisioning schema gate", () => {
  it("refuses a database lacking the Muawin assistance schema before backup, passwords, or activation", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "team-access-gate-"));
    const target = path.join(temp, "copy.db");
    const backups = path.join(temp, "backups");
    const handoff = path.join(temp, "credentials.dpapi");
    const syntheticWorkbook = path.join(temp, "team-access.xlsx");
    try {
      fs.copyFileSync(source, target);
      const targetDb = new DatabaseSync(target);
      try { targetDb.exec('DROP INDEX IF EXISTS "staff_meta_assistsMurabbiId_idx"'); } finally { targetDb.close(); }
      await writeUnassignedWorkbook(syntheticWorkbook);
      const targetBefore = fs.statSync(target);

      await expect(
        runTeamAccessProvision({ workbook: syntheticWorkbook, dbPath: target, backupDir: backups, handoffPath: handoff, execute: true, acknowledged: true })
      ).rejects.toThrow(/Team Access schema is incomplete/);

      // Nothing was created and the target was not touched.
      expect(fs.existsSync(backups)).toBe(false);
      expect(fs.existsSync(handoff)).toBe(false);
      const targetAfter = fs.statSync(target);
      expect(targetAfter.size).toBe(targetBefore.size);
      expect(targetAfter.mtimeMs).toBe(targetBefore.mtimeMs);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Synthetic scenarios: no real workbook or database is involved.
// ---------------------------------------------------------------------------

const GULBERG = "Gulberg";
const GRIFFIN = "Griffin";
const MURABBI = "Synthetic Murabbi One";
const TEACHING_LEAD = "Synthetic Teaching Lead";
const NON_TEACHING_LEAD = "Synthetic Non Teaching Lead";
const DORMANT_MURABBI = "Synthetic Dormant Murabbi";
const ACTIVE_MURABBI = "Synthetic Active Murabbi";
const MUAWIN_ONE = "Synthetic Muawin One";
const MUAWIN_TWO = "Synthetic Muawin Two";
const OTHER_PARK_MURABBI = "Synthetic Other Park Murabbi";
const email = (handle: string) => `${handle}@example.invalid`;

const FIXTURE_DDL: readonly string[] = [
  `CREATE TABLE "cities" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "parks" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "groups" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE CASCADE)`,
  `CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "name" TEXT, "passwordHash" TEXT, "mustResetPwd" INTEGER NOT NULL DEFAULT 1, "tokenVersion" INTEGER NOT NULL DEFAULT 0, "isActive" INTEGER NOT NULL DEFAULT 0, "updatedAt" INTEGER)`,
  `CREATE TABLE "staff_meta" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL, "assignedCityId" TEXT, "assignedParkId" TEXT REFERENCES "parks"("id") ON DELETE SET NULL, "assignedGroupId" TEXT REFERENCES "groups"("id") ON DELETE SET NULL, "assistsMurabbiId" TEXT REFERENCES "staff_meta"("id") ON DELETE SET NULL, "isActive" INTEGER NOT NULL DEFAULT 0, "updatedAt" INTEGER)`,
];

const HEADERS = ["Name", "Work Email", "Role", "Park", "Group Code", "Assists Murabbi Email"];
const FIXTURE_FINGERPRINT_QUERY = "SELECT type, name, sql FROM sqlite_master ORDER BY type, name";

function seedPlaceholder(db: DatabaseSync, id: string, name: string, mail: string, parkId: string, active = false): void {
  db.prepare('INSERT INTO "users" ("id","email","name","isActive") VALUES (?,?,?,?)').run(`user-${id}`, mail, name, active ? 1 : 0);
  db.prepare('INSERT INTO "staff_meta" ("id","userId","role","assignedParkId","isActive") VALUES (?,?,?,?,?)').run(id, `user-${id}`, active ? "murabbi" : "pending_assignment", parkId, active ? 1 : 0);
}

function createSyntheticDatabase(filePath: string): void {
  const db = new DatabaseSync(filePath);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    for (const statement of FIXTURE_DDL) db.exec(statement);
    db.exec(`
      INSERT INTO "cities" ("id","name") VALUES ('city-1','Synthetic City');
      INSERT INTO "parks" ("id","name") VALUES ('park-gulberg','Gulberg');
      INSERT INTO "parks" ("id","name") VALUES ('park-griffin','Griffin');
      INSERT INTO "groups" ("id","name","parkId") VALUES ('group-gulberg-1','Group 1','park-gulberg');
      INSERT INTO "groups" ("id","name","parkId") VALUES ('group-griffin-1','Group 1','park-griffin');
    `);
    seedPlaceholder(db, "staff-murabbi", MURABBI, email("syn.murabbi1"), "park-gulberg");
    seedPlaceholder(db, "staff-teaching-lead", TEACHING_LEAD, email("syn.lead1"), "park-gulberg");
    seedPlaceholder(db, "staff-non-teaching-lead", NON_TEACHING_LEAD, email("syn.lead2"), "park-gulberg");
    seedPlaceholder(db, "staff-dormant", DORMANT_MURABBI, email("syn.dormant"), "park-gulberg");
    seedPlaceholder(db, "staff-muawin-one", MUAWIN_ONE, email("syn.muawin1"), "park-gulberg");
    seedPlaceholder(db, "staff-muawin-two", MUAWIN_TWO, email("syn.muawin2"), "park-gulberg");
    seedPlaceholder(db, "staff-other-park", OTHER_PARK_MURABBI, email("syn.murabbi2"), "park-griffin");
    seedPlaceholder(db, "staff-active-murabbi", ACTIVE_MURABBI, email("syn.active"), "park-gulberg", true);
  } finally {
    db.close();
  }
}

function withReadOnly<T>(filePath: string, read: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    return read(db);
  } finally {
    db.close();
  }
}

interface StaffState {
  readonly role: string;
  readonly parkId: string | null;
  readonly groupId: string | null;
  readonly assists: string | null;
  readonly staffActive: number;
  readonly userActive: number;
  readonly staffId: string;
}

function staffState(filePath: string, mail: string): StaffState | undefined {
  return withReadOnly(filePath, (db) =>
    db
      .prepare('SELECT s."id" staffId,s."role" role,s."assignedParkId" parkId,s."assignedGroupId" groupId,s."assistsMurabbiId" assists,s."isActive" staffActive,u."isActive" userActive FROM "staff_meta" s JOIN "users" u ON u."id"=s."userId" WHERE lower(u."email")=?')
      .get(mail) as StaffState | undefined
  );
}

interface HandoffRecord {
  readonly path: string;
  readonly entries: readonly { readonly email: string; readonly password: string }[];
  /** Planned placeholders already active when the writer ran; must stay empty to prove handoff-before-activation. */
  readonly activePlanned: readonly string[];
}

/** Records the protected-handoff call without invoking PowerShell or DPAPI, capturing pre-activation state. */
function recordingHandoffWriter(filePath: string, record: HandoffRecord[], plannedEmails: readonly string[]): (outputPath: string, entries: readonly { email: string; password: string }[]) => void {
  return (outputPath, entries) => {
    record.push({ path: outputPath, entries: entries.map((entry) => ({ ...entry })), activePlanned: plannedEmails.filter((mail) => staffState(filePath, mail)?.staffActive === 1) });
  };
}

function schemaFingerprint(filePath: string): string {
  return withReadOnly(filePath, (db) => JSON.stringify(db.prepare(FIXTURE_FINGERPRINT_QUERY).all()));
}

function dataFingerprint(filePath: string): string {
  return withReadOnly(filePath, (db) =>
    JSON.stringify({
      users: db.prepare('SELECT "id","email","isActive","mustResetPwd" FROM "users" ORDER BY "id"').all(),
      staff: db.prepare('SELECT "id","role","assignedParkId","assignedGroupId","assistsMurabbiId","isActive" FROM "staff_meta" ORDER BY "id"').all(),
    })
  );
}

function credentialState(filePath: string, mail: string): { readonly passwordHash: string | null; readonly mustResetPwd: number; readonly tokenVersion: number } {
  return withReadOnly(filePath, (db) => db.prepare('SELECT "passwordHash" passwordHash,"mustResetPwd" mustResetPwd,"tokenVersion" tokenVersion FROM "users" WHERE lower("email")=?').get(mail) as { passwordHash: string | null; mustResetPwd: number; tokenVersion: number });
}

describe("Team Access assistance planning and local activation (synthetic)", () => {
  let tmp: string;
  let database: string;
  let backups: string;
  let handoff: string;

  const setup = (): void => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "team-access-synthetic-"));
    database = path.join(tmp, "synthetic.db");
    backups = path.join(tmp, "backups");
    handoff = path.join(tmp, "credentials.dpapi");
    createSyntheticDatabase(database);
  };
  const teardown = (): void => {
    fs.rmSync(tmp, { recursive: true, force: true });
  };

  it("assigns groups to Murabbi and teaching Park Lead, keeps Muawin groupless, and links assistance", async () => {
    setup();
    try {
      const file = path.join(tmp, "team-access.xlsx");
      await writeWorkbook(file, HEADERS, [
        [MURABBI, email("syn.murabbi1"), "Murabbi", GULBERG, "G11", ""],
        [TEACHING_LEAD, email("syn.lead1"), "Park Lead", GULBERG, "G11", ""],
        [MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.murabbi1")],
        [MUAWIN_TWO, email("syn.muawin2"), "Muawin", GULBERG, "", ""],
      ]);
      const rows = await readTeamAccessWorkbook(file);
      const plan = planSqliteTeamAccess(database, rows);
      expect(plan).toHaveLength(4);

      // Read-only planning cannot have touched anything yet.
      expect(staffState(database, email("syn.muawin1"))?.staffActive).toBe(0);
      expect(fs.existsSync(handoff)).toBe(false);

      const handoffs: HandoffRecord[] = [];
      await provisionSqliteTeamAccess(database, rows, plan, handoff, recordingHandoffWriter(database, handoffs, plan.map((item) => item.row.email)));

      const murabbi = staffState(database, email("syn.murabbi1"));
      expect(murabbi).toMatchObject({ role: "murabbi", groupId: "group-gulberg-1", assists: null, staffActive: 1, userActive: 1 });

      // A teaching Park Lead keeps the park_lead role and its group.
      const lead = staffState(database, email("syn.lead1"));
      expect(lead).toMatchObject({ role: "park_lead", groupId: "group-gulberg-1", staffActive: 1, userActive: 1 });

      // Muawin never receives a group; the assistance link points at the Murabbi row.
      const muawinOne = staffState(database, email("syn.muawin1"));
      expect(muawinOne).toMatchObject({ role: "muawin", groupId: null, assists: murabbi?.staffId, staffActive: 1, userActive: 1 });

      // No assistance link is also valid.
      const muawinTwo = staffState(database, email("syn.muawin2"));
      expect(muawinTwo).toMatchObject({ role: "muawin", groupId: null, assists: null, staffActive: 1, userActive: 1 });

      withReadOnly(database, (db) => expect(db.prepare("PRAGMA foreign_key_check").all()).toHaveLength(0));

      // The injected writer replaced DPAPI: it ran once, before activation, with only the in-memory credentials.
      expect(handoffs).toHaveLength(1);
      expect(handoffs[0].path).toBe(handoff);
      expect(handoffs[0].activePlanned).toEqual([]);
      expect(handoffs[0].entries.map((entry) => entry.email).sort()).toEqual([email("syn.murabbi1"), email("syn.lead1"), email("syn.muawin1"), email("syn.muawin2")].sort());
      expect(handoffs[0].entries.every((entry) => typeof entry.password === "string" && entry.password.length > 0)).toBe(true);
      // No real protected or plaintext handoff file is created by the synthetic path.
      expect(fs.existsSync(handoff)).toBe(false);
    } finally {
      teardown();
    }
  }, 120_000);

  it("links a Muawin to an already-active Murabbi in the same park", async () => {
    setup();
    try {
      const file = path.join(tmp, "team-access.xlsx");
      await writeWorkbook(file, HEADERS, [[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.active")]]);
      const rows = await readTeamAccessWorkbook(file);
      const plan = planSqliteTeamAccess(database, rows);

      const handoffs: HandoffRecord[] = [];
      await provisionSqliteTeamAccess(database, rows, plan, handoff, recordingHandoffWriter(database, handoffs, plan.map((item) => item.row.email)));
      const active = staffState(database, email("syn.active"));
      expect(staffState(database, email("syn.muawin1"))).toMatchObject({ role: "muawin", groupId: null, assists: active?.staffId });

      // The injected writer ran before activation with only the in-memory Muawin credential; no real handoff exists.
      expect(handoffs).toHaveLength(1);
      expect(handoffs[0].activePlanned).toEqual([]);
      expect(handoffs[0].entries).toEqual([{ email: email("syn.muawin1"), password: expect.any(String) }]);
      expect(fs.existsSync(handoff)).toBe(false);
    } finally {
      teardown();
    }
  }, 120_000);

  it("keeps every placeholder inactive and writes nothing when the protected-handoff writer fails", async () => {
    setup();
    try {
      const file = path.join(tmp, "team-access.xlsx");
      await writeWorkbook(file, HEADERS, [
        [MURABBI, email("syn.murabbi1"), "Murabbi", GULBERG, "G11", ""],
        [MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.murabbi1")],
      ]);
      const rows = await readTeamAccessWorkbook(file);
      const plan = planSqliteTeamAccess(database, rows);
      const before = { data: dataFingerprint(database), schema: schemaFingerprint(database) };
      const failingWriter = (): never => { throw new Error("Simulated protected-handoff failure"); };

      await expect(provisionSqliteTeamAccess(database, rows, plan, handoff, failingWriter)).rejects.toThrow("Simulated protected-handoff failure");

      // No user or staff placeholder was activated and no row changed.
      expect(staffState(database, email("syn.murabbi1"))).toMatchObject({ role: "pending_assignment", assists: null, staffActive: 0, userActive: 0 });
      expect(staffState(database, email("syn.muawin1"))).toMatchObject({ role: "pending_assignment", assists: null, staffActive: 0, userActive: 0 });
      expect(dataFingerprint(database)).toBe(before.data);
      expect(schemaFingerprint(database)).toBe(before.schema);
      // No backup and no protected or plaintext handoff exists.
      expect(fs.existsSync(backups)).toBe(false);
      expect(fs.existsSync(handoff)).toBe(false);
    } finally {
      teardown();
    }
  }, 60_000);

  it("rejects invalid assistance links before any backup, password, or write", async () => {
    setup();
    try {
      const caseFile = async (rows: readonly (readonly string[])[]): Promise<string> => {
        const file = path.join(tmp, `case-${Math.random().toString(36).slice(2)}.xlsx`);
        await writeWorkbook(file, HEADERS, rows);
        return file;
      };
      const before = { data: dataFingerprint(database), schema: schemaFingerprint(database) };

      const crossPark = await caseFile([[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.murabbi2")], [OTHER_PARK_MURABBI, email("syn.murabbi2"), "Murabbi", GRIFFIN, "", ""]]);
      await expect(readTeamAccessWorkbook(crossPark).then((rows) => planSqliteTeamAccess(database, rows))).rejects.toThrow(/same park/);

      const selfLink = await caseFile([[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.muawin1")]]);
      await expect(readTeamAccessWorkbook(selfLink).then((rows) => planSqliteTeamAccess(database, rows))).rejects.toThrow(/cannot assist themselves/);

      const inactiveTarget = await caseFile([[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.dormant")]]);
      await expect(readTeamAccessWorkbook(inactiveTarget).then((rows) => planSqliteTeamAccess(database, rows))).rejects.toThrow(/active Murabbi or teaching Park Lead/);

      // A Park Lead without a group is not a teaching target.
      const nonTeachingLead = await caseFile([[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.lead2")], [NON_TEACHING_LEAD, email("syn.lead2"), "Park Lead", GULBERG, "", ""]]);
      await expect(readTeamAccessWorkbook(nonTeachingLead).then((rows) => planSqliteTeamAccess(database, rows))).rejects.toThrow(/active Murabbi or teaching Park Lead/);

      const muawinWithGroup = await caseFile([[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "G11", ""]]);
      await expect(readTeamAccessWorkbook(muawinWithGroup).then((rows) => planSqliteTeamAccess(database, rows))).rejects.toThrow(/Only Murabbi and Park Lead rows may include a group code/);

      const murabbiWithAssistance = await caseFile([[MURABBI, email("syn.murabbi1"), "Murabbi", GULBERG, "G11", email("syn.active")]]);
      await expect(readTeamAccessWorkbook(murabbiWithAssistance).then((rows) => planSqliteTeamAccess(database, rows))).rejects.toThrow(/Only Muawin rows may include an assisting Murabbi email/);

      const malformed = await caseFile([[MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", "not-an-email"]]);
      await expect(readTeamAccessWorkbook(malformed)).rejects.toThrow(/Invalid assisting Murabbi email in access workbook/);

      // Nothing above reached a write path.
      expect(dataFingerprint(database)).toBe(before.data);
      expect(schemaFingerprint(database)).toBe(before.schema);
      expect(fs.existsSync(handoff)).toBe(false);
      expect(fs.existsSync(backups)).toBe(false);
    } finally {
      teardown();
    }
  }, 120_000);

  it("still tolerates a workbook without the optional assistance column", async () => {
    setup();
    try {
      const file = path.join(tmp, "no-assistance.xlsx");
      await writeWorkbook(file, ["Name", "Work Email", "Role", "Park", "Group Code"], [[MURABBI, email("syn.murabbi1"), "Murabbi", GULBERG, "G11"]]);
      const rows = await readTeamAccessWorkbook(file);
      expect(rows[0]).toMatchObject({ role: "murabbi", groupNumber: 1, assistsMurabbiEmail: null });
      expect(planSqliteTeamAccess(database, rows)).toHaveLength(1);
    } finally {
      teardown();
    }
  }, 60_000);

  it("reports the same aggregate counts from the preflight helper", () => {
    setup();
    try {
      const rows = [
        { row: 2, name: MURABBI, email: email("syn.murabbi1"), role: "murabbi" as const, park: GULBERG, groupNumber: 1, assistsMurabbiEmail: null },
        { row: 3, name: MUAWIN_ONE, email: email("syn.muawin1"), role: "muawin" as const, park: GULBERG, groupNumber: 4, assistsMurabbiEmail: null },
      ];
      expect(preflightSqliteTeamAccess(database, rows)).toEqual({ roleGroupCodeViolations: 1, exactPlaceholderMismatches: 0 });
    } finally {
      teardown();
    }
  }, 60_000);

  it("reissues only active workbook passwords while preserving staff roles, assignments, and assistance", async () => {
    setup();
    try {
      const file = path.join(tmp, "team-access.xlsx");
      await writeWorkbook(file, HEADERS, [
        [MURABBI, email("syn.murabbi1"), "Murabbi", GULBERG, "G11", ""],
        [MUAWIN_ONE, email("syn.muawin1"), "Muawin", GULBERG, "", email("syn.murabbi1")],
      ]);
      const rows = await readTeamAccessWorkbook(file);
      const plan = planSqliteTeamAccess(database, rows);
      await provisionSqliteTeamAccess(database, rows, plan, handoff, () => undefined);
      const beforeStaff = dataFingerprint(database);
      const beforeCredentials = credentialState(database, email("syn.murabbi1"));
      const recovered: HandoffRecord[] = [];

      const result = await reissueSqliteTeamAccessPasswords({
        dbPath: database, rows, backupDir: backups, handoffPath: handoff,
        writeHandoff: recordingHandoffWriter(database, recovered, []),
      });

      expect(result).toEqual({ reissued: 2, passwordHandoff: handoff });
      expect(dataFingerprint(database)).toBe(beforeStaff);
      expect(recovered).toHaveLength(1);
      expect(recovered[0].entries.map((entry) => entry.email).sort()).toEqual([email("syn.murabbi1"), email("syn.muawin1")].sort());
      const afterCredentials = credentialState(database, email("syn.murabbi1"));
      expect(afterCredentials.mustResetPwd).toBe(1);
      expect(afterCredentials.tokenVersion).toBe(beforeCredentials.tokenVersion + 1);
      expect(afterCredentials.passwordHash).not.toBe(beforeCredentials.passwordHash);
      const password = recovered[0].entries.find((entry) => entry.email === email("syn.murabbi1"))?.password;
      expect(password).toEqual(expect.any(String));
      expect(await bcrypt.compare(password!, afterCredentials.passwordHash!)).toBe(true);
      expect(fs.existsSync(handoff)).toBe(false);
    } finally {
      teardown();
    }
  }, 120_000);

  it("does not alter active accounts when password-handoff creation fails", async () => {
    setup();
    try {
      const file = path.join(tmp, "team-access.xlsx");
      await writeWorkbook(file, HEADERS, [[MURABBI, email("syn.murabbi1"), "Murabbi", GULBERG, "G11", ""]]);
      const rows = await readTeamAccessWorkbook(file);
      await provisionSqliteTeamAccess(database, rows, planSqliteTeamAccess(database, rows), handoff, () => undefined);
      const before = { data: dataFingerprint(database), credentials: credentialState(database, email("syn.murabbi1")) };

      await expect(reissueSqliteTeamAccessPasswords({ dbPath: database, rows, backupDir: backups, handoffPath: handoff, writeHandoff: () => { throw new Error("Simulated recovery handoff failure"); } })).rejects.toThrow("Simulated recovery handoff failure");

      expect(dataFingerprint(database)).toBe(before.data);
      expect(credentialState(database, email("syn.murabbi1"))).toEqual(before.credentials);
      expect(fs.existsSync(handoff)).toBe(false);
    } finally {
      teardown();
    }
  }, 120_000);
});
