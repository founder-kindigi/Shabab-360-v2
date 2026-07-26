# MEDIA-001: Media Operations Workspace Contract

- **Document Version:** 1.0.0
- **Task ID:** `MEDIA-001-MEDIA-OPERATIONS-CONTRACT`
- **Complexity:** C2
- **Status:** `PROPOSED` — Pending Owner Review & Approval
- **Objective:** Define a production-safe Media Operations Workspace for the permanent Media collaboration team. This is not a Content Planner category and not a public community/social-media module.

---

## 1. Verified Baseline

### 1.1 Existing Prisma Models

The following models exist, are deployed to staging (additive collaboration-team migration completed 2026-07-20), and require no modification:

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

### 1.2 Existing Capabilities (from `src/lib/auth/capabilities.ts`)

Verified — 34 fixed capability codes. No media-specific codes exist yet. Relevant existing codes:

| Code | Used By |
|------|---------|
| `organisation.view` | Old `/api/admin/teams` routes (read) |
| `organisation.manage` | Old (write) + all new `/api/admin/collaboration-teams` routes |
| `content.view` | Content Planner read |
| `content.manage` | Content Planner write |
| `mashwara.view` | Weekly Mashwara read |
| `mashwara.manage` | Weekly Mashwara write |

### 1.3 Existing Authorization Pattern (Verified in Code)

Three-layer enforcement used by all protected routes:

1. **`requireCapability("capability.name")`** — module gate, checks session + role default / role override / user override
2. **`requireCityScope(user, cityId)`** or **`canAccessResourceScope(user, {cityId, parkId, groupId})`** — server-derived scope
3. **Active membership** — for workspace-level access, the caller must have `isActive === true && endedAt === null` in `StaffTeamMembership` for the target team

**HQ roles** (`super_admin`, `program_admin`): must provide explicit `cityId` (400 if missing). Never receive unfiltered cross-city lists.

**City scope derivation** (from `StaffMeta`):
- `assignedCityId` → directly (city_head)
- `assignedParkId` → `Park.cityId` (park_lead, park_admin)
- `assignedGroupId` → `Group.batch.cityId` or `Group.park.cityId` (murabbi)

**Team membership is never a login role or scope expansion.** This invariant is enforced in all routes.

---

## 2. Media Operations — Domain Model

The Media workspace is distinct from the general Activity Planner (ActivityPlanItem). Media work follows a structured creative production flow with briefs, assignments, deadlines, approvals, and asset metadata.

### 2.1 Media Work Brief

A brief is the unit of media work. Each brief belongs to one city and one Media team (CollaborationTeam with `code === "MEDIA"`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | cuid | auto | Primary key |
| `teamId` | cuid | yes | FK → CollaborationTeam.id (always a Media team) |
| `cityId` | cuid | yes | Denormalised for scope enforcement; must match `team.cityId` |
| `title` | string(200) | yes | Brief title |
| `description` | string(5000) | no | Full brief description |
| `mediaType` | enum | yes | `"graphic"` \| `"video"` \| `"audio"` \| `"document"` \| `"photography"` \| `"other"` |
| `format` | string(100) | no | Specific format hint (e.g. `"Instagram Story 9:16"`, `"A4 Flyer"`) |
| `assignedToStaffMetaId` | cuid? | no | Current assignee (must be active Media team member in same city) |
| `status` | enum | yes | See state machine §2.2 |
| `priority` | enum | yes | `"low"` \| `"medium"` \| `"high"` \| `"urgent"` |
| `dueAt` | datetime? | no | Deadline — server warns but does not block; overdue is informational |
| `contentBlockId` | cuid? | no | Optional link to ContentPlanBlock for cross-reference |
| `approvalState` | enum? | no | See approval state §2.3 |
| `approvedByStaffMetaId` | cuid? | no | Set when `approvalState === "approved"` |
| `approvedAt` | datetime? | no | Set when `approvalState === "approved"` |
| `rejectionReason` | string(1000)? | no | Set when `approvalState === "rejected"` |
| `assetMetadata` | json? | no | Structured metadata — see §2.4 |
| `cancellationReason` | string(500)? | no | Required when status transitions to `"cancelled"` |
| `isActive` | boolean | auto default true | Soft-delete for audit preservation |
| `createdBy` | cuid | auto | Server-derived from authenticated actor |
| `createdAt` | datetime | auto | |
| `updatedAt` | datetime | auto | |

### 2.2 Status State Machine

```
draft ──→ open ──→ in_progress ──→ ready_for_review ──→ approved ──→ delivered ──→ archived
  │          │          │                   │                   │
  └──→ cancelled    cancelled ──┐           ├──→ revision_requested ──→ in_progress
                                │           │
                                └──→ cancelled
```

| Status | Meaning | Who Can Set |
|--------|---------|-------------|
| `draft` | Brief being prepared; not yet actionable | `media.briefs.manage` |
| `open` | Ready for assignment | `media.briefs.manage` |
| `in_progress` | Assignee is actively working | Own assignee (`media.workspace.view` + active member) or `media.workspace.manage` |
| `ready_for_review` | Assignee has submitted for review | Own assignee or `media.workspace.manage` |
| `revision_requested` | Reviewer requested changes | `media.workspace.manage` |
| `approved` | Content approved for delivery | `media.workspace.manage` |
| `delivered` | Content delivered to requester | `media.workspace.manage` |
| `cancelled` | Brief abandoned | `media.briefs.manage` or `media.workspace.manage` |
| `archived` | Terminal — hidden from default views | `media.workspace.manage` |

**Transition rules (enforced server-side):**
- Forward-only except `revision_requested` → `in_progress` (the only backward transition).
- `cancelled` and `archived` are terminal — no further transitions allowed.
- A cancelled brief requires `cancellationReason` (validated by Zod).
- `approvalState` is set to `"approved"` automatically when status reaches `"approved"`.
- `approvedByStaffMetaId` and `approvedAt` are set server-side — never from client.

### 2.3 Approval State

Separate from status — tracks the explicit approval gate before delivery.

| Approval State | Meaning |
|----------------|---------|
| `null` | Not yet submitted for approval |
| `pending` | Submitted, awaiting review |
| `approved` | Review passed |
| `rejected` | Review failed (rejectionReason required) |

The approval state is managed by `media.workspace.manage`. On `approved`, the system automatically sets `approvedByStaffMetaId` and `approvedAt` from the authenticated actor — never from the client.

### 2.4 Asset Metadata

Structured JSON stored on the brief after delivery. Schema enforced server-side via Zod.

```typescript
const assetMetadataSchema = z.object({
  fileName: z.string().max(255).optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  duration: z.string().max(20).optional(),         // "MM:SS" or "HH:MM:SS"
  resolution: z.string().max(20).optional(),        // "1920x1080"
  format: z.string().max(100).optional(),
  thumbnailUrl: z.string().url().optional(),        // External thumbnail link only
  externalStorageUrl: z.string().url().optional(),  // Link to external storage
}).strict();
```

> [!IMPORTANT]
> **File uploads are disabled for this phase.** No file storage, no Multer, no S3 presigned URLs. The `externalStorageUrl` and `thumbnailUrl` fields accept links to externally hosted assets only. See §8 for the full uploads policy.

### 2.5 Server-Derived Audit Fields

All identity and audit fields on MediaBrief (`createdBy`, `approvedByStaffMetaId`, `approvedAt`) are **server-derived from the authenticated session actor**. The client must never supply them. Zod `.strict()` rejects any unknown fields.

---

## 3. Dynamic Capability Codes

Three new capabilities are required. The `media.*` prefix follows the established dot-notation pattern (`calling.*`, `mashwara.*`, `events.*`).

| Code | Purpose | Role Defaults |
|------|---------|---------------|
| `media.briefs.manage` | Create, edit, cancel briefs. Manage the brief lifecycle through `draft` → `open` → `cancelled`. | `super_admin`, `program_admin`, `city_head` |
| `media.workspace.view` | View the Media workspace dashboard, brief list, and brief details. Self-assignee may transition own work `in_progress` → `ready_for_review`. | `super_admin`, `program_admin`, `city_head`, plus active Media team members with `mashwara.view` |
| `media.workspace.manage` | Full workspace management: assign/reassign briefs, review/approve/reject deliverables, transition to `delivered`, `archived`, `revision_requested`. | `super_admin`, `program_admin`, `city_head` |

### 3.1 Proposed Additions to ACCESS_CAPABILITIES

These should be inserted alphabetically in `src/lib/auth/capabilities.ts`:

```typescript
"media.briefs.manage",
"media.workspace.view",
"media.workspace.manage",
```

### 3.2 Proposed Additions to USER_OVERRIDE_CAPABILITIES

```typescript
"media.workspace.view",
"media.workspace.manage",
```

`media.briefs.manage` is excluded from user overrides because brief management affects the shared team pipeline and should remain role-level only.

### 3.3 Role Default Matrix

| Role | `media.briefs.manage` | `media.workspace.view` | `media.workspace.manage` |
|------|-----------------------|------------------------|---------------------------|
| `super_admin` | YES | YES | YES |
| `program_admin` | YES | YES | YES |
| `city_head` | YES (own city) | YES (own city) | YES (own city) |
| `park_lead` | — | YES (if active Media team member) | — |
| `park_admin` | — | YES (if active Media team member) | — |
| `murabbi` | — | YES (if active Media team member) | — |
| `guardian` | — | — | — |
| `student` | — | — | — |

**Override behavior:** Standard resolution order (user override → role override → default). A deny override always wins.

**Scope enforcement remains server-side:** Even with `media.workspace.manage`, a user must have a valid derived city scope (or be HQ with explicit cityId) to access any Media workspace data.

---

## 4. Authorization Rules

### 4.1 Access Predicate Chain

Every Media workspace route enforces:

1. **Authentication gate** — `requireAuth()` → 401 if missing, 403 if mustResetPwd
2. **Capability gate** — `requireCapability("media.*")` → 403 if not allowed
3. **City scope** — `requireCityScope(user, brief.cityId)` or `requireCityScope(user, team.cityId)` → 403 if mismatch
4. **Active Media team membership** — caller must have `isActive === true && endedAt === null` in `StaffTeamMembership` for the target Media `CollaborationTeam` → 403 if not a member
5. **Assignment predicate** — For self-assignee actions (transition own work): `brief.assignedToStaffMetaId` must match caller's `StaffMeta.id`

### 4.2 Team Membership Is an Access Predicate Only

Active Media team membership grants access to the Media workspace dashboard and the ability to view briefs. It **must never**:

- Expand the user's core role or login scope (city/park/group)
- Grant access to data outside the user's server-derived city
- Grant `media.briefs.manage` or `media.workspace.manage` capabilities
- Override or replace hierarchical scope checks

### 4.3 HQ City Scope Rule

**HQ actors** (`super_admin`, `program_admin`) may operate in any city but must supply an explicit `cityId` parameter in the request query or body. Missing `cityId` returns 400. The provided `cityId` must reference an existing city in the database.

### 4.4 Scoped City Scope Derivation

For city_head, park_lead, park_admin, and murabbi actors, city scope is derived server-side from `StaffMeta`:

1. `assignedCityId` (city_head)
2. If null: `assignedParkId` → `Park.cityId` (park_lead, park_admin)
3. If null: `assignedGroupId` → `Group.batch.cityId` (murabbi)
4. If none resolved → 403

The derived city must match `team.cityId` (and `brief.cityId`) — return 403 on mismatch.

### 4.5 Server-Enforced Assignment Validation

When a brief is assigned (`assignedToStaffMetaId` is set or updated), the server must validate:

1. The assignee's `StaffMeta` is active (`isActive === true`)
2. The assignee has an active `StaffTeamMembership` for the target Media `CollaborationTeam`
3. The assignee's derived city matches the brief's `cityId`

If any check fails, the server returns 400 with detail.

---

## 5. API Route Matrix

All routes are additive. No existing route is modified.

### 5.1 Brief Endpoints

| Method | Path | Auth Gate | Scope Check | Notes |
|--------|------|-----------|-------------|-------|
| `GET` | `/api/teams/[teamId]/media/briefs` | `media.workspace.view` + active member | requireCityScope(team.cityId) | Paginated list with status/priority/mediaType filters |
| `POST` | `/api/teams/[teamId]/media/briefs` | `media.briefs.manage` + active member | requireCityScope(team.cityId) | Create brief |
| `GET` | `/api/teams/[teamId]/media/briefs/[briefId]` | `media.workspace.view` + active member | requireCityScope(team.cityId) | Single brief detail |
| `PATCH` | `/api/teams/[teamId]/media/briefs/[briefId]` | — | requireCityScope(team.cityId) | See §5.2 for role-gated field-level rules |
| `DELETE` | `/api/teams/[teamId]/media/briefs/[briefId]` | `media.briefs.manage` + active member | requireCityScope(team.cityId) | Soft-delete (isActive = false) |

### 5.2 Brief PATCH — Role-Gated Field Rules

| Field | `media.workspace.view` (own assignment) | `media.workspace.manage` | `media.briefs.manage` |
|-------|----------------------------------------|--------------------------|------------------------|
| `status` | `in_progress` ↔ `ready_for_review` only, on own brief | All transitions | Initial: draft → open |
| `assignedToStaffMetaId` | No | Yes | No |
| `title`, `description`, `mediaType`, `format`, `priority`, `dueAt`, `contentBlockId` | No | Yes | Yes (draft only) |
| `approvalState` | No | Yes (`pending` → `approved`/`rejected`) | No |
| `rejectionReason` | No | Yes (when rejecting) | No |
| `assetMetadata` | No | Yes (on approved/delivered) | No |
| `cancellationReason` | No | Yes | Yes (on own briefs) |

### 5.3 Media Team Browsing Endpoint

| Method | Path | Auth Gate | Scope Check | Notes |
|--------|------|-----------|-------------|-------|
| `GET` | `/api/teams/[teamId]/media` | `media.workspace.view` + active member | requireCityScope(team.cityId) | Workspace dashboard: active briefs count, briefs by status, team member quick-list |

---

## 6. Bounded Zod Contracts

### 6.1 Shared Primitives

```typescript
const teamIdSchema = z.string().cuid();
const briefIdSchema = z.string().cuid();
const staffMetaIdSchema = z.string().cuid();
const cityIdSchema = z.string().cuid();

const briefStatusSchema = z.enum([
  "draft", "open", "in_progress", "ready_for_review",
  "revision_requested", "approved", "delivered", "cancelled", "archived",
]);

const approvalStateSchema = z.enum(["pending", "approved", "rejected"]).nullable();

const mediaTypeSchema = z.enum([
  "graphic", "video", "audio", "document", "photography", "other",
]);

const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
```

### 6.2 Brief Schemas

```typescript
const createBriefSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().trim().max(5000).optional(),
  mediaType: mediaTypeSchema,
  format: z.string().trim().max(100).optional(),
  priority: prioritySchema.default("medium"),
  dueAt: z.coerce.date().optional(),
  contentBlockId: z.string().cuid().optional(),
}).strict();  // Rejects client-supplied createdBy, status, approvalState, etc.

const updateBriefSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  mediaType: mediaTypeSchema.optional(),
  format: z.string().trim().max(100).optional().nullable(),
  priority: prioritySchema.optional(),
  dueAt: z.coerce.date().optional().nullable(),
  contentBlockId: z.string().cuid().optional().nullable(),
  status: briefStatusSchema.optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional().nullable(),
  approvalState: approvalStateSchema.optional(),
  rejectionReason: z.string().trim().max(1000).optional().nullable(),
  assetMetadata: assetMetadataSchema.optional().nullable(),
  cancellationReason: z.string().trim().max(500).optional().nullable(),
}).strict();  // Rejects client-supplied createdBy, approvedByStaffMetaId, approvedAt

const briefListQuerySchema = z.object({
  status: briefStatusSchema.optional(),
  mediaType: mediaTypeSchema.optional(),
  priority: prioritySchema.optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### 6.3 Asset Metadata Schema

```typescript
const assetMetadataSchema = z.object({
  fileName: z.string().max(255).optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  duration: z.string().regex(/^\d{1,2}:\d{2}$|^\d{1,2}:\d{2}:\d{2}$/).optional(),
  resolution: z.string().regex(/^\d+x\d+$/).optional(),
  format: z.string().max(100).optional(),
  thumbnailUrl: z.string().url().optional(),
  externalStorageUrl: z.string().url().optional(),
}).strict();
```

---

## 7. Proposed Additive Prisma Model

> [!IMPORTANT]
> This model is additive-only. It must be added identically to `prisma/schema.prisma` (SQLite) and `prisma/postgres/schema.prisma` (PostgreSQL). It does not modify `CollaborationTeam`, `StaffTeamMembership`, or any existing model.

```prisma
model MediaBrief {
  id                      String    @id @default(cuid())
  teamId                  String
  cityId                  String
  title                   String
  description             String?
  mediaType               String    // "graphic" | "video" | "audio" | "document" | "photography" | "other"
  format                  String?
  assignedToStaffMetaId   String?
  status                  String    @default("draft")
  priority                String    @default("medium")
  dueAt                   DateTime?
  contentBlockId          String?
  approvalState           String?   // null | "pending" | "approved" | "rejected"
  approvedByStaffMetaId   String?
  approvedAt              DateTime?
  rejectionReason         String?
  assetMetadata           String?   // JSON string — validated server-side via Zod
  cancellationReason      String?
  isActive                Boolean   @default(true)
  createdBy               String    // server-derived userId
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  team            CollaborationTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  assignedStaff   StaffMeta?        @relation("MediaAssignee", fields: [assignedToStaffMetaId], references: [id], onDelete: SetNull)
  contentBlock    ContentPlanBlock? @relation(fields: [contentBlockId], references: [id], onDelete: SetNull)
  approvedByStaff StaffMeta?        @relation("MediaApprover", fields: [approvedByStaffMetaId], references: [id], onDelete: SetNull)
  createdByUser   User              @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([teamId, status])
  @@index([teamId, assignedToStaffMetaId, status])
  @@index([cityId, status])
  @@index([mediaType, status])
  @@index([priority, status])
  @@map("media_briefs")
}
```

Opposite relation fields to add to `StaffMeta`:

```prisma
  mediaAssignments MediaBrief[]   @relation("MediaAssignee")
  mediaApprovals   MediaBrief[]   @relation("MediaApprover")
```

Opposite relation field to add to `CollaborationTeam`:

```prisma
  mediaBriefs MediaBrief[]
```

### 7.1 Dual Prisma Migration Plan

1. **Add model and relation fields** to both `prisma/schema.prisma` and `prisma/postgres/schema.prisma`
2. **Generate local SQLite migration:** `npx prisma migrate dev --name add_media_briefs`
3. **Generate PostgreSQL migration:** `npx prisma migrate dev --schema=prisma/postgres/schema.prisma --create-only --name add_media_briefs`
4. **Staging/production:** `npx prisma migrate deploy` (or with `--schema` flag for PostgreSQL)
5. **Safe rollback:** Disable route access by revoking `media.*` capabilities. Do not drop table — preserve data.

---

## 8. Uploads Policy (Disabled)

File uploads are explicitly disabled for this phase. This applies to all Media workspace operations.

### 8.1 What Is Disabled

- File upload to any server or storage endpoint
- Multer, formidable, or any multipart form handling
- S3 presigned URL generation or cloud storage uploads
- Image, video, or audio file storage
- Base64 inline data encoding in API payloads

### 8.2 What Is Allowed

- External URL references in `assetMetadata.externalStorageUrl` and `assetMetadata.thumbnailUrl`
- Link registration only — no file transfer, no server-side download, no storage

### 8.3 UI Treatment

- All file-picker/dropzone controls are hidden or replaced with a disabled state
- When displayed, the disabled area shows: `"File uploads are currently disabled. External links can be registered after delivery."`
- URL input fields for external storage links are text inputs only — no upload UI

---

## 9. Mobile UI Requirements (375px/390px Viewports)

All Media workspace views must function on 375px (iPhone SE) and 390px (iPhone 14/15/16 Pro) viewports.

### 9.1 Layout Rules

- **Single-column** layout on mobile. Two-column desktop layouts stack vertically.
- **Tab bar** collapses to a horizontal scrollable tab bar at the top.
- **Action sheets and modals** open as full-screen sheets with `pb-24` bottom margin to clear the floating bottom navigation bar.
- **Brief list cards** stack vertically with full-width tap targets. Each card shows: title, mediaType badge, status pill, priority indicator, assignee avatar/initials, due date.

### 9.2 Touch Targets

- All interactive elements have minimum 44×44pt tap targets.
- Swipe gestures on brief list items for quick actions (on supported statuses):
  - Swipe left: "Mark In Progress" / "Submit for Review"
  - Swipe right: "Cancel" (with confirmation)
- Long press on a brief card opens an action sheet with all available transitions.

### 9.3 Filter and Search

- Filter controls are collapsible below the page header.
- Active filters shown as removable chips.
- Search by title is available via a search bar at the top of the brief list.

### 9.4 Form Inputs

- Full-width form fields on mobile.
- Date picker uses the native platform picker (`type="date"`).
- Dropdowns use native `<select>` or bottom-sheet picker.

---

## 10. Safe States (Empty, Error, Loading)

### 10.1 Empty States

| Context | State | Message |
|---------|-------|---------|
| Brief list, no briefs | Empty | "No media briefs yet. Create the first brief to get started." (Shown only to `media.briefs.manage` users. Others see: "No media briefs to show.") |
| Brief list, no matching filters | Empty with active filters | "No briefs match your current filters. Try adjusting your search or filter criteria." |
| Brief list, no active briefs | Empty (status: active only) | "All briefs are resolved. Great work!" |
| Team members list | Empty | "No team members shown." |
| Asset metadata | Not yet set | "Asset metadata will be available after delivery." |

### 10.2 Error States

| Context | Error | Message |
|---------|-------|---------|
| Any fetch | Network / server error | "Could not load media briefs. Please try again." With retry button. |
| Any mutation | 400 | Inline field validation errors from Zod. |
| API call | 401 | Redirect to sign-in. |
| API call | 403 | "You do not have permission to perform this action." With optional "Request Access" link. |
| API call | 404 | "Brief not found. It may have been removed." |
| Concurrent mutation | 409 | "This brief was updated by another user. Please refresh and try again." |
| Status transition | Invalid transition | "This status change is not allowed. The current status is <status>." |
| Assignee change | Invalid assignee | "The selected staff member is not an active Media team member or does not belong to this city." |

### 10.3 Loading States

| Context | Treatment |
|---------|-----------|
| Brief list fetch | Skeleton cards (3-6 placeholder cards with pulse animation) |
| Single brief fetch | Skeleton detail (title, metadata rows, content area) |
| Mutation (save, transition) | Button shows spinner + "Saving..." / "Updating...". Inputs disabled during save. |
| Filter change | Brief list shows subtle loading indicator; existing results remain visible during refresh. |
| Page navigation | Skeleton layout matching target view structure. |

---

## 11. Audit Expectations

Every state-changing operation on a MediaBrief is logged via `logAudit()`:

| Action | Trigger | Data Recorded |
|--------|---------|---------------|
| `media_brief.create` | POST create brief | `entityType: "media_brief"`, `entityId: brief.id`, `newValues: { title, mediaType, priority }` |
| `media_brief.update` | PATCH brief fields | `entityType: "media_brief"`, `entityId: brief.id`, `oldValues`/`newValues` for changed fields |
| `media_brief.status_change` | Status transition | `entityType: "media_brief"`, `entityId: brief.id`, `oldValues: { status }`, `newValues: { status }`, `reason` for cancellation |
| `media_brief.assign` | Assignee changed | `entityType: "media_brief"`, `entityId: brief.id`, `oldValues: { assignedTo }`, `newValues: { assignedTo }` |
| `media_brief.approve` | Approval granted | `entityType: "media_brief"`, `entityId: brief.id`, `newValues: { approvalState: "approved", approvedBy }` |
| `media_brief.reject` | Approval rejected | `entityType: "media_brief"`, `entityId: brief.id`, `newValues: { approvalState: "rejected", rejectionReason }` |
| `media_brief.asset_metadata` | Asset metadata set | `entityType: "media_brief"`, `entityId: brief.id`, `newValues: { fileName, mimeType }` (excludes `externalStorageUrl` from audit if deemed sensitive) |
| `media_brief.delete` | Soft-delete | `entityType: "media_brief"`, `entityId: brief.id`, `reason` |

### 11.1 Redaction Rules

- `externalStorageUrl` and `thumbnailUrl` are redacted from audit logs (logged as `"[REDACTED]"`).
- `rejectionReason` and `cancellationReason` are logged in full (not PII in these fields).
- No user credentials, tokens, or session data are ever written to audit.

### 11.2 Audit Read Access

- Audit log entries for Media operations are readable only by users with `audit.view` capability within the same derived city scope.

---

## 12. Allow, Deny, Failure, and Audit Test Matrix

### 12.1 Allow Tests (Success Paths)

| ID | Actor Capabilities | Context | Action | Expected | Audit? |
|----|-------------------|---------|--------|----------|--------|
| MD-ALLOW-001 | `media.briefs.manage` (LHR city_head) | LHR Media team, create brief | POST brief (draft) | 201 | Yes (create) |
| MD-ALLOW-002 | `media.workspace.manage` (LHR city_head) | LHR Media, transition draft → open | PATCH status | 200 | Yes (status_change) |
| MD-ALLOW-003 | `media.workspace.view` (LHR active member) | Assigned own brief, transition in_progress → ready_for_review | PATCH status | 200 | Yes (status_change) |
| MD-ALLOW-004 | `media.workspace.manage` (LHR city_head) | Brief in ready_for_review, approve | PATCH approvalState → approved | 200 | Yes (approve) |
| MD-ALLOW-005 | `media.workspace.manage` (LHR city_head) | Approved brief, set asset metadata | PATCH assetMetadata | 200 | Yes (asset_metadata) |
| MD-ALLOW-006 | `media.workspace.manage` (LHR city_head) | Brief delivered, archive | PATCH status → archived | 200 | Yes (status_change) |
| MD-ALLOW-007 | `media.workspace.view` (LHR active member) | Own brief list | GET briefs | 200 | No |
| MD-ALLOW-008 | `media.briefs.manage` (HQ with explicit cityId) | LHR Media team | POST brief (open) | 201 | Yes (create) |
| MD-ALLOW-009 | `media.workspace.manage` (LHR city_head) | Assign brief to active LHR Media team member | PATCH assignedToStaffMetaId | 200 | Yes (assign) |
| MD-ALLOW-010 | `media.workspace.manage` (LHR city_head) | Brief in ready_for_review, reject with reason | PATCH approvalState → rejected, rejectionReason set | 200 | Yes (reject) |
| MD-ALLOW-011 | `media.briefs.manage` (LHR city_head) | Cancel own brief with reason | PATCH status → cancelled, cancellationReason set | 200 | Yes (status_change) |
| MD-ALLOW-012 | `media.workspace.view` (LHR active member) | View single brief detail | GET brief | 200 | No |

### 12.2 Deny Tests (Negative Paths)

| ID | Actor Capabilities | Context | Action | Expected |
|----|-------------------|---------|--------|----------|
| MD-DENY-001 | Unauthenticated | LHR Media team | POST brief | 401 |
| MD-DENY-002 | No media capability (park_lead, no Media membership) | LHR Media team | GET briefs | 403 |
| MD-DENY-003 | `media.workspace.view` only (active member) | Create new brief | POST brief | 403 (requires media.briefs.manage) |
| MD-DENY-004 | `media.workspace.view` (active member, not assignee) | Try to transition another's brief | PATCH status → in_progress | 403 |
| MD-DENY-005 | `media.workspace.view` (active member, own brief) | Try to skip to approved | PATCH status → approved | 403 |
| MD-DENY-006 | `media.workspace.view` (active member) | Try to approve own brief | PATCH approvalState → approved | 403 |
| MD-DENY-007 | `media.workspace.manage` (LHR city_head) | Assign brief to staff not in LHR | PATCH assignedToStaffMetaId | 400 (city mismatch) |
| MD-DENY-008 | `media.workspace.manage` (LHR city_head) | Assign brief to inactive StaffMeta | PATCH assignedToStaffMetaId | 400 (inactive staff) |
| MD-DENY-009 | `media.workspace.manage` (LHR city_head) | Assign brief to non-Media-team staff | PATCH assignedToStaffMetaId | 400 (not team member) |
| MD-DENY-010 | `media.briefs.manage` (LHR city_head) | Cancel without cancellationReason | PATCH status → cancelled | 400 |
| MD-DENY-011 | `media.workspace.view` (active member) | Transition from cancelled to anything | PATCH status → in_progress | 400 (terminal) |
| MD-DENY-012 | `media.briefs.manage` (LHR city_head) | Update brief after it's open (use manage for draft) | Client supplies `createdBy` in payload | 400 (strict schema) |
| MD-DENY-013 | `media.briefs.manage` (LHR city_head) | Create brief with invalid mediaType | POST with mediaType="unknown" | 400 (Zod enum) |
| MD-DENY-014 | `media.workspace.manage` (ISB city_head) | Access LHR Media team workspace | GET /api/teams/[LHR-teamId]/media | 403 (cross-city) |
| MD-DENY-015 | `media.workspace.manage` (HQ, no cityId) | No explicit cityId provided | GET briefs | 400 (missing cityId) |
| MD-DENY-016 | `media.workspace.view` (active member) | Set asset metadata | PATCH assetMetadata | 403 |
| MD-DENY-017 | Inactive Media membership (endedAt set) | All workspace routes | Any | 403 |
| MD-DENY-018 | `media.workspace.manage` (LHR city_head) | Client supplies `approvedByStaffMetaId` in payload | PATCH approvalState → approved | 400 (strict schema) |

### 12.3 Error/Failure Tests

| ID | Test | Expected |
|----|------|----------|
| MD-ERR-001 | Create brief with empty title | 400 |
| MD-ERR-002 | Create brief with title exceeding 200 chars | 400 |
| MD-ERR-003 | GET non-existent brief | 404 |
| MD-ERR-004 | PATCH non-existent brief | 404 |
| MD-ERR-005 | Assign brief to non-existent staffMetaId | 400 |
| MD-ERR-006 | List with invalid page (< 1) | 400 |
| MD-ERR-007 | List with invalid limit (> 100) | 400 |
| MD-ERR-008 | PATCH with no valid fields in body | 400 (empty update) |
| MD-ERR-009 | Asset metadata with invalid duration format ("abc") | 400 |
| MD-ERR-010 | Concurrent PATCH (stale data) | 409 (or last-write-wins — to be decided) |

### 12.4 Audit Tests

| ID | Test | Expected |
|----|------|----------|
| MD-AUDIT-001 | Creating a brief creates audit log entry | AuditLog with action `media_brief.create` exists |
| MD-AUDIT-002 | Rejecting a brief logs reason | AuditLog.rejectionReason matches |
| MD-AUDIT-003 | Setting asset metadata redacts externalStorageUrl | AuditLog.newValues.externalStorageUrl is `"[REDACTED]"` |
| MD-AUDIT-004 | Assigning brief logs both old and new assignee | AuditLog.oldValues and .newValues contain assignedToStaffMetaId |
| MD-AUDIT-005 | Non-audit.view user cannot read Media audit entries | 403 |

---

## 13. Explicitly Deferred Features

The following features require separate owner review and approval before implementation. They are **out of scope** for this contract.

| Feature | Reason for Deferral |
|---------|-------------------|
| **Image, video, audio file storage** | Requires S3/cloud storage integration, upload middleware, presigned URLs, and storage cost analysis. |
| **Public publishing or distribution** | Media workspace is internal operations only. Public-facing publishing requires product-level approval. |
| **Reactions, comments, or discussion on briefs** | Real-time features, notifications, and moderation infrastructure not yet designed for team workspace. |
| **Minor-facing community features** | Media workspace is staff-only. Any cross-role or minor-facing features require safeguarding review and consent. |
| **Consent, moderation, and retention policy** | Media assets may capture individuals. Consent capture, content moderation workflow, and retention/deletion policy are separate workstreams. |
| **Automated notifications (email, in-app, push)** | Notification channel architecture is separate. This phase uses in-app polling only. |
| **PDF/image preview of deliverables** | Requires storage (deferred) or external URL proxy. |
| **Repeating / recurring briefs or templates** | Briefs are individual units. Template-based generation is a future enhancement. |
| **Dashboard analytics (per-member throughput, average cycle time)** | Read-only metrics view deferred. Briefs data model supports querying these later. |
| **Media library / asset catalogue** | Long-term storage and search of delivered assets is a separate module. |
| **Batch operations (multi-select, bulk status change)** | Pilot starts with per-brief operations only. |
| **Integration with external design tools (Canva, Adobe)** | API or SSO integration with third-party tools requires separate evaluation. |

---

## 14. Implementation Package — Files to Create

### Schema

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `MediaBrief` model after `ActivityPlanItem`; add relation fields to `StaffMeta` and `CollaborationTeam` |
| `prisma/postgres/schema.prisma` | Same additive changes |

### Auth

| File | Action |
|------|--------|
| `src/lib/auth/capabilities.ts` | Add `media.briefs.manage`, `media.workspace.view`, `media.workspace.manage` to `ACCESS_CAPABILITIES` and `USER_OVERRIDE_CAPABILITIES`; add role defaults |

### Shared Helpers

| File | Action |
|------|--------|
| `src/lib/media/zod.ts` | All Zod schemas (brief create/update/list, asset metadata) |
| `src/lib/media/types.ts` | TypeScript types for MediaBrief, MediaBriefStatus, etc. |
| `src/lib/media/scope.ts` | Media-specific scope helpers: `hasActiveMediaMembership(staffMetaId, cityId)` |
| `src/lib/media/audit.ts` | Audit action wrappers for media operations |

### API Routes

| File | Method/Handler |
|------|---------------|
| `src/app/api/teams/[teamId]/media/route.ts` | GET workspace dashboard |
| `src/app/api/teams/[teamId]/media/briefs/route.ts` | GET list, POST create |
| `src/app/api/teams/[teamId]/media/briefs/[briefId]/route.ts` | GET detail, PATCH update, DELETE soft-delete |

### UI Components

| File | Action |
|------|--------|
| `src/components/modules/media/media-workspace.tsx` | Workspace dashboard with brief list |
| `src/components/modules/media/media-brief-card.tsx` | Brief list item card |
| `src/components/modules/media/media-brief-form.tsx` | Create/edit brief form |
| `src/components/modules/media/media-brief-detail.tsx` | Brief detail view with status timeline |
| `src/components/modules/media/media-status-badge.tsx` | Status pill component |
| `src/components/modules/media/media-approval-section.tsx` | Approval/rejection controls |
| `src/components/modules/media/media-asset-metadata-form.tsx` | Asset metadata entry (URL fields only) |
| `src/components/modules/media/media-empty-states.tsx` | Empty/error/loading state components |

### Tests

| File | Action |
|------|--------|
| `src/__tests__/api/media/allow.test.ts` | 12 allow tests |
| `src/__tests__/api/media/deny.test.ts` | 18 deny tests |
| `src/__tests__/api/media/error.test.ts` | 10 error tests |
| `src/__tests__/api/media/audit.test.ts` | 5 audit tests |
| `src/__tests__/lib/media/zod.test.ts` | Zod validation tests |
| `src/__tests__/lib/media/scope.test.ts` | Media membership + scope tests |

---

## 15. Owner Decisions

The following items require product owner resolution before implementation begins:

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| D1 | **Brief ID format** — human-readable vs cuid | CUID / Sequential / Custom format | Affects URL structure and display |
| D2 | **Approval flow** — single approver or multiple? | Single approvedBy / Multi-step approval chain | Affects approvalState enum and auth rules |
| D3 | **Overdue handling** — should server auto-escalate overdue briefs? | No auto-action / Notify assignee / Notify city_head | Affects optional cron or read-time escalation |
| D4 | **Concurrent edit conflict** — how to handle simultaneous PATCH? | Last-write-wins / 409 Conflict with stale data | Affects optimistic concurrency control |
| D5 | **Asset metadata** — should `externalStorageUrl` be mandatory on delivery? | Optional / Required before delivered | Affects Zod validation on status → delivered |
| D6 | **Grade/band for mediaType** — allow free-text format or constrained catalogue? | Free-text / Constrained per mediaType | Affects format field validation |
| D7 | **Notification during pilot** — should status changes trigger any notification? | In-app polling only / Sidebar badge count | Affects client-side polling strategy |

---

## 16. Implementation Sequence

### Phase 1 — Schema & Auth (Independent)
1. Add `MediaBrief` model to both schema files
2. Generate additive migrations
3. Add `media.*` capabilities + role defaults

### Phase 2 — Helpers & API (Depends on Phase 1)
4. Create Zod schemas and TypeScript types
5. Create scope/audit helpers
6. Create 3 API route files with full auth chain

### Phase 3 — UI (Depends on Phase 2)
7. Create workspace dashboard component
8. Create brief list, detail, form components
9. Implement mobile-responsive layout (375px/390px)
10. Implement all empty/error/loading states

### Phase 4 — Testing & Quality (Depends on Phase 2-3)
11. Write 45 tests (12 allow, 18 deny, 10 error, 5 audit)
12. Zod + scope unit tests
13. Lint, typecheck, full suite, SQLite/PostgreSQL builds

---

## 17. Handoff Checklist

- [ ] `MediaBrief` model added to both Prisma schemas
- [ ] Additive migration generated and tested
- [ ] `media.*` capabilities added + role defaults
- [ ] 3 API route files created with full auth chain (capability + scope + membership)
- [ ] Scope helpers, Zod schemas, audit helpers created
- [ ] UI components created (8)
- [ ] All 45+ tests pass
- [ ] Lint, typecheck, full suite, SQLite/PostgreSQL builds pass
- [ ] Uploads disabled — no file storage endpoints
- [ ] Mobile 375px/390px responsive verified
- [ ] Empty/error/loading states implemented
- [ ] All deferred features explicitly excluded from code
- [ ] Owner decisions D1–D7 resolved
- [ ] This contract updated with any deviations

---

*End of MEDIA-001-MEDIA-OPERATIONS-CONTRACT.md*
