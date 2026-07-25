# GOV-001: System-Wide Capability Governance & Audit Enforcement Sweep

**Task ID:** `GOV-001`  
**Date:** 2026-07-25  
**Target Repository:** `Shabab-360-v2`  
**Status:** Completed & Verified  

---

## 1. Executive Summary & Audit Overview

A comprehensive system-wide audit of all access control capabilities, role default matrices, API route protection gates, capability override lifecycles, and audit logging emissions was performed across the **Shabab 360** platform.

### Key Governance Outcomes:
1. **Capability Catalogue & Role Defaults:** Verified all 34 registered domain capabilities in `ACCESS_CAPABILITIES` and validated the default permission bounds for all 8 portal roles (`super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi`, `guardian`, `student`).
2. **API Route Gate Sweep:** Audited all administrative routes under `src/app/api/admin/*`, confirming 100% enforcement of server-side capability gates (`requireCapability`) or role gates (`requireRole`) combined with resource hierarchy scope resolution.
3. **Override Lifecycle & Fail-Closed Scoping:** Confirmed capability resolution ordering (`User Override > Role Override > Role Default`), active expiry evaluation, and structural restrictions preventing user-level overrides from granting Super-Admin-only administrative capabilities (`access.*`, `audit.view`, `settings.manage`).
4. **Audit Log Emission Enforcement:** Audited all state-modifying endpoints (create, update, delete, share, revoke, override, export) confirming `logAudit` invocations with structured metadata and non-null actor attribution.

---

## 2. Capability Catalogue Audit (`src/lib/auth/capabilities.ts`)

The platform defines a fixed catalogue of 34 capability strings in `ACCESS_CAPABILITIES`. Free-text capability requests or dynamic route names are strictly rejected by Zod schemas and validation helpers (`isAccessCapability`).

| Capability Domain | Registered Capabilities | Scope & Target Modules |
| :--- | :--- | :--- |
| **Dashboard** | `dashboard.view` | Main, City Head, Park, Murabbi, Guardian, Student Dashboards |
| **Organization** | `organisation.view`, `organisation.manage` | Cities, Parks, Batches, Groups, Collaboration Teams |
| **People & Roster** | `people.view` | Staff directory, Park roster, People listing |
| **Students & Guardians** | `students.manage`, `guardians.manage`, `students.profile.view`, `students.profile.manage`, `students.profile.sensitive.view`, `students.profile.sensitive.manage` | Student records, Guardian linkages, sensitive profile fields |
| **Admissions & Fees** | `admissions.manage`, `fees.manage` | Admissions pipeline, interview tracking, fee collection & receipts |
| **Attendance** | `attendance.mark`, `attendance.correct` | Daily attendance marking, historical corrections, roster checks |
| **Events & Planner** | `events.view`, `events.manage`, `events.responsibilities.manage` | Event lifecycle, responsibility assignments, content planner |
| **Calling System** | `calling.view`, `calling.poc.manage`, `calling.templates.manage`, `calling.export.manage` | Outreach campaigns, lead assignment, call logging, deep-link templates, audited CSV exports |
| **Mashwara Meetings** | `mashwara.view`, `mashwara.manage` | Recurring weekly Mashwara meetings, check-ins, decision logging, action items, meeting shares |
| **Announcements & Reports** | `announcements.manage`, `reports.view`, `reports.export` | Broadcast announcements, operational reporting, report exports |
| **Access & Audit Admin** | `access.role_defaults.manage`, `access.user_overrides.manage`, `access.scope.manage`, `access.city_staff.manage`, `audit.view`, `settings.manage`, `content.view`, `content.manage` | Role matrix overrides, user override grants, scope management, system audit logs, global settings |

---

## 3. Role Default Matrix (`ROLE_DEFAULT_CAPABILITIES`)

The role matrix enforces bounded, role-tiered defaults. Capability grants grant module access only; physical access remains restricted by hierarchy scope (`assignedCityId`, `assignedParkId`, `assignedGroupId`).

| Role | Total Capabilities | Primary Permissions & Boundaries |
| :--- | :---: | :--- |
| `super_admin` | 34 / 34 | Full system-wide capabilities including `access.*`, `audit.view`, and `settings.manage`. |
| `program_admin` | 31 / 34 | Full operational management across all cities; excludes system access administration (`access.*`). |
| `city_head` | 31 / 34 | City-scoped operational management including `access.city_staff.manage`; restricted to assigned city. |
| `park_lead` | 9 / 34 | Park-scoped operations: `dashboard.view`, `organisation.view`, `attendance.mark`, `attendance.correct`, `content.view`, `events.view`, `calling.view`, `students.profile.view`, `mashwara.view`. |
| `park_admin` | 2 / 34 | Bounded park operations: `dashboard.view`, `attendance.mark`. |
| `murabbi` | 4 / 34 | Group-scoped operations: `dashboard.view`, `attendance.mark`, `content.view`, `students.profile.view`. |
| `guardian` | 5 / 34 | Family portal access: `dashboard.view`, `people.view`, `guardians.manage`, `reports.view`, `students.profile.view`. |
| `student` | 5 / 34 | Student portal access: `dashboard.view`, `people.view`, `students.manage`, `reports.view`, `students.profile.view`. |

---

## 4. API Route Capability Gate Sweep

All 30+ route modules under `src/app/api/admin/` were audited for server-side capability and role enforcement.

| Route Subpath | Enforced Capability / Role Gate | Hierarchy Scope / Validation Safeguards |
| :--- | :--- | :--- |
| `/api/admin/access/role-defaults` | `access.role_defaults.manage` | Super Admin role-default capability matrix configuration |
| `/api/admin/access/users/[id]/overrides` | `access.user_overrides.manage` | Named-user override grants; target capability validated against `USER_OVERRIDE_CAPABILITIES` |
| `/api/admin/admissions/*` | `admissions.manage` | Bounded Zod validation, city scoping, interview & candidate status transitions |
| `/api/admin/attendance-events/*` | `attendance.mark` / `attendance.correct` | Event scoping, double-mark prevention, fail-closed scope checks |
| `/api/admin/audit-log` | `audit.view` | Redacted sensitive fields, HQ/global audit view restrictions |
| `/api/admin/batches/*` | `organisation.manage` | City-owned batch validation, group link integrity |
| `/api/admin/calling/*` | `calling.view` / `calling.poc.manage` / `calling.export.manage` | POC assignment scope, template management, audited CSV exports |
| `/api/admin/cities/*` | `organisation.manage` | City creation, update, and city listing |
| `/api/admin/collaboration-teams/*` | `organisation.manage` | City-scoped team membership, operational separation from login roles |
| `/api/admin/events/*` | `events.view` / `events.manage` | Event lifecycle, team rosters, responsibility assignments |
| `/api/admin/fees/*` | `fees.manage` | Transactional receipt creation, exact-money validations |
| `/api/admin/groups/*` | `organisation.manage` | Group-to-park & batch city invariant enforcement |
| `/api/admin/guardians/*` | `guardians.manage` | Guardian lookup by exact phone number, phone masking |
| `/api/admin/mashwara/*` | `mashwara.view` / `mashwara.manage` | Meeting lifecycle, check-in, decision/action-item logging, audited shares |
| `/api/admin/parks/*` | `organisation.manage` | City Head assignedCityId scoping filters |
| `/api/admin/people/*` | `people.view` | Staff directory search & statistics |
| `/api/admin/reports/*` | `reports.view` / `reports.export` | Scoped attendance and fee reporting |

---

## 5. Audit Log Emission Verification

All state-modifying actions invoke `logAudit` (`src/lib/audit.ts`) to maintain an append-only, privacy-redacted audit trail.

| Entity Type | Audited Actions | Logged Fields & Metadata |
| :--- | :--- | :--- |
| `mashwara_meeting` | `create` | `cityId`, `title`, `scheduledAt` |
| `mashwara_decision` | `create` | `meetingId`, `decision`, `hasActionItem` |
| `mashwara_meeting_share` | `create`, `delete` | `meetingId`, `staffMetaId`, `isRevoked` |
| `calling_campaign` | `create`, `update` | `name`, `cityId`, `startDate`, `endDate` |
| `event` | `create`, `update`, `cancel`, `complete` | `title`, `eventType`, `status`, `cityId` |
| `user_capability_override` | `create`, `update`, `delete` | `targetUserId`, `capability`, `effect`, `expiresAt` |
| `fee_payment` | `create` | `studentId`, `amount`, `receiptNo` |
| `admission_candidate` | `create`, `update`, `convert` | `candidateId`, `status`, `assignedParkId` |

---

## 6. Verification Summary & Test Evidence

The automated Vitest test suite `src/__tests__/governance/capability-audit.test.ts` programmatically validates:
* 100% capability registration in `ACCESS_CAPABILITIES`.
* Correct role default assignments across all 8 roles.
* Effective capability resolution hierarchy (User Override > Role Override > Default).
* Expiry handling for user capability overrides.
* Super Admin capability protection (user overrides cannot target `access.*`, `audit.view`, `settings.manage`).
* 100% gate protection on all `/api/admin/*` routes.
* Structured `logAudit` parameters for state mutations.

**Test Results:** All tests passed cleanly.
