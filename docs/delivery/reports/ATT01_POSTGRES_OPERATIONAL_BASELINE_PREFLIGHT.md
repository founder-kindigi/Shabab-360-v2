# ATT01 PostgreSQL operational-baseline preflight contract

Date: 2026-09-18. Task: ATT01 release preparation. Mode: **contract definition
only — no database was contacted**.

No production, staging or external PostgreSQL database was contacted; no `.env`,
credential or DPAPI handoff was read; no Prisma migration command was run.

## 1. Why this exists

A fresh disposable replay of all 32 PostgreSQL migrations passed. That proves the
chain can build a **new** database; it does **not** prove the ATT01 changes can be
applied to the **existing operational baseline**, which was created before parts
of this history and may already contain objects the pending migrations create.

This document defines the read-only comparison, the evidence an authorised
operator must capture, the stop conditions, and the rollback decision points that
turn that into a safe migration decision. It is a contract, not an execution
record.

## 2. Inputs the operator must capture (read-only)

| # | Input | How | Why |
| --- | --- | --- | --- |
| 1 | `_prisma_migrations` contents, verbatim | `SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY started_at;` | history comparison (section 3) |
| 2 | `prisma migrate status --schema prisma/postgres/schema.prisma` output | owner-run against the target | applied / pending / divergent verdict |
| 3 | Schema fingerprint: tables, columns, nullability, defaults, indexes, constraints, enums | catalogue queries or the repository's PGlite comparison (`docs/reviews/v2-audit-2026-09-08/verify-postgres-migrations.mjs`) against `prisma/postgres/schema.prisma` | collision preflight (section 5) |
| 4 | Full logical backup | `pg_dump -Fc` | recovery (section 6) and the restore rehearsal |
| 5 | Restore rehearsal on a disposable cluster | `pg_restore --exit-on-error --dbname=<disposable>` | proves the backup is usable before anything destructive |
| 6 | Aggregate guard counts | the M01 readiness preflight | data preconditions (section 5) |

The connection string is supplied by the operator from their own secret store at
command time. It is never read from `.env` in this repository and never printed.

## 3. Required migration-history comparison

Compare the target ledger against the intended chain (32 folders under
`prisma/postgres/migrations`, in timestamp order) and classify every row:

| Class | Meaning | Effect |
| --- | --- | --- |
| applied-in-order | recorded once, `finished_at` set, `rolled_back_at` null, checksum matches the file | expected |
| pending | present in the chain, absent from the ledger | expected for the ATT01 set (section 4) |
| unknown-applied | in the ledger but not in the chain | **stop** — the target was built from history this repository does not contain |
| missing-applied | applied objects exist but the ledger has no row | **stop** — history is not trustworthy |
| duplicated | the same `migration_name` recorded more than once | **stop** |
| unfinished / rolled-back | `finished_at` null or `rolled_back_at` set | **stop** — a previous attempt is unresolved |

The comparison is a read-only set operation over the ledger and the folder names;
it needs no schema access.

## 4. Expected migration ledger state

Two states are acceptable, and nothing else:

1. **Fully applied** — all 32 chain migrations recorded in order with matching
   checksums. The ATT01 object set is already present; the remaining work is
   verification only.
2. **Applied baseline + a known pending set** — the pending names are exactly the
   nine migrations modelled by
   `src/lib/migrations/production-preflight.ts`
   (`20260827090000`, `20260907114612`, `20260909020000`, `20260909030000`,
   `20260909040000`, `20260909050000`, `20260909060000`, `20260909070000`,
   `20260916080000`).

Any other pending name means the chain and the target disagree about the ATT01
sequence, and the preflight stops.

## 5. Schema fingerprint and collision comparison

- **Fingerprint**: compare modelled tables, columns, nullability, defaults,
  indexes, constraints and enums against `prisma/postgres/schema.prisma`. The
  comparison must report per-object presence, never a single boolean.
- **Collision preflight**: run the M01 readiness model against the target. Every
  object the pending sequence creates unconditionally must be **absent** on a
  clean baseline; a present one blocks.
- **Unguarded foreign keys are now modelled.** As of this task the collision model
  covers every foreign key the pending sequence adds without a `DROP CONSTRAINT`
  guard — 25 in total:
  - `staff_meta_assistsMurabbiId_fkey` (the Muawin assistance relation, migration
    `20260916080000`),
  - 22 constraints added by `20260909030000_restore_modeled_tables`,
  - `park_lessons_parkId_fkey` and `park_routine_slots_parkId_fkey` added by
    `20260909050000_align_modeled_constraints`.
  Drop-then-re-add realignments (`participants_groupId_fkey`,
  `admission_applications_convertedParticipantId_fkey`) are deliberately **not**
  collision targets: their pre-state is a prerequisite and is already covered by
  `REQUIRED_EXISTING_CONSTRAINTS`.
- **Data guards** must all be zero: batch/park city conflicts, cities with more
  than one active batch, participant group orphans, admission
  converted-participant orphans, park lesson/slot orphans, and
  `student_extended_profiles` null or duplicated ids.
- **Prerequisites** must all be present (`attendance_events`, `batch_settings`,
  `batches`, `cities`, `event_registrations`, `groups`,
  `park_staff_attendance_records`, `parks`, `participants`, `staff_meta`,
  `student_extended_profiles`, the admission columns, and the two constraints
  named above).

## 6. Backup and restore verification

1. Take a **full logical backup** (`pg_dump -Fc`) of the target during a quiet
   window; record path, byte size, SHA-256 and timestamp.
2. Verify the artefact: `pg_restore --list <backup>` must succeed and list the
   expected tables.
3. **Rehearse the restore** into a separately created disposable cluster or
   database — never over the shared baseline — with `--exit-on-error`, then
   compare table counts and the ATT01-relevant row aggregates against the source.
4. Only a verified, rehearsed backup authorises any subsequent write.

## 7. Stop conditions

Stop, make no change, and report if any of these is true:

- any ledger row is unknown-applied, missing-applied, duplicated, unfinished or
  rolled back (section 3);
- the pending set is not one of the two acceptable states (section 4);
- the backup is absent, empty, fails `pg_restore --list`, or fails the restore
  rehearsal;
- the fingerprint comparison reports a missing prerequisite;
- the collision preflight reports a single collision — including any of the 25
  unguarded foreign keys;
- any guard count is non-zero;
- `_prisma_migrations` changes between the backup and the preflight run;
- the operator cannot name the rollback artefact and its location.

## 8. Rollback decision points

| Point | Action |
| --- | --- |
| Before any write | Abort. Nothing to unwind; discard the disposable rehearsal database. |
| Migration fails mid-file | PostgreSQL DDL is transactional per migration file; confirm the object is absent, then `npx prisma migrate resolve --rolled-back <name>` **only** after verifying the partial state. Never mark a migration rolled back without checking. |
| Migration applies but the outcome is wrong | Restore the verified dump over the target, re-run the fingerprint and aggregate reconciliation, then forward-fix. Treat the target as **partially modified** until the restore verifies. |
| Restore itself fails | Stop. The target is in an unknown state; escalate rather than retrying blindly. |

There are no down-migrations for `20260909030000_restore_modeled_tables`
(tables/indexes/constraints) or `20260909040000_active_city_batch`
(functions/triggers), so rollback is dump restore, not a reverse migration.

After the application has written to PostgreSQL, never roll the deployment back
to SQLite; recovery is restore-and-redeploy (`docs/MIGRATION_DESIGN.md`).

## 9. Operator commands (later, authorised, owner-run)

```bash
# 0. read-only history + fingerprint
psql "$DIRECT_URL" -Atc "select migration_name, finished_at, rolled_back_at from \"_prisma_migrations\" order by started_at;"
npx prisma migrate status --schema prisma/postgres/schema.prisma

# 1. backup, then verify the artefact
pg_dump -Fc -f <backup-dir>/shabab-<stamp>.dump "$DIRECT_URL"
pg_restore --list <backup-dir>/shabab-<stamp>.dump > /dev/null

# 2. restore rehearsal into a disposable cluster (never the shared baseline)
createdb -h 127.0.0.1 -p <port> shabab_restore_rehearsal
pg_restore --exit-on-error --dbname=shabab_restore_rehearsal <backup-dir>/shabab-<stamp>.dump

# 3. readiness + collision preflight against the restored copy
#    (runMigrationReadinessPreflight with the operator's own read-only runner)

# 4. only with every stop condition clear:
npx prisma migrate deploy --schema prisma/postgres/schema.prisma
```

`$DIRECT_URL` is the operator's direct/session connection string, supplied from
their secret store. Do not run migrations through a transaction pooler, do not
export it into this repository, and do not commit it.

## 10. Muawin assistance review outcome

- **Schema parity**: `prisma/schema.prisma` and `prisma/postgres/schema.prisma`
  declare the same model — nullable `assistsMurabbiId`, the
  `@relation("MuawinAssistance", … onDelete: SetNull)` self-relation, the
  `muawinAssistants StaffMeta[]` back-relation, and `@@index([assistsMurabbiId])`.
- **Migration parity**: both chains contain
  `20260916080000_add_muawin_assistance`. PostgreSQL adds the column (guarded),
  the index (guarded) and the self-referential foreign key
  `staff_meta_assistsMurabbiId_fkey ON DELETE SET NULL ON UPDATE CASCADE`.
  SQLite adds the column and index and deliberately omits the self-reference,
  which SQLite cannot add to an existing table without rebuilding `staff_meta`;
  the documented local path for adding it is the guarded team-access schema
  reconciler.
- **Preflight coverage**: the Muawin foreign key is now an explicit collision
  check, so a pre-existing constraint blocks the migration instead of silently
  reaching it.

## 11. Remaining production prerequisites

1. An owner-authorised target, maintenance window and rollback authority.
2. A verified, rehearsed backup (section 6) and a named restore artefact.
3. The Muawin schema and both migrations **committed** (currently local only).
4. A real operational read-only run of the ledger comparison, fingerprint and
   readiness preflight against the restored copy — never from this task.
5. Owner decision on the SQLite self-reference asymmetry if a fresh SQLite build
   is ever required from migrations alone.
6. Independent review before any production migration or deployment.

No production migration, deployment or team-pilot readiness is claimed.
