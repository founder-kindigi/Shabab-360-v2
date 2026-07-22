# MASHWARA-302 Weekly Mashwara Module Implementation Plan

**Task ID:** `MASHWARA-302-IMPLEMENTATION-PLAN`
**Status:** `PROPOSED` (Implementation Plan Pending Owner Approval — No Code/Schema Edits Applied)
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`
**Source Specification:** `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` (Section 8.6.1) & Shabab 360 Access Agreements

---

## 1. Overview & Objective

This document provides the phased, implementation-ready execution plan for building the **Weekly Mashwara (Staff Consultation & Meeting) Module** in Shabab 360.

Mashwara is a recurring staff consultation meeting, not merely an attendance event. It establishes recurring meeting series (`MashwaraSeries`), structured agendas, minutes of meeting (MoM / Karguzari), tracked action items with idempotent carry-forward capabilities across occurrences of the same series, explicit per-meeting sharing grants, and immutable lifecycle review locking (`DRAFT` -> `IN_PROGRESS` -> `REVIEW` -> `CLOSED` -> `REOPENED`).

### Core Architectural Invariants
1. **StaffMeta Server-Side Scope Derivation:** Authorization and access MUST derive the user's city scope server-side from `StaffMeta` (`assignedCityId`, `assignedPark.cityId`, or `assignedGroup.park.cityId` / `assignedGroup.batch.cityId`). Request body or query parameters (`cityId`, `parkId`) only narrow filters and MUST NEVER expand authorized scope.
2. **Series Recurrence & Carry-Forward Boundary:** Meetings belong to a recurring `MashwaraSeries`. Carry-forward of unresolved action items upon meeting closure targets ONLY the next occurrence of the **exact same `seriesId`**. Carry-forward execution is strictly idempotent to prevent duplicate tasks on retry.
3. **City-Wide Restricted Access:** Active staff members in a city automatically receive restricted participant access to `CITY_WIDE` Mashwara meetings in their derived city (read meeting record, submit permitted own MoM entries, update assigned action items). City-wide access does NOT grant meeting lifecycle management, attendance marking, closing, or general administrative access.
4. **Per-Meeting Explicit Sharing Grants:** City Heads and Super Admins can explicitly share an individual Mashwara meeting with a specific active staff member in the same city via `MashwaraShareGrant`. Shares are revocable, auditable, and grant only the meeting-specific permissions recorded on the share without expanding role or organizational scope.
5. **Same-City Assignment & Series Invariant:** Series, meetings, action items, and meeting roles can ONLY be assigned to staff members whose derived city matches the series/meeting `cityId`. Cross-city series or meeting membership is strictly prohibited (`403 Forbidden`).
6. **Approved Lifecycle & Immutable History Rule:**
   - Approved lifecycle states: `DRAFT` -> `IN_PROGRESS` -> `REVIEW` -> `CLOSED` -> `REOPENED` (and `CANCELLED`).
   - Once a meeting reaches `CLOSED`, meeting history (agendas, MoM entries, attendance) is immutably locked against non-super-admin edits.
   - Reopening a closed meeting is restricted exclusively to `SUPER_ADMIN` and `CITY_HEAD` (own city). Reopening appends an immutable audit log entry; original MoM entries and author timestamps remain unmodified.
7. **In-App Notification Restriction:** Event and meeting notifications write strictly to `db.notification` (in-app). Push and Email channels remain disabled for the pilot.
8. **Additive Schema Changes:** All Prisma models and relations are 100% additive across both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`).

---

## 2. Exact Additive Prisma Model & Relation Changes

The schema modification adds 7 new models and 6 new enums to both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`). No existing fields or models are removed or renamed.

### 2.1 Additive Enums
```prisma
enum MashwaraScopeType {
  CITY_WIDE
  SINGLE_PARK
  TEAM_SCOPED
}

enum RecurrenceFrequency {
  WEEKLY
  BIWEEKLY
  MONTHLY
  CUSTOM
}

enum MashwaraStatus {
  DRAFT
  IN_PROGRESS
  REVIEW
  CLOSED
  REOPENED
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
model MashwaraSeries {
  id           String              @id @default(cuid())
  title        String
  description  String?
  scopeType    MashwaraScopeType
  frequency    RecurrenceFrequency @default(WEEKLY)
  dayOfWeek    Int?                // 0 (Sun) to 6 (Sat)
  timeOfDay    String?             // "18:00"

  cityId       String
  city         City                @relation(fields: [cityId], references: [id], onDelete: Cascade)

  parkId       String?
  park         Park?               @relation(fields: [parkId], references: [id], onDelete: SetNull)

  teamId       String?
  team         CollaborationTeam?  @relation(fields: [teamId], references: [id], onDelete: SetNull)

  createdById  String
  createdBy    User                @relation("SeriesCreator", fields: [createdById], references: [id])

  meetings     MashwaraMeeting[]

  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  @@index([cityId])
  @@index([parkId])
  @@index([teamId])
}

model MashwaraMeeting {
  id              String             @id @default(cuid())
  seriesId        String?
  series          MashwaraSeries?    @relation(fields: [seriesId], references: [id], onDelete: SetNull)
  occurrenceIndex Int?

  title           String
  description     String?
  scopeType       MashwaraScopeType
  status          MashwaraStatus     @default(DRAFT)

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

  @@index([seriesId])
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
  id              String          @id @default(cuid())
  meetingId       String
  meeting         MashwaraMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  category        String          // e.g., "Progress", "Decision", "Blocker", "Risk"
  content         String
  isReopenedEntry Boolean         @default(false)

  authorId        String
  author          User            @relation("MoMAuthor", fields: [authorId], references: [id])

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([meetingId])
  @@index([authorId])
}

model MashwaraActionItem {
  id                 String             @id @default(cuid())
  meetingId          String
  meeting            MashwaraMeeting    @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  title              String
  description        String?
  priority           ActionItemPriority @default(MEDIUM)
  status             ActionItemStatus   @default(OPEN)

  assigneeId         String?
  assignee           User?              @relation("ActionItemAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  teamId             String?
  team               CollaborationTeam? @relation(fields: [teamId], references: [id], onDelete: SetNull)

  dueDate            DateTime?
  completionNotes    String?
  evidenceUrl        String?

  // Pointer to meeting where task was carried forward
  carriedToMeetingId String?
  carriedFromItemId  String?

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([meetingId])
  @@index([assigneeId])
  @@index([teamId])
  @@index([status])
  @@index([carriedFromItemId])
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
- `City`: `mashwaraSeries MashwaraSeries[]`, `mashwaraMeetings MashwaraMeeting[]`
- `Park`: `mashwaraSeries MashwaraSeries[]`, `mashwaraMeetings MashwaraMeeting[]`
- `CollaborationTeam`: `mashwaraSeries MashwaraSeries[]`, `mashwaraMeetings MashwaraMeeting[]`, `mashwaraActionItems MashwaraActionItem[]`
- `User`:
  - `createdSeries MashwaraSeries[] @relation("SeriesCreator")`
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
| `mashwara:create_series` | Create recurring meeting series | `SUPER_ADMIN`, `CITY_HEAD` (city scope), `PARK_LEAD` (park scope) |
| `mashwara:create_meeting` | Create/schedule meeting instance | `SUPER_ADMIN`, `CITY_HEAD` (city scope), `PARK_LEAD` (park scope) |
| `mashwara:manage_lifecycle` | Edit details, advance state (`DRAFT` -> `IN_PROGRESS` -> `REVIEW` -> `CLOSED`) | `SUPER_ADMIN`, `CITY_HEAD` (city scope), `PARK_LEAD` (park scope), Meeting Facilitator |
| `mashwara:reopen` | Reopen a `CLOSED` meeting | `SUPER_ADMIN`, `CITY_HEAD` (own city ONLY). All other roles denied (`403 Forbidden`). |
| `mashwara:take_attendance` | Mark staff attendance for meeting | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD` (own park meetings), Authorized Facilitator |
| `mashwara:contribute_mom` | Add MoM/Karguzari entry | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, Meeting Attendees, Shared Users (`CONTRIBUTE_MOM`), Active City Staff (`CITY_WIDE`) |
| `mashwara:manage_action_items` | Create or reassign action items | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, Facilitator |
| `mashwara:update_assigned_item`| Update completion status/notes on own assigned task | Assigned User, Assigned Team Member |
| `mashwara:share` | Grant or revoke per-meeting explicit share grant | `SUPER_ADMIN`, `CITY_HEAD` (own city meetings) |
| `mashwara:view_audit` | View meeting audit log | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |

---

## 4. Route-by-Route API Plan & Bounded Zod Schemas

All API routes live under `/api/mashwara/` and enforce strict input validation via Zod.

### 4.1 `POST /api/mashwara/series` (Create Meeting Series)
- **Authorization:** `mashwara:create_series`
- **Bounded Zod Input:**
```typescript
export const createMashwaraSeriesSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional(),
  scopeType: z.enum(["CITY_WIDE", "SINGLE_PARK", "TEAM_SCOPED"]),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]).default("WEEKLY"),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  cityId: z.string().cuid(),
  parkId: z.string().cuid().optional(),
  teamId: z.string().cuid().optional(),
});
```

### 4.2 `POST /api/mashwara` (Create Meeting Instance)
- **Authorization:** `mashwara:create_meeting`
- **Bounded Zod Input:**
```typescript
export const createMashwaraSchema = z.object({
  seriesId: z.string().cuid().optional(),
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
  1. If `seriesId` provided, verify `series.cityId === cityId`. Cross-city series meeting creation is rejected with `403 Forbidden`.
  2. Derive `occurrenceIndex` automatically from `count(meetings in series) + 1`.

### 4.3 `GET /api/mashwara` (List Meetings)
- **Authorization:** Authenticated user with scope derivation from `StaffMeta`.
- **Bounded Zod Input:**
```typescript
export const listMashwaraQuerySchema = paginatedQuerySchema({ maxPageSize: 50 }).extend({
  seriesId: z.string().cuid().optional(),
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  scopeType: z.enum(["CITY_WIDE", "SINGLE_PARK", "TEAM_SCOPED"]).optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "REVIEW", "CLOSED", "REOPENED", "CANCELLED"]).optional(),
});
```

### 4.4 `PATCH /api/mashwara/[id]` (Update / Advance Approved Lifecycle)
- **Authorization:** `mashwara:manage_lifecycle` (or `mashwara:reopen` if `status === REOPENED`)
- **Bounded Zod Input:**
```typescript
export const updateMashwaraSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "REVIEW", "CLOSED", "REOPENED", "CANCELLED"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
  meetingLink: z.string().url().max(300).optional(),
  facilitatorId: z.string().cuid().optional(),
});
```
- **Approved Lifecycle State Logic:**
  - `DRAFT` -> `IN_PROGRESS`: Live meeting session begins.
  - `IN_PROGRESS` -> `REVIEW`: Session concludes, minutes in review.
  - `REVIEW` -> `CLOSED`: Minutes finalized. Meeting history becomes **immutable**. Triggers **idempotent carry-forward** of unresolved `OPEN` / `IN_PROGRESS` action items to the next scheduled occurrence of the **exact same `seriesId`**.
  - `CLOSED` -> `REOPENED`: Restricted to `SUPER_ADMIN` and `CITY_HEAD` (own city) ONLY. Does not mutate historic entries; appends audit log and marks new MoM additions with `isReopenedEntry = true`.

### 4.5 `POST /api/mashwara/[id]/mom` (Add MoM Entry)
- **Authorization:** `mashwara:contribute_mom`
- **Bounded Zod Input:**
```typescript
export const createMoMEntrySchema = z.object({
  category: z.string().trim().min(2).max(50),
  content: z.string().trim().min(2).max(2000),
});
```

### 4.6 `POST /api/mashwara/[id]/action-items` (Create / Assign Action Item)
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
- **Same-City Validation:** Verify `deriveStaffCityId(assigneeId) === meeting.cityId`. Reject foreign city staff assignments with `403 Forbidden`.

### 4.7 `PATCH /api/mashwara/[id]/action-items/[itemId]` (Update Action Item Status)
- **Authorization:** `mashwara:update_assigned_item`

### 4.8 `POST /api/mashwara/[id]/share` (Grant Explicit Per-Meeting Access)
- **Authorization:** `mashwara:share`

---

## 5. Invariant, Recurrence Series & Carry-Forward Engine

A dedicated helper module `src/lib/auth/mashwara-scope.ts` will provide reusable validation, series traversal, and carry-forward functions:

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

### 5.2 Idempotent Carry-Forward Engine
```typescript
export async function carryForwardUnresolvedActionItems(
  db: PrismaClient,
  meetingId: string
): Promise<{ carriedCount: number; targetMeetingId: string | null }> {
  const currentMeeting = await db.mashwaraMeeting.findUnique({
    where: { id: meetingId },
    select: { id: true, seriesId: true, scheduledAt: true, cityId: true }
  });

  if (!currentMeeting || !currentMeeting.seriesId) {
    return { carriedCount: 0, targetMeetingId: null };
  }

  // Find next occurrence in the EXACT SAME SERIES
  const nextMeeting = await db.mashwaraMeeting.findFirst({
    where: {
      seriesId: currentMeeting.seriesId,
      cityId: currentMeeting.cityId, // Ensure strict same-city boundary
      scheduledAt: { gt: currentMeeting.scheduledAt },
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (!nextMeeting) {
    return { carriedCount: 0, targetMeetingId: null };
  }

  // Fetch open/in-progress action items
  const openItems = await db.mashwaraActionItem.findMany({
    where: {
      meetingId: currentMeeting.id,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });

  let carriedCount = 0;
  for (const item of openItems) {
    // Idempotency check: verify item was not ALREADY carried to nextMeeting
    const existingChild = await db.mashwaraActionItem.findFirst({
      where: {
        meetingId: nextMeeting.id,
        carriedFromItemId: item.id,
      },
    });

    if (!existingChild) {
      await db.$transaction([
        db.mashwaraActionItem.create({
          data: {
            meetingId: nextMeeting.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            status: "OPEN",
            assigneeId: item.assigneeId,
            teamId: item.teamId,
            dueDate: item.dueDate,
            carriedFromItemId: item.id,
          },
        }),
        db.mashwaraActionItem.update({
          where: { id: item.id },
          data: {
            status: "CARRIED_FORWARD",
            carriedToMeetingId: nextMeeting.id,
          },
        }),
      ]);
      carriedCount++;
    }
  }

  return { carriedCount, targetMeetingId: nextMeeting.id };
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
   - **Series & Boundary Tests:**
     - Rejection of cross-city series or meeting creation (`403 Forbidden`).
     - Verification that carry-forward targets ONLY the next occurrence of the exact same `seriesId`.
     - Verification of idempotency: re-running carry-forward on meeting retry does NOT create duplicate action items.
   - **Approved Lifecycle Tests:**
     - Validates state transitions `DRAFT` -> `IN_PROGRESS` -> `REVIEW` -> `CLOSED` -> `REOPENED`.
     - Reopen authorization test: verifies only `SUPER_ADMIN` and `CITY_HEAD` (own city) can reopen a `CLOSED` meeting.
     - Immutable history test: verifies original MoM entries and author timestamps cannot be modified or deleted after `CLOSED`.
   - **Denial Tests:**
     - Foreign city staff assignment rejection (`403 Forbidden`).
     - Foreign city explicit share grant rejection (`403 Forbidden`).
     - Park Admin attempt to review/close city Mashwara (`403 Forbidden`).
   - **StaffMeta Derivation Tests:**
     - Scope derivation via `assignedCityId`, `assignedPark.cityId`, and `assignedGroup.park.cityId` / `assignedGroup.batch.cityId`.

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
│  MASHWARA-302C: Meeting Series & CRUD API Routes       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302D: Agenda & MoM/Karguzari API Routes      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  MASHWARA-302E: Action Items & Idempotent Engine       │
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
│  MASHWARA-302H: End-to-End Series & Privacy Tests      │
└──────────────────────────┴─────────────────────────────┘
```

1. **`MASHWARA-302A`**: Add additive models (`MashwaraSeries`, `MashwaraMeeting`, etc.) & enums to `prisma/schema.prisma` and `prisma/postgres/schema.prisma`.
2. **`MASHWARA-302B`**: Implement `src/lib/auth/mashwara-scope.ts` with `deriveStaffCityId`, `assertMashwaraCityInvariants`, and access evaluators.
3. **`MASHWARA-302C`**: Implement `/api/mashwara/series` and `/api/mashwara` (POST, GET, PATCH) routes supporting `DRAFT` -> `IN_PROGRESS` -> `REVIEW` -> `CLOSED` -> `REOPENED`.
4. **`MASHWARA-302D`**: Implement `/api/mashwara/[id]/agenda` and `/api/mashwara/[id]/mom` routes.
5. **`MASHWARA-302E`**: Implement `/api/mashwara/[id]/action-items` with idempotent carry-forward logic on meeting review/close.
6. **`MASHWARA-302F`**: Implement `/api/mashwara/[id]/share` (POST, DELETE) for explicit member sharing grants.
7. **`MASHWARA-302G`**: Implement in-app notification dispatcher for Mashwara tasks & audit logger.
8. **`MASHWARA-302H`**: Comprehensive unit & integration test suite covering series boundaries, idempotency, reopen controls, and privacy bounds.
