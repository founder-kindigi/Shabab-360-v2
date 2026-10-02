# ATT01 PostgreSQL disposable replay

**Date:** 2026-09-18
**Status:** `READY_FOR_PRODUCTION_PREFLIGHT`
**Scope:** Fresh, disposable local PostgreSQL replay only. This is not production migration, deployment, account provisioning, or team-pilot approval.

## Environment and containment

An official `postgres:18` Docker image was downloaded after owner approval. Its
reported digest was `sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280`.

The verification container was named `shabab-att01-postgres` and configured with
`--network none`, no published ports, no bind mounts, no Docker volume, and
`--rm`. Docker inspection confirmed `network=none` and no container IP address.
It was removed after the checks. The image remains only in Docker's local image
cache for future disposable verification.

No `.env`, operational credential, production, staging, LAN, or cloud database
was used.

## Fresh migration replay

All **32** PostgreSQL migration folders were copied into the disposable container
and applied in timestamp order to an empty `astra_synthetic_review` database.
Each successful migration was then recorded in a container-local
`att01_replay_ledger` table.

| Check | Result |
| --- | --- |
| Migration folders replayed | 32 / 32 |
| Replay ledger entries | 32, each unique |
| Replay failure | None |
| `operation_receipts` table | One table with `id`, `requestHash`, `resultJson`, `createdAt` |
| `operation_receipts` primary key | Exactly one |
| `staff_meta_assistsMurabbiId_fkey` | Present as one foreign key |
| Schema dump | `pg_dump --schema-only` succeeded |
| Active-city batch uniqueness | Duplicate active batch was denied in a synthetic city/park fixture |

The replay emitted only expected PostgreSQL notices for already-created columns
inside guarded migrations. No migration SQL was edited for this verification.

## Additional repository validation

| Command | Result |
| --- | --- |
| `npx vitest run src/lib/migrations src/__tests__/release` | 8 files, 204 tests passed |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with 0 errors and 6 pre-existing warnings |

## Data impact and rollback

The replay database existed only in the container's writable layer. Removing the
`--rm` container deleted the database, replay ledger, copied migration files, and
synthetic fixture rows. No host database, including `prisma/dev.db`, was opened or
changed. No rollback is required.

## Remaining release-preparation work

1. Review and commit the untracked Muawin migration folders together with their
   matching schema changes and the updated migration-count assertions.
2. Extend the M01 preflight extractor to model unguarded foreign keys, including
   `staff_meta_assistsMurabbiId_fkey`, before using it as a complete operational
   compatibility proof.
3. Complete the production runbook, authorized backup, production preflight,
   import, role provisioning, and post-provisioning smoke checks in that order.

This report proves that the current 32-folder PostgreSQL chain replays on a fresh
local PostgreSQL 18 instance. It does not prove compatibility with an existing
operational database or authorize any live action.
