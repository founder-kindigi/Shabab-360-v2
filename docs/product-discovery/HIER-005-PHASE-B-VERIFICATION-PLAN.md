# HIER-005 Phase B Verification Plan

**Task ID:** `HIER-005`
**Status:** `PREPARED`
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`

---

## 1. Hierarchy Invariants

This verification plan confirms the exact acceptance criteria for the approved Phase B hierarchy:

* **City-Owned Batch:** A `Batch` strictly belongs to a `City`.
* **Park-Owned Group:** A `Group` strictly belongs to one `Batch` and one `Park` within the same `City`.
* **Compatibility Anchor:** The `Batch.parkId` field is retained strictly as a technical compatibility anchor for legacy data. It must **never** be used to determine business scope or restrict access boundaries.

## 2. Role-Based Access Control (RBAC) Acceptance Tests

The following tests verify that the Phase B hierarchy correctly enforces role scopes without regressing legacy reads:

### 2.1 City Head
* **Scope:** City-wide access.
* **Test:** A City Head MUST be able to view and manage all Batches and Groups that belong to their assigned City, regardless of the `Batch.parkId` value.
* **Denial:** Access to Batches or Groups in a foreign City MUST return a `403 Forbidden`.

### 2.2 Park Lead
* **Scope:** Assigned-park view only.
* **Test:** A Park Lead MUST be able to view all Groups explicitly assigned to their Park.
* **Denial:** A Park Lead MUST NOT be able to mutate (create/update/delete) Groups. Attempts must return `403 Forbidden`.
* **Denial:** A Park Lead MUST NOT see Groups from other Parks within the same City.

### 2.3 Park Admin
* **Scope:** Assigned-park attendance only.
* **Test:** A Park Admin MUST be able to manage and view attendance events ONLY for Groups assigned to their Park.
* **Denial:** A Park Admin MUST NOT be able to view or manage attendance for foreign Parks or alter overall Group settings.

### 2.4 Murabbi
* **Scope:** Own-group attendance only.
* **Test:** A Murabbi MUST be able to manage attendance ONLY for their explicitly assigned Group.
* **Denial:** Access to other Groups' attendance within the same Park MUST return a `403 Forbidden`.

## 3. Data Integrity & Migration Acceptance Tests

### 3.1 Legacy Read Compatibility
* **Test:** Pre-existing Lahore records (from Phase A imports) MUST render correctly in all read paths. Existing Groups and Batches must display under the correct City Head and Park dashboards without requiring data modification.

### 3.2 Consistency Enforcement on New Writes
* **Test:** Creating a new Group MUST validate that the selected Batch and Park both belong to the exact same City.
* **Denial:** Attempting to assign a Group to a Park in City A and a Batch in City B MUST return a `400 Bad Request` or `422 Unprocessable Entity`.

## 4. Rollout Validation

Before final staging approval, the following evidence must be provided:
1. **Reconciliation Evidence:** Post-migration counts of Cities, Parks, Batches, Groups, and Participants must exactly match the pre-migration baseline.
2. **Rollback Evidence:** Demonstrated ability to revert the Prisma schema and database state safely if the deployment fails.
