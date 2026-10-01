# ATT01 production rollout runbook

Owner: Shabab 360 operations. Module: ATT01 — group-session attendance.
Status: **drafted, unauthorized, unexecuted.** This runbook authorizes nothing by
itself; every gate below names the owner decision required before it runs.

No production, staging or external database was contacted while writing it, and it
contains no connection string, account identifier, password, phone number, workbook
row or handoff content. Placeholders are written as `<…>` and are substituted by the
owner's operator at execution time.

## 0. How to use this runbook

Every step is labelled with one of three classes:

| Class | Meaning |
| --- | --- |
| **LOCAL-PREP** | Safe to prepare or run locally now, read-only or on disposable local copies. |
| **OWNER-AUTHORIZED** | Requires an explicit, named owner decision, a change window and a verified backup before it runs. Never inferred from context. |
| **NEVER** | Must not be performed by any unapproved operator, at any gate. |

Gates run in order. A failed stop condition halts the rollout at that gate; go back
to the previous verified state rather than continuing.

Scope: ATT01 is the **first pilot module**. This runbook covers grouping attendance,
its data baseline, provisioning and the pilot itself. It does not authorize any other
module, and it does not replace the operational documents it references.

Related documents:

- `docs/delivery/ATT01_PILOT_AND_ITERATION_PLAN.md` — pilot scope, entry criteria,
  during-class procedure, triage rules, post-pilot template (authoritative for the
  pilot itself; this runbook does not restate it).
- `docs/delivery/reports/ATT01_POSTGRES_OPERATIONAL_BASELINE_PREFLIGHT.md` — the
  read-only baseline preflight contract from which Gate C is drawn.
- `docs/delivery/reports/ATT01_POSTGRES_DISPOSABLE_REPLAY.md` — fresh replay result.
- `docs/delivery/reports/ATT01_WORKBOOK_DB_RECONCILIATION.md` — workbook/SQLite
  reconciliation evidence.
- `docs/MIGRATION_DESIGN.md`, `docs/OPERATIONS_RUNBOOK.md` — provider cutover and
  free-tier operations.

## 1. Review findings that shaped this runbook

Reviewing the existing pilot and runbook documents against the current repository
state produced these corrections, which this runbook supersedes:

1. **Stale preconditions.** `docs/delivery/ATT01_PILOT_RUNBOOK_DRAFT.md` lists "the
   two new migration folders are committed" and the `operation_receipts`
   duplicate-migration blocker as open preconditions. Both are now closed: the
   Muawin assistance migration and both schemas are committed, the duplicate
   `operation_receipts` migration was removed, and the release assertions match the
   committed chains (18 SQLite / 32 PostgreSQL).
2. **Provider conflict — the most important correction.** The draft places Team
   Access and City Head provisioning inside the production rollout. Both CLIs are
   **local SQLite-only**: `scripts/provision-lahore-team-access.ts` and
   `scripts/provision-local-city-head.ts` require `--target sqlite` and refuse
   PostgreSQL outright. There is therefore **no approved tool path for provisioning
   accounts into a production PostgreSQL database**. Gate E therefore separates the
   local provisioning workflow (LOCAL-PREP, already exercised) from live
   provisioning, which is an explicit prerequisite (section 12), not something this
   runbook can authorise by wording.
3. **Stale companion list.** The draft references
   `ATT01_SOURCE_COMMIT_INVENTORY.md` and `ATT01_POSTGRES_MIGRATION_PREFLIGHT.md` as
   companions; the current authority is the operational-baseline preflight and the
   disposable replay reports above.
4. **Duplicated instructions.** The pilot plan already defines entry criteria,
   pre-class practice, during-class procedure, stop/fallback rules, triage and the
   post-pilot template. This runbook references them instead of copying them, so the
   two cannot drift.
5. **Terminology and role scope.** The draft's smoke-test list omits Muawin, Shabab
   and Guardian and does not state the unassigned-Murabbi denial. Gate F covers all
   eight roles and keeps Muawin excluded from attendance, as the pilot plan requires.
6. **No-op check removed.** The draft's "confirm the duplicate `operation_receipts`
   issue is resolved" step is now a historical fact, so Gate C checks the ledger and
   collision model instead.

## 2. Gate A — Authorization and change window

| Step | Class |
| --- | --- |
| A1. Owner names the approving person and the rollout scope (which city, parks, groups and roles are in the pilot). | OWNER-AUTHORIZED |
| A2. Owner sets the change window, including a writing freeze for the target. | OWNER-AUTHORIZED |
| A3. Owner names the rollback authority: who may decide to restore, and who executes it. | OWNER-AUTHORIZED |
| A4. Owner confirms the operator set and that no unapproved operator has access. | OWNER-AUTHORIZED |
| A5. Owner records the decision in the pilot log with a timestamp. | OWNER-AUTHORIZED |

**No-go criteria — do not open the window if any is true:**

- the approving owner, the window, or the rollback authority is unnamed;
- a required backup artefact does not exist or has not been rehearsed (Gate B);
- the Gate C preflight has not been run read-only, or reports any stop condition;
- there is no approved path for the accounts the pilot needs (section 12);
- the previous pilot's issues are not classified and closed, or blocked by owner
  decision;
- the manual fallback attendance sheet and an operations contact are not ready.

## 3. Gate B — Backup and restore proof

| Step | Class |
| --- | --- |
| B1. Take a full logical backup of the target: `pg_dump -Fc -f <backup-dir>/<stamp>.dump <approved production connection>`. | OWNER-AUTHORIZED |
| B2. Record the artefact: path, byte size, SHA-256 and timestamp, outside the database. | OWNER-AUTHORIZED |
| B3. Verify the artefact: `pg_restore --list <backup-dir>/<stamp>.dump` must succeed and list the expected tables. | OWNER-AUTHORIZED |
| B4. Rehearse the restore into a **separately created disposable** cluster or database with `--exit-on-error`, never over the shared target. | OWNER-AUTHORIZED |
| B5. Compare the rehearsal against the source: table counts and the ATT01 aggregates (parks, groups, participants, attendance events, attendance records, calendar dates) plus the ATT01-relevant financial totals. | OWNER-AUTHORIZED |
| B6. Record the rehearsal result and keep the artefact until the rollout and its post-pilot reconciliation are accepted. | OWNER-AUTHORIZED |

**Stop condition:** if the backup is missing, empty, fails `pg_restore --list`, fails
the rehearsal, or the restore fails on the disposable target, **stop**. Do not open
the window, do not migrate, do not import. Treat the target as unverified until a
fresh, rehearsed backup exists.

## 4. Gate C — Read-only operational baseline preflight

All steps are read-only; none writes to the target. Full contract:
`docs/delivery/reports/ATT01_POSTGRES_OPERATIONAL_BASELINE_PREFLIGHT.md`.

| Step | Class |
| --- | --- |
| C1. Migration ledger comparison: classify every `_prisma_migrations` row as applied-in-order, pending, unknown-applied, missing-applied, duplicated, unfinished or rolled-back. | OWNER-AUTHORIZED (read-only) |
| C2. Expected migration counts: 32 PostgreSQL folders and 18 SQLite folders on the committed chain; the pending set must be exactly the nine migrations modelled by `src/lib/migrations/production-preflight.ts` (`20260827090000`, `20260907114612`, `20260909020000`, `20260909030000`, `20260909040000`, `20260909050000`, `20260909060000`, `20260909070000`, `20260916080000`), or the set must be fully applied. | OWNER-AUTHORIZED (read-only) |
| C3. Schema/constraint fingerprint: compare tables, columns, nullability, defaults, indexes, constraints and enums against `prisma/postgres/schema.prisma`, reporting per-object presence. | OWNER-AUTHORIZED (read-only) |
| C4. Collision preflight: every object the pending sequence creates unconditionally must be absent, including the 25 unguarded foreign keys now modelled. | OWNER-AUTHORIZED (read-only) |
| C5. Muawin assistance relation: `staff_meta_assistsMurabbiId_fkey` must be **absent** on a clean baseline (migration `20260916080000` adds it) and, once applied, present exactly once with `ON DELETE SET NULL`. A pre-existing constraint is a collision and blocks. | OWNER-AUTHORIZED (read-only) |
| C6. Data guards: all zero (batch/park city conflicts, cities with more than one active batch, participant group orphans, admission converted-participant orphans, park lesson/slot orphans, student profile null/duplicate ids). | OWNER-AUTHORIZED (read-only) |
| C7. Confirm `prisma/schema.prisma` and `prisma/postgres/schema.prisma` remain aligned for the shared models. | LOCAL-PREP |

**Stop condition:** any unknown-applied, missing-applied, duplicated, unfinished or
rolled-back ledger row; any pending set other than C2; any collision including a
Muawin-assistance collision; any missing prerequisite; any non-zero guard count. Do
not run a migration until every check passes.

## 5. Gate D — Authorized migration and import procedure

Preflight and execution are strictly separate: Gate C is read-only and may be
re-run at any time; Gate D writes.

| Step | Class |
| --- | --- |
| D1. Re-run Gate C immediately before writing and require an identical result; if the ledger moved since Gate C, stop and re-baseline. | OWNER-AUTHORIZED |
| D2. Apply the pending migrations in order: `npx prisma migrate deploy --schema prisma/postgres/schema.prisma` against `<approved production connection>` supplied at command time from the owner's secret store. | OWNER-AUTHORIZED |
| D3. Verify the apply: ledger now shows every migration applied exactly once; re-run the Gate C fingerprint and collision checks; `PRAGMA`-equivalent integrity checks pass. | OWNER-AUTHORIZED |
| D4. Import the approved attendance dataset through the repository's guarded importer for the target environment, with its own verified backup and its dry run reviewed first. | OWNER-AUTHORIZED |
| D5. Import result checks: parks 6, groups 18, valid participants 339, attendance events 460, historical records 6,210, calendar dates 74; status totals present 1,626 / absent 2,570 / late 1,346 / excused 668; no record dated after the approved 2026-09-13 cutoff; exactly one active batch for the city. | OWNER-AUTHORIZED |
| D6. Record the applied migration names, the import counts and the aggregate-only reconciliation output. | OWNER-AUTHORIZED |

**Never in this gate:** commit or export a connection string; run migrations through
a transaction pooler; import private workbook rows into any report; use
`--completed-through` to import marks past the approved cutoff; re-run an import
without a fresh verified backup.

## 6. Gate E — Team Access provisioning (role checklist)

Each password handoff is a DPAPI-protected file written for the **current Windows
account** (`DataProtectionScope::CurrentUser`) at mode `0600`; plaintext is never
written to disk and the file is written **before** any account is activated, so a
handoff failure leaves every account inactive. Verification is done by having the
human operator decrypt it themselves on the intended machine and use the credential
— no step in this runbook prints, copies or pastes a password.

Local workflow (already exercised — **LOCAL-PREP**):

- preflight: `node scripts/provision-lahore-team-access.ts --input <team-access workbook> --preflight --sqlite-path <local db>`
- execute: `… --execute --confirm-team-access-provision --target sqlite --sqlite-path <local db> --backup-dir <backup-dir> --handoff <handoff-file>`
- City Head: `node scripts/provision-local-city-head.ts --email <owner-provided work email> --sqlite-path <local db> --dry-run`, then the gated `--execute` form.

**Live provisioning into production is not covered by these tools** (they refuse
PostgreSQL). Until an approved live path exists, live account creation is a
**prerequisite (section 12)**, not a step here.

Role checklist — every account must end with exactly this scope and nothing broader:

| Product label | Internal role | Required scope | Provisioned by (current tooling) | Denied when |
| --- | --- | --- | --- | --- |
| Program Head | `program_admin` | HQ, cross-city; may narrow by city | Owner/admin bootstrap path (not the Team Access workbook) | never for scope |
| City Head | `city_head` | pinned `assignedCityId` + active city — **the correct city, not any city** | City Head provisioner (local); live path = prerequisite | city missing or inactive; never falls back to all cities |
| Park Lead | `park_lead` | `assignedParkId` + active park; may teach a group | Team Access workbook (local) | park missing/inactive |
| Park Admin | `park_admin` | `assignedParkId` + active park | Owner/admin users path (not the Team Access workbook) | park missing/inactive |
| Murabbi | `murabbi` | active assigned group; may be active without one, then **denied** group/attendance data | Team Access workbook (local) | group/park missing |
| Muawin | `muawin` | `assignedParkId` only; content view; optional assistance link to a same-park Murabbi or teaching Park Lead; **never a group** | Team Access workbook (local) | park missing; any group or attendance data |
| Shabab | `student` | own participant record | Participant records | — |
| Guardian | `guardian` | own children only | Guardian records | — |

Provisioning checks (LOCAL-PREP for the local workflow):

1. Preflight reports zero unsupported rows, zero role/group code violations and zero
   placeholder mismatches before any write.
2. No account is activated without an approved work email; bracketed or placeholder
   email entries stay inactive.
3. A Muawin row never carries a group; a non-Muawin row never carries an assistance
   email.
4. An assistance target is an active Murabbi, or a Park Lead teaching a group, in the
   **same park**; self-assistance and cross-park assistance are refused.
5. After provisioning: no active account is outside its approved scope; every active
   account has the expected role, park and (where applicable) group; inactive
   placeholders remain inactive.
6. Verification never reveals a password: confirm the handoff exists and is DPAPI
   encrypted, then have the operator decrypt and sign in on the intended machine.

## 7. Gate F — Role and attendance smoke test

Run against the pilot environment, one role at a time. Record pass/deny with the
route and HTTP status (never a credential).

| Role | Expected | Class |
| --- | --- | --- |
| City Head | Sees only the assigned city; dashboard values come from `/api/city-head/dashboard`; a cross-city identifier is denied; no "Main admin" label. | OWNER-AUTHORIZED |
| Park Lead / Park Admin | Parks opens the scoped selector → assigned park workspace → attendance; only the assigned park. | OWNER-AUTHORIZED |
| Assigned Murabbi | Opens only the assigned group; the attendance action works even when no class is scheduled today. | OWNER-AUTHORIZED |
| Unassigned Murabbi | Gets a truthful no-group state and **cannot** reach group attendance or a roster. | OWNER-AUTHORIZED |
| Muawin | Content-only assistant portal; **no** roster, attendance controls, phone or call/WhatsApp action. | OWNER-AUTHORIZED |
| Shabab | Sees only their own record; no group or peer data. | OWNER-AUTHORIZED |
| Guardian | Sees only their own children; no other participant. | OWNER-AUTHORIZED |

Controlled attendance-session smoke test (one session, agreed in advance):

1. Park Lead/Park Admin opens the assigned park workspace; Murabbi opens only the
   assigned group, and confirms the displayed park, group and session date.
2. Mark a small agreed practice subset Present, Absent, Late and Excuse; wait for
   confirmation; refresh once and confirm the states persist without duplication.
3. Confirm a non-scheduled date and an out-of-scope group are refused.
4. Confirm Call/WhatsApp controls appear only for an absent student, and never for
   another status.
5. Close the session with a reason; confirm marks can no longer change; reopen with a
   reason, change one mark, and confirm the correction is audited.
6. Confirm closing a session never marks a student as dropout.
7. **Identify and remove the practice marks before pilot use:** record the session
   date, park and group in the pilot log, then use the authorised reset (or the
   reviewed cleanup path) so the practice session is empty before real marking
   begins. Never let practice marks be mistaken for imported history; if a reset is
   authorised, confirm its result and record it.

## 8. Gate G — Pilot start and post-pilot reconciliation

| Step | Class |
| --- | --- |
| G1. Brief the team using the pilot plan's during-class procedure; confirm the manual fallback and the operations contact. | OWNER-AUTHORIZED |
| G2. Incident reporting follows the pilot plan's issue-intake fields and priority rules; escalate scope leaks, lost attendance and credential exposure immediately. | OWNER-AUTHORIZED |
| G3. Post-pilot reconciliation: re-run the read-only reconciliation and confirm the imported totals are unchanged. | OWNER-AUTHORIZED |
| G4. Record pilot deltas (extra prepared sessions, operator marks, resets, receipts) as an **attributed pilot delta**, never as an import error; keep reports aggregate-only. | OWNER-AUTHORIZED |
| G5. Rollback criteria: any scope leak, lost/corrupted attendance, credential exposure, or inability to take attendance across the pilot. On any of these, stop digital marking for the affected park and follow the rollback summary (section 11). | OWNER-AUTHORIZED |
| G6. Decision record: proceed, proceed with limits, pause affected parks, or stop. Record the deciding owner, the evidence and the next class date. | OWNER-AUTHORIZED |

## 9. Operator checklist (one page)

- [ ] Approving owner, window, rollback authority and operator list recorded (A).
- [ ] Backup taken, hashed, `pg_restore --list` clean, restore rehearsed and compared (B).
- [ ] Ledger comparison, counts, fingerprint, collisions, Muawin relation and guards all pass (C).
- [ ] Preflight re-run immediately before writing, with an identical result (D1).
- [ ] Migrations applied and verified; import dry run reviewed, then executed (D2–D6).
- [ ] Every role account matches its approved scope; no account broader than approved (E).
- [ ] Handoffs are DPAPI-encrypted for the intended Windows user; no password shown (E).
- [ ] Every role smoke test recorded pass/deny; wrong-scope accounts denied (F).
- [ ] One controlled session marked, closed, reopened, corrected — then emptied and recorded (F).
- [ ] Pilot briefing, incident path, reconciliation, rollback criteria and decision record complete (G).

## 10. Release evidence checklist

- [ ] Named owner approval, window, rollback authority.
- [ ] Backup path, byte size, SHA-256, timestamp; `pg_restore --list` output; rehearsal comparison.
- [ ] Ledger comparison output and the applied migration list.
- [ ] Schema/constraint fingerprint result and collision-preflight result.
- [ ] Import counts and the aggregate-only reconciliation report.
- [ ] Provisioning preflight result and post-provisioning scope verification (aggregate only).
- [ ] Role smoke-test results (pass/deny per role) and the attendance-session record.
- [ ] Practice-mark removal evidence and the pilot log entry.
- [ ] Post-pilot reconciliation, pilot deltas, and the proceed/pause/stop decision.

## 11. Rollback summary

**Decision points:** before any write (abort — nothing to unwind); mid-migration
(confirm the partial state, then `npx prisma migrate resolve --rolled-back <migration>`
only if the object is genuinely absent); after a bad outcome (restore the verified
dump, re-run verification, then forward-fix); if the restore itself fails (stop and
escalate — the target is in an unknown state).

There are no down-migrations for the restored-table migration or the trigger
migration, so rollback is dump restore, not a reverse migration. After the
application has written to PostgreSQL, never roll the deployment back to SQLite;
recover by restore-and-redeploy.

## 12. Remaining prerequisites before an authorized live rollout

1. **Named owner authorization** for the target, window, rollback authority and
   operator set (Gate A).
2. **A verified, rehearsed backup** (Gate B) and a named restore artefact.
3. **An approved live provisioning path.** The current Team Access and City Head
   tools are local SQLite-only; live production account creation — including the City
   Head account pinned to its city — has no approved tool path yet.
4. **Gate C actually run read-only** against the restored operational baseline; the
   contract exists but has not been authorized or executed.
5. **Owner decision on the SQLite self-reference asymmetry** (the SQLite Muawin
   migration adds the column and index but not the self-referential foreign key) if a
   fresh SQLite build is ever required from migrations alone.
6. **Independent review** before any production migration or deployment.

## Non-claims

No production or staging system, database, migration, import, account, password,
credential, handoff, deployment or push occurred in preparing this runbook. It does
not claim production readiness, deployment readiness, a successful live migration, or
team-pilot approval; each gate above requires its own explicit owner authorization.
