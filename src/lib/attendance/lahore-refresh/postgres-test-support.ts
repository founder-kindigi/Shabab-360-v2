/**
 * Shared disposable PostgreSQL harness for the ATT01 integration tests.
 *
 * It is test-only infrastructure: every suite runs only when
 * `ATT01_TEST_POSTGRES_URL` points at a throwaway local server, each test clones a
 * prepared template database, and the harness drops everything it created. No
 * production, staging or external database is ever reachable from here.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createPgQueryPort, type PostgresQueryPort } from "./postgres-port";

export const POSTGRES_TEST_URL_ENV = "ATT01_TEST_POSTGRES_URL";

/** The throwaway admin connection, or an empty string when tests should skip. */
export function disposableAdminUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  return (env[POSTGRES_TEST_URL_ENV] ?? "").trim();
}

export function urlForDatabase(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/** Runs `run` against a fresh pool and always closes it. */
export async function withPort<T>(url: string, run: (port: PostgresQueryPort) => Promise<T>): Promise<T> {
  const port = createPgQueryPort(url);
  try {
    return await run(port);
  } finally {
    await port.close();
  }
}

/** Applies the committed PostgreSQL migration chain to a disposable database. */
export function applyMigrations(databaseUrl: string): void {
  try {
    execFileSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", "prisma/postgres/schema.prisma"],
      { env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl }, stdio: "pipe" }
    );
  } catch (error) {
    const detail = error instanceof Error && "stderr" in error ? String((error as { stderr?: unknown }).stderr) : "";
    throw new Error(`prisma migrate deploy failed against the disposable database: ${detail.slice(0, 400)}`);
  }
}

export interface DisposablePostgresHarness {
  readonly adminUrl: string;
  /** Clones the prepared template into a new database and returns its URL. */
  createDatabase(): Promise<string>;
  /** Drops every database this harness created, including the template. */
  destroy(): Promise<void>;
}

/**
 * Creates a template database, runs `prepare` against it once, and hands back a
 * factory that clones it per test. `prepare` typically migrates, and may also seed
 * the dataset the suite needs.
 */
export async function createDisposablePostgresHarness(options: {
  readonly label: string;
  readonly prepare: (databaseUrl: string) => Promise<void>;
}): Promise<DisposablePostgresHarness> {
  const adminUrl = disposableAdminUrl();
  const template = `att01_${options.label}_tpl_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const created: string[] = [];

  await withPort(adminUrl, (port) => port.execute(`CREATE DATABASE "${template}"`));
  await options.prepare(urlForDatabase(adminUrl, template));

  return {
    adminUrl,
    async createDatabase() {
      const database = `att01_${options.label}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await withPort(adminUrl, (port) => port.execute(`CREATE DATABASE "${database}" TEMPLATE "${template}"`));
      created.push(database);
      return urlForDatabase(adminUrl, database);
    },
    async destroy() {
      await withPort(adminUrl, async (port) => {
        for (const database of [...created, template]) {
          await port.execute(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
        }
      });
    },
  };
}
