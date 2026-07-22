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
  participant-level access to city-scoped Mashwara
- **Meeting-specific share**: City Heads/HQ may grant revocable, audited,
  meeting-specific share to selected same-city active team member without
  changing general scope

### 1.2 Design Principles

1. **Immutable review/audit behavior**: Once finalized, Karguzari and decisions
   cannot be edited; corrections require new entries with references
2. **Fail-closed authorization**: Missing city scope denies access
3. **No role expansion**: Team membership provides collaboration context only,
   never broader system access
4. **Audit trail**: All sensitive operations (shares, decisions, action items)
   are logged with actor, timestamp, and context

## 2. Data Model

### 2.1 Core Entities

| Entity | Purpose | Key attributes |
| --- | --- | --- |
| `Mashwara` | Recurring meeting definition | `cityId`, `title`, `purpose`, `recurrencePattern`, `status` (active/archived) |
| `MashwaraOccurrence` | Single meeting instance | `mashwaraId`, `scheduledDate`, `actualDate`, `status` (scheduled/completed/cancelled), `venueNotes` |
| `MashwaraAttendance` | Who attended an occurrence | `occurrenceId`, `staffId`, `attendanceStatus` (present/absent/excused), `recordedAt`, `recordedBy` |
| `Karguzari` | Meeting minutes/MoM | `occurrenceId`, `content`, `preparedBy`, `reviewedBy`, `finalizedAt`, `version` |
| `MashwaraDecision` | Captured decision | `occurrenceId`, `title`, `description`, `decisionOwner` (staffId), `dueDate`, `status`, `recordedBy`, `recordedAt` |
| `MashwaraActionItem` | Team task from meeting | `decisionId` (optional), `occurrenceId`, `teamId` (Sports/Skills/etc), `assignedTo` (staffId, optional), `title`, `description`, `dueDate`, `priority`, `status`, `createdBy`, `completedAt` |
| `MashwaraMeetingShare` | Audited guest access | `occurrenceId`, `grantedToStaffId`, `grantedBy`, `grantedAt`, `revokedAt`, `revokedBy`, `reason` |

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
Staff 1──* MashwaraAttendance
Staff 1──* MashwaraActionItem (assignedTo)
```

### 2.3 Recurrence Pattern

Mashwara typically occurs weekly. Store recurrence as JSON or structured field:

```typescript
interface RecurrencePattern {
  frequency: 'weekly' | 'biweekly' | 'monthly'; // extensible
  dayOfWeek?: number; // 0=Sunday, 6=Saturday (for weekly)
  startDate: string; // ISO date
  endDate?: string; // optional end
  timeOfDay?: string; // e.g., "19:00" local time
}
```

## 3. Authorization Model

### 3.1 Role-Based Access

| Role | Mashwara creation | Occurrence management | Attendance marking | Karguzari edit (draft) | Decision/action-item creation | View access |
| --- | --- | --- | --- | --- | --- | --- |
| **Super Admin** | All cities | All | All | All | All | All |
| **City Head** | Own city only | Own city only | Own city only | Own city only | Own city only | Own city only |
| **Park Lead** | Denied | Denied | Denied | Denied | Denied | Own city Mashwara (read-only participant) |
| **Park Admin** | Denied | Denied | Denied | Denied | Denied | Own city Mashwara (read-only participant) |
| **Murabbi** | Denied | Denied | Denied | Denied | Denied | Own city Mashwara (read-only participant) |
| **Team member** | Denied | Denied | Denied | Denied | Own-team action items only | Own city Mashwara (read-only participant) |
| **Meeting share** | Denied | Denied | Denied | Denied | Denied | Specific occurrence only (read) |

### 3.2 Scoping Rules

- **Mashwara creation**: Requires `city` capability + `assignedCityId` match (or Super Admin)
- **Occurrence management**: Requires `city` capability + Mashwara's `cityId` match
- **Attendance marking**: City Head or Super Admin only; staff must be active in the same city
- **Karguzari edit**: Only before finalization; requires `city` capability
- **Decision/action-item**: City Head or Super Admin; action items assigned to team members in the same city
- **Participant read access**: Automatic for all active staff in the Mashwara's city who are members of at least one collaboration team
- **Meeting-specific share**: City Head/Super Admin may grant temporary, audited, read-only access to a specific occurrence for a same-city staff member

### 3.3 Capability Requirements

Suggested new capabilities (to be added to Access Management):

- `mashwara.manage`: Create Mashwara, manage occurrences, finalize Karguzari (City Head default: own city only)
- `mashwara.attend`: Mark attendance for occurrences (City Head default: own city only)
- `mashwara.view`: Read access to Mashwara in scope (Team member default: own city only, restricted)

### 3.4 Share Authorization

- **Grant**: City Head or Super Admin only
- **Scope**: Share recipient must be active staff in the same city as the Mashwara
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
   - Recurrence pattern (frequency, day of week, start date, time)
   - Optional: venue/location notes
4. System validates:
   - City Head has `mashwara.manage` capability
   - `assignedCityId` matches
5. Create `Mashwara` record with status `active`
6. Audit: log creation with actor and timestamp

### 4.2 Generate Occurrence

- **Automatic**: Cron job or scheduled task generates upcoming occurrences based on recurrence pattern
- **Manual**: City Head can manually create an ad-hoc occurrence
- Each occurrence starts with status `scheduled`

### 4.3 Mark Attendance

1. City Head opens a scheduled or completed occurrence
2. System displays list of all active staff in the city (filtered by role/team membership as needed)
3. City Head marks each person as:
   - Present
   - Absent
   - Excused
4. System validates:
   - Actor has `mashwara.attend` capability
   - Actor's `assignedCityId` matches Mashwara's `cityId`
   - Staff being marked are active in the same city
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
   - Optional: attachments/references
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
   - Decision owner (staff member in the same city)
   - Due date (optional)
   - Status (pending/in-progress/completed)
3. System validates:
   - Actor has `mashwara.manage` capability
   - Decision owner is active staff in the same city
4. Create `MashwaraDecision` record with `recordedBy` and `recordedAt`
5. Audit: log decision creation

### 4.6 Create Action Item

1. From a decision or directly from an occurrence, City Head creates an action item
2. Fill form:
   - Title
   - Description
   - Assigned team (Sports, Skills, Tadreeb, Media, Muawin)
   - Assigned to (specific staff member in that team, optional)
   - Due date
   - Priority (low/medium/high)
3. System validates:
   - Actor has `mashwara.manage` capability
   - Team exists in the system
   - If assignedTo is specified, staff is active member of that team in the same city
4. Create `MashwaraActionItem` record with `createdBy` and `createdAt`
5. Audit: log action item creation

### 4.7 Grant Meeting-Specific Share

1. City Head opens an occurrence
2. Click "Grant Access"
3. Select staff member from same-city active roster
4. Enter reason (optional but recommended)
5. System validates:
   - Actor has `mashwara.manage` capability or is Super Admin
   - Share recipient is active staff in the same city
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
  1. **Attendance**: List of staff with attendance status, mark controls (City Head only)
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

- **Access**: If granted share, staff sees occurrence in Mashwara list
- **View**: Read-only access to that specific occurrence's Karguzari, decisions, and action items
- **No editing or management**: Share is strictly read-only

## 6. Data Integrity & Constraints

### 6.1 Database Constraints

- `Mashwara.cityId`: Foreign key to `City`, NOT NULL
- `MashwaraOccurrence.mashwaraId`: Foreign key to `Mashwara`, NOT NULL
- `MashwaraOccurrence.scheduledDate`: NOT NULL
- `MashwaraAttendance.occurrenceId`: Foreign key to `MashwaraOccurrence`, NOT NULL
- `MashwaraAttendance.staffId`: Foreign key to `Staff`, NOT NULL
- Unique index on `(occurrenceId, staffId)` for attendance
- `Karguzari.occurrenceId`: Foreign key to `MashwaraOccurrence`, UNIQUE (one Karguzari per occurrence)
- `Karguzari.finalizedAt`: NULL if draft, NOT NULL when finalized
- `MashwaraDecision.occurrenceId`: Foreign key to `MashwaraOccurrence`, NOT NULL
- `MashwaraActionItem.teamId`: Foreign key to `CollaborationTeam`, NOT NULL
- `MashwaraMeetingShare.occurrenceId`: Foreign key to `MashwaraOccurrence`, NOT NULL
- `MashwaraMeetingShare.grantedToStaffId`: Foreign key to `Staff`, NOT NULL
- Check constraint: `revokedAt` IS NULL OR `revokedAt` >= `grantedAt`

### 6.2 Immutability Rules

- **Finalized Karguzari**: Once `finalizedAt` is set, `content`, `preparedBy`, `reviewedBy` become read-only
- **Corrections**: If correction needed, create a new `Karguzari` with incremented `version` and reference to original
- **Decisions and action items**: Editable until completion; status transitions are audited

### 6.3 Cascade Behavior

- If `Mashwara` is archived, its occurrences remain visible (soft archive)
- If `Staff` is deactivated, their attendance records, decision ownership, and action item assignments persist (historical data)
- If `CollaborationTeam` is removed (future consideration), action items reference is preserved for audit

## 7. Migration & Deployment Strategy

### 7.1 Prerequisites

- Access Management (AM-001 through AM-005) must be complete and deployed
- Collaboration team schema and membership APIs must be complete
- City-scoped authorization must be stable and tested

### 7.2 Schema Migration

1. Create `Mashwara` table with indexes on `cityId` and `status`
2. Create `MashwaraOccurrence` table with indexes on `mashwaraId`, `scheduledDate`, and `status`
3. Create `MashwaraAttendance` table with composite unique index on `(occurrenceId, staffId)`
4. Create `Karguzari` table with unique index on `occurrenceId`
5. Create `MashwaraDecision` table with index on `occurrenceId`
6. Create `MashwaraActionItem` table with indexes on `occurrenceId`, `teamId`, and `assignedTo`
7. Create `MashwaraMeetingShare` table with indexes on `occurrenceId` and `grantedToStaffId`
8. Add foreign key constraints and check constraints
9. Align SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`) schemas

### 7.3 Capability Defaults

- Add `mashwara.manage`, `mashwara.attend`, `mashwara.view` to role capability defaults
- **Super Admin**: All Mashwara capabilities
- **City Head**: `mashwara.manage`, `mashwara.attend`, `mashwara.view` (city-scoped)
- **Park Lead, Park Admin, Murabbi**: `mashwara.view` (city-scoped, read-only participant)
- **Team member**: `mashwara.view` (city-scoped, read-only participant) + own-team action item update

### 7.4 Staging Rollout

1. Deploy schema migration to staging (PostgreSQL)
2. Verify capability defaults in staging
3. Create test Mashwara in Lahore city context
4. Test all workflows:
   - Mashwara creation
   - Occurrence generation
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

- **Karguzari content**: May contain sensitive discussions; access restricted to city-scoped staff
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

- Actor (staffId)
- Timestamp
- Operation type
- Target entity (occurrenceId, decisionId, etc.)
- Optional: reason or context

### 8.3 Access Control Enforcement

- **Server-side only**: All authorization checks in API routes
- **Fail-closed**: Missing `assignedCityId` or capability denies access
- **Scope validation**: Every Mashwara/occurrence operation validates city match
- **Share validation**: Meeting shares validated for same-city staff only

## 9. Testing Strategy

### 9.1 Unit Tests

- Authorization helpers: city-scoped Mashwara access
- Recurrence pattern parser and occurrence generation
- Karguzari finalization immutability
- Share grant/revoke logic

### 9.2 Integration Tests

- Mashwara CRUD with city-scoped authorization
- Occurrence creation and attendance marking
- Karguzari draft-to-finalized workflow
- Decision and action item creation with team linkage
- Meeting share grant/revoke with audit trail

### 9.3 Denial Tests

- City Head cannot access other-city Mashwara
- Park Lead cannot create Mashwara
- Murabbi cannot edit Karguzari
- Team member cannot manage occurrences
- Meeting share recipient cannot edit occurrence
- Finalized Karguzari cannot be edited

### 9.4 Browser UAT

- Full workflow execution in staging with test accounts
- Mobile responsiveness for Mashwara list and occurrence detail
- Verify audit logs appear correctly
- Test share grant/revoke from City Head account
- Verify participant read-only access from Park Lead account

## 10. Open Questions & Future Enhancements

### 10.1 Owner Decisions Required

1. **Recurrence pattern flexibility**: Should Mashwara support monthly, ad-hoc, or custom recurrence beyond weekly?
2. **Karguzari versioning**: If correction needed after finalization, should we support versioned Karguzari or require a separate correction note?
3. **Action item workflow**: Should action items have formal review/approval by City Head before completion, or is team member self-reporting sufficient?
4. **Notification**: Should Mashwara occurrence reminders and action item due dates trigger in-app notifications or email?
5. **Attachment support**: Should Karguzari support file attachments (PDFs, images)? If yes, security and storage implications need review.

### 10.2 Future Enhancements (Post-MVP)

- **Cross-city Mashwara**: HQ-level recurring meetings with multi-city participation
- **Delegation**: City Head delegates Mashwara management to a Park Lead (audited, revocable)
- **Integration with Calling/Events**: Link Mashwara decisions to calling campaigns or event responsibilities
- **Export**: City Head exports Karguzari and decisions to PDF for offline record-keeping
- **Mobile app**: Dedicated mobile view for marking attendance and viewing Karguzari on field devices

## 11. Implementation Checklist

**Wave 3 Task Dependencies** (from `AGENT_EXECUTION_WORKFLOW.md`):

- [ ] `MASHWARA-301` (this document): Final design revision - **Current Task**
- [ ] Owner review and approval of design
- [ ] `EVENT-302`: Event/responsibility schema (Codex) - Dependency for operational team context
- [ ] `MASHWARA-302`: Mashwara schema, lifecycle, and access implementation (Codex)
- [ ] `MASHWARA-303`: Mashwara UI (Gemini)

**Design Deliverables** (this task):

- [x] Core requirements and policy alignment
- [x] Data model with entities and relationships
- [x] Authorization model with role-based access
- [x] Workflow definitions for all key operations
- [x] UI wireframe concepts
- [x] Data integrity constraints
- [x] Migration and deployment strategy
- [x] Security and privacy considerations
- [x] Testing strategy
- [x] Open questions for owner decisions

---

**Status**: Design complete, awaiting owner review and approval before `MASHWARA-302` implementation.
