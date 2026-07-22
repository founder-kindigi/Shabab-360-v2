# EVENT-302 Event Responsibility Module Implementation Plan

**Task ID:** `EVENT-302-IMPLEMENTATION-PLAN`
**Status:** `PROPOSED` (Implementation Plan Pending Owner Approval — No Code/Schema Edits Applied)
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`
**Source Specification:** `docs/product-discovery/EVENT-301-EVENT-RESPONSIBILITY-DESIGN.md` (Approved Revision `d9a1d82`)

---

## 1. Overview & Objective

This document provides the phased, implementation-ready execution plan for building the **Event Responsibility Module** in Shabab 360. 

### Core Architectural Invariants
1. **City-Park Scope Invariant:** `Event.parkId` (if set) and all `EventScopePark.parkId` entries MUST belong to `Event.cityId`. Cross-city park inclusion is rejected at the API validation layer with `400 Bad Request`.
2. **User-City Alignment Invariant:** Every assigned staff/user (`EventResponsibilityAssignment.userId`) MUST belong to the same city (`Event.cityId`). Foreign city assignments are rejected with `403 Forbidden`.
3. **Park Admin Scope Restriction:** Park Admin is strictly attendance-only for their assigned park. Park Admin has zero authority to manage event lifecycle, create teams, assign tasks, or dispatch notifications.
4. **Temporary Grant Ceiling:** Temporary Event Leads cannot grant capabilities or assign roles beyond their own approved event grant.
5. **In-App Notification Restriction:** Event notifications write strictly to `db.notification` (in-app). Push and Email channels remain disabled for the pilot.
6. **Additive-Only Schema Changes:** New Prisma models and relations are 100% additive across both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`).

---

## 2. Exact Additive Prisma Model & Relation Changes

The schema modification adds 6 new models and 7 new enums to both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`). No existing fields or models are removed or renamed.

### 2.1 Additive Enums
```prisma
enum EventType {
  ADMISSIONS_CAMPAIGN
  SWIMMING
  TRIP
  INAUGURATION
  CLOSING_CEREMONY
  OTHER
}

enum EventStatus {
  DRAFT
  PLANNING
  ACTIVE
  COMPLETED
  ARCHIVED
  CANCELLED
}

enum EventScopeType {
  CITY_WIDE
  SINGLE_PARK
  MULTI_PARK
}

enum EventTeamType {
  STEERING
  SECURITY
  PARKING
  WELCOME_RECEPTION
  LOGISTICS
  FIRST_AID
  CONDUCTOR
  INTERVIEW_PANEL
  CUSTOM
}

enum EventRole {
  EVENT_LEAD
  COORDINATOR
  TEAM_LEAD
  TEAM_MEMBER
  VOLUNTEER
}

enum EventTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  VERIFIED
  CANCELLED
}

enum EventAttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
}
```

### 2.2 Additive Models
```prisma
model Event {
  id           String         @id @default(cuid())
  title        String
  description  String?
  type         EventType
  status       EventStatus    @default(DRAFT)
  scopeType    EventScopeType

  cityId       String
  city         City           @relation(fields: [cityId], references: [id], onDelete: Cascade)

  parkId       String?
  park         Park?          @relation("PrimaryParkEvents", fields: [parkId], references: [id], onDelete: SetNull)

  scopedParks  EventScopePark[]

  startsAt     DateTime
  endsAt       DateTime
  location     String?

  createdById  String
  createdBy    User           @relation("EventCreator", fields: [createdById], references: [id])

  teams        EventTeam[]
  assignments  EventResponsibilityAssignment[]
  tasks        EventTask[]
  attendance   EventAttendanceRecord[]

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([cityId])
  @@index([parkId])
  @@index([status])
  @@index([startsAt, endsAt])
}

model EventScopePark {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  parkId    String
  park      Park     @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([eventId, parkId])
  @@index([eventId])
  @@index([parkId])
}

model EventTeam {
  id          String        @id @default(cuid())
  eventId     String
  event       Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name        String
  teamType    EventTeamType

  assignments EventResponsibilityAssignment[]
  tasks       EventTask[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([eventId])
}

model EventResponsibilityAssignment {
  id          String         @id @default(cuid())
  eventId     String
  event       Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)

  teamId      String?
  team        EventTeam?     @relation(fields: [teamId], references: [id], onDelete: SetNull)

  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  eventRole   EventRole      @default(TEAM_MEMBER)
  title       String?

  startsAt    DateTime
  expiresAt   DateTime
  isActive    Boolean        @default(true)

  assignedById String
  assignedBy   User          @relation("AssignmentGranter", fields: [assignedById], references: [id])

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([eventId])
  @@index([userId])
  @@index([teamId])
  @@index([startsAt, expiresAt])
}

model EventTask {
  id          String          @id @default(cuid())
  eventId     String
  event       Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)

  teamId      String?
  team        EventTeam?      @relation(fields: [teamId], references: [id], onDelete: SetNull)

  assigneeId  String?
  assignee    User?           @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  title       String
  description String?
  status      EventTaskStatus @default(PENDING)
  dueDate     DateTime?

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([eventId])
  @@index([teamId])
  @@index([assigneeId])
}

model EventAttendanceRecord {
  id            String                @id @default(cuid())
  eventId       String
  event         Event                 @relation(fields: [eventId], references: [id], onDelete: Cascade)

  participantId String?
  participant   Participant?          @relation(fields: [participantId], references: [id], onDelete: Cascade)

  staffUserId   String?
  staffUser     User?                 @relation(fields: [staffUserId], references: [id], onDelete: Cascade)

  status        EventAttendanceStatus @default(PRESENT)
  checkInTime   DateTime              @default(now())
  notes         String?

  recordedById  String
  recordedBy    User                  @relation("AttendanceRecorder", fields: [recordedById], references: [id])

  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  @@index([eventId])
  @@index([participantId])
  @@index([staffUserId])
}
```

### 2.3 Additive Relations to Existing Models
- `City`: `events Event[]`
- `Park`: `primaryEvents Event[] @relation("PrimaryParkEvents")`, `eventScopes EventScopePark[]`
- `User`: `createdEvents Event[] @relation("EventCreator")`, `eventAssignments EventResponsibilityAssignment[]`, `grantedEventAssignments EventResponsibilityAssignment[] @relation("AssignmentGranter")`, `assignedEventTasks EventTask[] @relation("TaskAssignee")`, `eventAttendanceRecords EventAttendanceRecord[]`, `recordedEventAttendance EventAttendanceRecord[] @relation("AttendanceRecorder")`
- `Participant`: `eventAttendanceRecords EventAttendanceRecord[]`

---

## 3. Capability Names & Server-Side Authorization Rules

New explicit capability strings will be registered in `src/lib/auth/scope.ts`:

| Capability | Description | Enforcement Rule |
| :--- | :--- | :--- |
| `event:create` | Create an event record | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |
| `event:manage_lifecycle` | Advance or edit event state | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |
| `event:form_teams` | Add teams and assign roles | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |
| `event:manage_tasks` | Create/assign operational tasks | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, Active `EVENT_LEAD` / `TEAM_LEAD` |
| `event:take_attendance` | Check in participants or staff | `SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, `PARK_ADMIN` (own park events), Active `EVENT_LEAD` / Assigned Staff |
| `event:send_notifications` | Send in-app notification | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |
| `event:view_audit` | View event audit log | `SUPER_ADMIN`, `CITY_HEAD` (own city), `PARK_LEAD` (own park) |

---

## 4. Route-by-Route API Plan & Bounded Zod Schemas

All API routes live under `/api/events/` and enforce strict input validation via Zod.

### 4.1 `POST /api/events` (Create Event)
- **Authorization:** `event:create`
- **Bounded Zod Input:**
```typescript
export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional(),
  type: z.enum(["ADMISSIONS_CAMPAIGN", "SWIMMING", "TRIP", "INAUGURATION", "CLOSING_CEREMONY", "OTHER"]),
  scopeType: z.enum(["CITY_WIDE", "SINGLE_PARK", "MULTI_PARK"]),
  cityId: z.string().cuid(),
  parkId: z.string().cuid().optional(),
  scopedParkIds: z.array(z.string().cuid()).max(20).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().trim().max(200).optional(),
});
```
- **Validation Business Rules:**
  1. `endsAt` must be strictly after `startsAt`.
  2. If `scopeType === SINGLE_PARK`, `parkId` is required. Verify `park.cityId === cityId` in DB.
  3. If `scopeType === MULTI_PARK`, `scopedParkIds` required. Verify every park in `scopedParkIds` has `park.cityId === cityId`.
  4. If caller is `PARK_LEAD`, enforce `cityId === user.assignedCityId` and `parkId === user.assignedParkId`.

### 4.2 `GET /api/events` (List Events)
- **Authorization:** Authenticated user with scope filter (`cityId`, `parkId`, `status`).
- **Bounded Zod Input:**
```typescript
export const listEventsQuerySchema = paginatedQuerySchema({ maxPageSize: 50 }).extend({
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  status: z.enum(["DRAFT", "PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED", "CANCELLED"]).optional(),
  type: z.enum(["ADMISSIONS_CAMPAIGN", "SWIMMING", "TRIP", "INAUGURATION", "CLOSING_CEREMONY", "OTHER"]).optional(),
});
```

### 4.3 `PATCH /api/events/[id]` (Update Event / Lifecycle State)
- **Authorization:** `event:manage_lifecycle`
- **Bounded Zod Input:**
```typescript
export const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["DRAFT", "PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED", "CANCELLED"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
});
```

### 4.4 `POST /api/events/[id]/teams` (Create Event Team)
- **Authorization:** `event:form_teams`
- **Bounded Zod Input:**
```typescript
export const createEventTeamSchema = z.object({
  name: z.string().trim().min(2).max(50),
  teamType: z.enum(["STEERING", "SECURITY", "PARKING", "WELCOME_RECEPTION", "LOGISTICS", "FIRST_AID", "CONDUCTOR", "INTERVIEW_PANEL", "CUSTOM"]),
});
```

### 4.5 `POST /api/events/[id]/assignments` (Assign User Responsibility)
- **Authorization:** `event:form_teams`
- **Bounded Zod Input:**
```typescript
export const createAssignmentSchema = z.object({
  teamId: z.string().cuid().optional(),
  userId: z.string().cuid(),
  eventRole: z.enum(["EVENT_LEAD", "COORDINATOR", "TEAM_LEAD", "TEAM_MEMBER", "VOLUNTEER"]),
  title: z.string().trim().max(50).optional(),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
```
- **Validation Business Rules:**
  1. Verify target user `user.assignedCityId === event.cityId`. Reject foreign city staff with `403 Forbidden`.
  2. Verify `expiresAt > startsAt`.

### 4.6 `DELETE /api/events/[id]/assignments/[assignmentId]` (Revoke Assignment)
- **Authorization:** `event:form_teams`

### 4.7 `POST /api/events/[id]/tasks` & `PATCH /api/events/[id]/tasks/[taskId]`
- **Authorization:** `event:manage_tasks`
- **Bounded Zod Input:**
```typescript
export const createEventTaskSchema = z.object({
  teamId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateEventTaskSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CANCELLED"]),
});
```

### 4.8 `POST /api/events/[id]/attendance` (Take Attendance / Duty Check-in)
- **Authorization:** `event:take_attendance`
- **Bounded Zod Input:**
```typescript
export const recordEventAttendanceSchema = z.object({
  participantId: z.string().cuid().optional(),
  staffUserId: z.string().cuid().optional(),
  status: z.enum(["PRESENT", "ABSENT", "EXCUSED", "LATE"]),
  notes: z.string().trim().max(200).optional(),
});
```

---

## 5. Invariant & Expiry Enforcement Engine

A dedicated helper module `src/lib/auth/event-scope.ts` will provide reusable validation functions:

### 5.1 Same-City Hierarchy Validation Function
```typescript
export async function assertEventCityInvariants(db: PrismaClient, params: {
  cityId: string;
  parkId?: string | null;
  scopedParkIds?: string[];
  userId?: string;
}): Promise<void> {
  if (params.parkId) {
    const park = await db.park.findUnique({ where: { id: params.parkId }, select: { cityId: true } });
    if (!park || park.cityId !== params.cityId) {
      throw new ValidationError("Selected park does not belong to event city");
    }
  }
  if (params.scopedParkIds && params.scopedParkIds.length > 0) {
    const count = await db.park.count({
      where: { id: { in: params.scopedParkIds }, cityId: params.cityId }
    });
    if (count !== params.scopedParkIds.length) {
      throw new ValidationError("One or more scoped parks do not belong to event city");
    }
  }
  if (params.userId) {
    const user = await db.user.findUnique({ where: { id: params.userId }, select: { assignedCityId: true } });
    if (!user || user.assignedCityId !== params.cityId) {
      throw new ForbiddenError("Target user does not belong to event city");
    }
  }
}
```

### 5.2 Assignment Expiry Helper Function
```typescript
export function isAssignmentActive(assignment: {
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
}, now: Date = new Date()): boolean {
  return assignment.isActive && now >= assignment.startsAt && now <= assignment.expiresAt;
}
```

---

## 6. In-App Notification Channel Enforcement

- All notification logic associated with events will call `db.notification.create()` directly for in-app delivery.
- Sending via Email/SMS channels is explicitly blocked at runtime:
```typescript
if (channel !== "IN_APP") {
  throw new ValidationError("Only IN_APP notifications are supported for the Event module pilot");
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
3. Focused Jest/Vitest unit & integration test suites:
   - Same-city invariant rejection tests (`400 Bad Request`).
   - Foreign user assignment rejection tests (`403 Forbidden`).
   - Park Admin boundary restriction tests (verify 403 on team creation, lifecycle edits, task management, notification sending).
   - Assignment expiry boundary tests (`now() > expiresAt`).
   - In-app notification channel enforcement tests.

---

## 8. Independent Execution Breakdown

Work is divided into 8 atomic, independently reviewable subtasks:

```
┌────────────────────────────────────────────────────────┐
│  EVENT-302A: Prisma Additive Schema (Dual DB Sync)      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302B: Event Auth & Invariant Engine             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302C: Event Lifecycle & CRUD API Routes         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302D: Team & Assignment API Routes             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302E: Event Task Management API Routes          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302F: Event Attendance & Duty Check-in API      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302G: In-App Event Notifications & Audit Log    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  EVENT-302H: End-to-End Test Suite & Verification      │
└──────────────────────────┬─────────────────────────────┘
```

1. **`EVENT-302A`**: Add additive models & enums to `prisma/schema.prisma` and `prisma/postgres/schema.prisma`.
2. **`EVENT-302B`**: Implement `src/lib/auth/event-scope.ts` with same-city invariants, capability checks, and expiry helper.
3. **`EVENT-302C`**: Implement `/api/events` (POST, GET, PATCH) routes with Zod validation.
4. **`EVENT-302D`**: Implement `/api/events/[id]/teams` and `/api/events/[id]/assignments` routes.
5. **`EVENT-302E`**: Implement `/api/events/[id]/tasks` (GET, POST, PATCH) routes.
6. **`EVENT-302F`**: Implement `/api/events/[id]/attendance` route for participant/staff check-ins.
7. **`EVENT-302G`**: Implement in-app event notification dispatcher and event audit logger.
8. **`EVENT-302H`**: Comprehensive unit & integration test suite covering all invariants and scope boundaries.
