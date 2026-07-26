# RELEASE-002: Database Parity Evidence

- **Recorded:** 2026-07-26
- **Verified application base:** `159ba859c280b2ee197d4136f797b6385d772f4d`
- **Scope:** PostgreSQL migration-chain parity and read-only staging migration status
- **Secrets and data:** No connection strings, credentials, table rows, or personal data are recorded in this file.

## Verified Results

| Check | Result | Impact |
|---|---|---|
| Private bootstrap configuration | `DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL`, and `NEXTAUTH_SECRET` were present; all database URLs were distinct. | Runtime, direct-migration, and disposable-shadow roles are separated. |
| Bootstrap Git safety | `.env.bootstrap` is ignored by `.gitignore`. | No private configuration entered version control. |
| PostgreSQL migration parity | `prisma migrate diff` from `prisma/postgres/migrations/` to `prisma/postgres/schema.prisma` completed with exit code `0` and empty SQL output using the disposable shadow database. | The PostgreSQL migration chain reproduces the checked schema at the verified base. |
| Staging migration status | `prisma migrate status --schema=prisma/postgres/schema.prisma` completed with exit code `0` using the private direct configuration. | Prisma reported no command failure. This noninteractive invocation produced no migration-name output, so it is not evidence for a per-migration list beyond the successful status check. |

## Safe Execution Boundary

The parity command used a disposable shadow database. It did not apply migrations to staging or production. The status command was read-only. No schema, application, data, or environment file was changed by RELEASE-002.

## Current Release Interpretation

The PostgreSQL shadow-parity gate is **passed** for base `159ba85`. This does not authorize deployment by itself.

SQLite migration hygiene remains separate development work:

- `MIGRATION-002` supplies an unintegrated initial SQLite baseline.
- `MIGRATION-003` identified missing SQLite Mashwara foreign keys.
- `MIGRATION-004` is in progress to add a forward-only SQLite repair migration.

These SQLite changes must be reviewed and integrated into a clean release candidate before their status can be considered part of the release branch.

## Remaining Gates Before Shared Staging Deployment

1. Review and integrate the approved migration packages into one clean release candidate.
2. Re-run PostgreSQL parity against that exact release-candidate commit if its PostgreSQL schema or migrations change.
3. Run the relevant lint, typecheck, test suite, and PostgreSQL production build on the release candidate.
4. Complete browser UAT for role boundaries and mobile layouts.
5. Before any command that modifies a shared staging database, confirm a recent restorable backup or snapshot and obtain owner deployment approval.

## Explicit Non-Actions

- No `prisma migrate deploy` was run.
- No staging or production database was modified.
- No backup was created or inspected; development-only work does not require one.
- No secret value was printed, copied, or committed.
