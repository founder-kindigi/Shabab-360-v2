# HIER-004 — Phase B Hierarchy API/UI Impact Map

## 1. Overview and Rollout Strategy
The target hierarchy shifts from `City -> Park -> Batch -> Group` to `City -> {Parks, Batches} -> Group (one Batch + one Park)`.
The Phase B application code must be rollout-compatible while legacy columns (`Batch.parkId`, `Group.batchId`) and new columns (`Batch.cityId`, `Group.parkId`) exist simultaneously.

Because `Batch.parkId` remains a required schema field during Phase B, **dual-writes are mandatory**.

## 2. Critical Transition Decision: Legacy Anchor Park
While legacy `Batch.parkId` remains required by the Prisma schema, every newly created city-owned Batch needs a documented **legacy anchor park policy**. This value must act as a compatibility value only and must not determine the Batch's business scope. This requires an owner-approved rule before Phase B implementation to decide what park ID should be assigned to Batches created at the City level.

## 3. Read Path Rollout Strategy
The read strategy must be explicitly rollout-safe:
- New writes require `cityId` and `group.parkId`.
- Legacy fields are also written.
- Phase B reads use new fields after Phase A reconciliation, **with a controlled fallback** only where existing local/transition data can still be null.

## 4. API Contract Changes and Dual-Write Requirements

### Batch Management (`src/app/api/admin/batches/route.ts`)
- **Dual-Write**: When creating a Batch, the API must write to both `parkId` (legacy required anchor) and `cityId` (new).
- **Validation**: Zod schema (`createSchema`) must be updated to accept `cityId`.
- **Authorization**: Creation and mutation authorization shifts toward City-level capabilities. City Heads must be authorized against `batch.cityId === user.assignedCityId`.

### Group Management (`src/app/api/admin/groups/route.ts` & `src/app/api/admin/groups/[id]/route.ts`)
- **Dual-Write**: When creating a Group, the API must write to both `batchId` (legacy required) and `parkId` (new).
- **Validation**: Zod schema must accept `parkId`.
- **Invariant Enforcement**: Group creation/update must enforce the same-city invariant: `Group.park.cityId === Batch.cityId`.
- **Authorization**: Park-level access must check `group.parkId === user.assignedParkId` instead of traversing `group.batch.parkId`.

## 5. Read Path Migrations

Every query that currently traverses `batch.parkId` must be updated to use the new fields or their fallbacks. The following areas are impacted:

### Participant and Attendance (Park-Scoped)
Affected Files:
- `src/app/api/park/participants/route.ts`
- `src/app/api/park/roster/route.ts`
- `src/app/api/park/schedule/route.ts`
- `src/app/api/park/attendance/*`
**Impact**: Queries must stop joining through `batch` to get `parkId`. They must use `Group.parkId` (with fallback to `Group.batch.parkId` if `Group.parkId` is null during transition).

### Students and Guardians
Affected Files:
- `src/app/api/admin/students/*`
- `src/app/api/admin/guardians/*`
**Impact**: Fetching participants by park must query against `group.parkId` instead of traversing `batch.parkId`.

### Dashboard APIs (Admin & City-Head)
Affected Files:
- `src/app/api/admin/dashboard/route.ts`
- `src/app/api/city-head/dashboard/route.ts`
**Impact**: Update `where` clauses for counts and aggregations to use `Group.parkId` for Park-level statistics and `Batch.cityId` for City-level statistics.

### Search and Reporting APIs
Affected Files:
- `src/app/api/search/route.ts`
- `src/app/api/admin/reports/route.ts`
- `src/app/api/admin/reports/fee-report/route.ts`
**Impact**: Search filters scoped by park must use `group.parkId`. Filters scoped by city must use `batch.cityId`.

### Admissions, Notifications, and Certificates
Affected Files:
- `src/app/api/admin/admissions/*`
- `src/app/api/admin/certificates/*`
- `src/app/api/notifications/*`
**Impact**: Ensure scopes correctly evaluate `Batch.cityId` and `Group.parkId`.

## 6. Authorization & Capabilities
Affected Files:
- `src/lib/auth/scope.ts`
- `src/lib/auth/authorize.ts`

**Impact**:
- When evaluating if a user can access a `Group`, the logic must check `group.parkId`.
- When evaluating if a user can access a `Batch`, the logic must check `batch.cityId`.
- **Role Correction**: Park Admins are attendance-only for their assigned park and **must not manage Groups**.

## 7. UI Implications
- **Batch Creation Modal**: Must include a City selector (for Super Admins) or implicitly assign `cityId` for City Heads.
- **Group Creation Modal**: Must include a Park selector, as Groups now explicitly belong to a Park.

## 8. Fees
Affected Files:
- `src/app/api/admin/payments/*`

**Impact**: Fee Events remain Batch-based. Because Batches become city-owned under the new hierarchy, reporting/access filters become city-scoped.

## 9. Staging Reconciliation Checks
Before Phase B code is promoted to production, the following SQL assertions must pass on staging:
1. `SELECT count(*) FROM batches WHERE cityId IS NULL;` (Must be 0)
2. `SELECT count(*) FROM groups WHERE parkId IS NULL;` (Must be 0)
3. `SELECT count(*) FROM groups g JOIN batches b ON g.batchId = b.id JOIN parks p ON g.parkId = p.id WHERE p.cityId != b.cityId;` (Must be 0, ensuring the same-city invariant).

## 10. Safe Implementation Sequence & Rollback Boundary
1. **Pre-check**: Verify Phase A migrations have been applied and reconciliation assertions (above) pass.
2. **Deploy Phase B Code**: Deploy the dual-write/dual-read API and UI modifications with controlled null-fallbacks.
3. **Monitor**: Ensure no new records are created with null values for `cityId` or `group.parkId`.
4. **Rollback Boundary**: If Phase B introduces regressions, it can be safely reverted via `git revert`. Because Phase B continues to write to legacy columns (`Batch.parkId` and `Group.batchId`), rolling back the code has **zero data loss impact** and will seamlessly fall back to Phase A logic.

## 11. Phase B Test Matrix
A concrete test matrix must be executed:
- **Batch/Group Creation**: Verify dual-writes populate legacy and new columns.
- **Same-City Invariant**: Verify API rejects Group creation if `Group.park.cityId !== Batch.cityId`.
- **City Head Scope**: Verify City Head can create Batches and manage Groups across parks in their city.
- **Park Lead Scope**: Verify Park Lead is view-only for their assigned park.
- **Park Admin Scope**: Verify Park Admin is attendance-only and denied Group management.
- **Murabbi Scope**: Verify Murabbi is restricted to their assigned Group.
- **Rollback Compatibility**: Verify records created in Phase B read correctly if the code is rolled back to Phase A logic.
