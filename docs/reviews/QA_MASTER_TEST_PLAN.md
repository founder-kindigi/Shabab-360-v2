# Shabab 360 v2 — Master Quality Assurance (QA) Test Plan

**Document ID:** `QA-TEST-PLAN-001`  
**Date:** 2026-07-25  
**Role:** QA Lead / Quality Assurance Engineer  
**Target Repository:** `Shabab-360-v2`  
**Scope:** System-Wide Functional, Security, Governance, API, Performance, and Dual-Schema Testing  

---

## 1. Test Objectives & Scope

The objective of this QA Test Plan is to provide end-to-end quality validation for **Shabab 360 v2**, ensuring 100% adherence to functional requirements, zero-trust role-based authorization, resource scope boundaries, financial transaction safety, and dual-schema persistence.

### In-Scope Domain Portals & Modules (23 Functional Areas):
1. **System Administration & Governance**: Super Admin Dashboard, Role Defaults Matrix (`access.role_defaults.manage`), User Capability Overrides (`access.user_overrides.manage`), Append-Only Audit Trail (`audit.view`).
2. **Organization & Hierarchy Management**: City Administration, Park Locations, Batches, Groups, and Collaboration Teams (Sports, Skills, Tadreeb, Media, Muawin).
3. **User Account Provisioning & Onboarding**: Staff Onboarding (`/api/admin/invite`), Bulk CSV User Imports, Forced Password Reset Enforcers.
4. **Admissions & Student Pipeline**: Applicant Intake, Candidate Status Transitions, Interview Evaluation Logging, Batch Conversion into Active Participants.
5. **Student & Guardian Profiles**: Roster Management, Extended Student Profiles, CNIC/NICOP Validation, Sensitive Field Controls (`students.profile.sensitive.*`), Family Phone Linking.
6. **Attendance & Events Operations**: Attendance Event Scheduling, Roster Marking, Historical Corrections, Event Team & Responsibility Assignments.
7. **Fees Collection & Receipt Issuance**: Fee Event Creation, Collection with `Serializable` Isolation, Receipt Sequence Generation, Financial Audit Emissions.
8. **Outreach & Calling Campaigns**: Campaign Allocation, Lead Distribution, Call Outcome Logging, WhatsApp Deep-Link Templates, Audited Lead Exporting.
9. **Weekly Mashwara Workspace**: Recurring City Meetings, Attendance Check-In, Decision Logging with Linked Action Items, Audited Meeting Shares.
10. **Content Planner**: Session & Block Management, Curriculum Workbook Parsing (`.xlsx` adapter).
11. **Communications & Broadcasts**: Announcement Dispatch, Notifications Inbox.
12. **Operational Reporting & Exports**: Multi-City Attendance Metrics, Fee Collection Aggregation, Conversion Reports, CSV Export Generators.

---

## 2. Test Strategy & Testing Types

| Testing Type | Scope & Focus Area | Automated Tooling / Strategy | Target Standard |
| :--- | :--- | :--- | :---: |
| **Static Code & Type Quality** | Strict TypeScript compilation across 100% of files | `npm run typecheck` (`tsc --noEmit`) | **0 Errors** |
| **Code Style & Security Linting** | AST linting, anti-pattern detection, security rules | `npx eslint src/` | **0 Errors** |
| **Schema Validation** | Dual-schema alignment (SQLite & PostgreSQL) | `npm run db:postgres:validate` | **Valid Schema** |
| **API Authorization & Security** | RequireRole, RequireCapability, RequireResourceScope | Vitest Route Mocks & Auth Boundary Tests | **100% Deny-by-Default** |
| **End-to-End Integration** | Meeting lifecycle, share delegation, admissions | `mashwara-e2e.test.ts`, `student-profile/route.test.ts` | **100% Pass** |
| **Financial Transaction Safety** | Concurrent payments, balance limits, receipt sequence | `fees/[id]/payments/route.test.ts` | **100% Pass** |
| **Release & Health Readiness** | Staging smoke, migration safety, build verification | `master-production-signoff.test.ts`, `pilot-production-health.test.ts` | **100% Pass** |

---

## 3. Test Environment & Prerequisites

* **Local Environment**: Windows OS, Node.js 20+, Next.js 16.2 (Turbopack), Vitest v3.2.7.
* **Database Target**: Dual persistence validation — SQLite (`prisma/schema.prisma`) & PostgreSQL (`prisma/postgres/schema.prisma`).
* **Test Datasets**: Synthetic Lahore Batch 4 dataset, seeded test roles across all 8 portal roles (`super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi`, `guardian`, `student`).

---

## 4. Test Case Matrix & Test Suite Inventory

### Suite 1: Security & Governance Tests (`src/__tests__/governance/`)
* `TC-GOV-001`: Capability catalogue completeness (34 capabilities registered).
* `TC-GOV-002`: Role default matrix validation across all 8 roles.
* `TC-GOV-003`: User capability override resolution & expiry evaluation (`resolveEffectiveCapability`).
* `TC-GOV-004`: Protection of administrative capabilities from non-admin overrides.

### Suite 2: API Route Security & Scope Boundary Tests (`src/app/api/admin/`)
* `TC-API-001`: Reject unauthorized unauthenticated access across all `/api/admin/*` routes (`401`).
* `TC-API-002`: Deny unauthorized capability requests (`403`).
* `TC-API-003`: Scope enforcement — City Head restricted to assigned city (`assignedCityId`).
* `TC-API-004`: Scope enforcement — Park Lead/Admin restricted to assigned park (`assignedParkId`).
* `TC-API-005`: Scope enforcement — Murabbi restricted to assigned group (`assignedGroupId`).

### Suite 3: End-to-End Business Operations (`src/__tests__/integration/`)
* `TC-E2E-001`: Weekly Mashwara meeting scheduling, attendee check-in, decision logging, action item creation.
* `TC-E2E-002`: Cross-city meeting share delegation and soft-revocation access denial.
* `TC-E2E-003`: Admissions application submission, interview evaluation, and transaction conversion.
* `TC-E2E-004`: Fee payment recording with `Serializable` isolation level and receipt sequence incrementing.

### Suite 4: System Release & Production Health (`src/__tests__/release/`)
* `TC-REL-001`: PostgreSQL migration non-destructiveness check (no table drops).
* `TC-REL-002`: Master production build sign-off and environment configuration check.

---

## 5. QA Verification Execution Plan

1. Execute TypeScript type checking (`npm run typecheck`).
2. Execute ESLint code quality & security linting (`npx eslint src/`).
3. Execute PostgreSQL schema validation (`npm run db:postgres:validate`).
4. Execute full automated test suite (`npx vitest run`).
5. Compile empirical test findings and defect report.
