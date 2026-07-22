# UI-to-API Integration Map & Discrepancies Report

> [!IMPORTANT]
> **Historical Architecture Notice**: This document describes a prior architecture. Removed upload components must not be treated as current callers or active codebase components. Current upload-route status and consumer audits are documented in SEC-005 (`docs/product-discovery/SEC-005-UPLOAD-DISABLE-CONSUMER-AUDIT.md`). The review findings below are preserved for historical reference.

This report provides a read-only mapping of the frontend `fetch` calls to backend Next.js API routes for the **Shabab-360-v2** project, identifying integration gaps, schema mismatches, stale paths, and authorization mismatches.

---

## 1. UI-to-API Route Map

| Component / Page | Frontend Action | Target Endpoint | HTTP Method | Matched Backend Route Handler |
| :--- | :--- | :--- | :--- | :--- |
| [notification-bell.tsx](../../../src/components/layout/notification-bell.tsx) | Load Notification Feed | `/api/notifications` | `GET` | [route.ts (notifications)](../../../src/app/api/notifications/route.ts) |
| [use-realtime-notifications.ts](../../../src/hooks/use-realtime-notifications.ts) | Establish Realtime Socket | `/socket.io/?XTransformPort=3004` | `WS` | `mini-services/notification-service/index.ts` |
| [scope-selector.tsx](../../../src/components/shared/scope-selector.tsx) | Load Cities dropdown | `/api/admin/cities` | `GET` | [route.ts (cities)](../../../src/app/api/admin/cities/route.ts) |
| [scope-selector.tsx](../../../src/components/shared/scope-selector.tsx) | Load Parks dropdown | `/api/admin/parks?cityId=...` | `GET` | [route.ts (parks)](../../../src/app/api/admin/parks/route.ts) |
| [scope-selector.tsx](../../../src/components/shared/scope-selector.tsx) | Load Batches dropdown | `/api/admin/batches?parkId=...` | `GET` | [route.ts (batches)](../../../src/app/api/admin/batches/route.ts) |
| [scope-selector.tsx](../../../src/components/shared/scope-selector.tsx) | Load Groups dropdown | `/api/admin/groups?batchId=...` | `GET` | [route.ts (groups)](../../../src/app/api/admin/groups/route.ts) |
| [access-provisioning-page.tsx](../../../src/components/modules/admin/access-provisioning-page.tsx) | Load user list | `/api/admin/users?pageSize=20` | `GET` | [route.ts (users)](../../../src/app/api/admin/users/route.ts) |
| [access-provisioning-page.tsx](../../../src/components/modules/admin/access-provisioning-page.tsx) | Send staff invitation | `/api/admin/invite` | `POST` | [route.ts (invite)](../../../src/app/api/admin/invite/route.ts) |
| [access-provisioning-page.tsx](../../../src/components/modules/admin/access-provisioning-page.tsx) | Update user profile/scope | `/api/admin/users/${userId}` | `PATCH` | [route.ts (user detail)](../../../src/app/api/admin/users/%5Bid%5D/route.ts) |
| [access-provisioning-page.tsx](../../../src/components/modules/admin/access-provisioning-page.tsx) | Deactivate user | `/api/admin/users/${userId}` | `DELETE` | [route.ts (user detail)](../../../src/app/api/admin/users/%5Bid%5D/route.ts) |
| [import-dialog.tsx](../../../src/components/shared/import-dialog.tsx) | Import users dynamically | `/api/admin/import/users` | `POST` | [route.ts (import users)](../../../src/app/api/admin/import/users/route.ts) |
| [admissions-page.tsx](../../../src/components/modules/admin/admissions-page.tsx) | Load pipeline applications | `/api/admin/admissions` | `GET` | [route.ts (admissions)](../../../src/app/api/admin/admissions/route.ts) |
| [admissions-page.tsx](../../../src/components/modules/admin/admissions-page.tsx) | Create admission record | `/api/admin/admissions` | `POST` | [route.ts (admissions)](../../../src/app/api/admin/admissions/route.ts) |
| [admissions-page.tsx](../../../src/components/modules/admin/admissions-page.tsx) | Load application details | `/api/admin/admissions/${id}` | `GET` | [route.ts (admission detail)](../../../src/app/api/admin/admissions/%5Bid%5D/route.ts) |
| [admissions-page.tsx](../../../src/components/modules/admin/admissions-page.tsx) | Update application status | `/api/admin/admissions/${id}` | `PATCH` | [route.ts (admission detail)](../../../src/app/api/admin/admissions/%5Bid%5D/route.ts) |
| [admissions-page.tsx](../../../src/components/modules/admin/admissions-page.tsx) | Enroll applicant (Convert) | `/api/admin/admissions/${id}` | `PATCH` | [route.ts (admission detail)](../../../src/app/api/admin/admissions/%5Bid%5D/route.ts) |
| [admissions-page.tsx](../../../src/components/modules/admin/admissions-page.tsx) | Create interview slot | `/api/admin/admissions/${id}/interviews` | `POST` | [route.ts (interviews)](../../../src/app/api/admin/admissions/%5Bid%5D/interviews/route.ts) |
| [announcements-page.tsx](../../../src/components/modules/admin/announcements-page.tsx) | Load announcements list | `/api/announcements` | `GET` | [route.ts (announcements)](../../../src/app/api/announcements/route.ts) |
| [announcements-page.tsx](../../../src/components/modules/admin/announcements-page.tsx) | Create announcement | `/api/announcements` | `POST` | [route.ts (announcements)](../../../src/app/api/announcements/route.ts) |
| [announcements-page.tsx](../../../src/components/modules/admin/announcements-page.tsx) | Delete announcement | `/api/announcements/${id}` | `DELETE` | [route.ts (announcement detail)](../../../src/app/api/announcements/%5Bid%5D/route.ts) |
| [batches-page.tsx](../../../src/components/modules/admin/batches-page.tsx) | Print batch certificates | `/api/admin/certificates/batch?batchId=...` | `GET` | [route.ts (batch certs)](../../../src/app/api/admin/certificates/batch/route.ts) |
| [guardians-page.tsx](../../../src/components/modules/admin/guardians-page.tsx) | Invite new guardian | `/api/admin/guardians/invite` | `POST` | [route.ts (guardian invite)](../../../src/app/api/admin/guardians/invite/route.ts) |
| [guardian-detail-sheet.tsx](../../../src/components/modules/admin/guardian-detail-sheet.tsx) | Get guardian metadata | `/api/admin/guardians/${id}/detail` | `GET` | [route.ts (guardian detail)](../../../src/app/api/admin/guardians/%5Bid%5D/detail/route.ts) |
| [guardians-page.tsx](../../../src/components/modules/admin/guardians-page.tsx) | Update guardian scope | `/api/admin/guardians/${id}` | `PATCH` | [route.ts (guardian status)](../../../src/app/api/admin/guardians/%5Bid%5D/route.ts) |
| [guardians-page.tsx](../../../src/components/modules/admin/guardians-page.tsx) | Deactivate guardian | `/api/admin/guardians/${id}` | `DELETE` | [route.ts (guardian status)](../../../src/app/api/admin/guardians/%5Bid%5D/route.ts) |
| [import-dialog.tsx](../../../src/components/shared/import-dialog.tsx) | Import guardians dynamically | `/api/admin/import/guardians` | `POST` | [route.ts (import guardians)](../../../src/app/api/admin/import/guardians/route.ts) |
| [students-page.tsx](../../../src/components/modules/admin/students-page.tsx) | Load students list | `/api/admin/students` | `GET` | [route.ts (students)](../../../src/app/api/admin/students/route.ts) |
| [participant-detail-sheet.tsx](../../../src/components/modules/admin/participant-detail-sheet.tsx) | Load student details | `/api/admin/students/${id}/detail` | `GET` | [route.ts (student detail)](../../../src/app/api/admin/students/%5Bid%5D/detail/route.ts) |
| [students-page.tsx](../../../src/components/modules/admin/students-page.tsx) | Update student fields | `/api/admin/students/${id}` | `PATCH` | [route.ts (student update)](../../../src/app/api/admin/students/%5Bid%5D/route.ts) |
| [students-page.tsx](../../../src/components/modules/admin/students-page.tsx) | Deactivate student | `/api/admin/students/${id}` | `DELETE` | [route.ts (student update)](../../../src/app/api/admin/students/%5Bid%5D/route.ts) |
| [students-page.tsx](../../../src/components/modules/admin/students-page.tsx) | Bulk update student states | `/api/admin/students/batch` | `PATCH` | [route.ts (student batch)](../../../src/app/api/admin/students/batch/route.ts) |
| [import-dialog.tsx](../../../src/components/shared/import-dialog.tsx) | Import participants dynamically | `/api/admin/import/participants` | `POST` | [route.ts (import students)](../../../src/app/api/admin/import/participants/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Load fees summary & logs | `/api/admin/fees` | `GET` | [route.ts (fees)](../../../src/app/api/admin/fees/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Create fee events in batch | `/api/admin/fees/batch-create` | `POST` | [route.ts (fees batch create)](../../../src/app/api/admin/fees/batch-create/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Update fee event details | `/api/admin/fees/${id}` | `PATCH` | [route.ts (fee detail)](../../../src/app/api/admin/fees/%5Bid%5D/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Deactivate fee event | `/api/admin/fees/${id}` | `DELETE` | [route.ts (fee detail)](../../../src/app/api/admin/fees/%5Bid%5D/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Log payment transaction | `/api/admin/fees/${id}/payments` | `POST` | [route.ts (payments)](../../../src/app/api/admin/fees/%5Bid%5D/payments/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Send fee warning email | `/api/admin/fees/${id}/remind` | `POST` | [route.ts (remind)](../../../src/app/api/admin/fees/%5Bid%5D/remind/route.ts) |
| [fees-page.tsx](../../../src/components/modules/admin/fees-page.tsx) | Grant fee event waiver | `/api/admin/fees/${id}/waiver` | `POST` | [route.ts (waiver)](../../../src/app/api/admin/fees/%5Bid%5D/waiver/route.ts) |
| [reports-page.tsx](../../../src/components/modules/admin/reports-page.tsx) | Generate attendance report | `/api/admin/reports/attendance-report` | `GET` | [route.ts (attendance report)](../../../src/app/api/admin/reports/attendance-report/route.ts) |
| [reports-page.tsx](../../../src/components/modules/admin/reports-page.tsx) | Generate fee report | `/api/admin/reports/fee-report` | `GET` | [route.ts (fee report)](../../../src/app/api/admin/reports/fee-report/route.ts) |
| [audit-log-page.tsx](../../../src/components/modules/admin/audit-log-page.tsx) | Load system audit logs | `/api/admin/audit-log` | `GET` | [route.ts (audit log)](../../../src/app/api/admin/audit-log/route.ts) |
| [settings-page.tsx](../../../src/components/modules/admin/settings-page.tsx) | Load current profile details | `/api/user/profile` | `GET` | [route.ts (profile)](../../../src/app/api/user/profile/route.ts) |
| [settings-page.tsx](../../../src/components/modules/admin/settings-page.tsx) | Save profile updates | `/api/user/profile` | `POST` | [route.ts (profile)](../../../src/app/api/user/profile/route.ts) |
| [reset-password-page.tsx](../../../src/components/modules/auth/reset-password-page.tsx) | Perform password reset | `/api/auth/reset-password` | `POST` | [route.ts (reset-pwd)](../../../src/app/api/auth/reset-password/route.ts) |
| [city-head-dashboard.tsx](../../../src/components/modules/city-head/city-head-dashboard.tsx) | Load City metrics | `/api/city-head/dashboard` | `GET` | [route.ts (city-head-dash)](../../../src/app/api/city-head/dashboard/route.ts) |
| [murabbi-dashboard.tsx](../../../src/components/modules/murabbi/murabbi-dashboard.tsx) | Load Murabbi metrics | `/api/murabbi/dashboard` | `GET` | [route.ts (murabbi-dash)](../../../src/app/api/murabbi/dashboard/route.ts) |
| [murabbi-groups-page.tsx](../../../src/components/modules/murabbi/murabbi-groups-page.tsx) | Load Murabbi assigned groups | `/api/murabbi/groups` | `GET` | [route.ts (murabbi-groups)](../../../src/app/api/murabbi/groups/route.ts) |
| [park-dashboard.tsx](../../../src/components/modules/park/park-dashboard.tsx) | Load Park metrics | `/api/park/dashboard` | `GET` | [route.ts (park-dash)](../../../src/app/api/park/dashboard/route.ts) |
| [park-attendance-page.tsx](../../../src/components/modules/park/park-attendance-page.tsx) | Get attendance events | `/api/park/attendance/events` | `GET` | [route.ts (attendance events)](../../../src/app/api/park/attendance/events/route.ts) |
| [park-attendance-page.tsx](../../../src/components/modules/park/park-attendance-page.tsx) | Create attendance event | `/api/park/attendance/events` | `POST` | [route.ts (attendance events)](../../../src/app/api/park/attendance/events/route.ts) |
| [attendance-roster.tsx](../../../src/components/modules/park/attendance-roster.tsx) | Load roster for event | `/api/park/attendance/${eventId}` | `GET` | [route.ts (attendance detail)](../../../src/app/api/park/attendance/%5BeventId%5D/route.ts) |
| [attendance-roster.tsx](../../../src/components/modules/park/attendance-roster.tsx) | Fetch active warnings | `/api/park/attendance/warnings?groupId=...` | `GET` | [route.ts (warnings)](../../../src/app/api/park/attendance/warnings/route.ts) |
| [attendance-roster.tsx](../../../src/components/modules/park/attendance-roster.tsx) | Sync local modifications | `/api/park/attendance/sync` | `POST` | [route.ts (attendance sync)](../../../src/app/api/park/attendance/sync/route.ts) |
| [attendance-roster.tsx](../../../src/components/modules/park/attendance-roster.tsx) | Reset attendance records | `/api/park/attendance/${eventId}/reset` | `DELETE` | [route.ts (reset event)](../../../src/app/api/park/attendance/%5BeventId%5D/reset/route.ts) |
| [attendance-roster.tsx](../../../src/components/modules/park/attendance-roster.tsx) | Close attendance event | `/api/park/attendance/${eventId}/close` | `PATCH` | [route.ts (close event)](../../../src/app/api/park/attendance/%5BeventId%5D/close/route.ts) |
| [attendance-edit-dialog.tsx](../../../src/components/shared/attendance-edit-dialog.tsx) | Edit attendance cell | `/api/park/attendance/${eventId}/records/${recordId}` | `PATCH` | [route.ts (record patch)](../../../src/app/api/park/attendance/%5BeventId%5D/records/%5BrecordId%5D/route.ts) |
| [park-guardians-page.tsx](../../../src/components/modules/park/park-guardians-page.tsx) | Load Park guardians list | `/api/park/guardians` | `GET` | [route.ts (park guardians)](../../../src/app/api/park/guardians/route.ts) |
| [park-guardians-page.tsx](../../../src/components/modules/park/park-guardians-page.tsx) | Search guardians by phone | `/api/park/guardians/search?phone=...` | `GET` | [route.ts (guardian search)](../../../src/app/api/park/guardians/search/route.ts) |
| [park-guardians-page.tsx](../../../src/components/modules/park/park-guardians-page.tsx) | Link parent to student | `/api/park/guardians` | `POST` | [route.ts (park guardians)](../../../src/app/api/park/guardians/route.ts) |
| [park-participants-page.tsx](../../../src/components/modules/park/park-participants-page.tsx) | Load park student list | `/api/park/participants` | `GET` | [route.ts (park participants)](../../../src/app/api/park/participants/route.ts) |
| [park-participants-page.tsx](../../../src/components/modules/park/park-participants-page.tsx) | Register student to group | `/api/park/participants` | `POST` | [route.ts (park participants)](../../../src/app/api/park/participants/route.ts) |
| [park-roster-page.tsx](../../../src/components/modules/park/park-roster-page.tsx) | Load daily attendance status | `/api/park/roster` | `GET` | [route.ts (park roster)](../../../src/app/api/park/roster/route.ts) |
| [park-schedule-page.tsx](../../../src/components/modules/park/park-schedule-page.tsx) | Load weekly agenda slots | `/api/park/schedule?weekOffset=...` | `GET` | [route.ts (park schedule)](../../../src/app/api/park/schedule/route.ts) |
| [guardian-dashboard.tsx](../../../src/components/modules/guardian/guardian-dashboard.tsx) | Load Guardian profile data | `/api/guardian/dashboard` | `GET` | [route.ts (guardian dash)](../../../src/app/api/guardian/dashboard/route.ts) |
| [guardian-history-page.tsx](../../../src/components/modules/guardian/guardian-history-page.tsx) | Load child historical stats | `/api/guardian/attendance-history` | `GET` | [route.ts (guardian attendance)](../../../src/app/api/guardian/attendance-history/route.ts) |
| [guardian-fees-page.tsx](../../../src/components/modules/guardian/guardian-fees-page.tsx) | Load child pending payments | `/api/guardian/fees` | `GET` | [route.ts (guardian fees)](../../../src/app/api/guardian/fees/route.ts) |
| [guardian-schedule-page.tsx](../../../src/components/modules/guardian/guardian-schedule-page.tsx) | Load weekly calendar slots | `/api/guardian/schedule` | `GET` | [route.ts (guardian schedule)](../../../src/app/api/guardian/schedule/route.ts) |
| [student-dashboard.tsx](../../../src/components/modules/student/student-dashboard.tsx) | Load Student profile stats | `/api/student/dashboard` | `GET` | [route.ts (student dash)](../../../src/app/api/student/dashboard/route.ts) |
| [student-history-page.tsx](../../../src/components/modules/student/student-history-page.tsx) | Load historical attendance | `/api/student/attendance-history` | `GET` | [route.ts (student history)](../../../src/app/api/student/attendance-history/route.ts) |
| [student-fees-page.tsx](../../../src/components/modules/student/student-fees-page.tsx) | Load child ledger entries | `/api/student/fees` | `GET` | [route.ts (student fees)](../../../src/app/api/student/fees/route.ts) |
| [student-schedule-page.tsx](../../../src/components/modules/student/student-schedule-page.tsx) | Load weekly class agenda | `/api/student/schedule` | `GET` | [route.ts (student schedule)](../../../src/app/api/student/schedule/route.ts) |
| [avatar-upload.tsx](../../../src/components/shared/avatar-upload.tsx) | Upload profile picture file | `/api/upload/avatar` | `POST` | [route.ts (avatar upload)](../../../src/app/api/upload/avatar/route.ts) |
| [document-upload.tsx](../../../src/components/shared/document-upload.tsx) | Fetch linked documents list | `/api/upload/document` | `GET` | [route.ts (doc upload)](../../../src/app/api/upload/document/route.ts) |
| [document-upload.tsx](../../../src/components/shared/document-upload.tsx) | Upload a files bundle | `/api/upload/document` | `POST` | [route.ts (doc upload)](../../../src/app/api/upload/document/route.ts) |
| [document-upload.tsx](../../../src/components/shared/document-upload.tsx) | Delete a document from list | `/api/upload/document` | `DELETE` | [route.ts (doc upload)](../../../src/app/api/upload/document/route.ts) |

---

## 2. Identified Schema Mismatches, Issues & Discrepancies

### A. Runtime Crash: Schema Mismatch on Guardian Invitation (`/api/admin/guardians/invite`)
*   **Evidence Location**: [route.ts:L122](../../../src/app/api/admin/guardians/invite/route.ts#L122):
    ```ts
    const guardian = await tx.guardian.create({
      data: {
        userId: user.id,
        name,
        phone,
        cnic: cnic || null,
        address: address || null,
        occupation: relationship || null, // <--- Schema mismatch!
      },
    });
    ```
*   **Database Schema**: [schema.prisma:L139](../../../prisma/schema.prisma#L139) contains no `occupation` field on the `Guardian` model. The `relationship` parameter should map to `GuardianChild.relation` rather than `Guardian.occupation`.
*   **Affected Roles**: Super Admins and Program Admins.
*   **User Impact**: **P0 Runtime Crash**. Attempting to invite a new guardian causes a Prisma validation crash on database write, making it impossible to register parents/guardians.
*   **Recommended Acceptance Test**:
    ```ts
    const res = await fetch("/api/admin/guardians/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ahmad Malik",
        phone: "03001234567",
        relationship: "Father"
      })
    });
    expect(res.status).toBe(201); // Asserts that creation succeeds without throwing a Prisma validation error.
    ```

---

### B. Broken Authorization: Role Mismatch on Attendance Management API endpoints
*   **Evidence Location**:
    *   **Edit Attendance Cell**: [route.ts:L16](../../../src/app/api/park/attendance/%5BeventId%5D/records/%5BrecordId%5D/route.ts#L16) defines:
        ```ts
        const EDIT_ROLES = ["admin", "park_admin", "park_lead"];
        ```
        And restricts global scope evaluation at [route.ts:L72](../../../src/app/api/park/attendance/%5BeventId%5D/records/%5BrecordId%5D/route.ts#L72) with:
        ```ts
        if (user.role !== "admin") { ... }
        ```
    *   **Close Attendance Event**: [route.ts:L28](../../../src/app/api/park/attendance/%5BeventId%5D/close/route.ts#L28):
        ```ts
        if (user.role !== "park_admin" && user.role !== "park_lead") { ... }
        ```
    *   **Reset Attendance Event**: [route.ts:L15](../../../src/app/api/park/attendance/%5BeventId%5D/reset/route.ts#L15):
        ```ts
        const ALLOWED_ROLES = ["park_admin", "park_lead"];
        ```
*   **System Roles**: The database enum roles are `"super_admin"`, `"program_admin"`, `"city_head"`, `"park_admin"`, `"park_lead"`, `"murabbi"`, `"guardian"`, `"student"`. There is no `"admin"` role in the system database.
*   **Affected Roles**: Super Admins (`super_admin`), Program Admins (`program_admin`), and City Heads (`city_head`).
*   **User Impact**: **Broken User Flow**. Global and regional administrators are blocked (`403 Forbidden`) from modifying, closing, or resetting park attendance events, despite possessing higher privilege rights.
*   **Recommended Acceptance Test**:
    *   Authenticate as a `super_admin` or `program_admin`.
    *   Dispatch a `PATCH` request to `/api/park/attendance/[eventId]/records/[recordId]` with a valid `status` and `editReason`.
    *   Verify that the response returns `200 OK` (success) and the modification is logged, rather than returning `403 Forbidden`.

---

### C. Runtime Crash: Schema Mismatch in Global Search API Route (`/api/search`)
*   **Evidence Location**: [route.ts:L68](../../../src/app/api/search/route.ts#L68) inside the `searchParticipants` helper:
    ```ts
    const where: Prisma.ParticipantWhereInput = {
      isActive: true, // <--- Schema mismatch!
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    };
    ```
*   **Database Schema**: [schema.prisma:L170](../../../prisma/schema.prisma#L170) contains no `isActive` field on the `Participant` model (it uses `state: String @default("active")`).
*   **Affected Roles**: Administrators performing global queries.
*   **User Impact**: **Potential Runtime Crash**. If the global search was ever triggered, it would throw an internal server error due to Prisma schema validation failure.
*   **Recommended Acceptance Test**:
    *   Execute a request: `GET /api/search?q=test`.
    *   Assert that the server returns a structured array with `200 OK` status and doesn't crash on the `isActive` parameter check.

---

### D. Hard-coded Development assumptions on Realtime Notifications
*   **Evidence Location**:
    *   [route.ts:L92](../../../src/app/api/park/attendance/%5BeventId%5D/close/route.ts#L92):
        ```ts
        fetch("http://localhost:3004/notify", { ... })
        ```
    *   [route.ts:L317](../../../src/app/api/park/attendance/%5BeventId%5D/route.ts#L317):
        ```ts
        fetch("http://localhost:3004/notify", { ... })
        ```
    *   [route.ts:L188](../../../src/app/api/park/attendance/sync/route.ts#L188):
        ```ts
        fetch("http://localhost:3004/notify", { ... })
        ```
*   **User Impact**: **Broken Realtime Flow in Production**. The server side attempts to post notifications to a hardcoded local port `3004`. Once the Next.js app is deployed to a serverless platform like Vercel, these requests fail, preventing active managers from receiving real-time dashboard notifications.
*   **Recommended Acceptance Test**:
    *   Deploy changes behind a staging flag and assert that the internal `fetch` targets an environment-configured variable `NOTIFICATION_SERVICE_URL` instead of a hard-coded local address.

---

### E. Stale Paths (Code Duplication & Dead Code)

1.  **Dead Endpoint: Global Search**
    *   **Path**: `src/app/api/search/route.ts`
    *   **Status**: Stale. There is no global search bar or search component in the application shell or sub-pages that invokes this endpoint.
2.  **Dead Endpoint: Individual Participant Certificate**
    *   **Path**: `src/app/api/admin/certificates/[participantId]/route.ts`
    *   **Status**: Stale. The UI batch print dialog at [batches-page.tsx:L227](../../../src/components/modules/admin/batches-page.tsx#L227) pulls certificates in bulk via `/api/admin/certificates/batch` and maps the payload, bypassing this individual endpoint entirely.
3.  **Duplicate Endpoint: Admissions Enrollment Conversion**
    *   **Path**: `src/app/api/admin/admissions/[id]/convert/route.ts`
    *   **Status**: Stale/Duplicate. Both this route and the generic `PATCH` update route in `src/app/api/admin/admissions/[id]/route.ts` implement the identical participant creation, optional guardian insertion, and admission link update logic. The UI calls the `PATCH` route with `status="enrolled"` and ignores the dedicated `/convert` route.
*   **User Impact**: Unnecessary technical debt, bloated bundle size, and increased maintenance overhead.

---

Ready for Codex review.
