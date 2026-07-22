# MASHWARA-302 Weekly Mashwara Module Implementation Plan

**Task ID:** `MASHWARA-302-IMPLEMENTATION-PLAN`
**Status:** `PROPOSED` (Implementation Plan Pending Owner Approval — No Code/Schema Edits Applied)
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`
**Source Specification:** `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` (Section 8.6.1) & Shabab 360 Access Agreements

---

## 1. Overview & Objective

This document provides the phased, implementation-ready execution plan for building the **Weekly Mashwara (Staff Consultation & Meeting) Module** in Shabab 360.

Mashwara is a recurring staff consultation meeting, not merely an attendance event. It establishes structured agendas, minutes of meeting (MoM / Karguzari), tracked action items with carry-forward capabilities, explicit per-meeting sharing grants, and immutable lifecycle review locking.

### Core Architectural Invariants
1. **StaffMeta Server-Side Scope Derivation:** Authorization and access MUST derive the user's city scope server-side from `StaffMeta` (`assignedCityId`, `assignedPark.cityId`, or `assignedGroup.park.cityId` / `assignedGroup.batch.cityId`). Request body or query parameters (`cityId`, `parkId`) only narrow filters and MUST NEVER expand authorized scope.
2. **City-Wide Restricted Access:** Active staff members in a city automatically receive restricted participant access to `CITY_WIDE` Mashwara meetings in their derived city (read meeting record, submit permitted own MoM entries, update assigned action items). City-wide access does NOT grant meeting lifecycle management, attendance marking, closing, or general administrative access.
3. **Per-Meeting Explicit Sharing Grants:** City Heads and Super Admins can explicitly share an individual Mashwara meeting with a specific active staff member in the same city via `MashwaraShareGrant`. Shares are revocable, auditable, and grant only the meeting-specific permissions recorded on the share without expanding role or organizational scope.
4. **Same-City Assignment Invariant:** Action items and meeting roles can ONLY be assigned to staff members whose derived city matches the meeting's `cityId`. Foreign city staff assignments are rejected with `403 Forbidden`.
5. **Lifecycle Lock:** Once a meeting reaches `REVIEWED_CLOSED`, meeting minutes, decisions, and attendance records are immutably locked against non-super-admin edits. Unresolved action items are carried forward to the next scheduled instance.
6. **In-App Notification Restriction:** Event and meeting notifications write strictly to `db.notification` (in-app). Push and Email channels remain disabled for the pilot.
7. **Additive Schema Changes:** All Prisma models and relations are 100% additive across both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`).

---

## 2. Exact Additive Prisma Model & Relation Changes

The schema modification adds 6 new models and 5 new enums to both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`). No existing fields or models are removed or renamed.

### 2.1 Additive Enums
```prisma
enum MashwaraScopeType {
  CITY_WIDE
  SINGLE_PARK
  TEAM_SCOPED
}

enum MashwaraStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  REVIEWED_CLOSED
  CANCELLED
}

enum ActionItemPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum ActionItemStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CARRIED_FORWARD
  CANCELLED
}

enum MashwaraSharePermission {
  READ_ONLY
  CONTRIBUTE_MOM
  ASSIGNED_TASK_ONLY
}
```

### 2.2 Additive Models
```prisma
model MashwaraMeeting {
  id              String             @id @default(cuid())
  title           String
  description     String?
  scopeType       MashwaraScopeType
  status          MashwaraStatus     @default(SCHEDULED)

  cityId          String
  city            City               @relation(fields: [cityId], references: [id], onDelete: Cascade)

  parkId          String?
  park            Park?              @relation(fields: [parkId], references: [id], onDelete: SetNull)

  teamId          String?
  team            CollaborationTeam? @relation(fields: [teamId], references: [id], onDelete: SetNull)

  scheduledAt     DateTime
  endedAt         DateTime?
  location        String?
  meetingLink     String?

  facilitatorId   String
  facilitator     User               @relation("MashwaraFacilitator", fields: [facilitatorId], references: [id])

  createdById     String
  createdBy       User               @relation("MashwaraCreator", fields: [createdById], references: [id])

  // Parent meeting for carry-forward tracking
  parentMeetingId String?
  parentMeeting   MashwaraMeeting?   @relation("MashwaraCarryForward", fields: [parentMeetingId], references: [id], onDelete: SetNull)
  childMeetings   MashwaraMeeting[]  @relation("MashwaraCarryForward")

  agendaItems     MashwaraAgendaItem[]
  momEntries      MashwaraMoMEntry[]
  actionItems     MashwaraActionItem[]
  attendance      MashwaraAttendanceRecord[]
  shares          MashwaraShareGrant[]

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([cityId])
  @@index([parkId])
  @@index([teamId])
  @@index([status])
  @@index([scheduledAt])
}

model MashwaraAgendaItem {
  id          String          @id @default(cuid())
  meetingId   String
  meeting     MashwaraMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  order       Int             @default(0)
  title       String
  description String?
  allocatedMins Int?

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([meetingId])
}

model MashwaraMoMEntry {
  id          String          @id @default(cuid())
  meetingId   String
  meeting     MashwaraMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  category    String          // e.g., "Progress", "Decision", "Blocker", "Risk"
  content     String

  authorId    String
  author      User            @relation("MoMAuthor", fields: [authorId], references: [id])

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([meetingId])
  @@index([authorId])
}

model MashwaraActionItem {
  id              String             @id @default(cuid())
  meetingId       String
  meeting         MashwaraMeeting    @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  title           String
  description     String?
  priority        ActionItemPriority @default(MEDIUM)
  status          ActionItemStatus   @default(OPEN)

  assigneeId      String?
  assignee        User?              @relation("ActionItemAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  teamId          String?
  team            CollaborationTeam? @relation(fields: [teamId], references: [id], onDelete: SetNull)

  dueDate         DateTime?
  completionNotes String?
  evidenceUrl     String?

  // Pointer to meeting where task was carried forward
  carriedToMeetingId String?

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([meetingId])
  @@index([assigneeId])
  @@index([teamId])
  @@index([status])
}

model MashwaraAttendanceRecord {
  id          String          @id @default(cuid())
  meetingId   String
  meeting     MashwaraMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  staffUserId String
  staffUser   User            @relation("MashwaraAttendee", fields: [staffUserId], references: [id], onDelete: Cascade)

  isPresent   Boolean         @default(true)
  notes       String?

  recordedById String
  recordedBy  User            @relation("MashwaraAttendanceRecorder", fields: [recordedById], references: [id])

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([meetingId, staffUserId])
  @@index([meetingId])
  @@index([staffUserId])
}

model MashwaraShareGrant {
  id          String                  @id @default(cuid())
  meetingId   String
  meeting     MashwaraMeeting         @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  userId      String
  user        User                    @relation("MashwaraShareRecipient", fields: [userId], references: [id], onDelete: Cascade)

  permission  MashwaraSharePermission @default(READ_ONLY)
  reason      String?

  grantedById String
  grantedBy   User                    @relation("MashwaraShareGranter", fields: [grantedById], references: [id])

  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  @@unique([meetingId, userId])
  @@index([meetingId])
  @@index([userId])
}
```

### 2.3 Additive Relations to Existing Models
- `City`: `mashwaraMeetings MashwaraMeeting[]`
- `Park`: `mashwaraMeetings MashwaraMeeting[]`
- `CollaborationTeam`: `mashwaraMeetings MashwaraMeeting[]`, `mashwaraActionItems MashwaraActionItem[]`
- `User`:
  - `facilitatedMashwaras MashwaraMeeting[] @relation("MashwaraFacilitator")`
  - `createdMashwaras MashwaraMeeting[] @relation("MashwaraCreator")`
  - `momEntries MashwaraMoMEntry[] @relation("MoMAuthor")`
  - `assignedMashwaraActionItems MashwaraActionItem[] @relation("ActionItemAssignee")`
  - `mashwaraAttendance MashwaraAttendanceRecord[] @relation("MashwaraAttendee")`
  - `recordedMashwaraAttendance MashwaraAttendanceRecord[] @relation("MashwaraAttendanceRecorder")`
  - `receivedMashwaraShares MashwaraShareGrant[] @relation("MashwaraShareRecipient")`
  - `grantedMashwaraShares MashwaraShareGrant[] @relation("MashwaraShareGranter")`

---

## 3. Capability Names & Server-Side Authorization Rules

New explicit capability strings will be registered in `src/lib/auth/scope.ts`:

| Capability | Description | Enforcement Rule |
| :--- | :--- | :--- |
| `mashwara:create` | Create a new meeting | `SUPER_ADMIN`, `CITY_HEAD` (city scope), `PARK_LEAD` (park scope) |
| `mashwara:manage_lifecycle` | Edit meeting details, advance status, or review/close | `SUPER_ADMIN`, `CITY_HEAD` (city scope), `PARK_LEAD` (park scope), Meeting Facilitator |
| `mashwara:take_attendance` | Mark staff attendance for meeting | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD` (own park meetings), Authorized Facilitator |
| `mashwara:contribute_mom` | Add MoM/Karguzari entry | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, Meeting Attendees, Shared Users (`CONTRIBUTE_MOM`), Active City Staff (`CITY_WIDE`) |
| `mashwara:manage_action_items` | Create or reassign action items | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, Facilitator |
| `mashwara:update_assigned_item`| Update completion status/notes on own assigned task | Assigned User, Assigned Team Member |
| `mashwara:share` | Grant or revoke per-meeting explicit share grant | `SUPER_ADMIN`, `CITY_HEAD` (own city meetings) |
| `mashwara:view_audit` | View meeting audit log | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |

---

## 4. Route-by-Route API Plan & Bounded Zod Schemas

All API routes live under `/api/mashwara/` and enforce strict input validation via Zod.

### 4.1 `POST /api/mashwara` (Create Meeting)
- **Authorization:** `mashwara:create`
- **Bounded Zod Input:**
```typescript
export const createMashwaraSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional(),
  scopeType: z.enum(["CITY_WIDE", "SINGLE_PARK", "TEAM_SCOPED"]),
  cityId: z.string().cuid(),
  parkId: z.string().cuid().optional(),
  teamId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  location: z.string().trim().max(200).optional(),
  meetingLink: z.string().url().max(300).optional(),
  facilitatorId: z.string().cuid(),
});
```
- **Validation Business Rules:**
  1. If `scopeType === SINGLE_PARK`, `parkId` is required and `park.cityId === cityId`.
  2. If `scopeType === TEAM_SCOPED`, `teamId` is required.
  3. Verify `facilitatorId` belongs to `cityId` via `deriveStaffCityId`.

### 4.2 `GET /api/mashwara` (List Meetings)
- **Authorization:** Authenticated user with scope derivation from `StaffMeta`.
- **Bounded Zod Input:**
```typescript
export const listMashwaraQuerySchema = paginatedQuerySchema({ maxPageSize: 50 }).extend({
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  scopeType: z.enum(["CITY_WIDE", "SINGLE_PARK", "TEAM_SCOPED"]).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED_CLOSED", "CANCELLED"]).optional(),
});
```
- **Scope Rule:** Server-side logic derives caller's city via `StaffMeta`.
  - For `CITY_WIDE` meetings: Includes all meetings where `meeting.cityId === callerCityId`.
  - For `SINGLE_PARK` meetings: Included if `caller.assignedParkId === meeting.parkId` or caller is `CITY_HEAD`.
  - For Shared meetings: Included if caller has an active `MashwaraShareGrant`.

### 4.3 `PATCH /api/mashwara/[id]` (Update / Advance Lifecycle)
- **Authorization:** `mashwara:manage_lifecycle`
- **Bounded Zod Input:**
```typescript
export const updateMashwaraSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED_CLOSED", "CANCELLED"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
  meetingLink: z.string().url().max(300).optional(),
  facilitatorId: z.string().cuid().optional(),
});
```
- **Lifecycle Rule:** If updating to `REVIEWED_CLOSED`, trigger carry-forward of unresolved `OPEN` / `IN_PROGRESS` action items to parent/child meeting. Lock meeting against further edits.

### 4.4 `POST /api/mashwara/[id]/mom` (Add MoM Entry)
- **Authorization:** `mashwara:contribute_mom`
- **Bounded Zod Input:**
```typescript
export const createMoMEntrySchema = z.object({
  category: z.string().trim().min(2).max(50),
  content: z.string().trim().min(2).max(2000),
});
```

### 4.5 `POST /api/mashwara/[id]/action-items` (Create / Assign Action Item)
- **Authorization:** `mashwara:manage_action_items`
- **Bounded Zod Input:**
```typescript
export const createActionItemSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().cuid().optional(),
  teamId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
});
```
- **Same-City Validation:** If `assigneeId` is provided, verify `deriveStaffCityId(assigneeId) === meeting.cityId`. Reject with `403 Forbidden` if foreign city staff.

### 4.6 `PATCH /api/mashwara/[id]/action-items/[itemId]` (Update Action Item Status)
- **Authorization:** `mashwara:update_assigned_item`
- **Bounded Zod Input:**
```typescript
export const updateActionItemSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CARRIED_FORWARD", "CANCELLED"]).optional(),
  completionNotes: z.string().trim().max(1000).optional(),
  evidenceUrl: z.string().url().max(300).optional(),
});
```

### 4.7 `POST /api/mashwara/[id]/share` (Grant Explicit Per-Meeting Access)
- **Authorization:** `mashwara:share`
- **Bounded Zod Input:**
```typescript
export const createMashwaraShareSchema = z.object({
  userId: z.string().cuid(),
  permission: z.enum(["READ_ONLY", "CONTRIBUTE_MOM", "ASSIGNED_TASK_ONLY"]).default("READ_ONLY"),
  reason: z.string().trim().max(200).optional(),
});
```
- **Same-City Validation:** Verify `deriveStaffCityId(userId) === meeting.cityId`. Share grants can ONLY target staff members in the same city. Reject with `403 Forbidden` if foreign city.

### 4.8 `DELETE /api/mashwara/[id]/share/[shareId]` (Revoke Share Grant)
- **Authorization:** `mashwara:share`

### 4.9 `POST /api/mashwara/[id]/attendance` (Mark Staff Attendance)
- **Authorization:** `mashwara:take_attendance`
- **Bounded Zod Input:**
```typescript
export const recordMashwaraAttendanceSchema = z.object({
  staffUserId: z.string().cuid(),
  isPresent: z.boolean(),
  notes: z.string().trim().max(200).optional(),
});
```

---

## 5. Invariant & Expiry Enforcement Engine

A dedicated helper module `src/lib/auth/mashwara-scope.ts` will provide reusable validation and derivation functions:

### 5.1 Staff City Derivation Function
```typescript
export async function deriveStaffCityId(db: PrismaClient, userId: string): Promise<string | null> {
  const staffMeta = await db.staffMeta.findUnique({
    where: { userId },
    select: {
      assignedCityId: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: {
        select: {
          park: { select: { cityId: true } },
          batch: { select: { cityId: true } },
        },
      },
    },
  });

  if (!staffMeta) return null;
  return (
    staffMeta.assignedCityId ||
    staffMeta.assignedPark?.cityId ||
    staffMeta.assignedGroup?.park?.cityId ||
    staffMeta.assignedGroup?.batch?.cityId ||
    null
  );
}
```

### 5.2 Same-City Hierarchy Validation Function
```typescript
export async function assertMashwaraCityInvariants(db: PrismaClient, params: {
  cityId: string;
  parkId?: string | null;
  targetUserId?: string;
}): Promise<void> {
  if (params.parkId) {
    const park = await db.park.findUnique({ where: { id: params.parkId }, select: { cityId: true } });
    if (!park || park.cityId !== params.cityId) {
      throw new ValidationError("Selected park does not belong to meeting city");
    }
  }
  if (params.targetUserId) {
    const targetCityId = await deriveStaffCityId(db, params.targetUserId);
    if (!targetCityId || targetCityId !== params.cityId) {
      throw new ForbiddenError("Target staff member does not belong to meeting city");
    }
  }
}
```

### 5.3 Meeting Authorization & Access Evaluator
```typescript
export async function canAccessMashwaraMeeting(db: PrismaClient, params: {
  meetingId: string;
  sessionUserId: string;
}): Promise<{ canAccess: boolean; isReadOnly: boolean; canManage: boolean }> {
  const meeting = await db.mashwaraMeeting.findUnique({
    where: { id: params.meetingId },
    select: { cityId: true, parkId: true, scopeType: true, facilitatorId: true, status: true }
  });
  if (!meeting) return { canAccess: false, isReadOnly: true, canManage: false };

  const callerCityId = await deriveStaffCityId(db, params.sessionUserId);
  if (!callerCityId || callerCityId !== meeting.cityId) {
    // Check if explicit share exists
    const share = await db.mashwaraShareGrant.findUnique({
      where: { meetingId_userId: { meetingId: params.meetingId, userId: params.sessionUserId } }
    });
    if (!share) return { canAccess: false, isReadOnly: true, canManage: false };
    return { canAccess: true, isReadOnly: share.permission === "READ_ONLY", canManage: false };
  }

  // Same city staff
  if (meeting.scopeType === "CITY_WIDE") {
    const isClosed = meeting.status === "REVIEWED_CLOSED";
    return { canAccess: true, isReadOnly: isClosed, canManage: params.sessionUserId === meeting.facilitatorId };
  }

  // Single park or team scoped
  const share = await db.mashwaraShareGrant.findUnique({
    where: { meetingId_userId: { meetingId: params.meetingId, userId: params.sessionUserId } }
  });

  return { canAccess: Boolean(share), isReadOnly: meeting.status === "REVIEWED_CLOSED", canManage: false };
}
```

---

## 6. In-App Notification Channel Enforcement

- All notification dispatches for Mashwara meetings (task assignments, meeting reminders, MoM publications) call `db.notification.create()` directly for in-app delivery.
- Push and Email channels remain explicitly blocked at runtime:
```typescript
if (channel !== "IN_APP") {
  throw new ValidationError("Only IN_APP notifications are supported for the Mashwara module pilot");
}
```

---

## 7. Migration, Rollback & Test Plan

### 7.1 Staging Backup & Rollback Protocol
- **Pre-Migration Gate:** Before executing `prisma migrate deploy` on staging, run a verified full database snapshot.
- **Rollback Protocol:** In case of deployment failure:
  > **Rollback Rule:** Restore the verified pre-migration staging backup. Reverse SQL migrations are strictly forbidden.

### 7.2 Test Matrix & Quality Gates
Before marking tasks complete, the implementation must pass:
1. `npm run typecheck`
2. `npm run lint`
3. Focused Jest/Vitest test suites:
   - **Denial Tests:** Foreign city staff task assignment rejection (`403 Forbidden`), foreign city share grant rejection (`403 Forbidden`), cross-city meeting view denial (`403 Forbidden`), Park Admin attempt to review/close city Mashwara (`403 Forbidden`).
   - **Lifecycle Tests:** Transitions `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED` -> `REVIEWED_CLOSED`. Verification that `REVIEWED_CLOSED` locks MoM entries against edits and carries forward open action items.
   - **Privacy & Sharing Tests:** Explicit share grant enables access for designated meeting only; revocation of share grant immediately terminates access.
   - **StaffMeta Derivation Tests:** Scope derivation via `assignedCityId`, `assignedPark.cityId`, and `assignedGroup.park.cityId` / `assignedGroup.batch.cityId`.

---

## 8. Independent Execution Breakdown

Work is divided into 8 atomic, independently reviewable subtasks:

```
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302A: Prisma Additive Schema (Dual DB Sync)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302B: Scope Derivation & Invariant Engine    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302C: Meeting Lifecycle & CRUD API Routes    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302D: Agenda & MoM/Karguzari API Routes      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302E: Action Items & Carry-Forward Engine    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302F: Explicit Member Sharing Grants API     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302G: In-App Notifications & Audit Logger    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302H: End-to-End Denial & Privacy Tests      │
└──────────────────────────┴─────────────────────────────┘
```

1. **`MASHWARA-302A`**: Add additive models & enums to `prisma/schema.prisma` and `prisma/postgres/schema.prisma`.
2. **`MASHWARA-302B`**: Implement `src/lib/auth/mashwara-scope.ts` with `deriveStaffCityId`, `assertMashwaraCityInvariants`, and access evaluators.
3. **`MASHWARA-302C`**: Implement `/api/mashwara` (POST, GET, PATCH) routes with Zod validation.
4. **`MASHWARA-302D`**: Implement `/api/mashwara/[id]/agenda` and `/api/mashwara/[id]/mom` routes.
5. **`MASHWARA-302E`**: Implement `/api/mashwara/[id]/action-items` with carry-forward logic on meeting review/close.
6. **`MASHWARA-302F`**: Implement `/api/mashwara/[id]/share` (POST, DELETE) for explicit member sharing grants.
7. **`MASHWARA-302G`**: Implement in-app notification dispatcher for Mashwara tasks & audit logger.
8. **`MASHWARA-302H`**: Comprehensive unit & integration test suite for denial, lifecycle review lock, and privacy bounds.
