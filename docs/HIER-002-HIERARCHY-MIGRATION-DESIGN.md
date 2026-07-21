# HIER-002: Batch → City / Group → (Park + Batch) Migration Design

**Task:** HIER-002  
**Owner:** Claude  
**Status:** Draft — pending Codex review  
**Created:** 2026-07-21  
**Scope:** Migration, rollback, and Lahore reconciliation design for the
hierarchy change. Docs only — no code, schema, migrations, secrets, or data
changes.

---

## 1. Problem Statement

The deployed staging database uses the **old** hierarchy model:

```
Old:  City → Park → Batch → Group
       Batch.parkId FK → parks(id)
       Group.batchId  FK → batches(id)  (no parkId on Group)
```

The application code and both Prisma schemas have already been updated to the
**new** hierarchy model:

```
New:  City → Park        City → Batch
       Group.parkId FK → parks(id)
       Group.batchId FK → batches(id)
       Batch.cityId FK → cities(id)     (no parkId on Batch)
```

The invariant to enforce: **Batch belongs to City; Group belongs to exactly one
Batch and one Park in that same City** (i.e., `group.park.cityId ===
group.batch.cityId`).

### Current staging state (Lahore import, 2026-07-20)

| Entity | Count | Current FK shape |
| --- | --- | --- |
| Cities | 1 (Lahore, `LHR`) | — |
| Parks | 6 | `parks.cityId` → `cities(id)` |
| Batches | 6 (one per park, all named "Batch 4") | `batches.parkId` → `parks(id)` |
| Groups | 13 | `groups.batchId` → `batches(id)`, no `parkId` |
| Participants | 277 | `participants.groupId` → `groups(id)` |
| Attendance events | 180 | `attendance_events.groupId` → `groups(id)` |
| Attendance records | 2,967 | `attendance_records.eventId` → `attendance_events(id)` |
| Fee events | 0 | `fee_events.batchId` → `batches(id)` |
| Batch settings | 0 | `batch_settings.batchId` → `batches(id)` |
| Staff (placeholders) | 51 + 1 system | `staff_meta.assignedParkId` → `parks(id)` |
| Content plans | 0 | `content_plans.batchId` → `batches(id)` |

### Key data observation

Because the Lahore importer created **one batch per park**, and each group
belongs to exactly one batch, every group is implicitly already associated with
exactly one park through its batch. The migration can derive `group.parkId`
deterministically:

```
group.parkId = group.batch.parkId   (before the column is removed from batches)
```

And the batch's owning city is also deterministic:

```
batch.cityId = batch.park.cityId    (before parkId is removed from batches)
```

---

## 2. Forward Migration Sequence

The migration must be a single versioned Prisma migration SQL file, executed
atomically within a transaction. All steps below occur within that transaction.

### Step 1: Add new columns (nullable)

```sql
-- Add cityId to batches (nullable initially for safe backfill)
ALTER TABLE "batches" ADD COLUMN "cityId" TEXT;

-- Add parkId to groups (nullable initially for safe backfill)
ALTER TABLE "groups" ADD COLUMN "parkId" TEXT;
```

### Step 2: Backfill batch.cityId from park.cityId

```sql
-- Every batch currently has a parkId; derive cityId from the park's city
UPDATE "batches"
SET "cityId" = (
  SELECT "parks"."cityId"
  FROM "parks"
  WHERE "parks"."id" = "batches"."parkId"
);
```

**Assertion:** After this step, zero batches should have a NULL `cityId`.

```sql
-- Verify: must return 0
SELECT COUNT(*) FROM "batches" WHERE "cityId" IS NULL;
```

### Step 3: Backfill group.parkId from batch.parkId

```sql
-- Every group currently has a batchId; derive parkId from the batch's park
UPDATE "groups"
SET "parkId" = (
  SELECT "batches"."parkId"
  FROM "batches"
  WHERE "batches"."id" = "groups"."batchId"
);
```

**Assertion:** After this step, zero groups should have a NULL `parkId`.

```sql
-- Verify: must return 0
SELECT COUNT(*) FROM "groups" WHERE "parkId" IS NULL;
```

### Step 4: Enforce NOT NULL constraints

```sql
ALTER TABLE "batches" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "groups" ALTER COLUMN "parkId" SET NOT NULL;
```

### Step 5: Add foreign key constraints

```sql
ALTER TABLE "batches" ADD CONSTRAINT "batches_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "groups" ADD CONSTRAINT "groups_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 6: Add indexes

```sql
-- Replace the old batchId-only index with a composite park+batch+active index
DROP INDEX IF EXISTS "groups_batchId_isActive_idx";

CREATE INDEX "groups_parkId_batchId_isActive_idx"
  ON "groups"("parkId", "batchId", "isActive");
```

### Step 7: Remove the old batch→park relationship

```sql
-- Drop the old FK constraint first
ALTER TABLE "batches" DROP CONSTRAINT "batches_parkId_fkey";

-- Drop the old column
ALTER TABLE "batches" DROP COLUMN "parkId";
```

### Step 8: Verify same-city invariant

This is a post-migration assertion, not a schema constraint (PostgreSQL cannot
enforce cross-table invariants via CHECK). It must be verified in the migration
script and enforced by the application.

```sql
-- Must return 0 rows. Any row here means a group links a park in one city
-- to a batch in a different city.
SELECT g."id" AS group_id, g."parkId", g."batchId",
       p."cityId" AS park_city, b."cityId" AS batch_city
FROM "groups" g
JOIN "parks" p ON p."id" = g."parkId"
JOIN "batches" b ON b."id" = g."batchId"
WHERE p."cityId" != b."cityId";
```

---

## 3. Complete Migration SQL

```sql
-- Migration: Change Batch from park-owned to city-owned;
-- add parkId to Group for direct park membership.
-- Hierarchy rule: Batch belongs to City; Group belongs to
-- exactly one Batch and one Park in that same City.

-- Step 1: Add new columns (nullable for backfill)
ALTER TABLE "batches" ADD COLUMN "cityId" TEXT;
ALTER TABLE "groups" ADD COLUMN "parkId" TEXT;

-- Step 2: Backfill batch.cityId from the batch's current park's city
UPDATE "batches"
SET "cityId" = (
  SELECT "parks"."cityId"
  FROM "parks"
  WHERE "parks"."id" = "batches"."parkId"
);

-- Step 3: Backfill group.parkId from the group's current batch's park
UPDATE "groups"
SET "parkId" = (
  SELECT "batches"."parkId"
  FROM "batches"
  WHERE "batches"."id" = "groups"."batchId"
);

-- Step 4: Enforce NOT NULL after backfill
ALTER TABLE "batches" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "groups" ALTER COLUMN "parkId" SET NOT NULL;

-- Step 5: Add new foreign keys
ALTER TABLE "batches" ADD CONSTRAINT "batches_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "groups" ADD CONSTRAINT "groups_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Replace old index, add new composite index
DROP INDEX IF EXISTS "groups_batchId_isActive_idx";
CREATE INDEX "groups_parkId_batchId_isActive_idx"
  ON "groups"("parkId", "batchId", "isActive");

-- Step 7: Remove old batch→park relationship
ALTER TABLE "batches" DROP CONSTRAINT "batches_parkId_fkey";
ALTER TABLE "batches" DROP COLUMN "parkId";
```

---

## 4. Lahore Data Transformation Detail

### 4.1 Batch transformation

Each of the 6 Lahore batches was imported as park-owned. After migration:

| Batch (all "Batch 4") | Old: parkId | New: cityId | Source |
| --- | --- | --- | --- |
| State Life School | → State Life School park | → Lahore city | `parks.cityId` of State Life School |
| Iqbal Park | → Iqbal Park park | → Lahore city | `parks.cityId` of Iqbal Park |
| _(4 more parks)_ | → respective park | → Lahore city | Same derivation |

All 6 batches will have `cityId` = Lahore's city ID, since all 6 parks belong
to Lahore.

### 4.2 Group transformation

Each of the 13 groups was imported with only a `batchId`. After migration, each
group gains a `parkId` derived from its batch's old `parkId`:

| Group | Old: batchId only | New: batchId + parkId |
| --- | --- | --- |
| Group in SLS batch | → SLS batch | → SLS batch + SLS park |
| Group in Iqbal batch | → Iqbal batch | → Iqbal batch + Iqbal park |

### 4.3 Same-city invariant verification

Since all 6 parks and all 6 batches belong to Lahore, the invariant
`group.park.cityId === group.batch.cityId` is trivially satisfied for all 13
groups. The verification query (Step 8) will return 0 rows.

### 4.4 Downstream FK chain after migration

```
Participant → Group → Park → City
                   → Batch → City   (same cityId as Park)
AttendanceEvent → Group → Park → City
                        → Batch → City
FeeEvent → Batch → City
BatchSettings → Batch → City
ContentPlan → City (direct)
            → Batch → City (optional)
            → Park → City (optional)
```

No downstream table FKs change. `participants.groupId`, `attendance_events.groupId`,
`fee_events.batchId`, and `batch_settings.batchId` all remain valid because the
migration does not change any primary key values.

---

## 5. Risks And Mitigations

### 5.1 NULL backfill failure

**Risk:** A batch has no matching park (orphaned parkId), or a group has no
matching batch, causing the backfill to leave NULLs and the NOT NULL step to
fail.

**Mitigation:** The import was atomic and all FK constraints were enforced at
import time. The count assertions in Steps 2–3 will catch any gap. If any NULL
remains, abort the migration.

### 5.2 Cross-city group after migration

**Risk:** A group could end up linking a park in City A to a batch in City B.

**Mitigation:** In the Lahore data, all parks and batches are in the same city.
The Step 8 verification query catches any violation. Additionally, the
application already enforces this at group creation time (the group POST route
verifies `park.cityId === batch.cityId`).

**Future enforcement:** When multi-city data exists, consider adding a database
trigger or a scheduled consistency check. A CHECK constraint cannot enforce this
because it requires a cross-table join.

### 5.3 Cascade behavior change

**Risk:** Dropping `batches.parkId` FK changes cascade behavior. Previously,
deleting a park would cascade-delete its batches. After migration, deleting a
park cascade-deletes its groups (via `groups.parkId`), but batches are deleted
via `batches.cityId → cities(id)` cascade, not park deletion.

**Mitigation:** This is the **intended behavior**. Batches are city-level
entities. Deleting a park should not delete the city's batch; it should delete
the park's groups. The application uses soft-delete (`isActive = false`) for
both parks and batches, so hard cascade-delete is a safety net, not normal
operations.

### 5.4 Lahore "one batch per park" → city-owned consolidation

**Risk:** The Lahore import created 6 separate "Batch 4" records (one per
park). After migration, all 6 will belong to Lahore. This means Lahore has 6
batches all named "Batch 4", which is semantically redundant.

**Mitigation:** This is a **data design decision, not a migration risk**. The
migration preserves all existing records and relationships without merging.
Merging the 6 batches into 1 would require reassigning all groups and
downstream FKs, which is a separate task requiring owner approval. The current
approach is safe and non-destructive.

**Recommendation:** After the migration is verified, the owner may approve a
consolidation step to merge the 6 park-specific batches into a single
city-level "Batch 4". That step is explicitly out of scope for HIER-002.

### 5.5 Content plan FK impact

**Risk:** The `content_plans` table has optional `batchId` and `parkId` FKs.
The batch FK currently points to `batches(id)` which has `parkId`. After
migration, `batches` loses `parkId`, but `content_plans.batchId` FK remains
valid because it points to `batches(id)` (primary key), not `batches(parkId)`.

**Mitigation:** No content plan rows exist in staging. The FK chain is
unaffected.

### 5.6 Fee event FK impact

**Risk:** `fee_events.batchId` → `batches(id)`. After migration, the batch
loses `parkId` but keeps its primary key.

**Mitigation:** No fee event rows exist in staging. The FK remains valid.

### 5.7 Import script compatibility

**Risk:** The Lahore import script (`scripts/import-lahore-batch-4-staging.cjs`)
uses the old schema (`parkId` on batch, no `parkId` on group). Re-running it
after migration would fail.

**Mitigation:** The import script has a non-idempotent guard (refuses if
`LHR` city already exists). It cannot be re-run against the migrated staging.
If a fresh import is needed, the staging must be reset first and the import
script must be updated to use the new schema shape.

---

## 6. Rollback And Recovery

### 6.1 Pre-migration backup

Before executing the migration on staging:

1. Run `pg_dump` of the staging database to an encrypted local file.
2. Record the dump checksum.
3. Verify the dump can be restored to a disposable local PostgreSQL instance.

### 6.2 Rollback migration SQL

If the forward migration must be reverted:

```sql
-- Rollback: Restore Batch.parkId and remove Group.parkId, Batch.cityId

-- Step R1: Add parkId back to batches (nullable for backfill)
ALTER TABLE "batches" ADD COLUMN "parkId" TEXT;

-- Step R2: Backfill batch.parkId from group data
-- Because each batch was originally one-per-park, and groups now have parkId,
-- we can derive the original parkId from any group in that batch.
UPDATE "batches"
SET "parkId" = (
  SELECT DISTINCT g."parkId"
  FROM "groups" g
  WHERE g."batchId" = "batches"."id"
  LIMIT 1
);

-- Step R2b: Handle batches with no groups (unlikely but safe)
-- If any batch has no groups, derive parkId from the batch's city and any park
-- in that city. This is a best-effort recovery; the original 1:1 park mapping
-- cannot be perfectly reconstructed if groups were reassigned.
-- For Lahore data, every batch has at least one group, so this is defensive.
UPDATE "batches"
SET "parkId" = (
  SELECT "parks"."id"
  FROM "parks"
  WHERE "parks"."cityId" = "batches"."cityId"
  LIMIT 1
)
WHERE "parkId" IS NULL;

-- Step R3: Enforce NOT NULL
ALTER TABLE "batches" ALTER COLUMN "parkId" SET NOT NULL;

-- Step R4: Re-add FK and cascade
ALTER TABLE "batches" ADD CONSTRAINT "batches_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step R5: Drop new columns and constraints
ALTER TABLE "groups" DROP CONSTRAINT "groups_parkId_fkey";
ALTER TABLE "groups" DROP COLUMN "parkId";

ALTER TABLE "batches" DROP CONSTRAINT "batches_cityId_fkey";
ALTER TABLE "batches" DROP COLUMN "cityId";

-- Step R6: Restore old index
DROP INDEX IF EXISTS "groups_parkId_batchId_isActive_idx";
CREATE INDEX "groups_batchId_isActive_idx"
  ON "groups"("batchId", "isActive");
```

### 6.3 Rollback limitations

- **R2 is lossy if batches were modified after migration.** If a new batch was
  created at the city level (without a park association), rollback cannot assign
  it a `parkId`. In that case, rollback would require manual data decisions.
- **R2b is best-effort.** If multiple parks exist in a city and a batch has no
  groups, the rollback picks an arbitrary park. This only affects
  post-migration data; the original Lahore import data is fully recoverable.
- **Preferred rollback:** Restore from the pre-migration `pg_dump` backup
  rather than running the rollback SQL, especially if post-migration writes
  occurred. The rollback SQL is provided for cases where a backup restore is
  not feasible and only schema shape needs to be reverted.

---

## 7. Dry-Run Checks

Before executing the migration on staging, run these verification queries
against the current staging database to confirm preconditions.

### 7.1 Pre-migration data inventory

```sql
-- Verify expected record counts
SELECT 'cities' AS entity, COUNT(*) AS count FROM "cities"
UNION ALL SELECT 'parks', COUNT(*) FROM "parks"
UNION ALL SELECT 'batches', COUNT(*) FROM "batches"
UNION ALL SELECT 'groups', COUNT(*) FROM "groups"
UNION ALL SELECT 'participants', COUNT(*) FROM "participants"
UNION ALL SELECT 'attendance_events', COUNT(*) FROM "attendance_events"
UNION ALL SELECT 'attendance_records', COUNT(*) FROM "attendance_records"
UNION ALL SELECT 'fee_events', COUNT(*) FROM "fee_events"
UNION ALL SELECT 'batch_settings', COUNT(*) FROM "batch_settings"
UNION ALL SELECT 'content_plans', COUNT(*) FROM "content_plans";
```

Expected:

| Entity | Count |
| --- | --- |
| cities | 1 |
| parks | 6 |
| batches | 6 |
| groups | 13 |
| participants | 277 |
| attendance_events | 180 |
| attendance_records | 2,967 |
| fee_events | 0 |
| batch_settings | 0 |
| content_plans | 0 |

### 7.2 Verify every batch has a valid parkId

```sql
SELECT b."id", b."name", b."parkId", p."id" AS park_exists
FROM "batches" b
LEFT JOIN "parks" p ON p."id" = b."parkId"
WHERE p."id" IS NULL;
```

Must return 0 rows.

### 7.3 Verify every batch's park belongs to a city

```sql
SELECT b."id", b."parkId", p."cityId"
FROM "batches" b
JOIN "parks" p ON p."id" = b."parkId"
WHERE p."cityId" IS NULL;
```

Must return 0 rows.

### 7.4 Verify every group has a valid batchId

```sql
SELECT g."id", g."batchId", b."id" AS batch_exists
FROM "groups" g
LEFT JOIN "batches" b ON b."id" = g."batchId"
WHERE b."id" IS NULL;
```

Must return 0 rows.

### 7.5 Preview the transformation

```sql
-- Preview: what cityId each batch will get
SELECT b."id" AS batch_id, b."name" AS batch_name, b."parkId",
       p."name" AS park_name, p."cityId", c."name" AS city_name
FROM "batches" b
JOIN "parks" p ON p."id" = b."parkId"
JOIN "cities" c ON c."id" = p."cityId";

-- Preview: what parkId each group will get
SELECT g."id" AS group_id, g."name" AS group_name, g."batchId",
       b."parkId" AS derived_parkId, p."name" AS park_name
FROM "groups" g
JOIN "batches" b ON b."id" = g."batchId"
JOIN "parks" p ON p."id" = b."parkId";
```

### 7.6 Verify column does not already exist

```sql
-- Ensure the migration has not been partially applied
SELECT column_name FROM information_schema.columns
WHERE table_name = 'batches' AND column_name = 'cityId';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'groups' AND column_name = 'parkId';
```

Both must return 0 rows.

---

## 8. Post-Migration Reconciliation

After the migration executes, run these checks to confirm success.

### 8.1 Schema shape verification

```sql
-- batches must have cityId, must NOT have parkId
SELECT column_name FROM information_schema.columns
WHERE table_name = 'batches' AND column_name IN ('cityId', 'parkId');
-- Expected: only 'cityId'

-- groups must have both parkId and batchId
SELECT column_name FROM information_schema.columns
WHERE table_name = 'groups' AND column_name IN ('parkId', 'batchId');
-- Expected: both 'parkId' and 'batchId'
```

### 8.2 FK verification

```sql
SELECT tc.constraint_name, tc.table_name, kcu.column_name,
       ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('batches', 'groups')
ORDER BY tc.table_name, kcu.column_name;
```

Expected constraints:

| Table | Column | Foreign table |
| --- | --- | --- |
| batches | cityId | cities |
| groups | batchId | batches |
| groups | parkId | parks |

The old `batches_parkId_fkey` must NOT appear.

### 8.3 Data integrity checks

```sql
-- All batches have non-null cityId
SELECT COUNT(*) AS null_city_batches FROM "batches" WHERE "cityId" IS NULL;
-- Expected: 0

-- All groups have non-null parkId
SELECT COUNT(*) AS null_park_groups FROM "groups" WHERE "parkId" IS NULL;
-- Expected: 0

-- Same-city invariant holds
SELECT COUNT(*) AS violations
FROM "groups" g
JOIN "parks" p ON p."id" = g."parkId"
JOIN "batches" b ON b."id" = g."batchId"
WHERE p."cityId" != b."cityId";
-- Expected: 0
```

### 8.4 Record count parity

```sql
-- Counts must match pre-migration values exactly
SELECT 'batches' AS entity, COUNT(*) FROM "batches"
UNION ALL SELECT 'groups', COUNT(*) FROM "groups"
UNION ALL SELECT 'participants', COUNT(*) FROM "participants"
UNION ALL SELECT 'attendance_events', COUNT(*) FROM "attendance_events"
UNION ALL SELECT 'attendance_records', COUNT(*) FROM "attendance_records";
```

All counts must match the pre-migration inventory (Section 7.1).

### 8.5 Index verification

```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('batches', 'groups')
ORDER BY tablename, indexname;
```

Expected: `groups_parkId_batchId_isActive_idx` exists;
`groups_batchId_isActive_idx` does not exist.

---

## 9. Test Strategy

### 9.1 Unit/integration tests (pre-deployment)

After updating the Prisma schemas to reflect the new hierarchy, the following
tests must pass:

- Existing batch CRUD tests verify `cityId` is required and `parkId` is not
  accepted.
- Existing group CRUD tests verify both `parkId` and `batchId` are required.
- **New test:** Group creation with cross-city park/batch is rejected (park's
  city ≠ batch's city).
- **New test:** Group list scoped by city head returns only groups in that
  city's parks.
- Scope tests for `requireResourceScope` with the new batch→city chain.
- Attendance, fee, and certificate tests continue to pass with the new FK
  chain.

### 9.2 Migration-specific tests

- Run the dry-run queries (Section 7) against a local PostgreSQL instance with
  a copy of the staging data.
- Execute the forward migration, then run the reconciliation queries
  (Section 8).
- Execute the rollback migration (Section 6.2), then verify the old schema
  shape is restored and counts match.
- Re-execute the forward migration after rollback to verify idempotency of the
  rollback → forward cycle.

### 9.3 Browser UAT

See [HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md](HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md)
for the complete browser UAT plan covering all five staff roles.

---

## 10. Execution Order

| Step | Action | Owner | Gate |
| --- | --- | --- | --- |
| 1 | Review and approve this design | Codex + Owner | Design approval |
| 2 | Take encrypted `pg_dump` of staging | Codex | Backup verified |
| 3 | Update Prisma postgres schema to match new model | Codex | Schema diff reviewed |
| 4 | Generate Prisma migration SQL from schema diff | Codex | SQL matches Section 3 |
| 5 | Run dry-run queries against staging (Section 7) | Codex | All checks pass |
| 6 | Apply migration to staging | Codex | Owner approval |
| 7 | Run post-migration reconciliation (Section 8) | Codex | All checks pass |
| 8 | Run lint, typecheck, tests, PostgreSQL build | Codex | All pass |
| 9 | Execute browser UAT per HIER-003 | Gemini/Codex | UAT pass |
| 10 | Update import script if a fresh import is needed | Codex | Script matches new schema |

---

## 11. Intentional Exclusions

- **Batch consolidation:** Merging the 6 park-specific "Batch 4" records into
  a single city-level batch is not part of this migration. It requires owner
  approval and downstream FK reassignment.
- **Application code changes:** Code already uses `cityId` on batch and `parkId`
  on group. No application code changes are required by this migration.
- **Same-city database trigger:** A PostgreSQL trigger could enforce the
  cross-table invariant at the database level. This is recommended but deferred
  to a separate task to keep this migration focused.
- **SQLite schema update:** The SQLite schema (`prisma/schema.prisma`) already
  reflects the new model. No SQLite migration is needed (SQLite uses `db push`).
- **Multi-city testing:** Testing with multiple cities requires creating a
  second city after migration. This is covered in the HIER-003 UAT plan, not
  in the migration itself.
