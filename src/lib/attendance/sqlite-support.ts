/**
 * Shared SQLite file primitives for the local data tools.
 *
 * These are the safety-critical pieces the guarded refresh and the attendance
 * schema reconciliation both depend on: a single file-level backup
 * implementation, its verification, its restore, and read-only catalog helpers.
 * Keeping one implementation avoids divergent backup behaviour between tools.
 *
 * Nothing here reads `.env`, credentials or row values, and no function in this
 * module writes to a database file other than through the explicit restore call.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";

/** A local SQLite file plus the directory that receives its backups. */
export interface SqliteFileTarget {
  readonly path: string;
  readonly backupDir: string;
}

export interface SqliteFileArtifact {
  readonly kind: "sqlite-file-copy";
  readonly path: string;
  readonly bytes: number;
}

export function openSqliteDatabase(filePath: string, readOnly = false): DatabaseSync {
  return new DatabaseSync(filePath, { readOnly });
}

/** Reads a single `COUNT(*) AS count` value. */
export function sqliteScalar(db: DatabaseSync, sql: string, ...params: (string | number | null)[]): number {
  const row = db.prepare(sql).get(...params) as { count?: number } | undefined;
  return typeof row?.count === "number" ? row.count : 0;
}

/** Real table names present in the database, excluding SQLite internals. */
export function listSqliteTables(db: DatabaseSync): string[] {
  return (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map(
    (row) => row.name
  );
}

/** Full file-level SQLite backup using node:sqlite's online backup primitive. */
export async function createSqliteFileBackup(target: SqliteFileTarget, label: string): Promise<SqliteFileArtifact> {
  fs.mkdirSync(target.backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(target.backupDir, `${label}-${stamp}.db`);
  const db = openSqliteDatabase(target.path);
  try {
    await sqliteBackup(db, backupPath);
  } finally {
    db.close();
  }
  const bytes = fs.statSync(backupPath).size;
  if (bytes === 0) throw new Error("SQLite backup is empty");
  return { kind: "sqlite-file-copy", path: backupPath, bytes };
}

/** A backup is only usable if it is non-empty, opens and passes integrity_check. */
export async function verifySqliteBackupFile(artifact: { readonly path: string }): Promise<void> {
  if (fs.statSync(artifact.path).size === 0) throw new Error("SQLite backup is empty");
  const db = openSqliteDatabase(artifact.path, true);
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string } | undefined;
    if (integrity?.integrity_check !== "ok") throw new Error("SQLite backup integrity check failed");
  } finally {
    db.close();
  }
}

/** Copies a verified backup over the target file. The caller owns authorization. */
export function restoreSqliteFileBackup(artifact: { readonly path: string }, target: { readonly path: string }): void {
  fs.copyFileSync(artifact.path, target.path);
}

/** `PRAGMA foreign_key_check` rows; empty means referential integrity holds. */
export function sqliteForeignKeyViolations(db: DatabaseSync): number {
  return db.prepare("PRAGMA foreign_key_check").all().length;
}

/** Opens the file read-only and counts `PRAGMA foreign_key_check` rows. */
export function countForeignKeyViolations(databasePath: string): number {
  const db = openSqliteDatabase(databasePath, true);
  try {
    return sqliteForeignKeyViolations(db);
  } finally {
    db.close();
  }
}
