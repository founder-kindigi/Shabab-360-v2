# Collaboration Team Workspace User Acceptance Test (UAT) Plan

**Package:** `PKG-TEAM-WORKSPACE`
**Master Contract Reference:** [`docs/product-discovery/TEAM-003-COLLABORATION-TEAM-WORKSPACE-CONTRACT.md`](file:///D:/iBuild/Shabab-360-v2/docs/product-discovery/TEAM-003-COLLABORATION-TEAM-WORKSPACE-CONTRACT.md)
**Date:** July 2026
**Status:** Staged for Owner Verification

---

## 1. Executive Summary & Objective

This document defines the formal User Acceptance Testing (UAT) procedure for the Shabab 360 Collaboration Team Workspace (`PKG-TEAM-WORKSPACE`).

The primary goals of this UAT plan are to verify:
1. **Dynamic Fixed Capabilities & City Isolation:** Server-derived city scope (`resolveActorCity`) strictly enforces city boundaries for all membership and workspace operations without hard-coded role gates.
2. **Operational Team Memberships:** Team assignments and revocations audit correctly while preserving canonical staff roles and hierarchy scopes.
3. **Activity Planning Lifecycle:** Active team members manage activity plan items, with `teams.workspace.view` actors constrained to transitioning their direct assignments from `planned` to `in_progress`.
4. **Team Chat Polling & Moderation:** Real-time stream feed with 3-second cursor polling supports soft deletion by authors (within 10 minutes) and moderation by `teams.workspace.manage` holders.
5. **Fail-Closed Document Registry:** Link registration returns HTTP 403 with a clear UI notice pending domain allowlist approval.

---

## 2. Dynamic Capability Matrix

| Role | Default Capabilities | City Scope Boundary | Team Membership Manage | Workspace View | Workspace Manage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin / Program Admin (HQ)** | All Capabilities | Explicit `cityId` Required | ✅ Yes | ✅ Yes | ✅ Yes |
| **City Head** | `teams.memberships.manage`, `teams.workspace.view`, `teams.workspace.manage` | Derived `assignedCityId` | ✅ Yes (Same City) | ✅ Yes | ✅ Yes |
| **Park Lead** | `teams.workspace.view`, `teams.workspace.manage` | Derived via Park -> City | ❌ No | ✅ Yes | ✅ Yes |
| **Park Admin / Murabbi** | `teams.workspace.view` | Derived via Park/Group -> City | ❌ No | ✅ Yes (View & Own Activity Transition) | ❌ No |

---

## 3. Pre-requisites & Test Setup

Before executing UAT scenarios:
1. Ensure the SQLite database contains active `City` records for **Lahore (LHR)** and **Islamabad (ISB)**.
2. Ensure active `CollaborationTeam` records exist for Lahore (e.g. `Lahore Tadreeb`) and Islamabad (e.g. `Islamabad Media`).
3. Ensure test staff user accounts exist in Lahore and Islamabad.

---

## 4. Step-by-Step Test Scenarios

### UAT-TM-01: HQ City Selection & Membership Management
- **Role:** Super Admin / Program Admin (HQ)
- **Steps:**
  1. Navigate to Collaboration Teams management page.
  2. Select `Lahore (LHR)` from the city scope selector.
  3. Observe team cards and member list loading for Lahore.
  4. Attempt to query `/api/admin/collaboration-teams` without `cityId` parameter.
- **Expected Result:** HTTP 400 Bad Request error returned when `cityId` is omitted. Valid list returned when `cityId` is provided.

### UAT-TM-02: Scoped City Head Member Assignment & Cross-City Isolation
- **Role:** Lahore City Head
- **Steps:**
  1. Open Lahore Tadreeb team.
  2. Select an active Lahore staff member from drop-down and assign title `Sports POC`.
  3. Verify member appears in active members list with title `Sports POC`.
  4. Attempt to assign an Islamabad staff member to the Lahore team via API.
- **Expected Result:** Assignment of Lahore staff succeeds (201 Created + Audit Log). Cross-city assignment fails with HTTP 400 Bad Request ("Target staff city mismatch").

### UAT-TM-03: Member Title Update & Soft-Revocation
- **Role:** Lahore City Head
- **Steps:**
  1. Click "End membership" for an active team member.
  2. Confirm in modal dialog.
- **Expected Result:** Membership is soft-revoked (`isActive: false`, `endedAt` set). Historical audit log entry `revoke_team_membership` recorded.

### UAT-ACT-01: Activity Item Creation & Assignment
- **Role:** Park Lead (`teams.workspace.manage`)
- **Steps:**
  1. Open Team Workspace -> Activities tab.
  2. Fill out title "Prepare Logistics", assign to an active team member, and submit.
- **Expected Result:** Item created with status `planned` (HTTP 201 + Audit Log).

### UAT-ACT-02: Activity Status Transitions & Viewer Restrictions
- **Role:** Murabbi (`teams.workspace.view` only)
- **Steps:**
  1. As direct assignee of a `planned` activity, click "Start".
  2. Status transitions to `in_progress`.
  3. Attempt to transition an unassigned activity or mark an activity `completed`.
- **Expected Result:** Direct transition to `in_progress` succeeds (HTTP 200). Non-direct transition or complete attempt fails with HTTP 403.

### UAT-CHT-01: Real-time Chat Stream Polling
- **Role:** Any Active Team Member
- **Steps:**
  1. Open Workspace -> Chat tab.
  2. Send a message "Welcome team!".
  3. Open a second browser tab as another team member.
- **Expected Result:** Message streams within 3 seconds via polling without full page reload.

### UAT-CHT-02: Self-Message Soft Deletion & Time Limit
- **Role:** Message Author
- **Steps:**
  1. Delete own message sent 1 minute ago -> Succeeds (HTTP 200 + Audit `delete_own_chat_message`).
  2. Attempt to delete own message sent >10 minutes ago -> Denied with HTTP 403 ("10 minutes has expired").

### UAT-DOC-01: Document Registry Disabled Notice Verification
- **Role:** Any Team Workspace User
- **Steps:**
  1. Open Workspace -> Documents tab.
  2. Observe yellow security banner.
  3. Attempt POST `/api/teams/[teamId]/documents`.
- **Expected Result:** Returns HTTP 403 Forbidden explaining the disabled security domain allowlist policy.

---

## 5. Sign-off & Completion Criteria

- [x] All 18 automated unit and integration tests passing (`npm test`).
- [x] Zero TypeScript compilation errors (`npm run typecheck`).
- [x] Zero ESLint warnings or errors (`npm run lint`).
- [x] `git diff --check` passes cleanly.
- [x] Schema alignment maintained between `prisma/schema.prisma` and `prisma/postgres/schema.prisma`.
