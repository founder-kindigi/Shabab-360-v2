import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import {
  assertLocalCityHeadTarget,
  normalizeLocalEmail,
  provisionLocalCityHead,
  readCityHeadPreflight,
} from "./city-head-provision";

const EMAIL = "ArslanAkram@Shabab360.com";

let dir: string;
let dbPath: string;

function open(): DatabaseSync {
  return new DatabaseSync(dbPath);
}

function createFixture(): void {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('CREATE TABLE "cities" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "code" TEXT NOT NULL, "isActive" INTEGER NOT NULL DEFAULT 1)');
    db.exec('CREATE TABLE "users" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL, "name" TEXT, "phone" TEXT, "mustResetPwd" INTEGER NOT NULL DEFAULT 1, "tokenVersion" INTEGER NOT NULL DEFAULT 0, "isActive" INTEGER NOT NULL DEFAULT 1, "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL)');
    db.exec('CREATE TABLE "staff_meta" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE, "role" TEXT NOT NULL, "assignedCityId" TEXT, "assignedParkId" TEXT, "assignedGroupId" TEXT, "isActive" INTEGER NOT NULL DEFAULT 1, "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL)');
    db.prepare('INSERT INTO "cities" ("id","name","code","isActive") VALUES (?,?,?,1)').run("city-lhr", "Lahore", "LHR");
    db.prepare('INSERT INTO "users" ("id","email","passwordHash","name","mustResetPwd","tokenVersion","isActive","createdAt","updatedAt") VALUES (?,?,?,?,1,0,1,?,?)')
      .run("user-super", "super@example.invalid", "hash", "Super", 1, 1);
    db.prepare('INSERT INTO "staff_meta" ("id","userId","role","assignedCityId","isActive","createdAt","updatedAt") VALUES (?,?,?,?,1,?,?)')
      .run("staff-super", "user-super", "super_admin", "city-lhr", 1, 1);
  } finally {
    db.close();
  }
}

function seedAccount(role: string, cityId: string | null, parkId: string | null = null): void {
  const db = open();
  try {
    db.prepare('INSERT INTO "users" ("id","email","passwordHash","name","mustResetPwd","tokenVersion","isActive","createdAt","updatedAt") VALUES (?,?,?,?,1,0,1,?,?)')
      .run("user-existing", "arslanakram@shabab360.com", "hash", "Existing", 1, 1);
    db.prepare('INSERT INTO "staff_meta" ("id","userId","role","assignedCityId","assignedParkId","isActive","createdAt","updatedAt") VALUES (?,?,?,?,?,1,?,?)')
      .run("staff-existing", "user-existing", role, cityId, parkId, 1, 1);
  } finally {
    db.close();
  }
}

function accountRow() {
  const db = open();
  try {
    return db.prepare('SELECT u."email",u."passwordHash",u."isActive",u."mustResetPwd",u."tokenVersion",s."role",s."assignedCityId",s."assignedParkId",s."assignedGroupId",s."isActive" AS "staffActive" FROM "users" u JOIN "staff_meta" s ON s."userId"=u."id" WHERE u."email"=?').get("arslanakram@shabab360.com");
  } finally {
    db.close();
  }
}

function counts() {
  const db = open();
  try {
    return {
      users: (db.prepare('SELECT COUNT(*) AS c FROM "users"').get() as { c: number }).c,
      staff: (db.prepare('SELECT COUNT(*) AS c FROM "staff_meta"').get() as { c: number }).c,
    };
  } finally {
    db.close();
  }
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    dbPath,
    email: EMAIL,
    name: "arslanakram",
    backupDir: path.join(dir, "backups"),
    handoffPath: path.join(dir, "handoff.bin"),
    execute: true,
    acknowledged: true,
    writeHandoff: vi.fn(),
    ...overrides,
  };
}

describe("local City Head provisioning", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "city-head-provision-"));
    dbPath = path.join(dir, "fixture.db");
    createFixture();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("normalizes the email and reports an absent account with the Lahore city id", () => {
    expect(normalizeLocalEmail(EMAIL)).toBe("arslanakram@shabab360.com");
    const preflight = readCityHeadPreflight(dbPath, EMAIL);
    expect(preflight).toMatchObject({ email: "arslanakram@shabab360.com", status: "absent", conflict: null, cityId: "city-lhr", cityName: "Lahore" });
    expect(preflight.userCount).toBe(1);
    expect(preflight.cityHeadCount).toBe(0);
  });

  it("creates the account with the reviewed contract and a protected handoff", async () => {
    const writeHandoff = vi.fn();
    const result = await provisionLocalCityHead(input({ writeHandoff }));
    const row = accountRow() as any;

    expect(result).toMatchObject({
      mode: "execute",
      writesPerformed: true,
      outcome: "created",
      email: "arslanakram@shabab360.com",
      role: "city_head",
      isActive: 1,
      mustResetPwd: 1,
      assignedCityId: "city-lhr",
      assignedParkId: null,
      assignedGroupId: null,
    });
    expect(fs.existsSync(String(result.backupPath))).toBe(true);
    expect(row).toMatchObject({
      email: "arslanakram@shabab360.com",
      isActive: 1,
      mustResetPwd: 1,
      tokenVersion: 0,
      role: "city_head",
      assignedCityId: "city-lhr",
      assignedParkId: null,
      assignedGroupId: null,
      staffActive: 1,
    });
    expect(row.passwordHash).not.toBe("hash");

    // The handed-over credential matches the stored hash, and no plaintext is returned.
    expect(writeHandoff).toHaveBeenCalledTimes(1);
    const [handoffPath, entries] = writeHandoff.mock.calls[0] as [string, { email: string; password: string }[]];
    expect(handoffPath).toBe(path.join(dir, "handoff.bin"));
    expect(entries).toHaveLength(1);
    expect(entries[0].email).toBe("arslanakram@shabab360.com");
    expect(await bcrypt.compare(entries[0].password, row.passwordHash)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(entries[0].password);

    // Exactly one new user and one new staff row.
    expect(counts()).toEqual({ users: 2, staff: 2 });
    expect(result.userCount).toBe(2);
    expect(result.staffCount).toBe(2);
    expect(result.cityHeadCount).toBe(1);
  });

  it("does not replace an existing account that already matches role and city", async () => {
    seedAccount("city_head", "city-lhr");
    const before = counts();
    expect(readCityHeadPreflight(dbPath, EMAIL).status).toBe("already-provisioned");

    const writeHandoff = vi.fn();
    const result = await provisionLocalCityHead(input({ writeHandoff }));

    expect(result).toMatchObject({ outcome: "already-provisioned", writesPerformed: false });
    expect(writeHandoff).not.toHaveBeenCalled();
    expect(counts()).toEqual(before);
    const existing = (accountRow() as any).passwordHash;
    expect(existing).toBe("hash");
  });

  it.each([
    ["a different role", () => seedAccount("park_lead", "city-lhr")],
    ["a different city", () => seedAccount("city_head", "city-other")],
    ["an unexpected park assignment", () => seedAccount("city_head", "city-lhr", "park-1")],
  ])("stops without mutating when the existing account conflicts (%s)", async (_label, seed) => {
    seed();
    const before = counts();
    const writeHandoff = vi.fn();

    expect(readCityHeadPreflight(dbPath, EMAIL).status).toBe("conflict");
    await expect(provisionLocalCityHead(input({ writeHandoff }))).rejects.toThrow(/Refusing to provision/);

    expect(writeHandoff).not.toHaveBeenCalled();
    expect(counts()).toEqual(before);
    expect(fs.existsSync(path.join(dir, "handoff.bin"))).toBe(false);
  });

  it("refuses an inactive Lahore city before any write", async () => {
    const db = open();
    try {
      db.prepare('UPDATE "cities" SET "isActive"=0 WHERE "code"=?').run("LHR");
    } finally {
      db.close();
    }

    expect(readCityHeadPreflight(dbPath, EMAIL).status).toBe("conflict");
    await expect(provisionLocalCityHead(input())).rejects.toThrow(/Refusing to provision/);
    expect(counts()).toEqual({ users: 1, staff: 1 });
  });

  it("refuses execution without the acknowledgement, backup directory or handoff", async () => {
    await expect(provisionLocalCityHead(input({ acknowledged: false }))).rejects.toThrow(/confirm-local-city-head/);
    await expect(provisionLocalCityHead(input({ backupDir: "" }))).rejects.toThrow(/backup-dir/);
    await expect(provisionLocalCityHead(input({ handoffPath: "" }))).rejects.toThrow(/handoff/);
    expect(counts()).toEqual({ users: 1, staff: 1 });
  });

  it("refuses non-local targets", () => {
    for (const target of ["postgres://user:pass@host/db", "\\\\host\\share\\dev.db", "//host/share/dev.db"]) {
      expect(() => assertLocalCityHeadTarget(target)).toThrow(/local file path/);
    }
    expect(() => assertLocalCityHeadTarget(path.join(dir, "missing.db"))).toThrow(/does not exist/);
  });

  it("reports a read-only preflight without writing anything", async () => {
    const result = await provisionLocalCityHead(input({ execute: false, acknowledged: false, backupDir: "", handoffPath: "" }));
    expect(result).toMatchObject({ mode: "preflight", writesPerformed: false, outcome: "preflight" });
    expect(counts()).toEqual({ users: 1, staff: 1 });
    expect(fs.existsSync(path.join(dir, "backups"))).toBe(false);
  });
});

const CLI = path.resolve(process.cwd(), "scripts/provision-local-city-head.ts");

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", timeout: 30_000 });
}

describe("City Head provisioning CLI argument contract", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "city-head-prov-cli-"));
    dbPath = path.join(dir, "fixture.db");
    createFixture();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("treats --dry-run as the read-only preflight", { timeout: 60_000 }, () => {
    const before = counts();
    const run = runCli(["--email", EMAIL, "--sqlite-path", dbPath, "--dry-run"]);

    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout)).toMatchObject({ mode: "preflight", writesPerformed: false, outcome: "preflight" });
    expect(counts()).toEqual(before);
    expect(fs.existsSync(path.join(dir, "handoff.bin"))).toBe(false);
  });

  it("keeps the default read-only with only --email and --sqlite-path", { timeout: 60_000 }, () => {
    const before = counts();
    const run = runCli(["--email", EMAIL, "--sqlite-path", dbPath]);

    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout)).toMatchObject({ mode: "preflight", writesPerformed: false });
    expect(counts()).toEqual(before);
  });

  it("refuses --dry-run combined with --execute and still writes nothing", { timeout: 60_000 }, () => {
    const before = counts();
    const run = runCli(["--email", EMAIL, "--sqlite-path", dbPath, "--dry-run", "--execute"]);

    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/mutually exclusive/);
    expect(counts()).toEqual(before);
  });

  it("still requires every explicit execution gate", { timeout: 60_000 }, () => {
    const before = counts();
    const run = runCli([
      "--email", EMAIL, "--sqlite-path", dbPath,
      "--execute", "--confirm-local-city-head",
      "--backup-dir", path.join(dir, "backups"), "--handoff", path.join(dir, "handoff.bin"),
    ]);

    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/Refusing execution without --target sqlite/);
    expect(counts()).toEqual(before);
    expect(fs.existsSync(path.join(dir, "backups"))).toBe(false);
  });
});
