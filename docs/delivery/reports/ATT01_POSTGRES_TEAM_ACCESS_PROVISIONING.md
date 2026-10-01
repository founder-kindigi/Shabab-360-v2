# ATT01 PostgreSQL Team Access provisioning

Date: 2026-09-23. Task: build and verify the separate PostgreSQL production Team
Access provisioning writer for ATT01.

Status: **implemented and validated against a disposable local PostgreSQL 18
database.** Production, staging, Supabase and every external database were **not**
contacted, no real account was created, and the tool was **not** run against a live
target.

This report does not authorize a production bootstrap. It documents the tool, its
gates, the disposable evidence, and what the operator must do afterwards.

## 1. What this closes

`ATT01_POSTGRES_IMPORT_AND_RECONCILIATION.md` seeded the approved dataset but
deliberately created no user, staff, password or access scope.
`ATT01_PRODUCTION_TEAM_ACCESS_DESIGN.md` specified the contract but left the write
path unwired. This change supplies the PostgreSQL writer, CLI and audit emission for
that contract. Account provisioning is now implemented end to end; the live
bootstrap remains gated by owner authorization (runbook Gate A) and a verified
backup (Gate B).

## 2. Files

New:

| File | Purpose |
| --- | --- |
| `src/lib/auth/production-access-roster.ts` | Private approved roster reader: bounded, allow-listed, no-echo refusals |
| `src/lib/auth/production-access-postgres.ts` | Lookup adapter, target/import-total guard, transactional writer, audit, assistance linking |
| `src/lib/auth/production-access-cli.ts` | Argument parsing, execution gates, handoff-recipient check, safe diagnostics |
| `scripts/att01-postgres-access.ts` + `-impl.ts` | Provisioning CLI |
| `src/lib/auth/production-access-roster.test.ts` | Roster parsing and file-boundary tests |
| `src/lib/auth/production-access-cli.test.ts` | Gate, recipient and connection-contract tests |
| `src/lib/auth/production-access-postgres.test.ts` | Disposable-PostgreSQL integration tests |
| `src/lib/attendance/lahore-refresh/postgres-test-support.ts` | Shared disposable-PostgreSQL harness for both integration suites |

Modified:

- `src/lib/attendance/lahore-refresh/postgres-import.test.ts` — now uses the shared harness; assertions unchanged.
- `package.json` — adds the `att01:postgres:access` script.

`src/lib/auth/production-access.ts` is **unchanged**: all role, scope, refusal and
idempotency policy still comes from `buildAccessPlan`, and handoff-before-activation
ordering still comes from `applyAccessPlan`. No Prisma schema or migration changed.

## 3. Tool commands

Placeholders only. The connection comes from the environment, never from a file.

```bash
# dry run (default): reads the roster, resolves scope against the target and prints
# the plan, refusal codes and target validation. Zero writes.
npm run att01:postgres:access -- --roster <approved-roster.csv>

# write (every gate is required)
node scripts/att01-postgres-access.ts --roster <approved-roster.csv> \
  --target postgres --execute \
  --confirm-att01-postgres-access \
  --handoff <handoff-<stamp>.bin> \
  --handoff-recipient <operator-windows-user> \
  --reason <owner-approval-reference>
```

## 4. Runtime input contract

| Input | How it is supplied | Rules |
| --- | --- | --- |
| Connection | `ATT01_POSTGRES_URL` environment variable | Never read from `.env`, never hardcoded, never printed, never written to a file. Only a direct `postgres://`/`postgresql://` target — a `*.pooler.supabase.com` pooled host is refused |
| Roster | `--roster <path>` | Private, approved, supplied at run time; refused if the resolved path is inside the repository; ≤ 1 MiB, ≤ 500 rows, allow-listed header, ≤ 200 characters per field |
| Handoff file | `--handoff <path>` | Explicit operator destination; written mode `0600` |
| Handoff recipient | `--handoff-recipient <user>` | Must be the operator's own Windows account, because DPAPI uses `DataProtectionScope::CurrentUser`. A mismatch, a foreign domain, or an unresolvable identity is refused before any password is generated |
| Approval reference | `--reason <ref>` | Required for a write; ≤ 200 printable characters; recorded on every audit row |

The handoff is produced and consumed by the intended operator account. It must be
decrypted on that machine; a file encrypted for a different Windows user is
undecryptable by design.

### Roster format

CSV, header required. Columns: `ref, email, role, city, park, group, assists_ref,
name`. Only `ref`, `email` and `role` are required; `name` is an optional display
value. `city`, `park` and `group` are the scope references; `assists_ref` is the
`ref` of the same-park Murabbi (or teaching Park Lead) a Muawin assists. A UTF-8 BOM
is tolerated. Roles accept the internal name or the product label.

## 5. Safety gates

**Dry run is the default.** It performs zero writes and exits non-zero when the
target has blockers or the plan has refusals.

**Execution requires all of:** `--execute`, the exact acknowledgement
`CONFIRM-ATT01-POSTGRES-ACCESS`, `--target postgres`, `--handoff`,
`--handoff-recipient` and `--reason`.

**Target and data guards, before any password exists:**

- PostgreSQL only; pooled and non-PostgreSQL endpoints refused.
- The committed 32-migration ledger must be present and exactly match.
- The required Team Access tables, foreign keys and unique indexes must exist.
- The approved ATT01 import totals must be present (6 parks, 18 groups, 339
  participants, 460 events, 6,210 records, 74 dates, one city), so an unknown,
  unrelated or un-imported target is refused with `import_totals_mismatch`.

**Account rules:**

- An existing account is reused only when the shared plan finds the exact same role
  and scope **and** the account is active; otherwise it is refused
  (`existing_account_conflict` / `existing_account_inactive`). Nothing is silently
  re-roled or re-scoped.
- A duplicate account record is reported as a conflict, never guessed at.
- A plan containing any refusal is not applied at all.

**Password and activation safety:**

- Passwords are generated in memory only (24 random bytes, base64url) and stored as
  bcrypt cost 12. No plaintext is logged, returned, stored, audited or included in
  any test snapshot.
- The DPAPI handoff is written **before** the first activation. A handoff failure
  returns `handoff_failed_no_writes` and produces zero user, staff and audit writes.
- A failed run removes even a partially written handoff file.

**Transaction and audit:**

- User, staff and audit writes plus the Muawin assistance links run in **one**
  transaction. Any database failure rolls the whole batch back and returns
  `provisioning_failed_and_rolled_back`; no driver message is surfaced, because a
  PostgreSQL unique-violation detail can echo a key value.
- Each activated account emits one `audit_log` row: `action = access_provision`,
  `entityType = user`, `entityId = <userId>`, `reason = <approval reference>` and a
  `newValues` payload of scope ids and booleans only — no email, name, phone or
  credential. `operation_receipts` is not used: it is for idempotent attendance
  writes, not provisioning.

## 6. Role and scope rules

| Product label | Role | Required scope | Group | Denied when |
| --- | --- | --- | --- | --- |
| Program Head | `program_admin` | organisation | n/a | never for scope |
| City Head | `city_head` | pinned active `assignedCityId` | never | city missing, unknown or inactive |
| Park Lead | `park_lead` | active park in the approved city | optional (teaching) | park missing, unknown or inactive; group not in that park |
| Park Admin | `park_admin` | active park in the approved city | never | park missing or inactive; any group supplied |
| Murabbi | `murabbi` | active park | optional | park missing; group not in that park. Without a group the account is active but group/attendance data stays denied |
| Muawin | `muawin` | active park | **never** | any group supplied; assistance target not an active same-park Murabbi (or teaching Park Lead); self-assistance |
| Shabab | `student` | own participant record | n/a | refused by this path (`non_staff_role`) |
| Guardian | `guardian` | own children | n/a | refused by this path (`non_staff_role`) |
| — | `super_admin` | — | — | always refused (`system_owner_role`) |

Shabab and Guardian are **not** fabricated as staff accounts. Their approved account
contract is created from participant and guardian records, which this path does not
own; it fails closed with `non_staff_role` rather than inventing an account. If an
approved staff-style Shabab/Guardian input is later required, that is a separate
contract decision affecting the shared plan, not something this writer may assume.

Refusal codes are returned as aggregates (`plan_refused:<codes>`), never with
identities.

## 7. Disposable PostgreSQL validation

Engine: the `postgres:18` image (PostgreSQL 18.6), a temporary container bound to
`127.0.0.1`, removed after the run. No external service was contacted. Each test
cloned a template holding the committed 32-migration chain plus the approved ATT01
import.

| Suite | Command | Files | Tests | Exit |
| --- | --- | ---: | ---: | ---: |
| Production access (roster, CLI, plan, PostgreSQL integration) | `npx vitest run src/lib/auth/production-access-roster.test.ts src/lib/auth/production-access-cli.test.ts src/lib/auth/production-access.test.ts src/lib/auth/production-access-postgres.test.ts` | 4 | 51 | 0 |
| Auth, including the provisioning integration suite | `npx vitest run src/lib/auth --no-file-parallelism` | 16 | 167 | 0 |
| Lahore refresh: import + reconciliation incl. PostgreSQL integration | `npx vitest run src/lib/attendance/lahore-refresh --no-file-parallelism` | 13 | 80 | 0 |
| Migration verification + release parity | `npx vitest run src/lib/migrations src/__tests__/release` | 9 | 214 | 0 |
| Scoped ESLint | `npx eslint <changed files>` | — | 0 errors | 0 |
| Typecheck | `npx tsc --noEmit` | — | clean | 0 |

`--no-file-parallelism` is used for the long integration suites: with many files in
parallel the vitest worker can exceed its progress-report timeout on this machine and
the run exits non-zero even though every test passed. Sequentially the same suites
report a clean exit.

The integration suite covers, on a real disposable database: the approved import
totals and committed ledger are required; a wrong ledger and wrong import totals are
refused; the dry run writes nothing; a full roster (City Head, Park Lead, Murabbi,
Muawin) is provisioned with correct roles, scopes, assistance link and audit rows;
every stored hash is bcrypt and matches no generated plaintext; a handoff failure
produces zero writes; a mid-batch database failure rolls back and removes the
handoff; City Head without a city and with an unknown city are denied; a group not in
the assigned park, a Muawin group and cross-park assistance are denied;
`System Owner`, `Shabab` and `Guardian` inputs fail closed without writes; an exact
rerun is `already-configured` with no handoff; an inactive match is refused; a
conflicting rerun is refused; and no output carries a connection string, email,
password or handoff content.

### 7.1 Live CLI smoke evidence (disposable database)

Run against a throwaway database holding the approved import:

| Step | Result |
| --- | --- |
| Dry run | exit 0; target `provider=postgresql`, `ledgerApplied=32`, `cities=1`, import totals `6/18/339/460/6210/74`, `blockers=[]`; plan `planned=1`, `refused=0`, `requiresProtectedHandoff=true` |
| `--execute` without the acknowledgement | exit 1; `Refusing to write without --confirm-att01-postgres-access` |
| `--execute` with a foreign recipient | exit 1; `handoff_recipient_mismatch`; no handoff written |
| Real execute with the DPAPI handoff | exit 0; one account created; handoff file present; audit `access_provision` = 1 |
| Provisioned row | `role=city_head`, `assignedCityId=<approved city>`, `assignedParkId=null`, `assignedGroupId=null`, `assistsMurabbiId=null`, `isActive=true`, `mustResetPwd=true`, hash prefix `$2b$` |
| Idempotent rerun | exit 0; `activated=0`, `alreadyConfigured=1`, `writesPerformed=false`, no new handoff |

## 8. Post-provision role smoke tests (operator, after the live run)

Run these with the decrypted credentials on the intended machine. Never paste a
password into a report, ticket or chat.

- **City Head** — sign in; the dashboard is `/api/city-head/dashboard`; only the
  assigned city appears; a cross-city identifier is denied; no "Main admin" label.
- **Park Lead / Park Admin** — Parks shows only the assigned park workspace, and
  attendance is reachable there.
- **Assigned Murabbi** — only the assigned group opens; attendance works even with no
  session scheduled today.
- **Unassigned Murabbi** (if any) — truthful no-group state; group attendance and
  roster are denied.
- **Muawin** — content-only portal; no roster, no attendance controls, no phone or
  call/WhatsApp action.
- **Cross-scope denials** — a park from another city, a group from another park, and
  another park's roster are all denied.
- **Credential check** — the handoff decrypts only for the intended Windows account,
  the first sign-in forces a password reset, and no plaintext password appears
  anywhere in the audit log.

## 9. Known limitations

- Exercised only against a disposable local database; never run against an
  operational target.
- The account rows are created; no email is sent. Credential delivery is the DPAPI
  handoff, which requires the operator's own Windows account.
- The tool provisions staff roles only. Shabab and Guardian accounts remain a
  separate, unbuilt contract (section 6).
- Re-running with a changed scope is a refusal by design; changing an existing
  account is a separate, separately authorized operation.
- The integration suite skips itself without `ATT01_TEST_POSTGRES_URL` and the
  approved workbook, so a bare CI run validates the gates and fixtures rather than
  the approved dataset end to end.

## 10. Remaining work before the fresh production bootstrap

1. Owner authorization for the target, window and rollback authority (runbook Gate A).
2. A verified, rehearsed backup (Gate B) and a named restore artefact.
3. Run the ordered live gates: confirm fresh/empty → migrate → verify → import (dry
   run first) → reconcile → provision (dry run first) → role/scope smoke tests →
   attendance session smoke test → clean practice data → handover.

## Non-claims

No production, staging, Supabase or external database was contacted, queried or
altered. No real account, password, credential or DPAPI handoff was created outside
the disposable smoke run, and that file was deleted. No `.env` was read, and no
email, password, private roster row or connection string appears in this report or in
the repository. The tool was not run against a live target.
