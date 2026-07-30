# Module CRUD & Lifecycle Audit (CRUD-001)

**Audit Date:** 2026-07-30
**Planning Base:** `11aadee` on `codex/lahore-uat-candidate`
**Authoritative Documents:** `AGENTS.md`, `.agents/memory/current.md`, `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`, `docs/product-discovery/OWNER-REQUIREMENTS-2026-07-30.md`, `DEVELOPMENT-EXECUTION-PLAN-2026-07-30.md`
**Execution Guardrail:** Code evidence outranks legacy documents. Pure audit task—no code, schema, or data changes are included in this deliverable. Base state is strictly commit `11aadee`.

---

## 1. Executive Summary & Audit Methodology

This audit evaluates the lifecycle support (`create`, `read`, `update`, `delete`, `archive`, `close`, `reopen`, `assign`) across all 12 core modules of Shabab 360 at base commit `11aadee`. Each lifecycle action was audited against live codebase evidence in `src/app/api`, `src/app/admin`, `src/lib/auth`, `prisma/schema.prisma`, and corresponding Vitest test suites.

### Core Architecture Findings:
1. **Deny-by-Default Capability System:** Capability definitions (`ACCESS_CAPABILITIES`, `USER_OVERRIDE_CAPABILITIES`, `ROLE_DEFAULT_CAPABILITIES`) are anchored in `src/lib/auth/capabilities.ts`. Server-side enforcement uses `requireCapability` (`src/lib/auth/capability-access.ts`), `authorize.ts`, and `scope.ts` using 40 controlled capability codes. Capability checks are strictly paired with hierarchy scope authorization.
2. **Hierarchy Scope Integrity:** `cityId`, `parkId`, and `groupId` scope limits are strictly enforced on server endpoints via `src/lib/auth/scope.ts`. Missing scope denies access; scoped roles (`city_head`, `park_lead`, `park_admin`, `murabbi`) cannot access cross-hierarchy data.
3. **Audit Log & PII Protections:** Sensitive mutations produce structured `AuditLog` records with PII redaction (e.g. phone numbers masked, passwords omitted, call notes kept out of system audit entries).
4. **Immutable Ledger Design:** Certain domain concepts (e.g. `AttendanceRecord`, `Payment`, `AuditLog`) intentionally omit `delete` and `update` actions to preserve financial and historical data integrity.
5. **Evidence Discipline for Lifecycle Labels:** To maintain strict UAT standards, an action is labeled **Full** only when supported by API routes + UI integration + Vitest tests + verified browser UAT evidence. Modules with working API endpoints that lack complete browser UAT or UI workflows are classified as **Partial**.

---

## 2. Complete Module Lifecycle Support Matrix

Support States:
- **Full:** Supported by dedicated API routes, server scope gates, Zod validation, audit logging, UI integration, Vitest coverage, and verified browser UAT evidence.
- **Partial:** Route exists in API or database schema, but lacks complete browser UAT, mobile workflow, edge-case validation, or full UI coverage.
- **Planned (Wave 1/2):** Under active construction in current development execution plan (e.g., ATT-001..005, MASH-005/006, CALL-009, CP-IMPORT-001, EVENT-005/006).
- **Gap (CRUD-002):** Unimplemented lifecycle action requiring a dedicated isolated task in Wave 3.
- **N/A (Immutable Ledger):** Action intentionally prohibited by architectural design (e.g., deleting historical attendance or payments).

| Module | Create | Read | Update | Delete | Archive | Close | Reopen | Assign |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Attendance** | Partial | Partial | Partial (Correct) | N/A (Ledger) | Partial | Partial | Gap | Planned (ATT-003) |
| **2. Content Planner** | Partial | Partial | Partial | Partial | Partial | Gap | Gap | Partial |
| **3. Events** | Partial | Partial | Partial | Partial | Partial | Partial | Gap | Partial (Teams/Resp) |
| **4. Mashwara** | Partial | Partial | Partial | Partial | Partial | Partial | Planned (MASH-006)| Planned (MASH-006)|
| **5. Calling** | Partial | Partial | Partial | Partial | Partial | Partial (Campaign) | Gap | Partial |
| **6. Media** | Partial | Partial | Partial | Partial | Gap | Gap | Gap | Partial |
| **7. Teams** | Partial | Partial | Partial | Partial | Gap | Gap | Gap | Partial (Members) |
| **8. Students** | Partial | Partial | Partial | Gap | Gap | Gap | Gap | Partial (Group/Batch)|
| **9. Guardians** | Partial | Partial | Partial | Gap | Gap | N/A | N/A | Partial (Child Link) |
| **10. Admissions** | Partial | Partial | Partial | Partial | Gap | Partial (Reject) | Gap | Partial (Interviewer)|
| **11. Fees & Payments**| Partial | Partial | N/A (Ledger) | N/A (Ledger) | N/A | Partial (Receipt) | N/A | Partial (Participant)|
| **12. Access Management**| Full | Full | Full | Full | N/A | N/A | N/A | Full (Overrides) |

---

## 3. Detailed Module-by-Module Audit

### 3.1 Attendance Module

- **Verified Prisma Models at Base 11aadee:** `AttendanceEvent`, `AttendanceRecord`, `Participant`, `BatchSettings`.
  *(Note: `StaffAttendanceRecord` and `AttendanceEventRosterEntry` snapshot models are NOT present at base `11aadee`; they are **Planned (ATT-001)**).*
- **API Routes:**
  - `POST /api/murabbi/attendance/batch` (Submit session attendance)
  - `POST /api/park/attendance` (Park-level session attendance)
  - `GET /api/admin/attendance-events` (List sessions with pagination & scope filters)
  - `GET /api/admin/attendance-events/[eventId]` (Session details & record breakdown)
  - `PATCH /api/admin/attendance-events/[eventId]` (Session correction)
- **Capabilities & Roles:**
  - `attendance.mark`: Defined in `src/lib/auth/capabilities.ts`. Allowed for `super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi`.
  - `attendance.correct`: Allowed for `super_admin`, `program_admin`, `city_head`, `park_lead`.
- **Hierarchy Scope:** Server verifies caller's `cityId`, `parkId`, `groupId` via `src/lib/auth/scope.ts`. Scoped roles cannot mark outside assigned group/park.
- **Audit Behavior:** `AuditLog` generated on batch creation and session corrections. Records PII-free summary data (present/absent counts, event ID).
- **Error States:** `400` on invalid payload/date, `401` unauthenticated, `403` scope violation / missing capability, `404` event/participant missing, `409` closed session rewrite attempt.
- **Vitest Evidence:** `src/app/api/admin/attendance-events/route.test.ts`, `src/app/api/admin/attendance-events/[eventId]/route.test.ts`.
- **Browser UAT Need:** Mobile responsive attendance marking at 375px/390px viewport (ATT-005).
- **Identified Gaps (CRUD-002):** Missing dedicated `POST /api/admin/attendance-events/[eventId]/reopen` endpoint to reopen accidentally closed sessions with mandatory audit reason.

---

### 3.2 Content Planner Module

- **Verified Prisma Models at Base 11aadee:** `ContentPlan`, `ContentPlanSession`, `ContentPlanBlock`, `ContentPlanResource`, `ActivityPlanItem`.
- **API Routes:**
  - `GET /api/admin/content-planner/plans` (List plans)
  - `POST /api/admin/content-planner/plans` (Create plan)
  - `GET /api/admin/content-planner/plans/[id]` (Get plan details)
  - `PUT /api/admin/content-planner/plans/[id]` (Update plan)
  - `DELETE /api/admin/content-planner/plans/[id]` (Delete plan - soft archive)
  - `GET/POST /api/admin/content-planner/sessions`
  - `PATCH /api/admin/content-planner/sessions/[id]` (Existing route for session metadata & status updates)
  - `DELETE /api/admin/content-planner/sessions/[id]` (Existing route for session soft deletion)
  - `GET/POST /api/admin/content-planner/blocks`
- **Capabilities & Roles:**
  - `content.view`: Read plans (`super_admin`, `program_admin`, `city_head`, `park_lead`, `murabbi`). Defined in `src/lib/auth/capabilities.ts`.
  - `content.manage`: Write plans (`super_admin`, `program_admin`, `city_head`).
- **Hierarchy Scope:** City template vs. Park override scoping. City Head limited to assigned city plans.
- **Audit Behavior:** Plan mutations create `AuditLog` entries with plan title and target city/park scope.
- **Error States:** `400` validation failure, `401`, `403` missing scope, `404` plan not found.
- **Vitest Evidence:** `src/app/api/admin/content-planner/plans/route.test.ts`, `content-planner-ui.test.ts`.
- **Browser UAT Need:** Responsive content planner grid view and park override creation.
- **Identified Gaps (CRUD-002):** Audit and UI acceptance for session status transition rules (`planned` -> `in_progress` -> `completed` -> `archived`) using the existing `PATCH /api/admin/content-planner/sessions/[id]` endpoint rather than creating a duplicate API route.

---

### 3.3 Events Module

- **Verified Prisma Models at Base 11aadee:** `Event`, `TemporaryEventTeam`, `EventTeamMembership`, `EventResponsibility`, `EventPlannerItem`.
- **API Routes:**
  - `GET/POST /api/admin/events` (List/Create events)
  - `GET/PUT/DELETE /api/admin/events/[id]` (Manage event)
  - `GET/POST /api/admin/events/teams` (Manage temporary event teams)
  - `GET/POST /api/admin/events/responsibilities` (Manage event responsibilities)
  - `GET/POST /api/admin/events/planner-items` (Manage event planner checklist)
- **Capabilities & Roles:**
  - `events.view`: Read events (`super_admin`, `program_admin`, `city_head`, `park_lead`). Defined in `src/lib/auth/capabilities.ts`.
  - `events.manage`: Create/edit/delete events (`super_admin`, `program_admin`, `city_head`).
  - `events.responsibilities.manage`: Assign event tasks & teams.
- **Hierarchy Scope:** `events-scope.ts` enforces `cityId` / `parkId` boundaries.
- **Audit Behavior:** All event modifications write to `AuditLog`.
- **Error States:** `400` malformed date/capacity, `401`, `403` scope violation, `404` event missing.
- **Vitest Evidence:** `events-api.test.ts`, `events-routes.test.ts`, `events-scope.test.ts`.
- **Browser UAT Need:** Mobile event dashboard and team assignment drawer.
- **Identified Gaps (CRUD-002):** Event attendance projection to canonical attendance ledger without creating duplicate `AttendanceRecord` rows (EVENT-006 dependency).

---

### 3.4 Mashwara Module

- **Verified Prisma Models at Base 11aadee:** `MashwaraMeeting`, `MashwaraAttendee`, `MashwaraDecision`, `MashwaraActionItem`, `MashwaraMeetingShare`.
- **API Routes:**
  - `GET/POST /api/admin/mashwara` (List/Create meetings)
  - `GET/PUT/DELETE /api/admin/mashwara/[id]` (Manage meeting details)
  - `GET/POST /api/admin/mashwara/[id]/decisions` (Record decisions)
  - `GET/POST/DELETE /api/admin/mashwara/[id]/shares` (Manage meeting access shares)
- **Capabilities & Roles:**
  - `mashwara.view`: Read meeting notes (`super_admin`, `program_admin`, `city_head`, `park_lead`). Defined in `src/lib/auth/capabilities.ts`.
  - `mashwara.manage`: Create/edit meeting and decisions.
- **Hierarchy Scope:** `mashwara-scope.ts` restricts access to same-city team members and explicit meeting share recipients.
- **Audit Behavior:** Meeting creation, decision recording, and share grants write immutable `AuditLog` entries.
- **Error States:** `400` validation, `401`, `403` scope denied, `404` meeting not found.
- **Vitest Evidence:** `mashwara-api.test.ts`, `mashwara-scope.test.ts`.
- **Browser UAT Need:** Verification of direct refresh fix (MASH-005) and action item task assignment UI (MASH-006).
- **Identified Gaps (CRUD-002):** Formal meeting close & reopen workflow with locked MoM (Minutes of Meeting) state.

---

### 3.5 Calling Module

- **Verified Prisma Models at Base 11aadee:** `CallingCampaign`, `CallingPOCAssignment`, `ExternalSupportCaller`, `CallingTemplate`, `CallingTemplateUse`, `CallingAssignment`, `CallInteraction`.
- **API Routes:**
  - `GET/POST /api/calling/campaigns` (Manage calling campaigns)
  - `GET/POST /api/calling/assignments` (Lead assignments)
  - `GET/POST /api/calling/interactions` (Log call outcome)
  - `GET/POST /api/calling/templates` (Message templates)
- **Capabilities & Roles:**
  - `calling.view`: Caller access (`super_admin`, `program_admin`, `city_head`, `park_lead`). Defined in `src/lib/auth/capabilities.ts`.
  - `calling.poc.manage`: Calling POC campaign administration (`super_admin`, `program_admin`, `city_head`).
  - `calling.templates.manage`, `calling.export.manage`.
- **Hierarchy Scope:** Campaign and lead access scoped to assigned city and explicitly assigned callers.
- **Audit Behavior:** Audited CSV exports and campaign administration. Call interaction notes excluded from system audit logs to protect PII.
- **Error States:** `400`, `401`, `403` foreign city/unassigned lead, `404` lead missing.
- **Vitest Evidence:** `calling-api.test.ts`, `calling-ui-context.test.ts`.
- **Browser UAT Need:** Mobile lead calling workflow and WhatsApp deep-link generation.
- **Identified Gaps (CRUD-002):** Calling campaign archive and lead re-assignment bulk operations.

---

### 3.6 Media Module

- **Verified Prisma Models at Base 11aadee:** `MediaBrief`, `StaffTeamMembership` (Media collaboration team).
- **API Routes:**
  - `GET/POST /api/admin/media/briefs` (List/Create media briefs)
  - `GET/PUT/DELETE /api/admin/media/briefs/[id]` (Manage brief)
- **Capabilities & Roles:**
  - `media.workspace.view`, `media.workspace.manage`, `media.briefs.manage`: `super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi` (with Media team membership). Defined in `src/lib/auth/capabilities.ts`.
- **Hierarchy Scope:** City/Park scope derived via active user context and team membership.
- **Audit Behavior:** Audit entries written on media brief status change (Draft -> Approved -> Published).
- **Error States:** `400` invalid input, `401`, `403` missing team membership/capability, `404`.
- **Vitest Evidence:** `src/app/api/admin/media/media.test.ts`.
- **Browser UAT Need:** Dedicated admin UI workspace page for Media briefs management.
- **Identified Gaps (CRUD-002):** Media asset attachment linkage and explicit brief archiving/reopening.

---

### 3.7 Teams (Collaboration Teams) Module

- **Verified Prisma Models at Base 11aadee:** `CollaborationTeam`, `StaffTeamMembership`.
- **API Routes:**
  - `GET /api/admin/collaboration-teams` (List 5 canonical teams: Sports, Skills, Tadreeb, Media, Muawin)
  - `GET/POST/DELETE /api/admin/teams/[id]/members` (Manage team memberships)
  - `GET /api/admin/teams/can-manage` (Check manage capability)
- **Capabilities & Roles:**
  - `teams.memberships.manage`: `super_admin`, `program_admin`, `city_head`. Defined in `src/lib/auth/capabilities.ts`.
  - `teams.workspace.view`, `teams.workspace.manage`.
- **Hierarchy Scope:** Teams belong to a city. Team membership NEVER expands login role or hierarchy scope.
- **Audit Behavior:** Team member add/remove operations log detailed audit records.
- **Error States:** `400` missing staffId, `401`, `403` non-city head trying to manage team, `404` team not found, `409` duplicate membership.
- **Vitest Evidence:** `teams-api.test.ts`, `route.test.ts`.
- **Browser UAT Need:** Admin team membership management page at 375px/390px.
- **Identified Gaps (CRUD-002):** Bulk team membership assignment UI and team role title customization.

---

### 3.8 Students Module

- **Verified Prisma Models at Base 11aadee:** `Participant`, `StudentExtendedProfile`.
- **API Routes:**
  - `GET/POST /api/admin/students` (List/Create participants)
  - `GET/PUT/DELETE /api/admin/students/[id]` (Manage participant profile)
  - `GET/PUT /api/admin/students/[participantId]/profile` (Extended profile: age, gradeClass, medical notes)
  - `POST /api/admin/students/batch` (Bulk operations)
- **Capabilities & Roles:**
  - `students.manage`: Create/edit basic participant profile. Defined in `src/lib/auth/capabilities.ts`.
  - `students.profile.view`, `students.profile.manage`: Access extended profile.
  - `students.profile.sensitive.view`, `students.profile.sensitive.manage`: Medical & safeguarding notes.
- **Hierarchy Scope:** Scoped strictly by `cityId`, `parkId`, `groupId`. Nullable `groupId` supported for unassigned Lahore candidates.
- **Audit Behavior:** PII modifications and sensitive medical profile reads write to `AuditLog`.
- **Error States:** `400` validation failure, `401`, `403` missing scope/capability, `404` participant not found.
- **Vitest Evidence:** `src/app/api/admin/students/route.test.ts`.
- **Browser UAT Need:** Mobile student profile view, manual dropout confirmation flow (ATT-005).
- **Identified Gaps (CRUD-002):** Manual student archive/soft-delete and bulk group reassignment API.

---

### 3.9 Guardians Module

- **Verified Prisma Models at Base 11aadee:** `Guardian`, `GuardianChild`.
- **API Routes:**
  - `GET/POST /api/admin/guardians` (List/Create guardians)
  - `GET/PUT/DELETE /api/admin/guardians/[id]` (Manage guardian)
  - `POST /api/admin/guardians/invite` (Send portal invite)
- **Capabilities & Roles:**
  - `guardians.manage`: `super_admin`, `program_admin`, `city_head`, `guardian`. Defined in `src/lib/auth/capabilities.ts`.
  - `people.view`.
- **Hierarchy Scope:** Scoped by linked student's city/park. Phone lookup requires exact full phone number and masks PII (CNIC and home address omitted).
- **Audit Behavior:** Guardian profile changes and child linkages recorded in `AuditLog`.
- **Error States:** `400` invalid phone format, `401`, `403` forbidden, `404` guardian not found, `409` duplicate phone match.
- **Vitest Evidence:** `src/app/api/admin/guardians/route.test.ts`.
- **Browser UAT Need:** Guardian child lookup and verification drawer.
- **Identified Gaps (CRUD-002):** Self-service child linking request & administrative approval workflow.

---

### 3.10 Admissions Module

- **Verified Prisma Models at Base 11aadee:** `AdmissionApplication`, `AdmissionInterview`.
- **API Routes:**
  - `GET/POST /api/admin/admissions` (List/Create applications)
  - `GET/PUT/DELETE /api/admin/admissions/[id]` (Update application status / interview scheduling)
  - `POST /api/admin/admissions/[id]/convert` (Existing route for application conversion to participant)
- **Capabilities & Roles:**
  - `admissions.manage`: `super_admin`, `program_admin`, `city_head`. Defined in `src/lib/auth/capabilities.ts`.
- **Hierarchy Scope:** Scoped to target `cityId` and `parkId`.
- **Audit Behavior:** Application state transitions (Submitted -> Interview Scheduled -> Accepted / Rejected) are logged in `AuditLog`.
- **Error States:** `400` missing fields, `401`, `403` scope error, `404` application not found.
- **Vitest Evidence:** `src/app/api/admin/admissions/route.test.ts`.
- **Browser UAT Need:** Mobile admissions list, interview evaluation form.
- **Identified Gaps (CRUD-002):** Conversion route hardening: scope validation, capability check consistency, handling nullable `groupId` after ATT-001, guardian duplicate resolution, transactional audit logging, and tests.

---

### 3.11 Fees & Payments Module

- **Verified Prisma Models at Base 11aadee:** `FeeEvent`, `Payment`, `ReceiptSequence`.
- **API Routes:**
  - `GET/POST /api/admin/fees` (List/Create fee events)
  - `GET/PUT/DELETE /api/admin/fees/[id]` (Manage fee event)
  - `POST /api/admin/fees/batch-create` (Mass fee assignment)
  - `POST /api/admin/payments/[id]` (Record payment against fee event)
- **Capabilities & Roles:**
  - `fees.manage`: `super_admin`, `program_admin`, `city_head`. Defined in `src/lib/auth/capabilities.ts`.
- **Hierarchy Scope:** Scoped to participant's `cityId` and `parkId`.
- **Audit Behavior:** Transactional payment recording; exact-money integer validation; receipt sequence generated and logged in `AuditLog`.
- **Error States:** `400` invalid money amount / non-integer paisa, `401`, `403` missing scope, `404` fee event missing, `409` overpayment error.
- **Vitest Evidence:** `src/app/api/admin/fees/route.test.ts`.
- **Browser UAT Need:** Mobile fee collection modal and receipt preview.
- **Identified Gaps (CRUD-002):** Payment refund / fee waiver request and approval workflow.

---

### 3.12 Access Management Module

- **Verified Prisma Models at Base 11aadee:** `RoleCapabilityOverride`, `UserCapabilityOverride`, `User`, `StaffMeta`.
- **API Routes:**
  - `GET/PUT/DELETE /api/admin/access/role-overrides` (Manage role-level capability defaults)
  - `GET/PUT/DELETE /api/admin/access/users/[id]/overrides` (Manage named-user capability overrides)
- **Capabilities & Roles:**
  - `access.role_defaults.manage`, `access.user_overrides.manage`: Super Admin-only. Defined in `src/lib/auth/capabilities.ts`.
  - `access.scope.manage`, `access.city_staff.manage`: City Head / Program Admin.
- **Hierarchy Scope:** Super Admin manages global capability defaults; City Head manages staff assignment within assigned city only.
- **Audit Behavior:** Every override creation, modification, expiration, and revocation creates a detailed `AuditLog` entry.
- **Error States:** `400` invalid capability code / expired date, `401`, `403` non-Super Admin targeting system capability, `404` user not found.
- **Vitest Evidence:** `capabilities.test.ts`, `capability-access.test.ts`, `role-overrides/route.test.ts`, `users/[id]/overrides/route.test.ts`.
- **Browser UAT Evidence:** Completed and verified in AM-004 browser UAT (2026-07-18).
- **Identified Gaps (CRUD-002):** City Head delegation UI for reviewing active city staff capabilities and overrides.

---

## 4. Synthesis of Structural Gaps & Risk Analysis

1. **Session Reopen Controls:** Attendance sessions currently lack a formal, audited `reopen` endpoint. Once closed, reopening currently requires manual database correction or admin workarounds.
2. **Content Planner Transition Rules:** While `PATCH /api/admin/content-planner/sessions/[id]` handles session updates, formal transition validation rules (e.g. `planned` -> `in_progress` -> `completed` -> `archived`) and UI status toggles require audit and testing.
3. **Bulk Student Group Reassignment:** Moving multiple students between groups/parks when batch configurations change currently requires individual `PUT` updates.
4. **Admissions Conversion Hardening:** `POST /api/admin/admissions/[id]/convert` exists, but requires hardening for post-ATT-001 nullable group support, guardian duplicate resolution, scope verification, and full test coverage.
5. **Payment Refund & Waiver Controls:** Payments are strictly additive ledger entries. There is no audited refund or fee waiver mechanism to reverse accidental fee postings.

---

## 5. CRUD-002 Implementation Task Backlog (Wave 3 Sequence)

The following small, isolated, bounded implementation tasks are scheduled for Wave 3 (`CRUD-002`) following the completion of release-critical Wave 1 (Attendance) and Wave 2 (Workbook Modules):

### Task Breakdown:

1. **CRUD-002-A: Attendance Session Reopen Endpoint**
   - **Deliverable:** `POST /api/admin/attendance-events/[eventId]/reopen`
   - **Rules:** Requires `attendance.correct` capability, mandatory audit reason, transactional state update (`isClosed: false`).
   - **Allowed Files:** `src/app/api/admin/attendance-events/[eventId]/reopen/route.ts`, focused tests.

2. **CRUD-002-B: Content Planner Session Transition Rules & UI Toggles**
   - **Deliverable:** Session lifecycle status transition rules and UI status toggles using the existing `PATCH /api/admin/content-planner/sessions/[id]` endpoint.
   - **Rules:** Enforce valid session state transitions (`planned` -> `in_progress` -> `completed` -> `archived`) with city/park scope verification.
   - **Allowed Files:** `src/app/api/admin/content-planner/sessions/[id]/route.ts`, content planner UI components, focused tests.

3. **CRUD-002-C: Student Group Bulk Reassignment API**
   - **Deliverable:** `POST /api/admin/students/batch-reassign`
   - **Rules:** Transactional reassignment of participants to a target group within the same park/city, creating snapshot history.
   - **Allowed Files:** `src/app/api/admin/students/batch-reassign/route.ts`, focused tests.

4. **CRUD-002-D: Admissions Conversion Hardening & Test Suite**
   - **Deliverable:** Hardened `POST /api/admin/admissions/[id]/convert` route.
   - **Rules:** Enforce `admissions.manage` capability, strict city/park scope validation, support nullable `groupId` (post ATT-001), handle duplicate guardian phone matching, transactional participant creation, and full Vitest suite.
   - **Allowed Files:** `src/app/api/admin/admissions/[id]/convert/route.ts`, `src/app/api/admin/admissions/[id]/convert/route.test.ts`.

5. **CRUD-002-E: Audited Fee Waiver & Refund Workflow**
   - **Deliverable:** `POST /api/admin/fees/[id]/waiver`
   - **Rules:** Creates an audited negative adjustment entry against a fee event without modifying historical payment records.
   - **Allowed Files:** `src/app/api/admin/fees/[id]/waiver/route.ts`, focused tests.

---
