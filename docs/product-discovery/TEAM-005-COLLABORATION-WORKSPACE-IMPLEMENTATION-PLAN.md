# TEAM-005: Collaboration Workspace Implementation Plan

- **Document Version:** 1.1.0
- **Status:** `BLOCKED_PENDING_OWNER_DECISIONS` — Phase A pending API reconciliation; Phases B/C blocked by policy decisions.
- **Objective:** Phased implementation plan for the Collaboration Teams Workspace, including Activity Planner, Internal Chat, and Document Links.

## 1. Current State Verification

### 1.1 Existing Models
- **`CollaborationTeam`**: Exists in `prisma/schema.prisma` and `prisma/postgres/schema.prisma`. Includes fields for city, name, and activation status.
- **`StaffTeamMembership`**: Exists. Links `StaffMeta` with `CollaborationTeam`. Uses `startedAt`, `endedAt`, and an `isActive` boolean to track active periods.
- **`ActivityPlanItem`**: Exists. Used to track tasks assigned to team members.

### 1.2 Active Membership Definition
An **active membership** is strictly defined by the approved predicate:
- `isActive === true && endedAt === null`
- The authenticated actor's resolved `StaffMeta` ID matches the membership's `staffMetaId`.
- The actor's derived city scope matches the `cityId` of the `CollaborationTeam`.

### 1.3 Existing Team / Membership APIs
There is a current conflict in the implemented API baseline that must be reconciled:
- **`api/admin/collaboration-teams`**: Actively uses the `organisation.manage` capability and applies strict gating via `isHqRole` or `sessionCityId`.
- **`api/admin/teams`**: Actively uses the `organisation.view` capability and resolves scope via `resolveActorCity`.
- **Explicit Prerequisite:** The owner must select or consolidate the canonical membership API before any new workspace routes are built.
- **Gap:** Workspace-specific capabilities (`teams.workspace.view`, `teams.workspace.manage`) and their corresponding API routes and UI components are currently only in the TEAM-003 contract phase and are not implemented.

## 2. Reconciling TEAM-003 Contract vs Current APIs

- **Capabilities & Authorization Chain:** The proposed capabilities (`teams.workspace.view`, `teams.workspace.manage`, `teams.memberships.manage`) must be officially registered in `src/lib/auth/capabilities.ts`. *Note: TEAM-004 is approved but not yet integrated. We must not assume dynamic membership capability behavior already exists on the active candidate until the integration base proves it.*
- **Active-Membership Predicate:** Every new workspace API route (e.g., `/api/teams/[teamId]/*`) must enforce a server-side check ensuring the requester has an active `StaffTeamMembership` (where `isActive === true && endedAt === null`) for the target team.
- **City/Park Scope Rules:** Team memberships must never implicitly expand an actor's core city or park scope. Data access remains strictly bounded to the actor's assigned city.
- **Audit Requirements:** Modifying actions (e.g., creating activities, updating statuses, deleting chat messages) require explicit `logAudit` events. Standard read operations do not.
- **Mobile Rules:** The UI must be fully responsive, stacking multi-column layouts into a vertical stream and utilizing horizontal scrollable tab bars and modal action sheets with proper bottom-padding (`pb-24`) to accommodate mobile navigation.
- **Contradictions & Prerequisites:** As noted in 1.3, the conflicting team APIs (`collaboration-teams` vs `teams`) must be consolidated as a hard prerequisite.

---

## 3. Phased Implementation Plan

### Phase A: Activity Planner
**Goal:** Enable active team members to view, create, and transition team activities (`ActivityPlanItem`).

- **Proposed Files & UI Integration:**
  - `src/app/(portal)/teams/[teamId]/activities/page.tsx` (UI route for Activity dashboard)
  - `src/app/api/teams/[teamId]/activities/route.ts` (GET/POST)
  - `src/app/api/teams/[teamId]/activities/[id]/route.ts` (PATCH)
  - `src/components/modules/teams/team-activity-planner.tsx`
  - `src/lib/auth/team-workspace-auth.ts` (Shared authorization helper: `requireActiveTeamMembership(teamId)`)
- **Model/Migration Impact:** None (relies on the existing `ActivityPlanItem` model).
- **Validation Schemas:** `createActivitySchema`, `updateActivitySchema` in `src/lib/validations/team.ts`.
- **Assignment Validation:** The API must strictly validate that the `assignedStaffMetaId` belongs to a same-team active assignee, and preserve the server-derived city scope when querying assignments.
- **Status-Transition Matrix:**
  - `planned` -> `in_progress` (Allowed by Assignee or Manager)
  - `in_progress` -> `completed` / `cancelled` (Manager only)
- **Authorization & Scope:**
  - **GET:** Requires `teams.workspace.view` + `requireActiveTeamMembership`.
  - **POST:** Requires `teams.workspace.manage` + `requireActiveTeamMembership`.
  - **PATCH:** Requires `teams.workspace.manage` for assignment/completion, or `teams.workspace.view` if the caller is the exact assignee transitioning the status to `in_progress`.
- **Audit Events & Payload:**
  - `create_activity`, `update_activity_status`.
  - **Audit Sanitizer Payload Shape:** `{ activityId: string, teamId: string, previousStatus?: string, newStatus: string, assigneeId?: string }`.
- **Focused Tests:**
  - Verify same-team active assignee constraint (expect 400 if external assignee).
  - Verify exact assignee can transition `planned` to `in_progress`.
  - Verify exact assignee cannot transition to `completed` without `teams.workspace.manage`.
  - TEAM-003 tests `TC-TM-007` to `TC-TM-009`, `TC-TM-011`, `TC-TM-012`.

### Phase B: Internal Chat (Blocked)
> [!WARNING]
> **Hard Blocker:** No chat implementation until the product owner approves the chat retention, archive, and moderation policy.

**Goal:** Provide a polled, authenticated discussion feed for the team workspace.

- **Proposed Files:**
  - `src/app/api/teams/[teamId]/chat/route.ts` (GET/POST)
  - `src/app/api/teams/[teamId]/chat/[messageId]/route.ts` (DELETE)
  - `src/components/modules/teams/team-chat.tsx`
- **Model/Migration Impact:** Add the `TeamChatMessage` model to Prisma schemas.
- **Validation Schemas:** `createChatMessageSchema`.
- **Authorization & Scope:**
  - **GET/POST:** Requires `teams.workspace.view` + `requireActiveTeamMembership`.
  - **DELETE:** Requires `teams.workspace.view` (limited to self-deletion within 10 minutes) or `teams.workspace.manage` (for moderation).
- **Audit Events:** `delete_own_chat_message`, `moderate_chat_message`.
- **Focused Tests:** TEAM-003 tests `TC-TM-013` to `TC-TM-015`.

### Phase C: Document Links (Blocked)
> [!WARNING]
> **Hard Blocker:** No document-link implementation until the product owner approves the URL allowlist and safe external redirect policy.

**Goal:** Allow managers to register external trusted document links.

- **Proposed Files:**
  - `src/app/api/teams/[teamId]/documents/route.ts` (GET/POST)
  - `src/components/modules/teams/team-document-links.tsx`
- **Model/Migration Impact:** Add the `TeamDocumentLink` model to Prisma schemas.
- **Validation Schemas:** `registerDocumentLinkSchema`.
- **Authorization & Scope:**
  - **GET:** Requires `teams.workspace.view` + `requireActiveTeamMembership`.
  - **POST:** Requires `teams.workspace.manage` + `requireActiveTeamMembership` (Server enforces a Fail-Closed posture until the whitelist is approved).

---

## 4. Owner Decision Register

| Decision | Description | Recommended Default | Status |
| :--- | :--- | :--- | :--- |
| **Canonical API Consolidation** | Select or consolidate `/api/admin/collaboration-teams` vs `/api/admin/teams`. | Consolidate to `collaboration-teams` with explicit city scopes. | **Pending Approval** |
| **Chat Retention Policy** | Should chat messages be permanently stored or rolling 90-day deleted? | Rolling 90-day deletion. | **Pending Approval** |
| **URL Allowlist** | Which domains are allowed for Document Links? | `*.google.com`, `*.sharepoint.com` | **Pending Approval** |
| **External Redirect** | Should external links pass through a warning screen? | Yes, interstitial warning. | **Pending Approval** |
| **Automatic Membership End** | When a user is deactivated, do memberships expire? | Yes, close active memberships automatically. | **Pending Approval** |

---

## 5. Dependencies and Implementation Order
1. **API Reconciliation:** Resolve the canonical API baseline conflict (`collaboration-teams` vs `teams`).
2. **Plan Approval:** The product owner must approve this implementation plan and resolve decisions for Chat and Document Links.
3. **Schema Migration:** Add the `TeamChatMessage` and `TeamDocumentLink` models via declarative local migration generation, reviewed committed migrations, and deployer-confirmed staging/production application.
4. **Capabilities Update:** Add `teams.*` capabilities to `ACCESS_CAPABILITIES` (recognizing TEAM-004 integration status).
5. **Phase A (Activity Planner):** Build activity API routes and UI components.
6. **Phase B & C:** Remain blocked pending owner approval.

## 6. Risks / Non-Goals
- **Non-Goal:** Implementing a real-time Socket.IO chat (system will rely on cursor-based polling).
- **Non-Goal:** Providing direct file uploads to the server (only external URLs will be stored).
- **Risk:** Storing chat messages indefinitely in PostgreSQL could increase costs. **Mitigation:** Enforce a 90-day rolling retention policy.

## 7. Acceptance Criteria and Lahore UAT Inclusion
- **Phase A (Activity Planner)** must be fully testable by a Lahore City Head and a Murabbi.
- **Cross-City Isolation:** A Lahore user attempting to access an Islamabad team's workspace must receive HTTP 403 Forbidden.
- **Membership Verification:** All endpoints must strictly verify the caller's active membership status (`isActive === true && endedAt === null`) before querying or mutating records.
- **UAT Matrix:** Must confirm strict fail-closed state for Phase B and C if they remain blocked during UAT.

## 8. Safe Release Sequence
1. Deploy schema migrations via reviewed deployment procedures.
2. Deploy capability and API changes.
3. Deploy the UI features under a feature flag or strictly capability-gated.
4. Conduct the Lahore UAT.
5. Validate UAT sign-off and deploy to Production.
