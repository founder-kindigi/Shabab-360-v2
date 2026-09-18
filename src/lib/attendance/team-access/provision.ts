import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";
import { createSqliteBackup, verifySqliteBackup, type SqliteRefreshTarget } from "../lahore-refresh/sqlite-driver";
import { verifySqliteBackupFile } from "../sqlite-support";
import { assertTeamAccessSchemaReady } from "./schema-reconcile";

export const LAHORE_PARK_ORDER = ["Gulberg", "Gulshan Iqbal", "Griffin", "Johar Town", "Gulshan Ravi", "State Life"] as const;
export type SupportedRole = "murabbi" | "muawin" | "park_lead";
export interface TeamAccessRow { readonly row: number; readonly name: string; readonly email: string; readonly role: SupportedRole | "unassigned"; readonly park: string; readonly groupNumber: number | null; readonly assistsMurabbiEmail: string | null; }
export interface ProvisionSummary { readonly mode: "dry-run" | "execute"; readonly writesPerformed: boolean; readonly counts: { readonly supported: number; readonly unassigned: number; readonly murabbi: number; readonly muawin: number; readonly parkLead: number; readonly ungroupedMurabbi: number; readonly roleGroupCodeViolations: number; }; readonly passwordHandoff?: string; }
/** Protected-handoff writer seam. Production keeps using DPAPI; synthetic tests inject a recorder that never invokes PowerShell or DPAPI. */
export type ProtectedHandoffWriter = (outputPath: string, entries: readonly { email: string; password: string }[]) => void;
interface ExistingStaff { id: string; userId: string; name: string; parkName: string | null; userActive: number; staffActive: number; }
interface PlannedActivation { readonly row: TeamAccessRow & { readonly role: SupportedRole }; readonly staff: ExistingStaff; readonly parkId: string; readonly groupId: string | null; readonly assistsMurabbiId: string | null; }
type MutableActivation = { row: TeamAccessRow & { readonly role: SupportedRole }; staff: ExistingStaff; parkId: string; groupId: string | null; assistsMurabbiId: string | null };

/** Header texts accepted for the optional assisting-Murabbi column. */
const ASSISTANCE_HEADERS = ["assists murabbi email", "assisting murabbi email", "assists murabbi", "assisting murabbi"];

function cellText(value: unknown): string { if (typeof value === "string") return value.trim(); if (value && typeof value === "object" && "text" in value && typeof (value as { text?: unknown }).text === "string") return (value as { text: string }).text.trim(); return ""; }
function normalize(value: string): string { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US"); }
function validEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function canonicalRole(value: string): TeamAccessRow["role"] | null { const key = normalize(value); return key === "murabbi" ? "murabbi" : key === "muawin" ? "muawin" : key === "park lead" ? "park_lead" : key === "unassigned" ? "unassigned" : null; }
function groupNumber(code: string, park: string): number | null { if (!code.trim()) return null; const match = /^G(\d)(\d+)$/i.exec(code.trim()); if (!match) throw new Error("Invalid group code in access workbook"); const expectedPark = LAHORE_PARK_ORDER[Number(match[1]) - 1]; if (!expectedPark || normalize(expectedPark) !== normalize(park)) throw new Error("Group code does not match its park"); return Number(match[2]); }

/** A Murabbi always qualifies; a Park Lead only while it teaches a group. */
function eligibleAssistanceRole(role: SupportedRole, groupNumber: number | null): boolean { return role === "murabbi" || (role === "park_lead" && groupNumber !== null); }

function assistanceColumn(sheet: ExcelJS.Worksheet): number | null {
  const header = sheet.getRow(1);
  for (let column = 1; column <= sheet.columnCount; column += 1) {
    if (ASSISTANCE_HEADERS.includes(normalize(cellText(header.getCell(column).value)))) return column;
  }
  return null;
}

/** Reads hyperlink cell text only. No workbook row data is logged or emitted. */
export async function readTeamAccessWorkbook(input: string): Promise<TeamAccessRow[]> {
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.readFile(path.resolve(input));
  const sheet = workbook.getWorksheet("Team Access"); if (!sheet) throw new Error("Team Access worksheet is required");
  const assistColumn = assistanceColumn(sheet);
  const rows: TeamAccessRow[] = []; const emails = new Set<string>();
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    const name = cellText(sheet.getCell(row, 1).value); const email = cellText(sheet.getCell(row, 2).value).toLowerCase(); const role = canonicalRole(cellText(sheet.getCell(row, 3).value)); const park = cellText(sheet.getCell(row, 4).value); const code = cellText(sheet.getCell(row, 5).value);
    const assistance = assistColumn === null ? "" : cellText(sheet.getCell(row, assistColumn).value).toLowerCase();
    if (!name && !email && !role && !park && !code && !assistance) continue;
    if (!role) throw new Error("Invalid team access workbook role");
    if (role === "unassigned") { rows.push({ row, name, email, role, park, groupNumber: null, assistsMurabbiEmail: null }); continue; }
    if (!name || !validEmail(email) || !LAHORE_PARK_ORDER.some((item) => normalize(item) === normalize(park))) throw new Error("Invalid supported team access workbook row");
    if (emails.has(email)) throw new Error("Duplicate supported work email in access workbook"); emails.add(email);
    // Syntax only here: role, park and assistance policy is enforced by the read-only plan before any write.
    if (assistance && !validEmail(assistance)) throw new Error("Invalid assisting Murabbi email in access workbook");
    const parsedGroup = groupNumber(code, park);
    rows.push({ row, name, email, role, park, groupNumber: parsedGroup, assistsMurabbiEmail: assistance || null });
  }
  if (rows.length === 0) throw new Error("Team Access workbook has no rows"); return rows;
}
function summary(rows: readonly TeamAccessRow[], mode: "dry-run" | "execute", passwordHandoff?: string): ProvisionSummary { const supported = rows.filter((row) => row.role !== "unassigned") as (TeamAccessRow & { role: SupportedRole })[]; return { mode, writesPerformed: mode === "execute", counts: { supported: supported.length, unassigned: rows.length - supported.length, murabbi: supported.filter((row) => row.role === "murabbi").length, muawin: supported.filter((row) => row.role === "muawin").length, parkLead: supported.filter((row) => row.role === "park_lead").length, ungroupedMurabbi: supported.filter((row) => row.role === "murabbi" && row.groupNumber === null).length, roleGroupCodeViolations: supported.filter((row) => row.role === "muawin" && row.groupNumber !== null).length }, ...(passwordHandoff ? { passwordHandoff } : {}) }; }
function existingStaff(db: DatabaseSync): ExistingStaff[] { return db.prepare('SELECT s."id" id,s."userId" userId,u."name" name,p."name" parkName,u."isActive" userActive,s."isActive" staffActive FROM "staff_meta" s JOIN "users" u ON u."id"=s."userId" LEFT JOIN "parks" p ON p."id"=s."assignedParkId"').all() as unknown as ExistingStaff[]; }

/** An already-active Murabbi, or a Park Lead teaching inside the Muawin's park. */
function existingAssistanceTarget(db: DatabaseSync, email: string, parkId: string): string | null {
  const candidates = db.prepare('SELECT s."id" id,s."role" role,s."assignedGroupId" assignedGroupId,g."parkId" groupParkId FROM "staff_meta" s JOIN "users" u ON u."id"=s."userId" LEFT JOIN "groups" g ON g."id"=s."assignedGroupId" WHERE lower(u."email")=? AND s."assignedParkId"=? AND s."isActive"=1 AND u."isActive"=1').all(email, parkId) as unknown as { id: string; role: string; assignedGroupId: string | null; groupParkId: string | null }[];
  const match = candidates.find((candidate) => candidate.role === "murabbi" || (candidate.role === "park_lead" && candidate.assignedGroupId !== null && candidate.groupParkId === parkId));
  return match ? match.id : null;
}

/**
 * Resolves a Muawin's optional assistance target by work email inside the same park.
 * A target activated by this same plan qualifies, because it is active once the single
 * transaction completes; otherwise an already-active Murabbi or teaching Park Lead must match.
 */
function resolveAssistanceTarget(db: DatabaseSync, muawin: MutableActivation, plannedByEmail: ReadonlyMap<string, MutableActivation>): string {
  const email = normalize(muawin.row.assistsMurabbiEmail ?? "");
  if (email === normalize(muawin.row.email)) throw new Error("A Muawin cannot assist themselves");
  const planned = plannedByEmail.get(email);
  if (planned) {
    if (normalize(planned.row.park) !== normalize(muawin.row.park)) throw new Error("An assisting Murabbi must be in the same park as the Muawin");
    if (!eligibleAssistanceRole(planned.row.role, planned.row.groupNumber)) throw new Error("Selected staff member must be an active Murabbi or teaching Park Lead in the same park");
    return planned.staff.id;
  }
  const target = existingAssistanceTarget(db, email, muawin.parkId);
  if (!target) throw new Error("Selected staff member must be an active Murabbi or teaching Park Lead in the same park");
  return target;
}

/** Full plan validation is read-only and happens before any backup, password generation, or mutation. */
export function planSqliteTeamAccess(dbPath: string, rows: readonly TeamAccessRow[]): PlannedActivation[] {
  const supported = rows.filter((row) => row.role !== "unassigned") as (TeamAccessRow & { readonly role: SupportedRole })[];
  // Muawin never receives a group; Murabbi and teaching Park Lead may.
  if (supported.some((row) => row.role === "muawin" && row.groupNumber !== null)) throw new Error("Only Murabbi and Park Lead rows may include a group code");
  if (supported.some((row) => row.role !== "muawin" && row.assistsMurabbiEmail)) throw new Error("Only Muawin rows may include an assisting Murabbi email");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const parks = new Map((db.prepare('SELECT "id" id,"name" name FROM "parks"').all() as unknown as { id: string; name: string }[]).map((item) => [normalize(item.name), item.id]));
    const groups = new Map((db.prepare('SELECT g."id" id,p."name" parkName,g."name" groupName FROM "groups" g JOIN "parks" p ON p."id"=g."parkId"').all() as unknown as { id: string; parkName: string; groupName: string }[]).map((item) => [`${normalize(item.parkName)}|${normalize(item.groupName)}`, item.id]));
    const candidates = existingStaff(db);
    const plan: MutableActivation[] = supported.map((row) => {
      const parkId = parks.get(normalize(row.park)); const groupId = row.groupNumber === null ? null : groups.get(`${normalize(row.park)}|${normalize(`Group ${row.groupNumber}`)}`) ?? null;
      if (!parkId || (row.groupNumber !== null && !groupId)) throw new Error("Workbook scope does not exist in local Lahore data");
      const matches = candidates.filter((candidate) => normalize(candidate.name) === normalize(row.name) && normalize(candidate.parkName ?? "") === normalize(row.park));
      if (matches.length !== 1 || matches[0].userActive || matches[0].staffActive) throw new Error("Expected exactly one inactive local staff placeholder per supported row");
      return { row, staff: matches[0], parkId, groupId, assistsMurabbiId: null };
    });
    if (new Set(plan.map((item) => item.staff.id)).size !== plan.length) throw new Error("A local placeholder cannot be provisioned twice");
    const plannedByEmail = new Map(plan.map((item) => [normalize(item.row.email), item]));
    for (const item of plan) {
      if (item.row.role !== "muawin" || !item.row.assistsMurabbiEmail) continue;
      item.assistsMurabbiId = resolveAssistanceTarget(db, item, plannedByEmail);
    }
    return plan;
  } finally { db.close(); }
}
function generatePassword(): string { return crypto.randomBytes(24).toString("base64url"); }
/** DPAPI protects the full handoff for the current Windows account; plaintext is never written to disk. */
export function writeDpapiHandoff(outputPath: string, entries: readonly { email: string; password: string }[]): void { if (process.platform !== "win32") throw new Error("Refusing password handoff: Windows DPAPI is required"); const program = "Add-Type -AssemblyName System.Security -ErrorAction Stop;$p=[Console]::In.ReadToEnd();$b=[Text.Encoding]::UTF8.GetBytes($p);$e=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Convert]::ToBase64String($e)"; const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", program], { input: JSON.stringify({ version: 1, credentials: entries }), encoding: "utf8" }); if (result.status !== 0 || !result.stdout.trim()) throw new Error("Refusing password handoff: Windows DPAPI encryption failed"); fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, result.stdout.trim() + "\n", { encoding: "utf8", mode: 0o600 }); }

export async function provisionSqliteTeamAccess(dbPath: string, rows: readonly TeamAccessRow[], plan: readonly PlannedActivation[], handoffPath: string, writeHandoff: ProtectedHandoffWriter = writeDpapiHandoff): Promise<ProvisionSummary> {
  const passwords = plan.map(() => generatePassword()); const hashes = await Promise.all(passwords.map((password) => bcrypt.hash(password, 12)));
  // Protected handoff must exist before account activation. Any failure leaves all accounts inactive.
  writeHandoff(handoffPath, plan.map((item, index) => ({ email: item.row.email, password: passwords[index] })));
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      const updateUser = db.prepare('UPDATE "users" SET "email"=?,"passwordHash"=?,"mustResetPwd"=1,"isActive"=1,"tokenVersion"="tokenVersion"+1,"updatedAt"=? WHERE "id"=? AND "isActive"=0');
      const updateStaff = db.prepare('UPDATE "staff_meta" SET "role"=?,"assignedParkId"=?,"assignedGroupId"=?,"assistsMurabbiId"=?,"isActive"=1,"updatedAt"=? WHERE "id"=? AND "isActive"=0'); const now = Date.now();
      // Murabbi and teaching Park Lead keep their group; Muawin never takes one and alone may hold an assistance link.
      plan.forEach((item, index) => { if (updateUser.run(item.row.email, hashes[index], now, item.staff.userId).changes !== 1) throw new Error("Inactive placeholder activation failed"); if (updateStaff.run(item.row.role, item.parkId, item.row.role === "muawin" ? null : item.groupId, item.row.role === "muawin" ? item.assistsMurabbiId : null, now, item.staff.id).changes !== 1) throw new Error("Inactive staff metadata activation failed"); });
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); fs.rmSync(handoffPath, { force: true }); throw error; }
    return summary(rows, "execute", handoffPath);
  } finally { db.close(); }
}

export async function runTeamAccessProvision(input: { readonly workbook: string; readonly dbPath?: string; readonly backupDir?: string; readonly handoffPath?: string; readonly execute: boolean; readonly acknowledged: boolean; }): Promise<ProvisionSummary> {
  const rows = await readTeamAccessWorkbook(input.workbook); if (!input.execute) return summary(rows, "dry-run");
  if (!input.acknowledged || !input.dbPath || !input.backupDir || !input.handoffPath) throw new Error("Refusing execution without explicit acknowledgement, local SQLite target, verified backup directory, and DPAPI handoff path");
  const plan = planSqliteTeamAccess(input.dbPath, rows); // no backup/password/write until all exact matching succeeds
  // Read-only compatibility gate: stop before passwords, the backup or any activation.
  assertTeamAccessSchemaReady(input.dbPath, `node scripts/team-access-schema-compatibility.ts --database "${input.dbPath}" --execute --backup-dir <dir>`);
  const target: SqliteRefreshTarget = { path: input.dbPath, backupDir: input.backupDir }; const backup = await createSqliteBackup(target); await verifySqliteBackup(backup);
  try { return await provisionSqliteTeamAccess(input.dbPath, rows, plan, input.handoffPath); } catch (error) { fs.copyFileSync(backup.path, input.dbPath); throw error; }
}

/**
 * Recovery is for a protected handoff encrypted under a Windows identity other
 * than the operator's. It never changes staff roles or assignments; it only
 * reissues forced-reset passwords for the already-active workbook accounts.
 */
export async function reissueSqliteTeamAccessPasswords(input: {
  readonly dbPath: string;
  readonly rows: readonly TeamAccessRow[];
  readonly backupDir: string;
  readonly handoffPath: string;
  readonly writeHandoff?: ProtectedHandoffWriter;
}): Promise<{ readonly reissued: number; readonly passwordHandoff: string }> {
  const supported = input.rows.filter((row) => row.role !== "unassigned") as (TeamAccessRow & { readonly role: SupportedRole })[];
  if (supported.length === 0 || new Set(supported.map((row) => normalize(row.email))).size !== supported.length) {
    throw new Error("Team Access password recovery requires unique supported workbook accounts");
  }

  const db = new DatabaseSync(input.dbPath, { readOnly: true });
  let targets: { userId: string; email: string }[];
  try {
    targets = supported.map((row) => {
      const matches = db.prepare('SELECT u."id" userId,u."email" email FROM "users" u JOIN "staff_meta" s ON s."userId"=u."id" WHERE lower(u."email")=? AND u."isActive"=1 AND s."isActive"=1 AND s."role"=?').all(normalize(row.email), row.role) as { userId: string; email: string }[];
      if (matches.length !== 1) throw new Error("Team Access password recovery requires exactly one active account per supported workbook row");
      return matches[0];
    });
  } finally { db.close(); }

  const passwords = targets.map(() => generatePassword());
  const hashes = await Promise.all(passwords.map((password) => bcrypt.hash(password, 12)));
  const backup = await createSqliteBackup({ path: input.dbPath, backupDir: input.backupDir });
  // Password recovery needs an intact database file, not the full Lahore import schema.
  await verifySqliteBackupFile(backup);
  const writeHandoff = input.writeHandoff ?? writeDpapiHandoff;
  try {
    writeHandoff(input.handoffPath, targets.map((target, index) => ({ email: target.email, password: passwords[index] })));
    const writeDb = new DatabaseSync(input.dbPath);
    try {
      writeDb.exec("BEGIN IMMEDIATE");
      try {
        const update = writeDb.prepare('UPDATE "users" SET "passwordHash"=?,"mustResetPwd"=1,"tokenVersion"="tokenVersion"+1,"updatedAt"=? WHERE "id"=? AND "isActive"=1');
        const now = Date.now();
        targets.forEach((target, index) => {
          if (update.run(hashes[index], now, target.userId).changes !== 1) throw new Error("Team Access password recovery update failed");
        });
        writeDb.exec("COMMIT");
      } catch (error) { writeDb.exec("ROLLBACK"); throw error; }
    } finally { writeDb.close(); }
    return { reissued: targets.length, passwordHandoff: input.handoffPath };
  } catch (error) {
    fs.copyFileSync(backup.path, input.dbPath);
    fs.rmSync(input.handoffPath, { force: true });
    throw error;
  }
}




/** Aggregate-only read-only diagnostic. It never returns identities, row numbers or passwords. */
export function preflightSqliteTeamAccess(dbPath: string, rows: readonly TeamAccessRow[]): { readonly roleGroupCodeViolations: number; readonly exactPlaceholderMismatches: number } {
  const supported = rows.filter((row) => row.role !== "unassigned") as (TeamAccessRow & { role: SupportedRole })[];
  // Muawin never receives a group; a teaching Park Lead legitimately carries one.
  const roleGroupCodeViolations = supported.filter((row) => row.role === "muawin" && row.groupNumber !== null).length;
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const candidates = existingStaff(db);
    const exactPlaceholderMismatches = supported.filter((row) => candidates.filter((candidate) => normalize(candidate.name) === normalize(row.name) && normalize(candidate.parkName ?? "") === normalize(row.park) && !candidate.userActive && !candidate.staffActive).length !== 1).length;
    return { roleGroupCodeViolations, exactPlaceholderMismatches };
  } finally { db.close(); }
}
