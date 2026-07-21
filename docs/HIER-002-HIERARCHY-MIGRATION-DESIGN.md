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
Phase A: Expand (Transitional schema, additive columns, backfill, indexes)
      │
      ▼
Phase B: Rollout-Compatible Code & UAT (Deploy compatible code, execute HIER-003 UAT)
      │
      ▼ [Explicit Owner Approval Required]
Phase C: Contract (Final schema & separate contract migration to drop Batch.parkId)
```

---

### Phase A: Expand Phase (Transitional Schema & Backfill)

In Phase A, the database schema receives additive, non-breaking fields and backfilled data. Phase A **must explicitly use a transitional Prisma schema**, NOT the final target schema:
- `Batch.parkId`: required (`String`), retained through Phase A and Phase B. Existing legacy relation remains required and is NOT changed to optional.
- `Batch.cityId`: nullable (`String?`) during the initial additive/backfill phase.
- `Group.batchId`: required (`String`), retained through Phase A and Phase B.
- `Group.parkId`: nullable (`String?`) during the initial additive/backfill phase.
- After zero-null reconciliation, `cityId` and `Group.parkId` become required (`NOT NULL`), while `Batch.parkId` remains until explicitly approved Phase C.
- Both SQLite (`prisma/schema.prisma`) and staged PostgreSQL (`prisma/postgres/schema.prisma`) transition schemas remain strictly aligned.

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

#### 3. Index Enforcements
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
1. Update Phase B application code to be **rollout-compatible** while both legacy (`parkId` on `Batch`) and new (`cityId` on `Batch`, `parkId` on `Group`) columns exist.
2. Run standard quality checks (`npm run typecheck`, `npm run lint`, full Vitest suite).
3. Perform manual browser UAT using the HIER-003 UAT Plan ([HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md](product-discovery/HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md)).

---

### Phase C: Contract Phase (Final Schema & Destructive Cleanup)

**Prerequisite:** Phase C requires explicit, written approval from the project owner after Phase B UAT completion and stability verification.

Actions in Phase C:
- Introduce the **final Prisma schema** (removing `Batch.parkId` and making `cityId` / `parkId` required non-nullable).
- Apply a separate contract migration to drop legacy `batches.parkId` column and `batches_parkId_fkey` constraint.

---

## 3. Schema Alignment & Migration Deployment Rules

### 3.1 Phase A Transitional Prisma Schema (SQLite & PostgreSQL Aligned)

Per project invariants, both SQLite (`prisma/schema.prisma`) and staged PostgreSQL (`prisma/postgres/schema.prisma`) transition schemas must remain strictly aligned:

```prisma
model Batch {
  id        String   @id @default(cuid())
  name      String
  parkId    String   // Required legacy field retained through Phase A & B
  park      Park     @relation(fields: [parkId], references: [id], onDelete: Cascade)
  cityId    String?  // Additive field (nullable during backfill phase)
  city      City?    @relation(fields: [cityId], references: [id], onDelete: Cascade)
  groups    Group[]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([cityId, isActive])
  @@index([parkId, isActive])
  @@map("batches")
}

model Group {
  id        String   @id @default(cuid())
  name      String
  parkId    String?  // Additive field (nullable during backfill phase)
  park      Park?    @relation(fields: [parkId], references: [id], onDelete: Cascade)
  batchId   String   // Required legacy field retained through Phase A & B
  batch     Batch    @relation(fields: [batchId], references: [id], onDelete: Cascade)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parkId, batchId, isActive])
  @@map("groups")
}
```

### 3.2 Phase C Final Target Prisma Schema

```prisma
model Batch {
  id        String   @id @default(cuid())
  name      String
  cityId    String   // Required non-nullable in Phase C
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
  parkId    String   // Required non-nullable in Phase C
  park      Park     @relation(fields: [parkId], references: [id], onDelete: Cascade)
  batchId   String   // Required non-nullable
  batch     Batch    @relation(fields: [batchId], references: [id], onDelete: Cascade)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parkId, batchId, isActive])
  @@map("groups")
}
```

### 3.3 Deployment & Migration Authority Rules

1. **Local Tooling vs Staging Deployment:**
   - `prisma migrate dev` and `prisma migrate diff` are local generation and inspection tools only.
   - Staging environments apply committed migrations using `npx prisma migrate deploy`.
2. **Phase B Rollout Compatibility:**
   - Phase B application code must be rollout-compatible while both legacy and new columns exist.
3. **Phase C Final Schema Introduction:**
   - The final Prisma schema that removes `Batch.parkId` is introduced ONLY in Phase C, together with its separate contract migration following explicit owner approval.

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
| 3 | Phase A | Update SQLite & PostgreSQL transition schemas; generate Phase A migration | Codex | Schema review |
| 4 | Phase A | Execute prechecks, apply Phase A migration via `prisma migrate deploy` & backfill SQL | Codex | 0 unmapped records |
| 5 | Phase B | Deploy rollout-compatible application code for Phase B | Codex | `npm run typecheck` clean |
| 6 | Phase B | Run quality checks (`npm run lint`, `npm test`, build check) | Codex | All tests pass |
| 7 | Phase B | Execute manual browser UAT per HIER-003 plan | Gemini / Codex | UAT sign-off |
| 8 | Gate | Request explicit Owner approval for Phase C contract migration | Owner | Written approval |
| 9 | Phase C | Update schemas to final state & apply Phase C contract migration (`DROP COLUMN parkId`) | Codex | Contract complete |

---

## 6. Document Revision Summary

- Corrected baseline claim: `codex/production-hardening` uses `Batch.parkId` and `Group.batchId`. Code/schema changes are downstream dependencies.
- Mandated Phase A Transitional Prisma Schema (retaining `Batch.parkId` and adding `cityId` / `parkId` as nullable) aligned across SQLite and PostgreSQL.
- Replaced 1-step destructive plan with 3-phase Expand-Contract strategy (Phase A Expand, Phase B Rollout-Compatible Code/UAT, Phase C Final Schema & Contract Migration).
- Specified Prisma deployment rules: `prisma migrate dev`/`diff` are local tools; staging uses `prisma migrate deploy`.
- Added composite `batches(cityId, isActive)` index requirement and dual SQLite/PostgreSQL schema alignment mandate.
- Designated `pg_dump` restore as the only supported rollback strategy; marked reverse SQL as emergency manual recovery only.
