# Mashwara Design

**Module:** Weekly Mashwara (Recurring Meetings, Decisions & Action Items)
**Priority:** Future module (post-stabilization)
**Purpose:** Replace informal city-level meeting coordination with a structured,
auditable, recurring meeting module that supports attendance tracking, Karguzari
(MoM/minutes), decision recording, and collaboration-team action items.

## 1. Core Requirements

### 1.1 Approved Policy

From owner-approved baseline (`.agents/memory/current.md`):

- **Scoped recurring meetings**: Each Mashwara belongs to exactly one city
- **Attendance tracking**: Record who attended each meeting occurrence
- **Karguzari/MoM**: Immutable meeting minutes with review/audit behavior
- **Decisions**: Captured decisions with context and ownership
- **Collaboration-team action items**: Tasks assigned to Sports, Skills, Tadreeb,
  Media, or Muawin teams
- **Hierarchy scope preservation**: Team membership NEVER expands hierarchy scope
- **Participant access**: All active city team members receive restricted
  participant-level access to city-scoped Mashwara (automatic for users with
  `StaffMeta` in the city who have at least one collaboration team membership)
- **Meeting-specific share**: City Heads/HQ may grant revocable, audited,
  meeting-specific share to selected same-city active team members (users with
  `StaffMeta` and team membership, not general staff)

### 1.2 Design Principles

1. **Immutable review/audit behavior**: Once finalized, Karguzari and decisions
   cannot be edited; corrections require new entries with references
2. **Fail-closed authorization**: Missing city scope denies access
3. **No role expansion**: Team membership is an access predicate (grants Mashwara
   read access for same-city team members), never a login role or broader system access
4. **Audit trail**: All sensitive operations (shares, decisions, action items)
   are logged with actor, timestamp, and context

## 2. Data Model

### 2.1 Core Entities

| Entity | Purpose | Key attributes |
| --- | --- | --- |
| `Mashwara` | Recurring meeting definition | `cityId`, `title`, `purpose`, `recurrencePattern`, `status` (active/archived) |
| `MashwaraOccurrence` | Single meeting instance | `mashwaraId`, `scheduledDate`, `actualDate`, `status` (scheduled/completed/cancelled), `venueNotes` |
| `MashwaraAttendance` | Who attended an occurrence | `occurrenceId`, `userId`, `attendanceStatus` (present/absent/excused), `recordedAt`, `recordedBy` |
| `Karguzari` | Meeting minutes/MoM | `occurrenceId`, `content`, `preparedBy`, `reviewedBy`, `finalizedAt` |
| `MashwaraDecision` | Captured decision | `occurrenceId`, `title`, `description`, `decisionOwner` (userId), `dueDate`, `status`, `recordedBy`, `recordedAt` |
| `MashwaraActionItem` | Team task from meeting | `decisionId` (optional), `occurrenceId`, `teamId` (Sports/Skills/etc), `assignedTo` (userId, optional), `title`, `description`, `dueDate`, `priority`, `status`, `createdBy`, `completedAt` |
| `MashwaraMeetingShare` | Audited guest access | `occurrenceId`, `grantedToUserId`, `grantedBy`, `grantedAt`, `revokedAt`, `revokedBy`, `reason` |

### 2.2 Relationships

```
City 1──* Mashwara
Mashwara 1──* MashwaraOccurrence
MashwaraOccurrence 1──* MashwaraAttendance
MashwaraOccurrence 0..1─── Karguzari
MashwaraOccurrence 1──* MashwaraDecision
MashwaraOccurrence 1──* MashwaraActionItem
MashwaraActionItem *──1 CollaborationTeam
MashwaraDecision 1──* MashwaraActionItem (optional link)
MashwaraOccurrence 1──* MashwaraMeetingShare
User 1──* MashwaraAttendance
User 1──* MashwaraActionItem (assignedTo)
```

### 2.3 Recurrence Pattern

**Pilot scope**: Weekly recurrence only. Store as simple structured field:

```typescript
interface RecurrencePattern {
  frequency: 'weekly';
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startDate: string; // ISO date
  timeOfDay?: string; // e.g., "19:00" local time (optional)
}
```

**Future extensibility**: Post-pilot may add biweekly, monthly, or custom patterns.

## 3. Authorization Model

### 3.1 Role-Based Access

| Role | Mashwara creation | Occurrence management | Attendance marking | Karguzari edit (draft) | Decision/action-item creation | View access |
| --- | --- | --- | --- | --- | --- | --- |
| **Super Admin** | All cities | All | All | All | All | All |
| **City Head** | Own city only | Own city only | Own city only | Own city only | Own city only | Own city only |
| **Park Lead** | Denied | Denied | Denied | Denied | Denied | Own city Mashwara (read-only participant, if team member) |
| **Park Admin** | Denied | Denied | Denied | Denied | Denied | Own city Mashwara (read-only participant, if team member) |
| **Murabbi** | Denied | Denied | Denied | Denied | Denied | Own city Mashwara (read-only participant, if team member) |
| **Team member** | Denied | Denied | Denied | Denied | Denied (creation); update own-team or directly assigned items only | Own city Mashwara (read-only participant, if team member) |
| **Meeting share** | Denied | Denied | Denied | Denied | Denied | Specific occurrence only (read) |

### 3.2 Scoping Rules

- **Mashwara creation**: Requires `mashwara.manage` capability + server-side city derivation from actor's `StaffMeta` (`assignedCityId`, or city via `assignedParkId`, or city via `assignedGroupId`)
- **Occurrence management**: Requires `mashwara.manage` capability + Mashwara's `cityId` matches actor's derived city scope
- **Attendance marking**: City Head or Super Admin only; marked users must have active `StaffMeta` in the same derived city
- **Karguzari edit**: Only before finalization; requires `mashwara.manage` capability + derived city match
- **Decision/action-item creation**: City Head or Super Admin; action items assigned to users with `StaffMeta` team membership in the same derived city
- **Participant read access**: Automatic for all active users with `StaffMeta` in the Mashwara's city who are members of at least one collaboration team
- **Meeting-specific share**: City Head/Super Admin may grant temporary, audited, read-only access to a specific occurrence for a same-city active team member (user with `StaffMeta` and team membership)

### 3.3 Capability Requirements

Suggested new capabilities (to be added to Access Management):

- `mashwara.manage`: Create Mashwara, manage occurrences, finalize Karguzari (City Head default: own city only)
- `mashwara.attend`: Mark attendance for occurrences (City Head default: own city only)
- `mashwara.view`: Read access to Mashwara in scope (Team member default: own city only, restricted)

### 3.4 Share Authorization

- **Grant**: City Head or Super Admin only
- **Scope**: Share recipient must be active user with `StaffMeta` and team membership in the same city as the Mashwara
- **Duration**: Persists until explicitly revoked or occurrence is archived
- **Audit**: Every share grant and revocation is logged with actor, timestamp, and reason
- **Access level**: Read-only for the specific occurrence, Karguzari, decisions, and action items

## 4. Workflows

### 4.1 Create Recurring Mashwara

1. City Head navigates to Mashwara module
2. Click "Create New Mashwara"
3. Fill form:
   - Title (e.g., "Lahore Weekly Mashwara")
   - Purpose/description
   - Recurrence pattern (weekly, day of week, start date, time)
   - Optional: venue/location notes
4. System validates:
   - City Head has `mashwara.manage` capability
   - Server-side city derivation matches from actor's `StaffMeta`
5. Create `Mashwara` record with status `active`
6. Audit: log creation with actor and timestamp

### 4.2 Generate Occurrence

**Pilot scope**:
- **Manual only**: City Head manually creates each occurrence (scheduled or ad-hoc)
- Each occurrence starts with status `scheduled`

**Future enhancement**: Automated cron/scheduled task generation based on recurrence pattern (deferred post-pilot)

### 4.3 Mark Attendance

1. City Head opens a scheduled or completed occurrence
2. System displays list of all active users with `StaffMeta` in the city (filtered by role/team membership as needed)
3. City Head marks each person as:
   - Present
   - Absent
   - Excused
4. System validates:
   - Actor has `mashwara.attend` capability
   - Actor's derived city scope (from `StaffMeta`) matches Mashwara's `cityId`
   - Users being marked have active `StaffMeta` in the same city
5. Create/update `MashwaraAttendance` records with `recordedBy` and `recordedAt`
6. Audit: log attendance marking

### 4.4 Prepare Karguzari (MoM)

1. City Head opens a completed occurrence
2. Click "Prepare Karguzari"
3. Fill structured form:
   - Meeting summary
   - Key discussion points
   - Decisions (inline or linked)
   - Action items (inline or linked)
   - **Note**: Attachment support deferred to post-pilot
4. Save as draft (editable)
5. When ready, click "Finalize Karguzari"
6. System validates:
   - Actor has `mashwara.manage` capability
   - Occurrence status is `completed`
7. Finalize: Set `finalizedAt` timestamp, mark as immutable
8. Audit: log finalization with actor and timestamp

### 4.5 Record Decision

1. During or after an occurrence, City Head creates a decision
2. Fill form:
   - Title
   - Description/context
   - Decision owner (user with `StaffMeta` in the same city)
   - Due date (optional)
   - Status (pending/in-progress/completed)
3. System validates:
   - Actor has `mashwara.manage` capability
   - Decision owner has active `StaffMeta` in the same city
4. Create `MashwaraDecision` record with `recordedBy` and `recordedAt`
5. Audit: log decision creation

### 4.6 Create Action Item

1. From a decision or directly from an occurrence, City Head creates an action item
2. Fill form:
   - Title
   - Description
   - Assigned team (Sports, Skills, Tadreeb, Media, Muawin)
   - Assigned to (specific user with `StaffMeta` in that team, optional)
   - Due date
   - Priority (low/medium/high)
3. System validates:
   - Actor has `mashwara.manage` capability
   - Team exists in the system
   - If assignedTo is specified, user has active `StaffMeta` with membership in that team in the same city
4. Create `MashwaraActionItem` record with `createdBy` and `createdAt`
5. Audit: log action item creation

### 4.7 Grant Meeting-Specific Share

1. City Head opens an occurrence
2. Click "Grant Access"
3. Select user with `StaffMeta` and team membership from same-city active roster
4. Enter reason (optional but recommended)
5. System validates:
   - Actor has `mashwara.manage` capability or is Super Admin
   - Share recipient is active user with `StaffMeta` and team membership in the same city
   - No duplicate active share exists
6. Create `MashwaraMeetingShare` record with `grantedBy`, `grantedAt`, and `reason`
7. Audit: log share grant with full context

### 4.8 Revoke Meeting Share

1. City Head opens an occurrence
2. View active shares
3. Click "Revoke" on a share
4. Enter reason (optional)
5. System validates:
   - Actor has `mashwara.manage` capability or is Super Admin
   - Share exists and is not already revoked
6. Update `MashwaraMeetingShare`: set `revokedAt`, `revokedBy`, and `reason`
7. Audit: log revocation

## 5. UI Wireframe Concepts

### 5.1 Mashwara List (City Head)

- **Navigation**: Mashwara module in sidebar
- **View**: Table of active Mashwara in assigned city
  - Columns: Title, Recurrence, Next occurrence, Status
  - Actions: View, Edit (title/recurrence only), Archive
- **Create button**: "Create New Mashwara" (top-right)

### 5.2 Occurrence Calendar/List

- **View**: Calendar or chronological list of occurrences
  - Past occurrences: Show status (completed/cancelled), attendance summary, Karguzari status
  - Upcoming occurrences: Show scheduled date/time, venue notes
- **Actions per occurrence**:
  - View details
  - Mark attendance (if scheduled or completed)
  - Prepare/view Karguzari
  - Create decision
  - Create action item
  - Grant/revoke shares

### 5.3 Occurrence Detail Page

- **Header**: Occurrence date, status, venue notes
- **Tabs**:
  1. **Attendance**: List of users with `StaffMeta`, attendance status, mark controls (City Head only)
  2. **Karguzari**: View finalized MoM or draft form (City Head can edit draft)
  3. **Decisions**: List of decisions with owner, due date, status; create button
  4. **Action Items**: List of action items grouped by team; create button
  5. **Shares**: Active and revoked shares; grant/revoke controls (City Head only)

### 5.4 Participant View (Park Lead, Park Admin, Murabbi, Team Member)

- **Navigation**: Mashwara module in sidebar (read-only)
- **View**: List of city-scoped Mashwara and recent occurrences
  - Can view finalized Karguzari, decisions, and action items
  - Cannot edit or manage
- **Team member**: Can additionally update status of action items assigned to them or their team

### 5.5 Meeting-Specific Share View

- **Access**: If granted share, user sees occurrence in Mashwara list
- **View**: Read-only access to that specific occurrence's Karguzari, decisions, and action items
- **No editing or management**: Share is strictly read-only

## 6. Data Integrity & Constraints

### 6.1 Database Constraints

- `Mashwara.cityId`: Foreign key to `City`, NOT NULL
- `MashwaraOccurrence.mashwaraId`: Foreign key to `Mashwara`, NOT NULL
- `MashwaraOccurrence.scheduledDate`: NOT NULL
- `MashwaraAttendance.occurrenceId`: Foreign key to `MashwaraOccurrence`, NOT NULL
- `MashwaraAttendance.userId`: Foreign key to `User`, NOT NULL
- Unique index on `(occurrenceId, userId)` for attendance
- `Karguzari.occurrenceId`: Foreign key to `MashwaraOccurrence`, UNIQUE (one Karguzari per occurrence)
- `Karguzari.finalizedAt`: NULL if draft, NOT NULL when finalized
- `MashwaraDecision.occurrenceId`: Foreign key to `MashwaraOccurrence`, NOT NULL
- `MashwaraActionItem.teamId`: Foreign key to `CollaborationTeam`, NOT NULL
- `MashwaraMeetingShare.occurrenceId`: Foreign key to `MashwaraOccurrence`, NOT NULL
- `MashwaraMeetingShare.grantedToUserId`: Foreign key to `User`, NOT NULL
- Check constraint: `revokedAt` IS NULL OR `revokedAt` >= `grantedAt`

### 6.2 Immutability Rules

- **Finalized Karguzari**: Once `finalizedAt` is set, the record becomes immutable
- **Corrections**: If correction needed after finalization, City Head must create a separate correction note or decision record referencing the original occurrence
- **Decisions and action items**: Editable until completion; status transitions are audited

### 6.3 Cascade Behavior

- If `Mashwara` is archived, its occurrences remain visible (soft archive)
- If `User` is deactivated, their attendance records, decision ownership, and action item assignments persist (historical data)
- If `CollaborationTeam` is removed (future consideration), action items reference is preserved for audit

## 7. Migration & Deployment Strategy

### 7.1 Prerequisites

- Access Management (AM-001 through AM-005) must be complete and deployed
- Collaboration team schema and membership APIs must be complete
- City-scoped authorization must be stable and tested

### 7.2 Schema Migration

1. Create `Mashwara` table with indexes on `cityId` and `status`
2. Create `MashwaraOccurrence` table with indexes on `mashwaraId`, `scheduledDate`, and `status`
3. Create `MashwaraAttendance` table with composite unique index on `(occurrenceId, userId)`
4. Create `Karguzari` table with unique index on `occurrenceId`
5. Create `MashwaraDecision` table with index on `occurrenceId`
6. Create `MashwaraActionItem` table with indexes on `occurrenceId`, `teamId`, and `assignedTo`
7. Create `MashwaraMeetingShare` table with indexes on `occurrenceId` and `grantedToUserId`
8. Add foreign key constraints and check constraints
9. Align SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`) schemas

### 7.3 Capability Defaults

- Add `mashwara.manage`, `mashwara.attend`, `mashwara.view` to role capability defaults
- **Super Admin**: All Mashwara capabilities
- **City Head**: `mashwara.manage`, `mashwara.attend`, `mashwara.view` (city-scoped)
- **Park Lead, Park Admin, Murabbi**: `mashwara.view` (city-scoped, read-only participant, if team member)
- **Team member**: `mashwara.view` (city-scoped, read-only participant, if team member) + own-team action item update

### 7.4 Staging Rollout

1. Deploy schema migration to staging (PostgreSQL)
2. Verify capability defaults in staging
3. Create test Mashwara in Lahore city context
4. Test all workflows:
   - Mashwara creation
   - Manual occurrence creation
   - Attendance marking
   - Karguzari preparation and finalization
   - Decision recording
   - Action item assignment
   - Meeting share grant and revocation
   - Participant read access
5. Run authorization denial tests:
   - City Head cannot access other-city Mashwara
   - Park Lead cannot manage Mashwara
   - Team member cannot edit Karguzari or decisions
   - Meeting share recipient cannot edit occurrence
6. Audit log verification

### 7.5 Pilot Production Rollout

- Only after staging UAT passes and owner approves
- Coordinate with owner before creating first production Mashwara

## 8. Security & Privacy Considerations

### 8.1 Sensitive Data

- **Karguzari content**: May contain sensitive discussions; access restricted to city-scoped users with `StaffMeta` and team membership
- **Decisions**: May reference personnel, financial, or operational sensitive matters; city-scoped only
- **Action items**: Team-specific tasks; visible to team members but not externally
- **Meeting shares**: Audited and revocable to prevent unauthorized access leakage

### 8.2 Audit Requirements

All sensitive operations must be audited:

- Mashwara creation and archival
- Karguzari finalization
- Decision creation and status changes
- Action item creation and completion
- Meeting share grant and revocation

Audit logs must capture:

- Actor (userId)
- Timestamp
- Operation type
- Target entity (occurrenceId, decisionId, etc.)
- Optional: reason or context

### 8.3 Access Control Enforcement

- **Server-side only**: All authorization checks in API routes
- **Fail-closed**: Missing city scope (derived from `StaffMeta`) or capability denies access
- **Scope validation**: Every Mashwara/occurrence operation validates city match via server-side derivation
- **Share validation**: Meeting shares validated for same-city users with `StaffMeta` and team membership only

## 9. Testing Strategy

### 9.1 Unit Tests

- Authorization helpers: city-scoped Mashwara access via server-side `StaffMeta` derivation
- Recurrence pattern parser (weekly only for pilot)
- Karguzari finalization immutability
- Share grant/revoke logic

### 9.2 Integration Tests

- Mashwara CRUD with city-scoped authorization
- Manual occurrence creation and attendance marking
- Karguzari draft-to-finalized workflow
- Decision and action item creation with team linkage
- Meeting share grant/revoke with audit trail

### 9.3 Denial Tests

- City Head cannot access other-city Mashwara
- Park Lead cannot create Mashwara
- Murabbi cannot edit Karguzari
- Team member cannot manage occurrences
- Team member cannot create action items (only update own-team or directly assigned)
- Meeting share recipient cannot edit occurrence
- Finalized Karguzari cannot be edited

### 9.4 Browser UAT

- Full workflow execution in staging with test accounts
- Mobile responsiveness for Mashwara list and occurrence detail
- Verify audit logs appear correctly
- Test share grant/revoke from City Head account
- Verify participant read-only access from Park Lead with team membership account

## 10. Open Questions & Future Enhancements

### 10.1 Owner Decisions Required

**Pilot scope resolved**:
1. ✅ **Recurrence pattern**: Weekly only for pilot; manual occurrence creation
2. ✅ **Karguzari corrections**: Separate correction notes/decisions (no versioning)
3. ✅ **Cron/notifications/attachments**: Deferred to post-pilot

**Remaining owner decisions**:
1. **Action item workflow**: Should action items have formal review/approval by City Head before completion, or is team member self-reporting sufficient?

### 10.2 Future Enhancements (Post-MVP)

- **Automated occurrence generation**: Cron/scheduled task based on recurrence pattern
- **Notifications**: Occurrence reminders and action item due date alerts
- **Attachments**: File upload support for Karguzari (PDFs, images) with security review
- **Extended recurrence patterns**: Biweekly, monthly, custom
- **Cross-city Mashwara**: HQ-level recurring meetings with multi-city participation
- **Delegation**: City Head delegates Mashwara management to a Park Lead (audited, revocable)
- **Integration with Calling/Events**: Link Mashwara decisions to calling campaigns or event responsibilities
- **Export**: City Head exports Karguzari and decisions to PDF for offline record-keeping
- **Mobile app**: Dedicated mobile view for marking attendance and viewing Karguzari on field devices

## 11. Implementation Checklist

**Wave 3 Task Dependencies** (from `AGENT_EXECUTION_WORKFLOW.md`):

- [ ] `MASHWARA-301-REVISION` (this document): Final design revision - **Current Task**
- [ ] Owner review and approval of design
- [ ] `EVENT-302`: Event/responsibility schema (Codex) - Dependency for operational team context
- [ ] `MASHWARA-302`: Mashwara schema, lifecycle, and access implementation (Codex)
- [ ] `MASHWARA-303`: Mashwara UI (Gemini)

**Design Deliverables** (this task):

- [x] Core requirements and policy alignment
- [x] Data model with entities and relationships (User/StaffMeta references)
- [x] Authorization model with role-based access and server-side city derivation
- [x] Workflow definitions for all key operations (pilot scope: manual, weekly only)
- [x] UI wireframe concepts
- [x] Data integrity constraints
- [x] Migration and deployment strategy
- [x] Security and privacy considerations
- [x] Testing strategy
- [x] Owner decisions (pilot scope resolved; 1 remaining)

---

**Status**: Design revision complete, awaiting owner review and approval before `MASHWARA-302` implementation.
