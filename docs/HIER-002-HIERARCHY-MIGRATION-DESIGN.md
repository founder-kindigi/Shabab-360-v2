# HIER-002: Batch → City / Group → (Park + Batch) Migration Design

**Task:** HIER-002
**Owner:** Claude / Gemini
**Status:** Revised — ready for Codex review
**Created:** 2026-07-21
**Scope:** Architecture and expand-contract migration plan for transitioning from `City → Park → Batch → Group` to city-owned `Batch` and park-scoped `Group`. Docs only — no schema, code, or data changes in this task.

---

## 1. Problem Statement & Current Baseline

### 1.1 Current Checkout State (`codex/production-hardening`)

The current `codex/production-hardening` branch and database schema use the **legacy linear hierarchy model**:

```
Current State:  City → Park → Batch → Group
                 Batch.parkId  FK → parks(id)
                 Group.batchId FK → batches(id)  (no parkId on Group)
```

The application code and Prisma schemas (`prisma/schema.prisma` and `prisma/postgres/schema.prisma`) currently expect `Batch.parkId` and `Group.batchId`. The code/schema refactor is a **downstream dependency**, NOT an already-completed state.

### 1.2 Target Hierarchy Model

The target hierarchy model decouples `Batch` from `Park` while ensuring `Group` is linked to both:

```
Target State:   City → Park        City → Batch
                 Group.parkId  FK → parks(id)
                 Group.batchId FK → batches(id)
                 Batch.cityId  FK → cities(id)
```

### 1.3 Target Invariant

> **Batch belongs to City; Group belongs to exactly one Batch and one Park in that same City (`group.park.cityId === group.batch.cityId`).**

### 1.4 Staging Data Inventory (Lahore Baseline)

| Entity | Count | Current FK Shape |
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

---

## 2. Expand-Contract Phasing Strategy

To eliminate risk of data loss or service disruption, the migration uses a three-phase **Expand-Contract** strategy. One-step destructive migrations are strictly forbidden.

```
Phase A: Expand (Additive columns, backfill, indexes, reconciliation)
      │
      ▼
Phase B: Code & UAT (Deploy compatible code, execute HIER-003 UAT)
      │
      ▼ [Explicit Owner Approval Required]
Phase C: Contract (Separate migration to drop Batch.parkId)
```

---

### Phase A: Expand Phase (Additive Schema & Backfill)

In Phase A, the database schema receives additive, non-breaking fields and backfilled data. Legacy `Batch.parkId` remains intact so existing queries continue to operate.

#### 1. Additive Fields & FK Constraints
- Add `batches.cityId` (TEXT, FK → `cities(id)`).
- Add `groups.parkId` (TEXT, FK → `parks(id)`).

#### 2. Backfill Logic
- `batch.cityId` is backfilled from `batch.park.cityId`:
  ```sql
  UPDATE "batches"
  SET "cityId" = (
    SELECT "parks"."cityId"
    FROM "parks"
    WHERE "parks"."id" = "batches"."parkId"
  )
  WHERE "cityId" IS NULL;
  ```
- `group.parkId` is backfilled from `group.batch.parkId`:
  ```sql
  UPDATE "groups"
  SET "parkId" = (
    SELECT "batches"."parkId"
    FROM "batches"
    WHERE "batches"."id" = "groups"."batchId"
  )
  WHERE "parkId" IS NULL;
  ```

#### 3. NOT NULL & Index Enforcements
Once backfill verification passes (0 NULLs remaining), enforce `NOT NULL` on `batches.cityId` and `groups.parkId`.

Required Indexes:
- `CREATE INDEX "batches_cityId_isActive_idx" ON "batches"("cityId", "isActive");`
- `CREATE INDEX "groups_parkId_batchId_isActive_idx" ON "groups"("parkId", "batchId", "isActive");`

#### 4. Prechecks & Reconciliation Queries
Pre-migration dry run checks:
```sql
-- Check for orphan batches before backfill
SELECT COUNT(*) FROM "batches" b LEFT JOIN "parks" p ON p."id" = b."parkId" WHERE p."id" IS NULL;

-- Check for orphan groups before backfill
SELECT COUNT(*) FROM "groups" g LEFT JOIN "batches" b ON b."id" = g."batchId" WHERE b."id" IS NULL;
```
Post-backfill reconciliation check:
```sql
-- Verify 0 unmapped rows remain
SELECT COUNT(*) FROM "batches" WHERE "cityId" IS NULL;
SELECT COUNT(*) FROM "groups" WHERE "parkId" IS NULL;

-- Verify same-city invariant (must return 0)
SELECT COUNT(*) FROM "groups" g
JOIN "parks" p ON p."id" = g."parkId"
JOIN "batches" b ON b."id" = g."batchId"
WHERE p."cityId" != b."cityId";
```

---

### Phase B: Application Update & Verification

Once Phase A is deployed to staging:
1. Update Prisma schemas (`prisma/schema.prisma` and `prisma/postgres/schema.prisma`) ensuring both SQLite and PostgreSQL schemas remain aligned.
2. Update application code to read/write using `batch.cityId` and `group.parkId`.
3. Run standard quality checks (`npm run typecheck`, `npm run lint`, full Vitest suite).
4. Perform manual browser UAT using the HIER-003 UAT Plan ([HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md](product-discovery/HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md)).

---

### Phase C: Contract Phase (Destructive Cleanup)

**Prerequisite:** Phase C requires explicit, written approval from the project owner after Phase B UAT completion and stability verification.

Actions in Phase C:
- Drop legacy `batches.parkId` column and `batches_parkId_fkey` constraint.
- Remove legacy `groups_batchId_isActive_idx` if superseded by `groups_parkId_batchId_isActive_idx`.

---

## 3. Schema Alignment & Authoritative Prisma Migration

### 3.1 Dual-Schema Alignment Requirement
Per project invariants, the SQLite schema (`prisma/schema.prisma`) and staged PostgreSQL schema (`prisma/postgres/schema.prisma`) must remain strictly aligned:

```prisma
model Batch {
  id        String   @id @default(cuid())
  name      String
  cityId    String
  city      City     @relation(fields: [cityId], references: [id], onDelete: Cascade)
  groups    Group[]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([cityId, isActive])
  @@map("batches")
}

model Group {
  id        String   @id @default(cuid())
  name      String
  parkId    String
  park      Park     @relation(fields: [parkId], references: [id], onDelete: Cascade)
  batchId   String
  batch     Batch    @relation(fields: [batchId], references: [id], onDelete: Cascade)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parkId, batchId, isActive])
  @@map("groups")
}
```

### 3.2 Prisma Migration Authority
- Prisma-generated migration (`npx prisma migrate dev` / `npx prisma migrate diff`) is the authoritative source for DDL statements.
- Raw DDL SQL presented in design documentation is for reference and precheck design only, not as copy-paste execution scripts.

---

## 4. Rollback & Recovery Policy

### 4.1 Supported Rollback Strategy
- **`pg_dump` snapshot and verified database restore is the ONLY supported rollback strategy.**
- Prior to executing Phase A or Phase C on staging, an encrypted `pg_dump` snapshot must be taken and verified by testing a trial restore on a disposable database instance.

### 4.2 Emergency Manual Recovery (Reverse SQL)
Reverse SQL statements are classified as **emergency manual recovery tools only**, not standard operational rollbacks. They are lossy if new city-level batches without park mappings are created during Phase B.

```sql
-- EMERGENCY RECOVERY ONLY (Not standard rollback)
ALTER TABLE "batches" ADD COLUMN "parkId" TEXT;

UPDATE "batches"
SET "parkId" = (
  SELECT g."parkId"
  FROM "groups" g
  WHERE g."batchId" = "batches"."id"
  LIMIT 1
);

ALTER TABLE "batches" ADD CONSTRAINT "batches_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "parks"("id") ON DELETE CASCADE;
```

---

## 5. Execution Sequence Checklist

| Step | Phase | Action | Responsible | Gate |
| --- | --- | --- | --- | --- |
| 1 | Planning | Review and approve HIER-002 design | Codex / Owner | Design approved |
| 2 | Backup | Create & verify encrypted `pg_dump` snapshot of staging | Codex | Restore verified |
| 3 | Phase A | Generate Prisma migration for additive `cityId`/`parkId` & indexes | Codex | Schema review |
| 4 | Phase A | Execute prechecks, apply Phase A migration & backfill SQL | Codex | 0 unmapped records |
| 5 | Phase B | Update application code & align SQLite + PostgreSQL Prisma schemas | Codex | `npm run typecheck` clean |
| 6 | Phase B | Run quality checks (`npm run lint`, `npm test`, build check) | Codex | All tests pass |
| 7 | Phase B | Execute manual browser UAT per HIER-003 plan | Gemini / Codex | UAT sign-off |
| 8 | Gate | Request explicit Owner approval for Phase C contract migration | Owner | Written approval |
| 9 | Phase C | Apply Phase C contract migration (`DROP COLUMN parkId`) | Codex | Contract complete |

---

## 6. Document Revision Summary

- Corrected baseline claim: `codex/production-hardening` uses `Batch.parkId` and `Group.batchId`. Code/schema changes are downstream dependencies.
- Replaced 1-step destructive plan with 3-phase Expand-Contract strategy (Phase A Expand, Phase B Code/UAT, Phase C Contract).
- Designated Prisma-generated migration as authoritative for DDL.
- Added composite `batches(cityId, isActive)` index requirement and dual SQLite/PostgreSQL schema alignment mandate.
- Designated `pg_dump` restore as the only supported rollback strategy; marked reverse SQL as emergency manual recovery only.
