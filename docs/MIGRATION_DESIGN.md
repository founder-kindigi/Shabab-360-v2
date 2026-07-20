# SQLite-to-Supabase Free Postgres Migration Design

## Status and decision boundary

This is the controlled migration design for the free-tier pilot. The active application still uses SQLite through `prisma/schema.prisma`; the staged Postgres target lives in `prisma/postgres/` and must not be activated until staging evidence is complete.

The project owner must approve the cutover, provision the two Supabase projects, rotate previously exposed secrets, and supply environment variables only through approved secret stores. No migration tool reads or prints credentials.

## Staging execution evidence

On 2026-07-14, the reviewed baseline migration was applied to the empty Supabase Staging project through the owner-configured Session Pooler. The controlled importer then copied 1,242 operational records from the frozen SQLite snapshot without changing the source database.

- The reconciliation command passed row-count parity, exact financial totals, password-hash and Unicode fingerprints, and foreign-key checks.
- Staging financial totals are `PKR 2,000.00` fee amount, `PKR 0.00` discounts, `PKR 8,000.00` payments, and `PKR 0.00` waived amount.
- The 48 historical audit records and all notifications were intentionally excluded under the approved data policy.
- The additive `20260714223000_add_on_leave_participant_state` migration was applied on 2026-07-14 so the staged enum exactly matches the existing roster state values.
- The reviewed but not yet deployed `20260720100000_add_participant_age_and_grade_class` migration adds nullable `age` and `gradeClass` columns only. It supports the approved Lahore roster fields without changing existing records.
- PostgreSQL-client type validation and the dedicated production build now pass after Decimal-safe money serialization and database-neutral dashboard/report queries were implemented. The application runtime is **not** connected to Staging yet: Vercel and local development remain on SQLite until browser role testing, private storage, and backup/restore gates pass.

## Verified source inventory

The read-only SQLite inventory on 2026-07-14 found the following records. It intentionally reports counts and value categories only, never personal data.

| Model group | Records |
| --- | ---: |
| Users and staff | 14 |
| City, park, batch, group | 12 |
| Guardians and participants | 57 |
| Attendance events and records | 1,151 |
| Fee events and payments | 5 |
| Announcements | 3 |
| Audit logs | 48 |
| Notifications, admissions, report presets, settings, receipt sequences | 0 |

The data-value inventory supports these Postgres enums:

| Field | Approved values |
| --- | --- |
| `Participant.state` | `active`, `inactive`, `warning`, `dropout`, `graduated` |
| `AttendanceRecord.status` | `present`, `absent`, `late`, `excused` |
| `Payment.method` | `cash`, `bank`, `online`, `other`, `bank_transfer`, `easypaisa`, `jazzcash` |
| `Notification.type` | `email`, `in_app`, `push` |
| `Notification.channel` | `password_reset`, `password_changed`, `invite`, `fee_reminder`, `absence_alert`, `admission_status` |
| `Notification.status` | `pending`, `sent`, `failed` |

`Payment.method` intentionally retains both legacy and current API values. The API/UI vocabulary must be normalized in a separate compatibility pass before enabling stricter product-facing choices.

## Staged implementation

- [Postgres schema](../prisma/postgres/schema.prisma) contains the PostgreSQL provider, exact `Decimal(12,2)` PKR amounts, reviewed enums, existing foreign keys, and approved indexes.
- [Versioned baseline](../prisma/postgres/migrations/20260714200000_init_postgres/migration.sql) is generated from the staged schema and is the only approved starting schema for an empty staging project.
- `npm run db:postgres:generate` generates the Postgres version of the default application client; generated code is ignored. Use it only for Postgres validation or deployment builds, then run `npm run db:generate` before returning to local SQLite development.
- [vercel.json](../vercel.json) uses `npm run build:postgres`, so every Vercel build generates the PostgreSQL client before compiling. It never runs migrations; `db:postgres:deploy` remains an explicit owner-approved operation outside Vercel.
- `npm run db:postgres:validate` validates the target schema without connecting to a database.
- `npm run db:migrate:sqlite-to-postgres -- --dry-run` reads a frozen SQLite snapshot and verifies money precision without writing.
- Adding `--execute` imports only into an empty Postgres target through `DIRECT_URL`; it never truncates or overwrites a target.
- `npm run db:reconcile:sqlite-to-postgres` checks imported row counts, exact financial totals, password-hash/Unicode field parity, foreign keys, and excluded records without printing personal data.

The importer preserves primary keys and timestamps. It excludes `AuditLog` under [AUDIT_DATA_POLICY.md](AUDIT_DATA_POLICY.md) and excludes the transient notification outbox because historic notification body/data can contain obsolete credential content. The encrypted source backup remains the historical record.

### Additive local SQLite schema updates

For nullable development-only schema additions, use this controlled sequence:

1. Stop the local Next.js process so it cannot write generated Prisma state or
   hold an active SQLite connection.
2. Create an encrypted copy of the SQLite file referenced by `DATABASE_URL` and
   keep it outside Git. Never print or commit the URL or copied data.
3. Review `prisma db push` output and run `npm run db:push`. Do not use
   `db:reset`, `--force-reset`, or destructive change acceptance.
4. Run `npm run db:generate`, then verify the affected route tests, full
   typecheck, and both production builds.
5. Restart local development and test create, read, edit, and reload behavior.

The admission additional-information update is additive and nullable. Existing
records remain valid with `null` values. Application rollback may leave these
columns in place; populated columns must not be dropped during rollback.

## Connection configuration

The owner must create **two Supabase Free projects** in the same selected region: a sanitized Staging project and Pilot Production. Free currently permits two active projects, 500 MB database storage and 1 GB file storage per project, but pauses inactive projects after one week and does not provide automatic backups or point-in-time recovery. [Supabase pricing](https://supabase.com/pricing)

Use a dedicated `prisma` database role with the required schema privileges. Keep all URLs in local secret storage, GitHub/Vercel environment variables, or the owner’s password manager only.

| Purpose | URL | Rule |
| --- | --- | --- |
| Vercel runtime | `DATABASE_URL`: Supavisor transaction pooler, port `6543`, `pgbouncer=true`, `connection_limit=1`, SSL required | Required for serverless functions; never run a migration through it. |
| Local migration, backup, restore | `DIRECT_URL`: direct Postgres port `5432` with SSL | Preferred for Prisma Migrate, `pg_dump`, and `pg_restore`. Supabase Free direct connections are IPv6-only. |
| IPv4-only migration workstation | `DIRECT_URL`: Supavisor **session** pooler on port `5432` with SSL | Approved fallback only when the direct endpoint is unreachable. Never substitute transaction mode for a migration. |
| Frozen source snapshot | `SQLITE_DATABASE_URL`: local `file:` URL | Used by import/reconciliation scripts only; never set in Vercel. |

Supabase documents transaction-mode Supavisor as the serverless connection path and advises `pgbouncer=true` for Prisma because prepared statements are unsupported there. It reserves direct connections for migrations, native backup tools, and persistent sessions. [Connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres), [Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)

## Ordered runbook

1. Owner completes `SEC-001`: rotate secrets and record the Git-history decision.
2. Owner creates an encrypted SQLite backup and records its checksum outside Git. Freeze source writes for the chosen snapshot.
3. Owner provisions the empty Staging Supabase project and private storage buckets. Do not configure production traffic yet.
4. Set Staging `DATABASE_URL` and `DIRECT_URL` in a local secret store. Run `npm run db:postgres:deploy` manually from a controlled workstation; Vercel builds and preview deployments must never run migrations.
5. Run the SQLite importer once with `--dry-run`; review only its counts and exclusion summary.
6. Run it with `--execute` against the empty Staging project, then immediately run the reconciliation command. Any failed check aborts the run.
7. Replace the remaining SQLite-specific reporting queries and complete Decimal serialization/arithmetic compatibility. Regenerate the Postgres client and run the complete app suite against Staging.
8. Perform role-matrix, payment, upload/storage, connection-pool, and browser smoke tests on the Staging deployment.
9. Run a non-destructive restore rehearsal into a separately created disposable project or local Postgres instance. Never drop or overwrite shared Staging for a drill.
10. Repeat the approved migration on empty Pilot Production during a write freeze. Reconcile before Vercel Production points to it.

## Acceptance checks

- Every imported model has equal source/target row counts.
- The sums of fee amount, fee discounts, payment amount, and waived amount match exactly to paisa.
- The target has zero orphaned foreign keys.
- Password hashes and PII-bearing text fields have matching fingerprints without appearing in command output.
- Target audit and notification tables remain empty after import.
- Existing login hashes work on Staging.
- Urdu/Arabic text renders correctly in Staging UI.
- The Vercel runtime uses transaction pooling; all migration and backup commands use direct/session connections.
- A restore rehearsal succeeds outside shared Staging.

## Abort and recovery

Abort before cutover if row counts, financial totals, foreign keys, Unicode/hash parity, authentication, pool behavior, or any P0 test fails.

Before the application has written to Postgres, the owner can discard the disposable target and re-run from the encrypted SQLite snapshot. **After Vercel has accepted a Postgres write, never roll the live deployment back to SQLite.** Recovery is: pause writes, restore the latest Postgres backup to a clean Postgres target, redeploy the known-good application, reconcile, then forward-fix. Keep the source snapshot only as a migration reference, not as a live rollback database.

## Remaining migration work

The Staging schema, import, and reconciliation are complete, but this is not production activation. The following remain release gates:

- Owner approval and Supabase provisioning.
- Exact-money/Decimal compatibility across API arithmetic, response serialization, UI payloads, and report totals.
- Replacement of five SQLite-specific `$queryRaw` dashboard/report queries.
- A tested invitation-token schema migration after the data baseline is approved.
- Private Supabase Storage implementation and authorization tests.
- Staging import, reconciliation, backup/restore, connection-pool, browser, and role-matrix evidence.
