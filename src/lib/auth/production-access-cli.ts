/**
 * CLI contract for the guarded ATT01 PostgreSQL Team Access provisioning tool.
 *
 * Argument parsing, the execution gates, the handoff-recipient check and the safe
 * diagnostics live here so the thin `scripts/` entry point cannot drift from the
 * rules and so the rules are testable without a database or a real handoff.
 *
 * The connection is supplied only through `ATT01_POSTGRES_URL`; the approved
 * roster path, the handoff destination and the handoff recipient are explicit
 * operator inputs. None of them is ever hardcoded, printed or written to a file.
 */
import { resolveOptionalPostgresUrl } from "../attendance/lahore-refresh/postgres-cli";
import { AccessRefusedError } from "./production-access";
import type { ProvisioningTargetDiagnostics } from "./production-access-postgres";

/** The exact acknowledgement required to write. */
export const POSTGRES_ACCESS_CONFIRMATION = "CONFIRM-ATT01-POSTGRES-ACCESS";

const BOOLEAN_FLAGS = new Set(["--execute", "--confirm-att01-postgres-access", "--json"]);
const VALUE_FLAGS = new Set(["--roster", "--target", "--handoff", "--handoff-recipient", "--reason"]);

const REASON_MAX_LENGTH = 200;

export interface PostgresAccessArgs {
  readonly roster: string;
  readonly target: "postgres" | null;
  readonly execute: boolean;
  readonly confirmed: boolean;
  readonly handoffPath: string | null;
  readonly handoffRecipient: string | null;
  readonly reason: string | null;
  readonly json: boolean;
}

export function parsePostgresAccessArgs(argv: readonly string[]): PostgresAccessArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (BOOLEAN_FLAGS.has(argument)) {
      flags.add(argument);
      continue;
    }
    if (VALUE_FLAGS.has(argument)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new AccessRefusedError(`Missing value for ${argument}`);
      if (values.has(argument)) throw new AccessRefusedError(`Repeated argument: ${argument}`);
      values.set(argument, value);
      index += 1;
      continue;
    }
    throw new AccessRefusedError(`Unexpected argument: ${argument}`);
  }

  const roster = values.get("--roster");
  if (!roster) {
    throw new AccessRefusedError(
      "Usage: --roster <approved-roster.csv> [--json] | --roster <approved-roster.csv> --target postgres --execute --confirm-att01-postgres-access --handoff <file> --handoff-recipient <windows-user> --reason <approval-ref>"
    );
  }

  const target = values.get("--target") ?? null;
  if (target !== null && target !== "postgres") {
    throw new AccessRefusedError("--target must be exactly 'postgres' for the ATT01 PostgreSQL provisioning");
  }

  const execute = flags.has("--execute");
  const confirmed = flags.has("--confirm-att01-postgres-access");
  const handoffPath = values.get("--handoff") ?? null;
  const handoffRecipient = values.get("--handoff-recipient") ?? null;
  const reason = values.get("--reason")?.trim() ?? null;

  if (!execute && (confirmed || target !== null || handoffPath || handoffRecipient || reason)) {
    throw new AccessRefusedError("A dry run accepts no target, confirmation, handoff or reason input");
  }

  return { roster, target, execute, confirmed, handoffPath, handoffRecipient, reason, json: flags.has("--json") };
}

/**
 * The write gate. Every condition must hold: explicit `--execute`, the exact
 * acknowledgement, an explicit postgres target, and explicit handoff
 * destination, recipient and owner approval reference.
 */
export function assertPostgresAccessAuthorized(args: PostgresAccessArgs): void {
  if (!args.execute) return;
  if (args.target !== "postgres") throw new AccessRefusedError("Refusing to write without an explicit --target postgres");
  if (!args.confirmed) throw new AccessRefusedError("Refusing to write without --confirm-att01-postgres-access");
  if (!args.handoffPath) throw new AccessRefusedError("Refusing to write without an explicit --handoff destination");
  if (!args.handoffRecipient) throw new AccessRefusedError("Refusing to write without an explicit --handoff-recipient");
  if (!args.reason) throw new AccessRefusedError("Refusing to write without an owner approval --reason");
  if (args.reason.length > REASON_MAX_LENGTH || /[\u0000-\u001f\u007f]/.test(args.reason)) {
    throw new AccessRefusedError("--reason must be a short printable approval reference");
  }
}

/** The Windows account DPAPI will actually let decrypt the handoff. */
export function currentHandoffIdentity(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const user = (env.USERNAME ?? env.USER ?? "").trim();
  return user ? user.toLowerCase() : null;
}

/**
 * The handoff is protected with `DataProtectionScope::CurrentUser`, so a recipient
 * that is not the operator's own account can never decrypt it. That mismatch is
 * refused before any password is generated.
 */
export function assertHandoffRecipient(recipient: string, env: Readonly<Record<string, string | undefined>> = process.env): void {
  const current = currentHandoffIdentity(env);
  if (!current) throw new AccessRefusedError("handoff_recipient_unresolvable");
  const normalized = recipient.trim().toLowerCase();
  if (!normalized) throw new AccessRefusedError("handoff_recipient_unresolvable");
  const [domain, user] = normalized.includes("\\") ? normalized.split("\\") : ["", normalized];
  if (user !== current) throw new AccessRefusedError("handoff_recipient_mismatch");
  const currentDomain = (env.USERDOMAIN ?? "").trim().toLowerCase();
  if (domain && domain !== currentDomain) throw new AccessRefusedError("handoff_recipient_mismatch");
}

/** Resolves the runtime connection, or refuses when none was supplied. */
export function resolveAccessConnectionUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const url = resolveOptionalPostgresUrl(env);
  if (!url) throw new AccessRefusedError("Provide the target connection through ATT01_POSTGRES_URL; no other source is read");
  return url;
}

/** Aggregate-only, non-secret projection of the provisioning target diagnostics. */
export function summarizeProvisioningTarget(diagnostics: ProvisioningTargetDiagnostics) {
  return {
    provider: diagnostics.provider,
    serverMajor: diagnostics.serverMajor,
    ledgerApplied: diagnostics.ledgerApplied,
    cities: diagnostics.cities,
    aggregates: diagnostics.aggregates,
    importTotalsMatch: diagnostics.importTotalsMatch,
    schemaBlockers: diagnostics.schemaBlockers,
    blockers: diagnostics.blockers,
  };
}
