# HIER-002: Batch-To-City / Group-Batch-Park Migration Design

**Task:** HIER-002  
**Owner:** Claude  
**Status:** Draft — pending Codex review  
**Created:** 2026-07-21  
**Scope:** PostgreSQL forward migration, existing Lahore data transformation,
same-city invariant, indexes/FKs, rollback/recovery, dry-run checks and
verification tests. Docs only; no schema, code, or data changes.

---

## 1. Invariant

> **Batch belongs to City; Group belongs to exactly one Batch and one Park in
> that same City.**

This replaces the current model where Batch belongs to Park and Group belongs
only to Batch.

---

## 2. Current Model (before migration)

```
City
 └── Park (cityId FK → City)
      └── Batch (parkId FK → Park)
           └── Group (batchId FK → Batch)
                └── Participant (groupId FK → Group)
                └── AttendanceEvent (groupId FK → Group)
                └── StaffMeta.murabbi (assignedGroupId FK → Group)
      └── StaffMeta.park_staff (assignedParkId FK → Park)
      └── ContentPlan (parkId FK → Park nullable)
      └── AdmissionApplication (preferredParkId FK → Park nullable)

City
 └── StaffMeta.city_heads (assignedCityId FK → City)
 └── CollaborationTeam (cityId FK → City)
 └── ContentPlan (cityId FK → City)
 └── AdmissionApplication (cityId FK → City nullable)

Batch
 └── BatchSettings (batchId FK → Batch)
 └── FeeEvent (batchId FK → Batch)
 └── ContentPlan (batchId FK → Batch nullable)
```

---

## 3. Target Model (after migration)

```
City
 ├── Park (cityId FK → City) — unchanged
 ├── Batch (cityId FK → City) — NEW: batch is now city-owned
 ├── StaffMeta.city_heads — unchanged
 ├── CollaborationTeam — unchanged
 ├── ContentPlan — unchanged
 └── AdmissionApplication — unchanged

Park (cityId FK → City) — unchanged

Batch (cityId FK → City, NOT NULL)
 └── Group (batchId FK → Batch, parkId FK → Park) — NEW: parkId on Group
 └── BatchSettings — unchanged
 └── FeeEvent — unchanged
 └── ContentPlan — unchanged

Group (batchId FK → Batch, parkId FK → Park, NOT NULL)
 ├── Participant — unchanged
 ├── AttendanceEvent — unchanged
 ├── StaffMeta.murabbi — unchanged
 └── SAME-CITY CHECK constraint: park.cityId = batch.cityId
```

### Model changes summary

| Entity | Change |
|--------|--------|
| `Batch` | Remove `parkId`, add `cityId` (NOT NULL). FK → City. |
| `Group` | Add `parkId` (NOT NULL). FK → Park. |
| — | Add `Group` index on `[batchId, parkId]` |
| — | Add `Batch` index on `[cityId, isActive]` |
| — | Same-city invariant enforced via application + optional DB constraint |

### Indexes and foreign keys

**New/updated indexes:**

| Table | Index | Purpose |
|-------|-------|---------|
| `Batch` | `[cityId, isActive]` | City-scoped batch listing |
| `Group` | `[batchId, parkId]` | Lookup by batch + park |
| `Group` | `[parkId, isActive]` | Park-scoped group listing |
| `Group` | `[batchId, parkId, isActive]` | Composite scope filter |

**Foreign keys:**

| FK | From | To | Rule |
|----|------|----|----|
| `Batch.cityId` | `Batch` | `City` | `ON DELETE RESTRICT` (prevent city deletion with active batches) |
| `Group.parkId` | `Group` | `Park` | `ON DELETE RESTRICT` (prevent park deletion with active groups) |
| `Group.batchId` | `Group` | `Batch` | `ON DELETE RESTRICT` (already present, change from Cascade) |

The existing `ON DELETE CASCADE` on `Group.batchId` and `Batch.parkId` posed an
implicit data-loss risk. The new design uses `RESTRICT` for the top-level
hierarchy links; application-level soft-delete (isActive = false) replaces hard
deletion, and the cascade is preserved only for dependent child records
(Participant, AttendanceEvent) through their existing FK rules.

---

## 4. PostgreSQL Forward Migration Sequence

> **Important:** This migration targets the PostgreSQL schema in
> `prisma/postgres/schema.prisma`. The SQLite schema used for local development
> must also be updated to match, but the forward migration SQL below is written
> for PostgreSQL.

### Migration 1: Add cityId to Batch, add parkId to Group

```sql
-- Step 1: Add the new columns as nullable first to populate existing data
ALTER TABLE "batches" ADD COLUMN "cityId" TEXT;
ALTER TABLE "groups" ADD COLUMN "parkId" TEXT;

-- Step 2: Populate cityId on Batch from the owning Park
UPDATE "batches" SET "cityId" = "parks"."cityId"
FROM "parks"
WHERE "batches"."parkId" = "parks"."id";

-- Step 3: Populate parkId on Group from the owning Batch's Park
UPDATE "groups" SET "parkId" = "parks"."id"
FROM "batches"
JOIN "parks" ON "batches"."parkId" = "parks"."id"
WHERE "groups"."batchId" = "batches"."id";

-- Step 4: Verify all rows are populated
-- Both queries must return 0 rows
SELECT COUNT(*) FROM "batches" WHERE "cityId" IS NULL;
SELECT COUNT(*) FROM "groups" WHERE "parkId" IS NULL;

-- Step 5: Make columns NOT NULL
ALTER TABLE "batches" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "groups" ALTER COLUMN "parkId" SET NOT NULL;

-- Step 6: Add foreign keys
ALTER TABLE "batches" ADD CONSTRAINT "batches_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT;

ALTER TABLE "groups" ADD CONSTRAINT "groups_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE RESTRICT;

-- Update existing batch FK from CASCADE to RESTRICT
ALTER TABLE "groups" DROP CONSTRAINT "groups_batchId_fkey",
  ADD CONSTRAINT "groups_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT;

-- Step 7: Drop old column and FK on Batch
ALTER TABLE "batches" DROP CONSTRAINT "batches_parkId_fkey";
ALTER TABLE "batches" DROP COLUMN "parkId";

-- Step 8: Add indexes
CREATE INDEX IF NOT EXISTS "batches_cityId_isActive_idx"
  ON "batches"("cityId", "isActive");
CREATE INDEX IF NOT EXISTS "groups_batchId_parkId_idx"
  ON "groups"("batchId", "parkId");
CREATE INDEX IF NOT EXISTS "groups_parkId_isActive_idx"
  ON "groups"("parkId", "isActive");
CREATE INDEX IF NOT EXISTS "groups_batchId_parkId_isActive_idx"
  ON "groups"("batchId", "parkId", "isActive");
```

### Same-city invariant check constraint (optional)

PostgreSQL cannot express a跨-table CHECK constraint natively. The same-city
invariant is enforced at the application layer. For an additional safety layer,
a trigger-based check can be added:

```sql
CREATE OR REPLACE FUNCTION check_group_same_city()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT "cityId" FROM "batches" WHERE "id" = NEW."batchId") !=
     (SELECT "cityId" FROM "parks" WHERE "id" = NEW."parkId") THEN
    RAISE EXCEPTION 'Group batch and park must belong to the same city';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_group_same_city
  BEFORE INSERT OR UPDATE OF "batchId", "parkId" ON "groups"
  FOR EACH ROW EXECUTE FUNCTION check_group_same_city();
```

**Decision:** Use the trigger in PostgreSQL for defense-in-depth. The trigger is
idempotent and can be applied independently of the schema migration.

---

## 5. Existing Lahore Data Transformation

The Lahore staging data currently has:
- 1 city (Lahore)
- 6 parks
- 6 batches (each owned by a specific park)
- 13 groups (each belonging to a specific batch)

### Transformation mapping

**Batch transformation:**
| Current Batch | Current parkId | Derived cityId | New cityId value |
|---|---|---|---|
| All 6 batches | Various Lahore parks | Lahore city | Lahore's city.id |

Since all existing Lahore parks belong to Lahore city, all 6 batches derive
`cityId = <Lahore city ID>`.

**Group transformation:**
| Current Group | Current batchId | Batch's park → parkId | New parkId value |
|---|---|---|---|
| All 13 groups | Various batches | The park owning that batch | The corresponding park.id |

Since each batch is owned by a specific park, each group derives `parkId` from
its batch's owning park.

### Same-city invariant verification

After transformation, every group will have:
- `park.cityId = batch.cityId = Lahore city ID`

This holds automatically because:
1. `Batch.cityId` is derived from `Park.cityId` (same city)
2. `Group.parkId` is derived from `Batch.parkId` → `Park.id` (same park)
3. `Group.batchId` remains unchanged (same batch)

No existing record violates the same-city invariant because Lahore has exactly
one city and all parks belong to it.

---

## 6. Affected Routes And Code

### Batch API routes

| Route | Current behavior | Migration impact |
|-------|-----------------|------------------|
| `GET /api/admin/batches` | Lists batches by city scope via park.cityId | Simplify: directly filter by `cityId` on Batch |
| `POST /api/admin/batches` | Creates batch with `parkId` | Change to `cityId` in Zod schema, create logic |
| `GET /api/admin/batches/[id]` | Reads batch | Return `cityId` instead of `parkId` in response |
| `PATCH /api/admin/batches/[id]` | Edits batch fields | Change `parkId` validation to `cityId` |
| `DELETE /api/admin/batches/[id]` | Soft-deletes batch | No change needed (already uses `isActive`) |

### Group API routes

| Route | Current behavior | Migration impact |
|-------|-----------------|------------------|
| `GET /api/admin/groups` | Lists groups; scope by park | Add `parkId` filter, same-city invariant |
| `POST /api/admin/groups` | Creates group with `batchId` only | Add `parkId` field; validate same-city invariant |
| `GET /api/admin/groups/[id]` | Reads group | Return `parkId` in response |
| `PATCH /api/admin/groups/[id]` | Edits group | May update `parkId`; revalidate same-city |
| `DELETE /api/admin/groups/[id]` | Soft-deletes group | No change |

### UI components

| Component | Migration impact |
|-----------|-----------------|
| `batches-page.tsx` | Batch create/edit forms: change park selector to city selector. Batch list: show city instead of park. |
| `groups-page.tsx` | Group create/edit forms: add park selector alongside batch selector; cross-filter parks and batches by same city. Group list: show park column. |

### Authorization helpers

The existing hierarchy-scope helpers in `src/lib/auth/` use `parkId` for batch
scoping. After migration, batch scope can be determined directly from
`Batch.cityId` instead of traversing `Batch → Park → City`.

---

## 7. Application-Layer Validation Changes

### Zod schemas

**Batch create schema (current → target):**
```typescript
// Current
const createBatchSchema = z.object({
  name: z.string().min(2).max(100),
  parkId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

// Target
const createBatchSchema = z.object({
  name: z.string().min(2).max(100),
  cityId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});
```

**Group create schema (current → target):**
```typescript
// Current
const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  batchId: z.string().cuid(),
});

// Target
const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  batchId: z.string().cuid(),
  parkId: z.string().cuid(),
});
```

### Same-city invariant enforcement

```typescript
// In POST /api/admin/groups route handler
export async function POST(req: Request) {
  const json = await req.json();
  const data = createGroupSchema.parse(json);
  
  // Verify same-city invariant
  const [batch, park] = await Promise.all([
    prisma.batch.findUnique({ where: { id: data.batchId }, select: { cityId: true } }),
    prisma.park.findUnique({ where: { id: data.parkId }, select: { cityId: true } }),
  ]);
  
  if (!batch || !park) {
    return NextResponse.json({ error: 'Batch or park not found' }, { status: 404 });
  }
  
  if (batch.cityId !== park.cityId) {
    return NextResponse.json(
      { error: 'Batch and park must belong to the same city' },
      { status: 400 }
    );
  }
  
  // Create group with both batchId and parkId
  const group = await prisma.group.create({
    data: { name: data.name, batchId: data.batchId, parkId: data.parkId },
  });
  
  return NextResponse.json(group, { status: 201 });
}
```

---

## 8. Upstream And Downstream Cascade Impact

### Records that reference Batch (unaffected by cityId change)

| Model | Field | Impact |
|-------|-------|--------|
| `BatchSettings` | `batchId` → Batch | No change; FK continues to Batch.id |
| `FeeEvent` | `batchId` → Batch | No change; fees remain batch-scoped |
| `ContentPlan` | `batchId` → Batch (nullable) | No change; content can still link to batch |
| `Group` | `batchId` → Batch | No change; groups remain linked to batch |
| `StaffMeta` | none | Scope remains through assignedParkId/assignedGroupId |

### Records that reference Park (unaffected by parkId addition on Group)

| Model | Field | Impact |
|-------|-------|--------|
| `StaffMeta` | `assignedParkId` → Park | No change; staff still assigned to parks |
| `ContentPlan` | `parkId` → Park (nullable) | No change |
| `AdmissionApplication` | `preferredParkId` → Park (nullable) | No change |

### Participant and attendance scope

Currently, participant scope is resolved through `Group → Batch → Park → City`.
After migration, it becomes `Group → Batch → City` (for batch scope) and
`Group → Park → City` (for park scope). Both paths must resolve to the same
city, which the invariant guarantees.

Attendance events reference `Group`, so they automatically follow the new
group→park link.

### Content plan impact

Content plans currently reference `Batch`, `Park`, and `City` independently.
The planner is designed so that a template plan lives at city scope, with
optional batch and park overrides. After migration, batch scoping still works
via `Batch.cityId`, and the existing `ContentPlan.batchId` FK is unchanged.

---

## 9. Rollback And Recovery

### Rollback strategy

If the migration must be rolled back before any application writes to the new
columns:

```sql
-- Step 1: Drop new columns and indexes
DROP INDEX IF EXISTS "batches_cityId_isActive_idx";
DROP INDEX IF EXISTS "groups_batchId_parkId_idx";
DROP INDEX IF EXISTS "groups_parkId_isActive_idx";

-- Step 2: Restore parkId on Batch
ALTER TABLE "batches" ADD COLUMN "parkId" TEXT;
UPDATE "batches" SET "parkId" = "parks"."id"
FROM "parks" WHERE "batches"."cityId" = "parks"."cityId";

-- For data where a city has multiple parks, the above UPDATE is ambiguous
-- and rollback requires a mapping table. See risk #1 below.
-- If unambiguous: use LIMIT 1 per row with a correlated subquery.

-- Step 3: Drop parkId on Group
ALTER TABLE "groups" DROP COLUMN "parkId";

-- Step 4: Drop cityId on Batch, restore parkId FK
ALTER TABLE "batches" DROP COLUMN "cityId";
ALTER TABLE "batches" ADD CONSTRAINT "batches_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE;

-- Restore batch FK on Group to CASCADE
ALTER TABLE "groups" DROP CONSTRAINT "groups_batchId_fkey",
  ADD CONSTRAINT "groups_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE;
```

### Risk 1: Ambiguous Batch → Park restoration

If a city has multiple parks, restoring `Batch.parkId` from `Batch.cityId` is
ambiguous because the batch no longer knows which park it originally belonged
to. **Mitigation:** Before running the rollback, a mapping table must exist:

```sql
-- Create during forward migration before dropping parkId
CREATE TABLE "_batch_park_mapping" (
  "batchId" TEXT PRIMARY KEY REFERENCES "batches"("id") ON DELETE CASCADE,
  "parkId" TEXT NOT NULL REFERENCES "parks"("id") ON DELETE RESTRICT
);

-- Populate before dropping parkId
INSERT INTO "_batch_park_mapping" ("batchId", "parkId")
  SELECT "id", "parkId" FROM "batches";
```

If rollback is not expected, this table can be a temporary measure or omitted
entirely with the understanding that rollback would require restoring from the
pre-migration backup.

### Risk 2: Application writes after migration

Once the application writes new batches (with `cityId` instead of `parkId`) or
new groups (with `parkId`), the pre-migration application cannot read or
display them correctly. **After Postgres accepts a live write from the new
application, never roll the deployment back to the old code.**

### Recovery procedure

1. Place the application in maintenance mode (stop writes).
2. Create a full PostgreSQL backup.
3. Run the rollback SQL against a copy of the database.
4. Verify rollback correctness with reconciliation queries.
5. Deploy the pre-migration application code.
6. Verify the application works correctly against the rolled-back database.
7. If verification fails, restore from the backup taken in step 2.

---

## 10. Dry-Run Checks

Before executing the migration on the staging database, run these verification
queries to confirm the data is ready:

### Pre-migration data audit

```sql
-- 1. Count existing batches and groups
SELECT COUNT(*) AS batch_count FROM "batches" WHERE "isActive" = true;
SELECT COUNT(*) AS group_count FROM "groups" WHERE "isActive" = true;

-- 2. Verify every batch has an active park
SELECT b.id, b.name FROM "batches" b
LEFT JOIN "parks" p ON b."parkId" = p.id
WHERE p.id IS NULL OR p."isActive" = false;
-- Expected: 0 rows

-- 3. Verify every group has an active batch
SELECT g.id, g.name FROM "groups" g
LEFT JOIN "batches" b ON g."batchId" = b.id
WHERE b.id IS NULL OR b."isActive" = false;
-- Expected: 0 rows

-- 4. Verify every park belongs to a city
SELECT p.id, p.name FROM "parks" p
LEFT JOIN "cities" c ON p."cityId" = c.id
WHERE c.id IS NULL;
-- Expected: 0 rows

-- 5. Cross-entity city consistency (pre-migration sanity check)
-- Every group's batch's park should belong to the same city
SELECT g.id AS group_id, g.name AS group_name,
  b.id AS batch_id, b.name AS batch_name,
  p."cityId" AS batch_park_city_id,
  pp."cityId" AS group_park_city_id
FROM "groups" g
JOIN "batches" b ON g."batchId" = b.id
JOIN "parks" p ON b."parkId" = p.id
JOIN "parks" pp ON pp.id = p.id  -- group has no park yet, check batch's park
WHERE p."cityId" != pp."cityId";
-- Expected: 0 rows (same park, always same city)
```

### Post-migration data audit

```sql
-- 6. Verify all batches have a cityId
SELECT COUNT(*) FROM "batches" WHERE "cityId" IS NULL;
-- Expected: 0

-- 7. Verify all groups have a parkId
SELECT COUNT(*) FROM "groups" WHERE "parkId" IS NULL;
-- Expected: 0

-- 8. Verify same-city invariant for all groups
SELECT g.id, g.name FROM "groups" g
JOIN "batches" b ON g."batchId" = b.id
JOIN "parks" p ON g."parkId" = p.id
WHERE b."cityId" != p."cityId";
-- Expected: 0 rows

-- 9. Verify foreign key integrity
SELECT COUNT(*) AS orphan_batches FROM "batches" b
  LEFT JOIN "cities" c ON b."cityId" = c.id WHERE c.id IS NULL;
SELECT COUNT(*) AS orphan_group_batches FROM "groups" g
  LEFT JOIN "batches" b ON g."batchId" = b.id WHERE b.id IS NULL;
SELECT COUNT(*) AS orphan_group_parks FROM "groups" g
  LEFT JOIN "parks" p ON g."parkId" = p.id WHERE p.id IS NULL;
-- All expected: 0

-- 10. Verify total counts match pre-migration
SELECT COUNT(*) AS batch_count FROM "batches";
SELECT COUNT(*) AS group_count FROM "groups";
-- Must match pre-migration counts
```

### Dry-run script

A dry-run verification script should:
1. Connect to the staging database (read-only).
2. Run pre-migration audit (queries 1-5).
3. Run the forward migration SQL in a transaction.
4. Run post-migration audit (queries 6-10).
5. Roll back the transaction.
6. Report pass/fail for each check.

---

## 11. Verification Tests

### Unit/integration tests to add or update

| Test | Scope | Expected |
|------|-------|----------|
| `batches: create with cityId` | POST /api/admin/batches | 201, batch has correct cityId |
| `batches: create with invalid cityId` | POST /api/admin/batches | 404 city not found |
| `batches: list scoped by city` | GET /api/admin/batches | Only batches in the user's city |
| `groups: create with batchId + parkId` | POST /api/admin/groups | 201, group has correct parkId |
| `groups: create cross-city batch and park` | POST /api/admin/groups | 400 same-city invariant |
| `groups: create with invalid parkId` | POST /api/admin/groups | 404 park not found |
| `groups: list scoped by park` | GET /api/admin/groups | Only groups in the user's park |
| `groups: list scoped by batch` | GET /api/admin/groups | Only groups in the user's batch |
| `groups: list denied cross-city` | GET /api/admin/groups | No cross-city data leaked |
| `batches: edit cityId` | PATCH /api/admin/batches/[id] | 403 or 400 (city reassignment not allowed) |
| `groups: edit parkId cross-city` | PATCH /api/admin/groups/[id] | 400 same-city invariant |
| `groups: edit parkId same-city` | PATCH /api/admin/groups/[id] | 200, park updated |
| `authorization: city_head create batch` | POST with CH scope | 201 within city, 403 cross-city |
| `authorization: park_lead create batch` | POST with PL scope | 403 (park lead cannot create city-level batches) |
| `authorization: park_lead create group` | POST with PL scope | 201 within park, 403 cross-park |

### Existing tests to preserve

The following existing test verifications must still pass after migration:
- Attendance events link to correct groups.
- Fee events link to correct batches.
- Participant → Group → Batch → City chain is consistent.
- Cross-city denial works for all roles.
- Mobile/offline attendance scoping is correct.

---

## 12. Risks And Owner Decisions

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Batch→Park mapping lost** | Cannot restore original parkId after migration | Create mapping table before dropping parkId, or rely on pre-migration backup |
| **Application writes before schema deploys** | New code writes cityId, old schema expects parkId | Deploy schema migration and code together in the same deployment window |
| **API responses change shape** | Frontend expects `parkId` on Batch, gets `cityId` instead | Coordinate frontend update with API change |
| **UI components expect old field names** | Batch create/edit forms break | Update UI before or in lockstep with API |
| **Same-city invariant not enforced in SQLite** | Local dev may create invalid data | Enforce in application code; SQLite is dev-only |
| **Content plan batch scoping breaks** | ContentPlan.batchId still references Batch | FK remains; only the batch's owning entity changes |
| **Audit log refers to old field names** | History entries mention `parkId` on Batch | Audit logs are immutable; UI should handle deprecated fields |
| **Seed data outdated** | `prisma/seed.ts` creates batches with `parkId` | Update seed to use `cityId` and add `parkId` to groups |

### Owner decisions needed

1. **Park Lead ability to create groups:** Should Park Lead (and Park Admin)
   retain the ability to create groups within their park? This was marked as
   capability-dependent in HIER-003.
2. **City reassignment of batches:** Should a batch's cityId ever be editable?
   Recommendation: prevent it (treat as immutable after creation).
3. **Group park reassignment:** Should a group's parkId be editable?
   Recommendation: allow within the same city only, with full same-city
   revalidation.
4. **Trigger vs application-only invariant:** Deploy the PostgreSQL trigger or
   rely solely on application validation? Recommendation: deploy trigger for
   defense-in-depth.
5. **Mapping table retention:** Keep `_batch_park_mapping` permanently or drop
   it after migration verification? Recommendation: keep through one release
   cycle, then archive the table.

---

## 13. Execution Sequence

1. Run the dry-run script against the staging database. Fix any failures.
2. Owner approves the migration plan and owner-decisions above.
3. Apply the additive schema migration to staging (add columns, populate data,
   add FKs/indexes, drop old column).
4. Run post-migration audit checks and reconcile counts.
5. Deploy updated application code (APIs, Zod schemas, UI components,
   authorization helpers, seed script).
6. Verify batch/group CRUD, same-city invariant, cross-city denial, and
   downstream impact (attendance, fees, participants, reports).
7. Run the full test suite.
8. If verification fails, execute rollback procedure.
9. After successful staging verification, apply to production during a write
   freeze and repeat audit/reconciliation.

---

## 14. Handoff

```
Task ID: HIER-002
Branch and base commit: agent/claude/HIER-002-hierarchy-migration-design
  (base: codex/production-hardening @ dffd68a)
PR URL: (created via GitHub — target: codex/production-hardening)
Changed files: docs/HIER-002-HIERARCHY-MIGRATION-DESIGN.md
What changed:
  - Full forward-migration SQL for PostgreSQL
  - Existing Lahore data transformation mapping
  - Same-city invariant enforcement (application + optional PostgreSQL trigger)
  - Indexes, foreign keys, and constraint design
  - Upstream/downstream cascade impact analysis
  - Rollback procedure with mapping table strategy
  - Pre- and post-migration dry-run audit queries
  - Verification test cases for all new and changed endpoints
  - Risks, mitigations, and owner decisions
What was intentionally excluded:
  - No schema or Prisma model changes (docs only)
  - No application code changes (routes, Zod, UI, auth)
  - No migration script creation
  - No actual data transformation
  - No seed data update
Role/scope and personal-data impact:
  - No personal data is exposed, copied, or transformed
  - Role/scope boundaries tighten: batch-scoped access uses cityId directly
  - City Head retains batch management; Park Lead batch creation is denied
  - Cross-city denial is strengthened by direct cityId on Batch
Migration/data impact:
  - Additive migration: new columns, populates from existing data, no data loss
  - Pre-migration foreign keys are preserved through the mapping
  - Rollback is non-destructive within the same deployment window
  - Mapping table prevents ambiguous parkId restoration on rollback
Commands run and results:
  - No commands run (docs-only task)
Known risks / owner decisions:
  - Batch→Park mapping lost on rollback without pre-created mapping table
  - Application writes after migration prevent code-only rollback
  - Owner must decide: Park Lead group creation, batch city reassignment,
    group park reassignment, trigger deployment, mapping table retention
Ready for Codex review.
```
