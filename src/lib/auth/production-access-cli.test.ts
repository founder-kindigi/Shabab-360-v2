import { describe, expect, it } from "vitest";
import { POSTGRES_URL_ENV } from "../attendance/lahore-refresh/postgres-port";
import { AccessRefusedError } from "./production-access";
import {
  POSTGRES_ACCESS_CONFIRMATION,
  assertHandoffRecipient,
  assertPostgresAccessAuthorized,
  currentHandoffIdentity,
  parsePostgresAccessArgs,
  resolveAccessConnectionUrl,
  summarizeProvisioningTarget,
} from "./production-access-cli";

const roster = ["--roster", "/outside/approved-roster.csv"];
const writeFlags = [
  "--target",
  "postgres",
  "--execute",
  "--confirm-att01-postgres-access",
  "--handoff",
  "/outside/handoff.bin",
  "--handoff-recipient",
  "operator",
  "--reason",
  "owner-approval-2026-09-23",
];

function parse(extra: readonly string[]) {
  return parsePostgresAccessArgs([...roster, ...extra]);
}

describe("ATT01 PostgreSQL access argument guard", () => {
  it("defaults to a dry run that accepts only the roster", () => {
    const args = parse([]);
    expect(args.execute).toBe(false);
    expect(args.target).toBeNull();
    expect(args.confirmed).toBe(false);
    expect(args.handoffPath).toBeNull();
    expect(() => assertPostgresAccessAuthorized(args)).not.toThrow();
  });

  it("requires a roster and rejects unknown, repeated and value-less arguments", () => {
    expect(() => parsePostgresAccessArgs([])).toThrow(new RegExp("--roster"));
    expect(() => parse(["extra"])).toThrow(/Unexpected argument/);
    expect(() => parsePostgresAccessArgs([...roster, "--target"])).toThrow(/Missing value/);
    expect(() => parse(["--target", "postgres", "--target", "postgres"])).toThrow(/Repeated argument/);
  });

  it("refuses target, confirmation, handoff and reason outside --execute", () => {
    expect(() => parse(["--target", "postgres"])).toThrow(/dry run/);
    expect(() => parse(["--confirm-att01-postgres-access"])).toThrow(/dry run/);
    expect(() => parse(["--handoff", "/outside/handoff.bin"])).toThrow(/dry run/);
    expect(() => parse(["--reason", "ref"])).toThrow(/dry run/);
  });

  it("requires an explicit postgres target", () => {
    expect(() => parse(["--target", "sqlite"])).toThrow(/exactly 'postgres'/);
    const args = parse(["--execute", "--confirm-att01-postgres-access"]);
    expect(() => assertPostgresAccessAuthorized(args)).toThrow(/--target postgres/);
  });

  it("requires the exact acknowledgement before any write", () => {
    expect(() =>
      assertPostgresAccessAuthorized(parse(["--target", "postgres", "--execute", "--handoff", "/outside/h.bin", "--handoff-recipient", "operator", "--reason", "ref"]))
    ).toThrow(/--confirm-att01-postgres-access/);
    expect(POSTGRES_ACCESS_CONFIRMATION).toBe("CONFIRM-ATT01-POSTGRES-ACCESS");
  });

  it("requires an explicit handoff destination, recipient and approval reason", () => {
    const base = ["--target", "postgres", "--execute", "--confirm-att01-postgres-access"];
    expect(() => assertPostgresAccessAuthorized(parse(base))).toThrow(/--handoff destination/);
    expect(() => assertPostgresAccessAuthorized(parse([...base, "--handoff", "/outside/h.bin"]))).toThrow(/--handoff-recipient/);
    expect(() =>
      assertPostgresAccessAuthorized(parse([...base, "--handoff", "/outside/h.bin", "--handoff-recipient", "operator"]))
    ).toThrow(/--reason/);
    expect(() => assertPostgresAccessAuthorized(parse(writeFlags))).not.toThrow();
  });

  it("refuses an over-long or non-printable approval reason", () => {
    const withReason = (reason: string) =>
      parse(["--target", "postgres", "--execute", "--confirm-att01-postgres-access", "--handoff", "/outside/h.bin", "--handoff-recipient", "operator", "--reason", reason]);
    expect(() => assertPostgresAccessAuthorized(withReason("x".repeat(201)))).toThrow(/printable approval reference/);
    expect(() => assertPostgresAccessAuthorized(withReason("bad\u0007ref"))).toThrow(/printable approval reference/);
  });
});

describe("handoff recipient (DPAPI CurrentUser)", () => {
  const env = { USERNAME: "operator", USERDOMAIN: "SHABAB" } as Record<string, string | undefined>;

  it("resolves the current identity, tolerating the USER fallback", () => {
    expect(currentHandoffIdentity(env)).toBe("operator");
    expect(currentHandoffIdentity({ USER: "ubuntu" })).toBe("ubuntu");
    expect(currentHandoffIdentity({})).toBeNull();
  });

  it("accepts the operator's own account, with or without a matching domain", () => {
    expect(() => assertHandoffRecipient("operator", env)).not.toThrow();
    expect(() => assertHandoffRecipient("OPERATOR", env)).not.toThrow();
    expect(() => assertHandoffRecipient("SHABAB\\operator", env)).not.toThrow();
    expect(() => assertHandoffRecipient("shabab\\OPERATOR", env)).not.toThrow();
  });

  it("refuses a different account, a foreign domain, or an unresolvable identity", () => {
    expect(() => assertHandoffRecipient("someone-else", env)).toThrow(/handoff_recipient_mismatch/);
    expect(() => assertHandoffRecipient("OTHER\\operator", env)).toThrow(/handoff_recipient_mismatch/);
    expect(() => assertHandoffRecipient("   ", env)).toThrow(/handoff_recipient_unresolvable/);
    expect(() => assertHandoffRecipient("operator", {})).toThrow(/handoff_recipient_unresolvable/);
  });
});

describe("access connection contract", () => {
  it("accepts only a direct postgres connection from the documented variable", () => {
    expect(resolveAccessConnectionUrl({ [POSTGRES_URL_ENV]: "postgresql://u@127.0.0.1:5432/db" })).toContain("127.0.0.1");
    expect(() => resolveAccessConnectionUrl({})).toThrow(/ATT01_POSTGRES_URL/);
    expect(() => resolveAccessConnectionUrl({ [POSTGRES_URL_ENV]: "mysql://u@host/db" })).toThrow(/postgres:\/\//);
    expect(() =>
      resolveAccessConnectionUrl({ [POSTGRES_URL_ENV]: "postgresql://u:p@aws-0-eu.pooler.supabase.com:5432/postgres" })
    ).toThrow(/pooled connection/);
  });

  it("produces an aggregate-only target summary with no connection detail", () => {
    const summary = summarizeProvisioningTarget({
      provider: "postgresql",
      serverMajor: 18,
      ledgerApplied: 32,
      schemaBlockers: [],
      cities: 1,
      aggregates: { parks: 6, groups: 18, participants: 339, attendanceEvents: 460, attendanceRecords: 6210, calendarDates: 74 },
      importTotalsMatch: true,
      blockers: [],
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("@");
    expect(summary.importTotalsMatch).toBe(true);
    expect(summary.ledgerApplied).toBe(32);
  });

  it("uses a refusal error type for every gate", () => {
    expect(() => resolveAccessConnectionUrl({})).toThrow(AccessRefusedError);
  });
});
