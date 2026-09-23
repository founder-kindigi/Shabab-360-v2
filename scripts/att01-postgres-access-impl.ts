/**
 * Guarded ATT01 PostgreSQL Team Access provisioning implementation.
 *
 * Dry run is the default and performs zero writes: it reads the approved roster,
 * resolves scope against the target and reports the plan. A write run requires
 * `--execute`, the exact acknowledgement, an explicit postgres target and
 * explicit handoff destination, recipient and owner approval reference.
 *
 * Before any password is generated, the target is verified to be the approved
 * ATT01 dataset carrying the committed migration ledger, and the handoff
 * recipient is verified to be the operator's own Windows account (DPAPI
 * `CurrentUser`). The protected handoff is written before the first activation,
 * and every user/staff/audit write happens in one transaction.
 */
import { readExpectedPostgresMigrations } from "../src/lib/attendance/lahore-refresh/postgres-cli";
import { POSTGRES_URL_ENV, createPgQueryPort } from "../src/lib/attendance/lahore-refresh/postgres-port";
import {
  assertHandoffRecipient,
  assertPostgresAccessAuthorized,
  parsePostgresAccessArgs,
  resolveAccessConnectionUrl,
  summarizeProvisioningTarget,
} from "../src/lib/auth/production-access-cli";
import {
  assertProvisioningTargetReady,
  inspectProvisioningTarget,
  planPostgresAccess,
  provisionPostgresAccess,
} from "../src/lib/auth/production-access-postgres";
import { readAccessRoster } from "../src/lib/auth/production-access-roster";

const HELP = `ATT01 PostgreSQL Team Access provisioning (dry run by default)

  --roster <approved-roster.csv>   required private approved roster (never in the repo)
  --json                           accepted for symmetry; output is JSON either way

  (dry run)                        reads the roster, resolves scope against the target
                                   and prints the plan and refusal codes. Zero writes.

  --execute                        enable writes (default: dry run)
  --target postgres                required explicit target for writes
  --confirm-att01-postgres-access  required acknowledgement for writes
  --handoff <file>                 required protected handoff destination
  --handoff-recipient <user>       required; must be the operator's own Windows account
  --reason <approval-ref>          required owner approval reference recorded in audit

Connection: set ${POSTGRES_URL_ENV} in the environment at run time. It is never read
from .env, never printed and never written to a file. No password is ever printed:
the one-time credentials are only readable by decrypting the DPAPI handoff on the
intended Windows account.`;

export async function runAtt01PostgresAccessCli(argv: readonly string[]): Promise<void> {
  if (argv.includes("--help")) {
    console.log(HELP);
    return;
  }
  const args = parsePostgresAccessArgs(argv);
  assertPostgresAccessAuthorized(args);

  const entries = readAccessRoster(args.roster);
  const url = resolveAccessConnectionUrl();
  const port = createPgQueryPort(url);

  try {
    const diagnostics = await inspectProvisioningTarget(port, readExpectedPostgresMigrations());
    const target = summarizeProvisioningTarget(diagnostics);

    if (!args.execute) {
      const { plan, summary } = await planPostgresAccess(port, entries);
      console.log(JSON.stringify({ mode: "dry-run", writesPerformed: false, target, plan: summary }, null, 2));
      if (diagnostics.blockers.length > 0 || plan.refusals.length > 0) process.exitCode = 1;
      return;
    }

    // Target and data guards, then the handoff recipient, all before any password exists.
    assertProvisioningTargetReady(diagnostics);
    if (!args.handoffPath || !args.handoffRecipient || !args.reason) {
      throw new Error("Refusing to write without an explicit handoff, recipient and approval reason");
    }
    assertHandoffRecipient(args.handoffRecipient);

    const result = await provisionPostgresAccess({
      port,
      entries,
      handoffPath: args.handoffPath,
      reason: args.reason,
    });
    console.log(JSON.stringify({ ...result, target }, null, 2));
  } finally {
    await port.close();
  }
}
