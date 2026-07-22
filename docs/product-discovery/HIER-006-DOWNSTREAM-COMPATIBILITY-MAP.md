# HIER-006 Downstream Compatibility Map

**Task ID:** `HIER-006`
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`

This document maps all downstream usages of the hierarchy relations (`Batch.parkId`, `Batch.cityId`, `Group.batchId`, `Group.parkId`) across system modules and classifies their required updates for Phase B and beyond.

---

## 1. Attendance
* **`Batch.parkId`**: `legacy fallback allowed` (Used heavily in `src/app/api/park/attendance/*` as `group.batch.parkId`. Can remain as a read fallback for legacy groups lacking a direct park link).
* **`Batch.cityId`**: `requires city-based update` (City Head dashboards need to aggregate attendance using `cityId`).
* **`Group.batchId`**: `Phase B safe as-is` (Groups still belong to Batches; attendance events link via Group).
* **`Group.parkId`**: `requires group-park update` (Park-level attendance queries and scope validations must switch to checking `Group.parkId` directly for new records).

## 2. Dashboards (Admin & Park)
* **`Batch.parkId`**: `legacy fallback allowed` (Park dashboard filters).
* **`Batch.cityId`**: `requires city-based update` (City dashboard must fetch all Batches using `Batch.cityId` instead of relying on Park links).
* **`Group.batchId`**: `Phase B safe as-is` (Batch drill-down works identically).
* **`Group.parkId`**: `requires group-park update` (Park dashboard Group lists must query `Group.parkId` natively).

## 3. Reports
* **`Batch.parkId`**: `legacy fallback allowed` (Historical park-level aggregations).
* **`Batch.cityId`**: `requires city-based update` (City-wide aggregations now roll up via `Batch.cityId`).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Park-level reporting must aggregate via `Group.parkId`).

## 4. Admissions (Participant Registration)
* **`Batch.parkId`**: `blocked until Phase C` (Assigning new participants based on `Batch.parkId` is unsafe if the Batch spans multiple parks; explicit Group assignment is required).
* **`Batch.cityId`**: `requires city-based update` (Admissions boundaries now validated at the City level).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Participant park assignment is strictly derived from `Group.parkId`).

## 5. Staff Assignment & Access Provisioning
* **`Batch.parkId`**: `legacy fallback allowed` (Legacy staff scoping).
* **`Batch.cityId`**: `requires city-based update` (City Heads must be scoped via `Batch.cityId`).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Park Leads/Admins must have their RBAC validated against `Group.parkId`).

## 6. Fees & Payments
* **`Batch.parkId`**: `legacy fallback allowed` (Legacy fee event querying).
* **`Batch.cityId`**: `requires city-based update` (City Heads viewing fee collections across the city).
* **`Group.batchId`**: `Phase B safe as-is` (Fee exceptions or group-level fee tracking).
* **`Group.parkId`**: `requires group-park update` (Park-level fee filtering).

## 7. Certificates
* **`Batch.parkId`**: `legacy fallback allowed`.
* **`Batch.cityId`**: `requires city-based update` (Generating certificates for an entire city).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Park-level certificate batches).

## 8. Students / Guardians (Profiles)
* **`Batch.parkId`**: `legacy fallback allowed` (Displaying park association for legacy students).
* **`Batch.cityId`**: `requires city-based update` (City directory).
* **`Group.batchId`**: `Phase B safe as-is` (Displaying Batch assignment).
* **`Group.parkId`**: `requires group-park update` (Displaying and validating the student's actual physical park).

## 9. Content Planner
* **`Batch.parkId`**: `blocked until Phase C` (Content should not be restricted by legacy `parkId` since Batches are now City-wide).
* **`Batch.cityId`**: `requires city-based update` (Content plans assigned to a City-level Batch).
* **`Group.batchId`**: `Phase B safe as-is` (Delivering content to Groups via Batch).
* **`Group.parkId`**: `requires group-park update` (If content is ever customized per Park within a City Batch).
