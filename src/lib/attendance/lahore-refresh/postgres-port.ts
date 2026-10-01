/**
 * Guarded PostgreSQL query port for the ATT01 data tools.
 *
 * The whole PostgreSQL path depends on this narrow interface rather than a
 * provider model client, so the import and reconciliation logic is SQL-only and
 * testable, and the concrete driver stays a thin, reviewable binding.
 *
 * The connection string is supplied by the authorised operator at run time
 * through the `ATT01_POSTGRES_URL` environment variable only. It is never read
 * from `.env`, never hardcoded, never written to a file and never printed: every
 * exported diagnostic string is passed through {@link sanitizeDiagnostic} first.
 */
import { Pool, type PoolClient } from "pg";

/** A deliberate refusal. The message never echoes a connection string or credential. */
export class PostgresRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostgresRefusedError";
  }
}

export type PostgresRow = Record<string, unknown>;

/** The query surface the import and reconciliation tools depend on. */
export interface PostgresQueryPort {
  query<T = PostgresRow>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  execute(sql: string, params?: readonly unknown[]): Promise<number>;
  transaction<T>(run: (tx: PostgresQueryPort) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** The single documented runtime input for a PostgreSQL target. */
export const POSTGRES_URL_ENV = "ATT01_POSTGRES_URL";

/** The one staging pooler target that must never be reused or generalised. */
const POOLER_HOST_SUFFIX = "pooler.supabase.com";

const CONNECTION_URL_PATTERN = /postgres(ql)?:\/\/[^\s'"]+/gi;
const PASSWORD_PATTERN = /password=([^\s&'"]+)/gi;

/** Removes anything credential-shaped from a message before it is shown or logged. */
export function sanitizeDiagnostic(text: string): string {
  return text
    .replace(CONNECTION_URL_PATTERN, "postgresql://***")
    .replace(PASSWORD_PATTERN, "password=***")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates the operator-supplied connection string without revealing it. Only a
 * direct PostgreSQL target is accepted: a pooled host is refused so the staging
 * pooler cannot be reached by accident.
 */
export function resolvePostgresConnectionUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) {
    throw new PostgresRefusedError(`Provide the target connection through ${POSTGRES_URL_ENV}; no other source is read`);
  }
  if (!/^postgres(ql)?:\/\//i.test(value)) {
    throw new PostgresRefusedError(`${POSTGRES_URL_ENV} must be a postgres:// or postgresql:// connection string`);
  }
  let hostname: string;
  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    throw new PostgresRefusedError(`${POSTGRES_URL_ENV} is not a parseable connection string`);
  }
  if (hostname === POOLER_HOST_SUFFIX || hostname.endsWith(`.${POOLER_HOST_SUFFIX}`)) {
    throw new PostgresRefusedError("Refusing a pooled connection: supply a direct PostgreSQL connection for an ATT01 import");
  }
  return value;
}

class PgQueryPort implements PostgresQueryPort {
  private readonly pool: Pool;
  private readonly client: PoolClient | null;

  constructor(pool: Pool, client: PoolClient | null) {
    this.pool = pool;
    this.client = client;
  }

  private runner(): Pool | PoolClient {
    return this.client ?? this.pool;
  }

  async query<T = PostgresRow>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const result = await this.runner().query(sql, params as unknown[]);
    return result.rows as T[];
  }

  async execute(sql: string, params: readonly unknown[] = []): Promise<number> {
    const result = await this.runner().query(sql, params as unknown[]);
    return result.rowCount ?? 0;
  }

  async transaction<T>(run: (tx: PostgresQueryPort) => Promise<T>): Promise<T> {
    // An already-transactional port joins the open transaction instead of nesting.
    if (this.client) return run(this);
    const client = await this.pool.connect();
    const tx = new PgQueryPort(this.pool, client);
    try {
      await client.query("BEGIN");
      const result = await run(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // The original failure is the one that matters; surface it below.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.client) return;
    await this.pool.end();
  }
}

/** Opens a connection pool for one run. The caller owns authorisation and close. */
export function createPgQueryPort(connectionString: string): PostgresQueryPort {
  const pool = new Pool({ connectionString, max: 4, application_name: "att01-postgres-tool" });
  // A dropped idle client must not crash the CLI; the failing statement still errors.
  pool.on("error", () => {});
  return new PgQueryPort(pool, null);
}
