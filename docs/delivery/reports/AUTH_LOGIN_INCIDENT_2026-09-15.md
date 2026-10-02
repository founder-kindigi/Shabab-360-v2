# Authentication incident — 2026-09-15

## Impact

Existing Super Admin login began returning the generic invalid-credentials
message after the latest v2 update, on both localhost and the deployed app.

## Evidence and diagnosis

- `src/lib/auth.ts` now calls `consumeLoginAttempt` before user lookup or
  password verification.
- `consumeLoginAttempt` executes an insert/upsert against
  `login_attempt_windows`.
- Any database or throttle error is caught by `authorize` and fails closed as
  an invalid login.
- Commit `d2af03d` introduced both this dependency and the migration
  `20260909010000_login_throttle` for SQLite and PostgreSQL.
- A deployment that updated code without applying that migration would deny
  every password, including a previously valid Super Admin password. This
  exactly matches the reported timing and behavior.

This is a high-confidence diagnosis, not a direct production-table inspection.
No production credential, account, database or environment value was read.

## Required recovery

1. Take the approved production backup/snapshot.
2. Run a read-only migration-status/table-existence preflight against the
   production PostgreSQL direct URL.
3. If and only if `login_attempt_windows` is absent, apply the already-reviewed
   additive migration `20260909010000_login_throttle` using Prisma deploy.
4. Re-check the table and perform one owner-controlled Super Admin login.
5. If login remains unavailable, stop; inspect assignment activity and
   deployment database binding without resetting a password or creating an
   account.

## Risk and rollback

The migration adds one independent throttle table and one expiry index. It does
not change users, password hashes, roles, assignments or business records. A
rollback would remove only the new throttle table and would weaken durable
login throttling; it should be used only after a documented incident decision.

## Separate UI defect

`mobile-login-page.tsx` displays demo-role buttons that only prefill hard-coded
seed credentials. They do not provision accounts and are misleading whenever
the database is not seeded. Remove them in a later bounded frontend patch; this
is separate from the production login recovery.
## Production preflight result

The protected production preflight completed on 2026-09-15. It confirmed that
`20260909010000_login_throttle` is pending, which supports the authentication
incident diagnosis. It also reported seven additional pending PostgreSQL
migrations:

- `20260827090000_add_team_document_links`
- `20260907114612_add_evaluations_lessons_planner`
- `20260909020000_operation_receipts`
- `20260909030000_restore_modeled_tables`
- `20260909040000_active_city_batch`
- `20260909050000_align_modeled_constraints`
- `20260909060000_align_modeled_indexes`
- `20260909070000_attendance_reset_version`

No migration was applied. `prisma migrate deploy` applies every pending
migration and would exceed the approved throttle-only recovery. A full migration
review/approval or a separately reviewed emergency throttle-only procedure is
required before any production write.
## Emergency recovery execution

Owner approval was received for the throttle-only recovery. On 2026-09-15 the
reviewed SQL from `20260909010000_login_throttle` was applied with Prisma DB
execute, then the exact migration was recorded with Prisma migrate resolve.

Verification: Prisma migration status no longer lists
`20260909010000_login_throttle` as pending. The remaining seven migrations are
still pending and were not changed. No user, password hash, role, assignment,
participant, account or application data was modified.

The existing account owner must now perform the final interactive login check;
automated credential entry was not used.
## Local recovery execution

The local SQLite `prisma/dev.db` also lacked `login_attempt_windows`.
`20260909010000_login_throttle` was applied with Prisma DB execute and recorded
with Prisma migrate resolve on 2026-09-15. Migration status confirms it is no
longer pending; the other older local migrations remain untouched. No local
user, password, role, account, participant, or application record was changed.
## Local account recovery

With owner approval, a disposable local Super Admin identity was created for the
owner-provided local email in `prisma/dev.db`. It is active, has an active
Super Admin staff identity, requires a password reset at first sign-in, and has
a local bootstrap audit record. The temporary bootstrap-password entry was
removed from `.env.bootstrap` after the transaction. No production account or
production data was changed.