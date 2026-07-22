# HIER-006 Downstream Compatibility Map

**Task ID:** `HIER-006`
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`

This document maps all downstream usages of the hierarchy relations (`Batch.parkId`, `Batch.cityId`, `Group.batchId`, `Group.parkId`) across system modules and classifies their required updates for Phase B and beyond.

---

## 1. Attendance
**Files:**
* `src/app/api/park/attendance/*` (incl. `[eventId]/route.ts`, `events/route.ts`, etc.)
* `src/app/api/admin/attendance-events/[eventId]/route.ts`
* `src/components/modules/park/park-attendance-page.tsx`
* `src/components/modules/admin/admin-attendance-events.tsx`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed` (Used extensively in queries e.g., `{ parkId: group.batch.parkId }`. Can remain as a read fallback).
* **`Batch.cityId`**: `requires city-based update` (City Heads must aggregate via `Batch.cityId`).
* **`Group.batchId`**: `Phase B safe as-is` (Attendance queries traverse via Group).
* **`Group.parkId`**: `requires group-park update` (Park-scoped attendance must query `Group.parkId` directly).

## 2. Admin Dashboard
**Files:**
* `src/app/api/admin/dashboard/route.ts`
* `src/components/modules/admin/admin-dashboard.tsx`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed` (Filters using `parkId` query parameters).
* **`Batch.cityId`**: `Phase B safe as-is` (Admin handles all cities).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Group filtering via `parkId` natively).

## 3. City Head Dashboard
**Files:**
* `src/app/api/admin/dashboard/route.ts` (API handles City scope enforcement via `src/lib/auth/scope.ts`)
* `src/components/modules/admin/admin-dashboard.tsx`

**Classifications:**
* **`Batch.parkId`**: `Phase B safe as-is` (Not primarily used by City Head scopes).
* **`Batch.cityId`**: `requires city-based update` (Dashboard requires strict `Batch.cityId` enforcement for City Heads).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `Phase B safe as-is`.

## 4. Park Dashboard
**Files:**
* `src/app/api/park/dashboard/route.ts`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed` (`group.batch.parkId === staffMeta.assignedParkId`).
* **`Batch.cityId`**: `Phase B safe as-is`.
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Park dashboard needs to check `Group.parkId` natively).

## 5. Reports
**Files:**
* `src/app/api/admin/reports/attendance-report/route.ts`
* `src/app/api/admin/reports/fee-report/route.ts`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed`.
* **`Batch.cityId`**: `requires city-based update`.
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update`.

## 6. Admissions (Participants / Registrations)
**Files:**
* `src/app/api/admin/import/participants/route.ts`
* `src/app/api/admin/students/[id]/detail/route.ts`
* `src/components/modules/admin/people-page.tsx`

**Classifications:**
* **`Batch.parkId`**: `requires group-park update` (Phase B safely changes this to group-park scope; it shouldn't be blocked since a Group assignment links a participant to a Park).
* **`Batch.cityId`**: `requires city-based update` (Admissions boundaries now validated at the City level).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Participant park assignment derived from Group natively).

## 7. Staff Assignment & Access Provisioning
**Files:**
* `src/app/api/admin/users/[id]/route.ts`
* `src/app/api/admin/invite/route.ts`
* `src/components/modules/admin/access-provisioning-page.tsx`
* `src/lib/auth/scope.ts`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed` (Legacy staff scope checks).
* **`Batch.cityId`**: `requires city-based update` (City Head scoping).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Park Lead/Admin scoping natively).

## 8. Fees & Payments
**Files:**
* `src/app/api/student/fees/route.ts`
* `src/app/api/admin/fees/[id]/remind/route.ts`
* `src/app/api/admin/payments/[id]/receipt/route.ts`
* `src/components/modules/admin/fees-page.tsx`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed` (Used in receipts `payment.feeEvent.batch.parkId`).
* **`Batch.cityId`**: `requires city-based update`.
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update`.

## 9. Certificates
**Files:**
* `src/app/api/admin/certificates/batch/route.ts`

**Classifications:**
* **`Batch.parkId`**: `no usage found` / `legacy fallback allowed` (No direct usage mapped).
* **`Batch.cityId`**: `requires city-based update` (Generating certificates for an entire city).
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update` (Park-level certificate batches).

## 10. Students / Guardians (Profiles)
**Files:**
* `src/app/api/park/participants/route.ts`
* `src/app/api/park/guardians/route.ts`
* `src/app/api/admin/guardians/[id]/detail/route.ts`

**Classifications:**
* **`Batch.parkId`**: `legacy fallback allowed` (`participant.group.batch.parkId`).
* **`Batch.cityId`**: `requires city-based update`.
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update`.

## 11. Content Planner
**Files:**
* `src/app/api/park/schedule/route.ts`
* `src/app/api/park/roster/route.ts`

**Classifications:**
* **`Batch.parkId`**: `requires group-park update` (Phase B safely changes content access scope to be group-park bound).
* **`Batch.cityId`**: `requires city-based update`.
* **`Group.batchId`**: `Phase B safe as-is`.
* **`Group.parkId`**: `requires group-park update`.

## 12. Notifications
**Files:**
* `src/app/api/notifications/route.ts`
* `src/app/api/admin/notifications/queue/route.ts`
* `src/lib/email-service.ts`

**Classifications:**
* **`Batch.parkId`**: `no usage found` (Search evidence: Notifications queue system-wide or user-id specific, independent of explicit hierarchy model IDs. See `src/lib/notification-security.ts`).
* **`Batch.cityId`**: `no usage found`.
* **`Group.batchId`**: `no usage found`.
* **`Group.parkId`**: `no usage found`.
