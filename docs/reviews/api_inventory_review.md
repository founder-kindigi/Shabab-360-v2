# API Route Inventory & Security Audit Report

> [!IMPORTANT]
> **Historical Architecture Notice**: This document describes a prior architecture. Removed upload components must not be treated as current callers or active codebase components. Current upload-route status and consumer audits are documented in SEC-005 (`docs/product-discovery/SEC-005-UPLOAD-DISABLE-CONSUMER-AUDIT.md`). The review findings below are preserved for historical reference.

## Executive Summary
This document compiles a comprehensive, read-only inventory of all 84 route files (generating 118 HTTP method handlers) inside the `src/app/api` directory of the Shabab-360-v2 Next.js application. Additionally, it details critical P0 security findings that violate the release gates outlined in [IMPROVEMENT_PLAN.md](file:///D:/iBuild/Shabab-360-v2/docs/IMPROVEMENT_PLAN.md).

---

## 🔴 P0 Security Shortlist & File Evidence

### 1. Fail-Open Scope Bypass on Admin Detail Endpoints
*   **Vulnerability**: Scope checks in route handlers are implemented as standard conditional statements mapping roles to permissions. However, there is no default `deny` or final `else` statement. Any authenticated user carrying a role not handled by the conditions (such as a `guardian` or `student`) bypasses the checks entirely, falling through to view, update, or soft-delete administrative items.
*   **File Evidence**:
    *   [batches/[id]/route.ts#L30-L55](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/batches/%5Bid%5D/route.ts#L30-L55)
    *   [groups/[id]/route.ts#L45-L63](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/groups/%5Bid%5D/route.ts#L45-L63)
*   **Code Example**:
    ```ts
    // Scope check
    const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
    if (!isHQ && user.role === "city_head" && user.assignedCityId) {
      if (batch.park.city.id !== user.assignedCityId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (
      !isHQ &&
      ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
      user.assignedParkId
    ) {
      if (batch.parkId !== user.assignedParkId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // If user.role is 'guardian', both checks evaluate to false, bypass occurs!
    ```

### 2. Plaintext Invitation Credentials Written to Audit Logs
*   **Vulnerability**: During the guardian invitation process, the plaintext password (`invitationCode`) is logged directly into the `AuditLog` database table, exposing it to any administrator or agent with audit logs access.
*   **File Evidence**:
    *   [guardians/invite/route.ts#L129-L135](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/guardians/invite/route.ts#L129-L135)
*   **Code Example**:
    ```ts
    await logAudit({
      userId: auth.user.id,
      action: "invite_guardian",
      entityType: "guardian",
      entityId: result.guardian.id,
      newValues: { name, email: userEmail, phone, cnic, address, relationship, invitationCode }, // plaintext exposure
    });
    ```

### 3. Hardcoded Shared Password & Discarded Random Password
*   **Vulnerability**:
    *   **Staff Invite**: Every invited staff member has their password hash set to a hardcoded default string (`"Shabab@2024"`). Any attacker knowing this can compromise newly created accounts prior to user verification/reset.
    *   **Guardian Invite**: The handler invokes a random password generator (`generateRandomPassword()`) but never uses or stores the resulting string. It hashes the 6-character, high-collision alphanumeric invitation code as the password hash.
*   **File Evidence**:
    *   [invite/route.ts#L135](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/invite/route.ts#L135) (Hardcoded default staff password)
    *   [guardians/invite/route.ts#L72-L73](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/guardians/invite/route.ts#L72-L73) (Random password unused)

### 4. Global Scope Leakage of Student & Guardian PII
*   **Vulnerability**: Any authenticated staff member (including low-privileged single-group `murabbi` or park staff) can query details for any student or guardian globally across the system. There is no scope mapping between the caller's assigned city/park/group and the target record.
*   **File Evidence**:
    *   [students/[id]/detail/route.ts#L9-L16](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/students/%5Bid%5D/detail/route.ts#L9-L16)
    *   [guardians/[id]/detail/route.ts#L9-L16](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/guardians/%5Bid%5D/detail/route.ts#L9-L16)
    *   [guardians/search/route.ts#L36-L49](file:///D:/iBuild/Shabab-360-v2/src/app/api/park/guardians/search/route.ts#L36-L49) (Global search leaks CNIC and addresses)

### 5. Financial Transaction and Integrity Vulnerabilities
*   **Vulnerability**:
    *   Payments can be recorded for participants without confirming they belong to the batch/group of the target fee event.
    *   Receipt numbers (`receiptNo`) are generated via sequences outside of the payment transaction. If payment creation fails, the counter remains incremented, creating sequential gaps.
    *   Monetary checks use floating-point types (`z.number()`) which are subject to precision loss.
*   **File Evidence**:
    *   [payments/route.ts#L183-L189](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/fees/%5Bid%5D/payments/route.ts#L183-L189) (No participant batch verification)
    *   [payments/route.ts#L193-L217](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/fees/%5Bid%5D/payments/route.ts#L193-L217) (Sequence generated before transaction block; floats utilized)

### 6. Unrestricted, Unauthenticated Realtime Service
*   **Vulnerability**: The standalone Socket.IO service allows any client to connect without authenticating, arbitrary room joins (e.g., joining administrative rooms by emitting `"join", "admin"`), arbitrary presence registration, and unauthenticated `POST /notify` calls.
*   **File Evidence**:
    *   [index.ts#L120-L190](file:///D:/iBuild/Shabab-360-v2/mini-services/notification-service/index.ts#L120-L190)
    *   [index.ts#L45-L90](file:///D:/iBuild/Shabab-360-v2/mini-services/notification-service/index.ts#L45-L90)

### 7. Null Assignment Bypass on Park Scope Checks
*   **Vulnerability**: If a park admin or lead has a null/undefined `assignedParkId` in their metadata, the scope check: `if (user.assignedParkId && user.assignedParkId !== event.group.batch.parkId)` resolves to `false`, bypassing the check entirely and granting them global access.
*   **File Evidence**:
    *   [reset/route.ts#L51-L53](file:///D:/iBuild/Shabab-360-v2/src/app/api/park/attendance/%5BeventId%5D/reset/route.ts#L51-L53)
    *   [attendance/route.ts#L50-L52](file:///D:/iBuild/Shabab-360-v2/src/app/api/park/attendance/route.ts#L50-L52)

---

## Complete API Route Inventory

| Route | Method | Type | Auth Mechanism | Allowed Roles | Scope Check | Client Caller | Suspected Gaps / Comments |
|---|---|---|---|---|---|---|---|
| `/api/admin/admissions` | `GET` | Read | requireRole() | super_admin,program_admin | None | admissions-page.tsx | Secure (standard) |
| `/api/admin/admissions` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | admissions-page.tsx | Secure (standard) |
| `/api/admin/admissions/[id]/convert` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | None | Secure (standard) |
| `/api/admin/admissions/[id]/interviews` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | admissions-page.tsx | Secure (standard) |
| `/api/admin/admissions/[id]` | `GET` | Read | requireRole() | super_admin,program_admin | None | admissions-page.tsx | Secure (standard) |
| `/api/admin/admissions/[id]` | `PATCH` | Mutation | requireRole() | super_admin,program_admin | None | admissions-page.tsx | Secure (standard) |
| `/api/admin/attendance-events` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | admin-attendance-events.tsx | Secure (standard) |
| `/api/admin/attendance-events/[eventId]` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | None | Secure (standard) |
| `/api/admin/audit-log` | `GET` | Read | requireRole() | super_admin,program_admin | None | audit-log-page.tsx | Secure (standard) |
| `/api/admin/batches` | `GET` | Read | requireAuth() | Any Authenticated | None | page-header.tsx, access-provisioning-page.tsx, batches-page.tsx, fees-page.tsx, groups-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/batches` | `POST` | Mutation | requireAuth() | Any Authenticated | None | page-header.tsx, access-provisioning-page.tsx, batches-page.tsx, fees-page.tsx, groups-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/batches/[id]` | `GET` | Read | requireAuth() | Any Authenticated | None | batches-page.tsx | **Critical P0**: Fail-open authorization |
| `/api/admin/batches/[id]` | `PATCH` | Mutation | requireAuth() | Any Authenticated | None | batches-page.tsx | **Critical P0**: Fail-open authorization |
| `/api/admin/batches/[id]` | `DELETE` | Mutation | requireAuth() | Any Authenticated | None | batches-page.tsx | **Critical P0**: Fail-open; Missing Zod validation |
| `/api/admin/certificates/batch` | `GET` | Read | requireAuth() | Any Authenticated | None | batches-page.tsx | Secure (standard) |
| `/api/admin/certificates/[participantId]` | `GET` | Read | requireAuth() | Any Authenticated | None | batches-page.tsx | Secure (standard) |
| `/api/admin/cities` | `GET` | Read | requireRole() | super_admin,program_admin | None | page-header.tsx, access-provisioning-page.tsx, admin-attendance-events.tsx, admissions-page.tsx, cities-page.tsx, fees-page.tsx, guardians-page.tsx, parks-page.tsx, people-page.tsx, reports-page.tsx, students-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/cities` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | page-header.tsx, access-provisioning-page.tsx, admin-attendance-events.tsx, admissions-page.tsx, cities-page.tsx, fees-page.tsx, guardians-page.tsx, parks-page.tsx, people-page.tsx, reports-page.tsx, students-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/cities/[id]` | `GET` | Read | requireRole() | super_admin,program_admin | None | cities-page.tsx | Secure (standard) |
| `/api/admin/cities/[id]` | `PATCH` | Mutation | requireRole() | super_admin,program_admin | None | cities-page.tsx | Secure (standard) |
| `/api/admin/cities/[id]` | `DELETE` | Mutation | requireRole() | super_admin,program_admin | None | cities-page.tsx | Missing request body validation (Zod) |
| `/api/admin/dashboard` | `GET` | Read | requireAuth() | Any Authenticated | None | admin-dashboard.tsx, settings-page.tsx | Secure (standard) |
| `/api/admin/fees/batch-create` | `POST` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees` | `GET` | Read | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees` | `POST` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees/[id]/payments` | `GET` | Read | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees/[id]/payments` | `POST` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | **P0**: Missing batch-to-participant matching |
| `/api/admin/fees/[id]/remind` | `POST` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Missing request body validation (Zod) |
| `/api/admin/fees/[id]` | `GET` | Read | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees/[id]` | `PATCH` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees/[id]` | `DELETE` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Missing request body validation (Zod) |
| `/api/admin/fees/[id]/waiver` | `POST` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/fees/[id]/waiver` | `DELETE` | Mutation | requireAuth() | Any Authenticated | None | fees-page.tsx | Missing request body validation (Zod) |
| `/api/admin/groups` | `GET` | Read | requireAuth() | Any Authenticated | None | page-header.tsx, access-provisioning-page.tsx, admissions-page.tsx, groups-page.tsx, people-page.tsx, students-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/groups` | `POST` | Mutation | requireAuth() | Any Authenticated | None | page-header.tsx, access-provisioning-page.tsx, admissions-page.tsx, groups-page.tsx, people-page.tsx, students-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/groups/[id]` | `GET` | Read | requireAuth() | Any Authenticated | None | groups-page.tsx | **Critical P0**: Fail-open authorization |
| `/api/admin/groups/[id]` | `PATCH` | Mutation | requireAuth() | Any Authenticated | None | groups-page.tsx | **Critical P0**: Fail-open authorization |
| `/api/admin/groups/[id]` | `DELETE` | Mutation | requireAuth() | Any Authenticated | None | groups-page.tsx | **Critical P0**: Fail-open; Missing Zod validation |
| `/api/admin/guardians/batch` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | guardians-page.tsx | Secure (standard) |
| `/api/admin/guardians/invite` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | guardians-page.tsx | **Critical P0**: Plaintext password logged & generated but unused |
| `/api/admin/guardians` | `GET` | Read | requireRole() | super_admin,program_admin | None | guardian-detail-sheet.tsx, guardians-page.tsx | Secure (standard) |
| `/api/admin/guardians` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | guardian-detail-sheet.tsx, guardians-page.tsx | Secure (standard) |
| `/api/admin/guardians/[id]/detail` | `GET` | Read | requireRole() | super_admin,program_admin,city_head,park_admin,park_lead,murabbi, | None | guardian-detail-sheet.tsx | **P0**: Missing scope validation (data leakage) |
| `/api/admin/guardians/[id]` | `PATCH` | Mutation | requireRole() | super_admin,program_admin | None | guardian-detail-sheet.tsx, guardians-page.tsx | Secure (standard) |
| `/api/admin/guardians/[id]` | `DELETE` | Mutation | requireRole() | super_admin,program_admin | None | guardian-detail-sheet.tsx, guardians-page.tsx | Missing request body validation (Zod) |
| `/api/admin/import/guardians` | `POST` | Mutation | requireRole() | super_admin,program_admin,city_head,park_admin,park_lead,murabbi, | None | guardians-page.tsx | Secure (standard) |
| `/api/admin/import/participants` | `POST` | Mutation | requireRole() | super_admin,program_admin,city_head,park_admin,park_lead,murabbi, | None | students-page.tsx | Secure (standard) |
| `/api/admin/import/users` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | access-provisioning-page.tsx | Secure (standard) |
| `/api/admin/invite` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | access-provisioning-page.tsx, people-page.tsx | **P0**: Hardcoded shared invite password |
| `/api/admin/notifications/queue` | `GET` | Read | requireRole() | super_admin,program_admin | None | email-service.ts | Secure (standard) |
| `/api/admin/notifications/queue` | `PATCH` | Mutation | requireRole() | super_admin,program_admin | None | email-service.ts | Missing request body validation (Zod) |
| `/api/admin/parks` | `GET` | Read | requireAuth() | Any Authenticated | None | page-header.tsx, access-provisioning-page.tsx, admin-attendance-events.tsx, admissions-page.tsx, batches-page.tsx, fees-page.tsx, parks-page.tsx, people-page.tsx, reports-page.tsx, students-page.tsx, users-page.tsx, scope-selector.tsx | Secure (standard) |
| `/api/admin/parks/[id]` | `GET` | Read | requireRole() | super_admin,program_admin,city_head | City | parks-page.tsx | Secure (standard) |
| `/api/admin/parks/[id]` | `PATCH` | Mutation | requireRole() | super_admin,program_admin,city_head | City | parks-page.tsx | Secure (standard) |
| `/api/admin/parks/[id]` | `DELETE` | Mutation | requireRole() | super_admin,program_admin | None | parks-page.tsx | Missing request body validation (Zod) |
| `/api/admin/payments/[id]/receipt` | `GET` | Read | requireAuth() | Any Authenticated | None | fees-page.tsx | Secure (standard) |
| `/api/admin/people` | `GET` | Read | requireRole() | super_admin,program_admin | None | people-page.tsx | Secure (standard) |
| `/api/admin/reports/attendance-report` | `GET` | Read | requireAuth() | Any Authenticated | None | admin-attendance-events.tsx, reports-page.tsx | Secure (standard) |
| `/api/admin/reports/fee-report` | `GET` | Read | requireRole() | super_admin,program_admin | None | reports-page.tsx | Secure (standard) |
| `/api/admin/reports` | `GET` | Read | requireRole() | super_admin,program_admin | None | admin-attendance-events.tsx, reports-page.tsx | Secure (standard) |
| `/api/admin/students/batch` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | students-page.tsx | Secure (standard) |
| `/api/admin/students` | `GET` | Read | requireRole() | super_admin,program_admin | None | guardians-page.tsx, participant-detail-sheet.tsx, students-page.tsx | Secure (standard) |
| `/api/admin/students` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | guardians-page.tsx, participant-detail-sheet.tsx, students-page.tsx | Secure (standard) |
| `/api/admin/students/[id]/detail` | `GET` | Read | requireRole() | super_admin,program_admin,city_head,park_admin,park_lead,murabbi, | None | participant-detail-sheet.tsx | **P0**: Missing scope validation (data leakage) |
| `/api/admin/students/[id]` | `PATCH` | Mutation | requireRole() | super_admin,program_admin | None | participant-detail-sheet.tsx, students-page.tsx | Secure (standard) |
| `/api/admin/students/[id]` | `DELETE` | Mutation | requireRole() | super_admin,program_admin | None | participant-detail-sheet.tsx, students-page.tsx | Missing request body validation (Zod) |
| `/api/admin/users/batch` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | users-page.tsx | Secure (standard) |
| `/api/admin/users` | `GET` | Read | requireRole() | super_admin,program_admin | None | access-provisioning-page.tsx, people-page.tsx, users-page.tsx | Secure (standard) |
| `/api/admin/users` | `POST` | Mutation | requireRole() | super_admin,program_admin | None | access-provisioning-page.tsx, people-page.tsx, users-page.tsx | Secure (standard) |
| `/api/admin/users/[id]` | `PATCH` | Mutation | requireRole() | super_admin,program_admin | None | access-provisioning-page.tsx, people-page.tsx, users-page.tsx | Secure (standard) |
| `/api/admin/users/[id]` | `DELETE` | Mutation | requireRole() | super_admin,program_admin | None | access-provisioning-page.tsx, people-page.tsx, users-page.tsx | Missing request body validation (Zod) |
| `/api/announcements` | `GET` | Read | requireAuth() | Any Authenticated | None | announcements-page.tsx, guardian-announcements-page.tsx, student-announcements-page.tsx | Secure (standard) |
| `/api/announcements` | `POST` | Mutation | requireRole() | super_admin,program_admin,city_head, | None | announcements-page.tsx, guardian-announcements-page.tsx, student-announcements-page.tsx | Secure (standard) |
| `/api/announcements/[id]` | `DELETE` | Mutation | requireAuth() | Any Authenticated | None | announcements-page.tsx | Missing request body validation (Zod) |
| `/api/auth/reset-password` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | settings-page.tsx, reset-password-page.tsx | Secure (standard) |
| `/api/city-head/dashboard` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | city-head-dashboard.tsx | Secure (standard) |
| `/api/guardian/attendance-history` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | guardian-history-page.tsx | Secure (standard) |
| `/api/guardian/dashboard` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | guardian-dashboard.tsx, guardian-history-page.tsx | Secure (standard) |
| `/api/guardian/fees` | `GET` | Read | requireAuth() | Any Authenticated | None | guardian-fees-page.tsx | Secure (standard) |
| `/api/guardian/schedule` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | guardian-schedule-page.tsx | Secure (standard) |
| `/api/murabbi/dashboard` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | murabbi-dashboard.tsx | Secure (standard) |
| `/api/murabbi/groups` | `GET` | Read | requireAuth() | Any Authenticated | None | murabbi-groups-page.tsx | Secure (standard) |
| `/api/notifications/history` | `GET` | Read | requireAuth() | Any Authenticated | None | notifications-page.tsx, activity-feed.tsx | Secure (standard) |
| `/api/notifications` | `GET` | Read | requireAuth() | Any Authenticated | None | notification-bell.tsx, notifications-page.tsx, activity-feed.tsx | Secure (standard) |
| `/api/notifications/[id]/read` | `PATCH` | Mutation | requireAuth() | Any Authenticated | None | notifications-page.tsx | Missing request body validation (Zod) |
| `/api/park/attendance/check-alerts` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | None | Missing request body validation (Zod) |
| `/api/park/attendance/events` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | park-attendance-page.tsx | Missing request body validation (Zod) |
| `/api/park/attendance/events` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-attendance-page.tsx | Secure (standard) |
| `/api/park/attendance` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx, park-attendance-page.tsx, park-dashboard.tsx, attendance-edit-dialog.tsx, use-attendance-sync.ts | Secure (standard) |
| `/api/park/attendance` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx, park-attendance-page.tsx, park-dashboard.tsx, attendance-edit-dialog.tsx, use-attendance-sync.ts | Missing request body validation (Zod) |
| `/api/park/attendance/sync` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx, use-attendance-sync.ts | Missing request body validation (Zod) |
| `/api/park/attendance/warnings` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx | Secure (standard) |
| `/api/park/attendance/[eventId]/close` | `PATCH` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx, park-dashboard.tsx | **P0**: Super Admin can't close; Missing request body validation (Zod) |
| `/api/park/attendance/[eventId]/records/[recordId]` | `PATCH` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | attendance-edit-dialog.tsx | Missing request body validation (Zod) |
| `/api/park/attendance/[eventId]/reset` | `DELETE` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx | **P0**: Scope check bypasses when assignedParkId is null; Missing request body validation (Zod) |
| `/api/park/attendance/[eventId]` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx, park-attendance-page.tsx, park-dashboard.tsx, attendance-edit-dialog.tsx, use-attendance-sync.ts | Secure (standard) |
| `/api/park/attendance/[eventId]` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | attendance-roster.tsx, park-attendance-page.tsx, park-dashboard.tsx, attendance-edit-dialog.tsx, use-attendance-sync.ts | Missing request body validation (Zod) |
| `/api/park/dashboard` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-dashboard.tsx | Secure (standard) |
| `/api/park/guardians` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-guardians-page.tsx | Secure (standard) |
| `/api/park/guardians` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | park-guardians-page.tsx | **P0**: Murabbi blocked from linking; Missing request body validation (Zod) |
| `/api/park/guardians/search` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-guardians-page.tsx | **P0**: Global search of guardians (PII exposure) |
| `/api/park/participants` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-participants-page.tsx | Secure (standard) |
| `/api/park/participants` | `POST` | Mutation | getServerSession() | Any Authenticated (Manual check) | None | park-participants-page.tsx | Missing request body validation (Zod) |
| `/api/park/roster` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-roster-page.tsx | Secure (standard) |
| `/api/park/schedule` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | park-schedule-page.tsx | Secure (standard) |
| `/api/route.ts` | `GET` | Read | Public (No Session Check) | Public | None | None | Secure (standard) |
| `/api/search` | `GET` | Read | requireAuth() | Any Authenticated | None | None | Secure (standard) |
| `/api/student/attendance-history` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | student-history-page.tsx | Secure (standard) |
| `/api/student/dashboard` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | student-dashboard.tsx | Secure (standard) |
| `/api/student/fees` | `GET` | Read | requireAuth() | Any Authenticated | None | student-fees-page.tsx | Secure (standard) |
| `/api/student/schedule` | `GET` | Read | getServerSession() | Any Authenticated (Manual check) | None | student-schedule-page.tsx | Secure (standard) |
| `/api/upload/avatar` | `POST` | Mutation | requireAuth() | Any Authenticated | None | avatar-upload.tsx | Missing request body validation (Zod) |
| `/api/upload/avatar` | `GET` | Read | requireAuth() | Any Authenticated | None | avatar-upload.tsx | Secure (standard) |
| `/api/upload/document` | `POST` | Mutation | requireAuth() | Any Authenticated | None | document-upload.tsx | Missing request body validation (Zod) |
| `/api/upload/document` | `GET` | Read | requireAuth() | Any Authenticated | None | document-upload.tsx | Secure (standard) |
| `/api/upload/document` | `DELETE` | Mutation | requireAuth() | Any Authenticated | None | document-upload.tsx | Missing request body validation (Zod) |
| `/api/user/profile` | `GET` | Read | requireAuth() | Any Authenticated | None | settings-page.tsx, student-profile-page.tsx | Secure (standard) |
| `/api/user/profile` | `PATCH` | Mutation | requireAuth() | Any Authenticated | None | settings-page.tsx, student-profile-page.tsx | Missing request body validation (Zod) |
