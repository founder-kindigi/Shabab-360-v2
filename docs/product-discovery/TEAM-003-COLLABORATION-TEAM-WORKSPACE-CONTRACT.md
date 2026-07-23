# TEAM-003: Collaboration Team Workspace Contract

- **Document Version:** 1.4.0
- **Task ID:** `PKG-05-TEAM-WORKSPACE-CONTRACT`
- **Status:** `PROPOSED` — Pending Owner Review & Approval
- **Integration Base:** `064fc53` (on branch `agent/antigravity/pkg-05-team-workspace-contract`)
- **Objective:** Establish the implementation contract, authorization rules, API endpoints, Zod schemas, UI requirements, and test matrices for the permanent Lahore Collaboration Teams: **Sports, Skills, Tadreeb, Media, and Muawin**.

---

## 1. Verified Current-Model and Current-Capability Inventory

A complete static review of the database schema and security configurations in the workspace has been conducted. The current baseline resources are identified below.

### 1.1 Existing Prisma Schema Models
The following models are verified from the repository-relative path [schema.prisma](prisma/schema.prisma#L197-L236):

```prisma
model CollaborationTeam {
  id          String   @id @default(cuid())
  cityId      String
  name        String
  code        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  city        City                  @relation(fields: [cityId], references: [id], onDelete: Cascade)
  memberships StaffTeamMembership[]
  contentBlocks ContentPlanBlock[]
  activityPlans ActivityPlanItem[]

  @@unique([cityId, code])
  @@index([cityId, isActive])
  @@map("collaboration_teams")
}

model StaffTeamMembership {
  id         String   @id @default(cuid())
  staffMetaId String
  teamId     String
  title      String?
  startedAt  DateTime @default(now())
  endedAt    DateTime?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  staffMeta StaffMeta         @relation(fields: [staffMetaId], references: [id], onDelete: Cascade)
  team      CollaborationTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([staffMetaId, teamId, startedAt])
  @@index([staffMetaId, isActive])
  @@index([teamId, isActive])
  @@map("staff_team_memberships")
}
```

And `ActivityPlanItem` model in [schema.prisma](prisma/schema.prisma#L325-L344):
```prisma
model ActivityPlanItem {
  id                  String   @id @default(cuid())
  teamId              String
  contentBlockId      String?
  assignedStaffMetaId String?
  title               String
  description         String?
  status              String   @default("planned")
  scheduledFor        DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  team          CollaborationTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  contentBlock  ContentPlanBlock? @relation(fields: [contentBlockId], references: [id], onDelete: SetNull)
  assignedStaff StaffMeta?        @relation("ActivityAssignee", fields: [assignedStaffMetaId], references: [id], onDelete: SetNull)

  @@index([teamId, status])
  @@index([assignedStaffMetaId, status])
  @@map("activity_plan_items")
}
```

### 1.2 Current Capabilities Inventory
Verified from [capabilities.ts](src/lib/auth/capabilities.ts):
* Capabilities are fixed in `ACCESS_CAPABILITIES` (lines 7-26) to prevent free-text injections.
* No team-specific capabilities exist in the current codebase.

---

## 2. Proposed Additive Prisma Models and Migration Plan

To support team chat messages and registered document links, the following additions to the schema are proposed.

### 2.1 Proposed Additive Models
The following model definitions will be added to the Prisma schemas:

```prisma
model TeamChatMessage {
  id        String   @id @default(cuid())
  teamId    String
  senderId  String
  content   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  team   CollaborationTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  sender StaffMeta         @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([teamId, createdAt])
  @@map("team_chat_messages")
}

model TeamDocumentLink {
  id          String   @id @default(cuid())
  teamId      String
  addedById   String
  title       String
  url         String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  team    CollaborationTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  addedBy StaffMeta         @relation(fields: [addedById], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@map("team_document_links")
}
```

*Note:* Opposite relation fields `chatMessages TeamChatMessage[]` and `documentLinks TeamDocumentLink[]` will be added to both `CollaborationTeam` and `StaffMeta` models to establish the bidirectional relationships.

### 2.2 Dual Prisma Migration Plan
As required by the repository working agreements, the local SQLite database and staged PostgreSQL database configurations must be kept aligned:

1. **Development Environment (SQLite):**
   * Edit `prisma/schema.prisma` to append the proposed models and relation fields.
   * Run the local migration command:
     ```bash
     npx prisma migrate dev --name add_team_workspace_tables
     ```
   * Confirm the generated migration file is created under `prisma/migrations/`.

2. **Staging & Production Environment (PostgreSQL):**
   * Edit `prisma/postgres/schema.prisma` to append the identical model definitions and relation fields.
   * Generate the staged PostgreSQL migration files:
     * **Locally Only (Against Local PostgreSQL Dev Database):** Run the following to generate and commit the SQL migration files:
       ```bash
       npx prisma migrate dev --schema=prisma/postgres/schema.prisma --create-only --name add_team_workspace_tables
       ```
     * **Staging and Production Deployment:** Run committed migration files directly against the target database:
       ```bash
       npx prisma migrate deploy --schema=prisma/postgres/schema.prisma
       ```
     * > [!WARNING]
       > **NEVER run `migrate dev` against staging or production environments.** Those environments must only apply committed migrations via `migrate deploy`.

3. **Prisma Client Compilation:**
   * Run `npm run db:postgres:generate` and local compilation checks to confirm the generated clients build without errors.

4. **Safe Rollback Protocol:**
   * Disable route access by revoking the relevant capabilities (`teams.workspace.view`, `teams.workspace.manage`, and `teams.memberships.manage`) or setting environment flag toggles.
   * **Do not drop database tables or run destructive rollbacks in production.** Existing rows must be preserved in place to prevent accidental data loss.
   * Full database backup restore procedures are reserved for Codex-and-owner incident recovery scenarios only.

---

## 3. Team Membership Lifecycle

Operational team memberships track staff assignments without modifying core roles or scope properties.

```mermaid
stateDiagram-v2
    [*] --> InactiveStaff : User Registered (StaffMeta)
    InactiveStaff --> ActiveMembership : Assigned to Team (startedAt = now, isActive = true)
    ActiveMembership --> ActiveMembership : Update Title / Responsibility
    ActiveMembership --> InactiveHistory : End Membership (endedAt = now, isActive = false)
    InactiveHistory --> ActiveMembership : Re-assigned (New Membership Row Created)
    InactiveHistory --> [*]
```

### 3.1 Lifecycle Stages
* **Create Team:** Managed via database initialization (under Owner setup rules).
* **Assign Member:** Triggered by authorized City Head or Super Admin.
  * *Preconditions:* The staff member must have an active `StaffMeta` record and their assigned city must match the team's `cityId`.
  * *Database Action:* Creates a new row in `StaffTeamMembership` setting `isActive: true` and `startedAt: new Date()`.
* **Revoke/End:**
  * *Database Action:* Updates `StaffTeamMembership` setting `isActive: false` and `endedAt: new Date()`. Historical records are preserved for audit.

---

## 4. Server-Derived City-Scope and Capability Authorization Matrix

To enforce dynamic security controls, authorization relies on dynamic dot-notation capabilities. **No static role gates may override a granted capability plus its derived resource scope.**

### 4.1 Proposed Dynamic Capabilities
* `teams.memberships.manage`: Allows managing team memberships (assigning and revoking) within the user's city scope.
* `teams.workspace.view`: Grants access to view team-scoped details (read discussion feeds, view registered links, view team activities).
* `teams.workspace.manage`: Grants permissions to manage team activities (create, assign, complete/cancel activities) and moderate team messages.

### 4.2 Workspace Route Security Rules
Every workspace route (GET, POST, PATCH, DELETE) must enforce **both** checks:
1. **Dynamic Capability:** The user must resolve the correct dot-notation capability (`teams.workspace.view` or `teams.workspace.manage`) for the requested action.
2. **Active Membership:** The requesting user must have an active, non-expired membership record (where `isActive === true` AND `endedAt` is `null` in `StaffTeamMembership`) for the exact `CollaborationTeam` targeted.


### 4.3 Server-Derived Scope Enforcements
* **HQ/Scoped City Resolver Rules for Membership Administration:**
  * **HQ Capability Holders (Global Access):** Must explicitly provide a valid `cityId` parameter in the request query or payload, otherwise the server must return an HTTP 400 Bad Request error.
  * **Scoped Actors (City Head / City Admins):** The server must resolve exactly one city by traversing the actor's own `StaffMeta` city/park/group path. If the actor's city scope is missing, or does not match the target team's city, the request must fail with HTTP 403 Forbidden.
  * **Target Staff Member Scope:** The target staff member's derived city (resolved through their `StaffMeta` relationship paths) must equal the target `team.cityId`, otherwise the server returns an HTTP 400 Bad Request.
  * **List Endpoints Restriction:** Under no circumstances may any list endpoint return unfiltered, cross-city records. Listing teams or members must filter results implicitly by the resolved server-derived city of the requester.
* **Core Data Gating:** Membership in a collaboration team **must never** expand a user's core park, group, participant, or attendance scope limits. A `murabbi` assigned to the Lahore `SPORTS` team can view the Sports workspace dashboard, but remains strictly restricted to their assigned group roster for all core participant directory reads and attendance event writes.

---

## 5. Team Workspace Information Architecture and UI States

The Team Workspace provides a dedicated page for active members, located at `/teams/[teamId]`.

### 5.1 Desktop UI Layout
* **Dashboard Shell:** Left panel contains the tab navigation. Right panel contains team statistics (member count, pending activities).
* **Tab Sections:**
  * **Activity Planner:** Bounded task planner linking to Content Planner blocks.
  * **Discussion Feed:** Polled message stream.
  * **Shared Documents:** Shared link registry (uploads disabled).
  * **Members Roster:** Active members list.

### 5.2 Mobile UI Layout (375px/390px Viewports)
* **Tab Bar:** Tabs collapse to a horizontal scrollable tab bar at the top of the viewport.
* **Stacking:** Two-column layouts stack vertically. The sidebar metadata moves inside a collapsible header drawer.
* **CTAs and Modals:** Action sheets and task creation forms open as full-screen modal sheets with a bottom margin of `pb-24` to avoid overlapping the floating bottom navigation bar.

---

## 6. Activity Planner & Content Planner Connection

The Activity Planner links team tasks to the curriculum defined in the Content Planner.

### 6.1 Content Plan Gating
* An `ActivityPlanItem` has an optional `contentBlockId` linking it to `ContentPlanBlock`.
* Active team members can query only the `ActivityPlanItem` rows matching their team's `teamId`.

### 6.2 Activity Status Gating
* **Standard Permissions (`teams.workspace.view` + Active Membership):**
  * The user is only authorized to transition an activity's status from `planned` to `in_progress`.
  * **Strict Owner Constraint:** The caller can only modify this status if they are the designated assignee (`assignedStaffMetaId` matches their `StaffMeta.id`). Attempting to change other users' tasks or transition to `completed`/`cancelled` must yield HTTP 403.
* **Elevated Permissions (`teams.workspace.manage` + Active Membership):**
  * Required to create activities (`POST`), assign/reassign tasks, and transition status to `completed` or `cancelled`.
* **Assignee Invariant:** The `assignedStaffMetaId` field must be validated on the server to ensure the assignee is an active, same-team member of the target `CollaborationTeam`.

---

## 7. Discussion/Chat Privacy, Retention, and Polling Rules

To simplify the network stack, real-time Socket.IO and presence features are avoided in favor of authenticated polling.

### 7.1 Polling Architecture
* **Fetch Loop:** The client-side dashboard queries the chat history feed via GET `/api/teams/[teamId]/chat` at a periodic interval (e.g. every 10 seconds).
* **Cursor Pagination:** Retrieves messages using timestamp/ID based cursor pagination to minimize server load.
* **Access Gating:** The API route validates that the requesting user's session has an active membership row in `StaffTeamMembership` for `teamId` before returning chat data.

### 7.2 Message Moderation and soft-deletion
* **Regular Members (`teams.workspace.view` + Active Membership):** May soft-delete their own messages only within 10 minutes of creation via `DELETE /api/teams/[teamId]/chat/[messageId]`.
* **Moderator Permissions (`teams.workspace.manage` + Active Membership):** Authorized team administrators can soft-delete any message in the team at any time.
* **Database Action:** Soft-deletion updates `isActive: false` on `TeamChatMessage` and replaces the UI content with `"This message was deleted"`.
* **Audit Logging:** The system must record audit log entries (`logAudit`) for both member self-deletion and administrator moderation actions.

---

## 8. Shared-Document Behavior (Uploads Disabled)

File uploads are disabled. Shared documents are link registrations only.

### 8.1 Disabled Dropzone UI
* **Drag-and-Drop Area:** Styled with grayscale opacity (`opacity-50 cursor-not-allowed`) displaying a lock icon.
* **Button State:** "Upload File" is disabled. Text reads: `"File uploads are currently disabled. Please register a link to an external document below."`
* **Form Inputs:** Fields are provided for Document Title (string), Link URL (https), and Description (optional).

### 8.2 Fail-Closed Link Validation
* **Strict Gating:** All document link registrations remain **fail-closed** and are rejected by default on the server. No external links may be saved until the owner approves a formal domain whitelist and redirect warning policy.
* **Future Whitelist Verification:** Future link registrations must validate URLs against an approved server-side whitelist (e.g., matching trusted storage domains).

---

## 9. Future API Matrix and Bounded Zod Contracts

### 9.1 API Matrix

| Route | Method | Payload / Query | Access Level (Required Capabilities) | Description |
| --- | --- | --- | --- | --- |
| `/api/teams/[teamId]` | GET | None | `teams.workspace.view` + Active Member | Fetch team metadata and active roster |
| `/api/teams/[teamId]/activities` | GET | `status` filter | `teams.workspace.view` + Active Member | Fetch team activity planner items |
| `/api/teams/[teamId]/activities` | POST | Zod Activity Create | `teams.workspace.manage` + Active Member | Add a planned activity item |
| `/api/teams/[teamId]/activities/[id]`| PATCH| Zod Activity Update | - `teams.workspace.view` + active exact-team membership: caller may only transition their own assigned item planned -> in_progress.<br>- `teams.workspace.manage` + active exact-team membership: may create/update assignment and transition completed/cancelled. | Update status or assignee of activity |
| `/api/teams/[teamId]/chat` | GET | `cursor` pagination | `teams.workspace.view` + Active Member | Fetch polled discussion feed |
| `/api/teams/[teamId]/chat` | POST | Zod Message Create | `teams.workspace.view` + Active Member | Send message to team discussion |
| `/api/teams/[teamId]/chat/[messageId]`| DELETE| None | - `teams.workspace.view` + active exact-team membership: own message only, within 10 minutes.<br>- `teams.workspace.manage` + active exact-team membership: may moderate any message. | Soft-delete a chat message (self or moderated) |

| `/api/teams/[teamId]/documents` | GET | None | `teams.workspace.view` + Active Member | Fetch registered external document links |
| `/api/teams/[teamId]/documents` | POST | Zod Link Create | `teams.workspace.manage` + Active Member | Register a shared external document link |
| `/api/admin/collaboration-teams` | GET | `cityId`, `status` | `teams.memberships.manage` | List teams in allowed city scope |
| `/api/admin/collaboration-teams/[teamId]/members` | GET | None | `teams.memberships.manage` | List members of specified team |
| `/api/admin/collaboration-teams/[teamId]/members` | POST | Zod Member Assign | `teams.memberships.manage` | Assign a new member to team |
| `/api/admin/collaboration-teams/[teamId]/members/[membershipId]`| PATCH| Zod Member Update | `teams.memberships.manage` | Update member title/responsibility |
| `/api/admin/collaboration-teams/[teamId]/members/[membershipId]`| DELETE| None | `teams.memberships.manage` | Revoke/End a team membership |

### 9.2 Bounded Zod Contracts

```typescript
import { z } from "zod";

const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, "Invalid identifier format");

export const createActivitySchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  description: z.string().trim().max(1000).optional(),
  contentBlockId: cuidSchema.optional(),
  assignedStaffMetaId: cuidSchema.min(1, "Assignee is required"), // Must match active same-team member
  scheduledFor: z.string().datetime().optional(),
});

export const updateActivitySchema = z.object({
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  assignedStaffMetaId: cuidSchema.optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
});

export const createChatMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content cannot be empty").max(2000, "Message exceeds 2000 character limit"),
});

export const registerDocumentLinkSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  url: z.string().url("Must be a valid URL").refine((val) => val.startsWith("https://"), {
    message: "URL must use secure HTTPS protocol",
  }),
  description: z.string().trim().max(500).optional(),
});

export const assignTeamMemberSchema = z.object({
  staffMetaId: cuidSchema.min(1, "Staff member is required"),
  title: z.string().trim().min(2).max(120).optional(),
});

export const updateTeamMemberSchema = z.object({
  title: z.string().trim().min(2).max(120).optional().nullable(),
});
```

---

## 10. Allow, Deny, Failure, and Audit Test Matrix

### 10.1 Test Cases

| Case ID | Actor Capabilities | Context / Parameters | Action Attempted | Expected Outcome | Audit Log Recorded? |
| --- | --- | --- | --- | --- | --- |
| `TC-TM-001` | `teams.memberships.manage` (LHR) | Team: LHR Tadreeb, Staff: Lahore Murabbi | Create team membership | **Allow** (HTTP 201) | Yes (`create`) |
| `TC-TM-002` | None | Team: LHR Tadreeb, Staff: Lahore Murabbi | Create team membership | **Deny** (HTTP 403 - Missing capability) | No |
| `TC-TM-003` | `teams.memberships.manage` (LHR) | Team: ISB Sports, Staff: Rawalpindi Lead | Create team membership | **Deny** (HTTP 400 - Target staff city mismatch) | No |
| `TC-TM-004` | `teams.workspace.view` (Non-member) | Team: LHR Media | GET `/api/teams/[teamId]/chat` | **Deny** (HTTP 403 - Active membership required) | No |
| `TC-TM-005` | `teams.workspace.view` (Active member) | Team: LHR Media | GET `/api/teams/[teamId]/chat` | **Allow** (HTTP 200) | No |
| `TC-TM-006` | `teams.workspace.manage` (Active member) | Register document URL: `https://drive.google.com` | POST `/api/teams/[teamId]/documents` | **Deny** (HTTP 403 - Fail-closed pending whitelist approval) | No |
| `TC-TM-007` | `teams.workspace.view` (Active member) | Update activity status to `completed` | PATCH `/api/teams/[teamId]/activities/[id]` | **Deny** (HTTP 403 - Requires `teams.workspace.manage`) | No |
| `TC-TM-008` | `teams.workspace.manage` (Active member) | Update activity status to `completed` | PATCH `/api/teams/[teamId]/activities/[id]` | **Allow** (HTTP 200) | Yes (`update_activity_status`) |
| `TC-TM-009` | `teams.workspace.manage` (Active member) | Assign activity to staff outside team | POST `/api/teams/[teamId]/activities` | **Deny** (HTTP 400 - Assignee not on team) | No |
| `TC-TM-010` | `teams.memberships.manage` (LHR City) | Team: ISB Tadreeb, Staff: Rawalpindi Murabbi | Create team membership | **Deny** (HTTP 403 - Cross-city boundary violation) | No |
| `TC-TM-011` | `teams.workspace.view` (Active assignee) | Update own activity status from planned to `in_progress` | PATCH `/api/teams/[teamId]/activities/[id]` | **Allow** (HTTP 200) | Yes (`update_activity_status`) |
| `TC-TM-012` | `teams.workspace.view` (Active non-assignee) | Update another user's activity status | PATCH `/api/teams/[teamId]/activities/[id]` | **Deny** (HTTP 403 - Forbidden) | No |
| `TC-TM-013` | `teams.workspace.view` (Active member) | Soft-delete own message after 5 minutes | DELETE `/api/teams/[teamId]/chat/[messageId]` | **Allow** (HTTP 200) | Yes (`delete_own_chat_message`) |
| `TC-TM-014` | `teams.workspace.view` (Active member) | Soft-delete own message after 15 minutes | DELETE `/api/teams/[teamId]/chat/[messageId]` | **Deny** (HTTP 403 - Time limit exceeded) | No |
| `TC-TM-015` | `teams.workspace.manage` (Active member) | Soft-delete another member's message | DELETE `/api/teams/[teamId]/chat/[messageId]` | **Allow** (HTTP 200) | Yes (`moderate_chat_message`) |
| `TC-TM-016` | `teams.memberships.manage` (HQ/Global) | Omit `cityId` parameter | GET `/api/admin/collaboration-teams` | **Deny** (HTTP 400 - Missing cityId parameter) | No |
| `TC-TM-017` | `teams.memberships.manage` (HQ/Global) | Provide `cityId: LHR` | GET `/api/admin/collaboration-teams` | **Allow** (HTTP 200 - Implicitly scoped LHR list) | No |

---

## 11. Implementation Roadmap

### 11.1 Future Implementation Files
The following repository-relative paths will be created or modified:
* **[NEW]** `src/app/api/teams/[teamId]/route.ts`: Core workspace metadata route.
* **[NEW]** `src/app/api/teams/[teamId]/activities/route.ts` & `[id]/route.ts`: Activity Planner endpoints.
* **[NEW]** `src/app/api/teams/[teamId]/chat/route.ts`: Group discussion feed.
* **[NEW]** `src/app/api/teams/[teamId]/chat/[messageId]/route.ts`: Chat moderation and deletion endpoint.
* **[NEW]** `src/app/api/teams/[teamId]/documents/route.ts`: Registered links registry.
* **[MODIFY]** `src/lib/auth/capabilities.ts`: Add `teams.memberships.manage`, `teams.workspace.view`, and `teams.workspace.manage` to capabilities array.
* **[NEW]** `src/components/modules/teams/team-workspace-dashboard.tsx`: Main UI container.
* **[NEW]** `src/components/modules/teams/team-activity-planner.tsx`: Activity planner panel.
* **[NEW]** `src/components/modules/teams/team-chat.tsx`: Discussion chat stream component.

---

## 12. Explicit Owner Decisions

The following architectural and product decisions must be resolved by the product owner before execution begins:

1. **Collaboration Team Setup Provisioning:** Should the initial creation of the permanent Lahore teams (`SPORTS`, `SKILLS`, `TADREEB`, `MEDIA`, `MUAWIN`) be handled via DB migrations or via an administrative UI tool?
2. **Approved Domain Whitelist for Document Links:** Define the exact list of trusted storage domains (e.g. `*.google.com`, `*.sharepoint.com`) allowed for link sharing.
3. **External URL Redirect Handling:** When a user clicks a registered document link, should they be navigated directly to the external site, or should they pass through an intermediate warning/redirection page?
4. **Chat History Retention Window:** Should team chat messages be permanently archived, or should a rolling 90-day deletion/archiving policy be enforced?
5. **Notification Channels:** When new team chat messages are posted, should notifications be sent only via local in-app alerts, or should they trigger automated email/SMS alerts?
6. **Automatic Assignment End:** When a staff member's core user deactivation occurs (`User.isActive` set to `false`), should the server automatically terminate all their active `StaffTeamMembership` records?
