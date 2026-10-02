# Production migration impact review — 2026-09-15

## Decision: do not deploy the eight migrations

The approved aggregate-only production preflight found **12 participants with a
null group assignment**. Migration `20260909050000_align_modeled_constraints`
originally changed `participants.groupId` to required; U01 revised that staged
migration to keep the group relation nullable, so those records are a supported
state rather than a migration blocker. No database write occurred.

## Preflight evidence

- Prisma migration status: eight PostgreSQL migrations are pending.
- `participants` with null `groupId`: 12.
- Batch-city conflict rows: 0.
- No identities, row values, credentials, or private data were read or printed.

## Migration-by-migration impact

| Migration | Effect | Production risk |
| --- | --- | --- |
| 20260827090000 | Adds team document-link and external-link-policy tables/indexes. | Fails if equivalent unmanaged tables already exist. |
| 20260907114612 | Adds evaluations, park lessons and routine-slot tables/indexes. | New persisted product data; table-name collision risk. |
| 20260909010000 | Adds durable login throttle table/index. | Low, additive; restores the missing login dependency. |
| 20260909020000 | Adds operation-receipt table. | Low, additive; needed for idempotent operations. |
| 20260909030000 | Restores 14 modeled finance, stock, messaging, points, resource and profile constraints. | Highest DDL surface; creates tables, indexes and foreign keys; collision and existing-data constraint risk. |
| 20260909040000 | Backfills batch city, adds one-active-batch constraint and triggers. | Can reject inconsistent data or duplicate active city batches. |
| 20260909050000 | Aligns FKs, defaults and registration fields; keeps the participant group nullable. | Low for the group column; the remaining constraint/default surface still applies. |
| 20260909060000 | Adds two performance indexes. | Low; may take locks while built. |
| 20260909070000 | Adds attendance reset version with default zero. | Low additive table rewrite/lock consideration. |

## Safe recovery sequence

1. No reconciliation mapping is required: unassigned participants are a
   supported state, and no group may be assigned by guesswork.
2. Run a broader read-only schema-collision and active-batch uniqueness
   preflight.
3. Take a production backup/snapshot and schedule a maintenance window.
4. Re-run full migration status and the aggregate integrity checks.
5. Apply the ordered migration set only after all blockers are zero, then
   verify login and the affected schema artifacts.

## Immediate login mitigation

The login failure is explained by the missing throttle migration, but applying
only it would leave migration history intentionally out of order. A throttle-only
emergency procedure remains possible only as a separately reviewed and
explicitly authorized operation. It is not performed by this review.