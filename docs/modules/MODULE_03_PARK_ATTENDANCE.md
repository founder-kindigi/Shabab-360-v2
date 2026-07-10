# Module 3: Park Attendance

> **Priority:** P0 (Core Operations)
> **Depends On:** Module 1 (Auth & Foundation), Module 2 (City Operations)
> **Parallel Group:** Group A (parallel with Modules 5, 7, 8)
> **New Database Tables:** `attendance_events`, `attendance_records`
> **New NPM Packages:** `dexie` (IndexedDB wrapper)

---

## Module Overview

**This is the heart of Shabab360.** Module 3 is the primary daily operation that park-level staff perform. Park Admins, Park Leads, and Murabbis use this module on mobile phones — often in parks with poor or no internet connectivity — to mark which participants attended today's session. The entire system exists to make this single workflow as fast, reliable, and forgiving of network issues as possible.

### Business Context

Every park runs daily or weekly sessions organized by group. Each session is an "attendance event." The Murabbi (mentor) or Park Admin opens the roster, sees all participants in the group, and marks each one as Present, Absent, Late, or Excused. In Pakistan, parks frequently have unreliable cellular data, so the system must work fully offline and sync when connectivity returns.

### Roles

| Role | Access Level | Scope |
|------|-------------|-------|
| `park_admin` | Full — all groups in assigned park, can close events | Park-scoped |
| `park_lead` | Full — all groups in assigned park, can close events | Park-scoped |
| `murabbi` | Read/Write — only their assigned group's events, cannot close events | Group-scoped |

### Key Design Principles

1. **Offline-first:** Every attendance mark is queued locally (Dexie/IndexedDB) before attempting network. If offline, it stays queued.
2. **Idempotent:** Every mutation carries a `mutationId` (UUID). Re-sending the same mutation produces no duplicate records.
3. **Mobile-first UI:** The roster screen uses 44px+ touch targets, large text, minimal scrolling, and works one-handed on a 375px-wide phone screen.
4. **PKT timezone:** "Today" is determined by Asia/Karachi timezone, not the device's local time.
5. **Optimistic UI:** Toggling a status button updates the UI instantly; the actual server round-trip happens in the background.

---

## Database Tables

The following two tables are introduced in this module. They are already defined in the master Prisma schema.

### attendance_events

```prisma
model AttendanceEvent {
  id          String              @id @default(cuid())
  groupId     String
  title       String
  eventDate   DateTime            // stored UTC, displayed PKT
  isClosed    Boolean             @default(false)
  closedAt    DateTime?
  closedBy    String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  group       Group               @relation(fields: [groupId], references: [id])
  records     AttendanceRecord[]
  closer      StaffMeta?          @relation("EventCloser", fields: [closedBy], references: [id])

  @@map("attendance_events")
}
```

**Column Details:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | String (cuid) | Primary key |
| `groupId` | String (FK → groups.id) | Which group this event belongs to |
| `title` | String | Human-readable title, e.g. "Regular Session - 15 Jul 2025" |
| `eventDate` | DateTime (UTC) | The date the session occurs. Stored in UTC. Queried and displayed in PKT. |
| `isClosed` | Boolean | `false` = open (attendance can be marked), `true` = closed (read-only for most roles) |
| `closedAt` | DateTime? | When the event was closed |
| `closedBy` | String? (FK → staff_meta.id) | Who closed the event |
| `createdAt` / `updatedAt` | DateTime | Timestamps |

**Indexes to add:**

```prisma
@@index([groupId, eventDate])   // Efficient "today's events for a group" query
@@index([eventDate])            // Efficient "all events on a date" query
```

### attendance_records

```prisma
model AttendanceRecord {
  id            String           @id @default(cuid())
  eventId       String
  participantId String
  status        String           // present, absent, late, excused
  markedBy      String?
  markedAt      DateTime         @default(now())
  editReason    String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  event         AttendanceEvent  @relation(fields: [eventId], references: [id])
  participant   Participant      @relation(fields: [participantId], references: [id])
  marker        StaffMeta?       @relation("AttendanceMarker", fields: [markedBy], references: [id])

  @@unique([eventId, participantId])
  @@map("attendance_records")
}
```

**Column Details:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | String (cuid) | Primary key |
| `eventId` | String (FK → attendance_events.id) | Which event this record belongs to |
| `participantId` | String (FK → participants.id) | Which participant this record is for |
| `status` | String | One of: `present`, `absent`, `late`, `excused` |
| `markedBy` | String? (FK → staff_meta.id) | Which staff member marked this |
| `markedAt` | DateTime | When the attendance was marked |
| `editReason` | String? | If a record is updated after initial mark, the reason for the change |
| `createdAt` / `updatedAt` | DateTime | Timestamps |

**Constraints:**

- `@@unique([eventId, participantId])` — A participant can only have one attendance record per event. This enforces upsert behavior.
- Status must be one of the four enum-like values. Enforced by Zod on the API layer and by application logic on the client.

**Indexes to add:**

```prisma
@@index([eventId])             // Fetch all records for an event (roster query)
@@index([participantId])       // Fetch all records for a participant (history query)
```

---

## Offline Queue Design (Dexie)

### Why Dexie

Park staff mark attendance in environments with unreliable connectivity. The system must accept attendance marks even when completely offline, persist them to IndexedDB via Dexie, and sync them to the server when connectivity returns. Dexie provides a clean Promise-based API over IndexedDB and is well-suited for this queue pattern.

### Dexie Database: `shabab360-offline`

```typescript
// src/lib/offline/db.ts
import Dexie, { type Table } from 'dexie';

export interface OfflineQueueItem {
  mutationId: string;        // UUID - unique idempotency key
  eventId: string;           // FK to attendance_events.id
  participantId: string;     // FK to participants.id
  status: 'present' | 'absent' | 'late' | 'excused';
  markedAt: string;          // ISO 8601 timestamp
  queuedAt: string;          // ISO 8601 timestamp when queued
  retryCount: number;        // Starts at 0, incremented on each failed sync attempt
  lastError: string | null;  // Error message from last failed sync attempt
  syncedAt: string | null;   // ISO 8601 timestamp when successfully synced
  state: 'pending' | 'syncing' | 'synced' | 'failed';
}

export class ShababOfflineDB extends Dexie {
  queue!: Table<OfflineQueueItem, string>;

  constructor() {
    super('shabab360-offline');
    this.version(1).stores({
      queue: 'mutationId, eventId, participantId, state, queuedAt',
      // mutationId is the primary key
      // Indexed fields for querying: eventId, participantId, state, queuedAt
    });
  }
}

export const offlineDB = new ShababOfflineDB();
```

### Schema Design Decisions

1. **`mutationId` as primary key:** This UUID is generated on the client before any network call. The server uses it for idempotency — if the same `mutationId` arrives twice, the server ignores the duplicate. This means a retried sync never creates duplicate records.

2. **`state` field:** Tracks the lifecycle of each queued item:
   - `pending` — Added to queue, not yet attempted
   - `syncing` — Currently being sent to server (prevents duplicate sync attempts)
   - `synced` — Successfully synced to server
   - `failed` — Sync failed after max retries

3. **`retryCount` + `lastError`:** Each failed item increments `retryCount` and stores the error. The UI shows failed items with retry buttons. Max retries: 5 (configurable constant).

4. **`markedAt` preserves original timestamp:** The time the user actually marked attendance, not the time it was synced.

### Queue Operations Summary

| Operation | Method | Description |
|-----------|--------|-------------|
| Add to queue | `offlineDB.queue.add(item)` | New attendance mark queued |
| Get pending items | `offlineDB.queue.where('state').anyOf(['pending', 'failed']).toArray()` | Items that need syncing |
| Mark as syncing | `offlineDB.queue.update(mutationId, { state: 'syncing' }) | Lock item during sync |
| Mark as synced | `offlineDB.queue.update(mutationId, { state: 'synced', syncedAt: now }) | Success |
| Mark as failed | `offlineDB.queue.update(mutationId, { state: 'failed', retryCount: count + 1, lastError: msg }) | Failure |
| Retry failed | `offlineDB.queue.where('state').equals('failed').modify({ state: 'pending', lastError: null })` | Reset failed to pending |
| Clear synced | `offlineDB.queue.where('state').equals('synced').delete()` | Housekeeping |
| Get counts | `offlineDB.queue.where('state').equals('pending').count()` etc. | For UI badges |

### Sync Flow Diagram

```
User taps status button
        │
        ▼
┌─ Is online? ─┐
│               │
YES             NO
│               │
▼               ▼
Call API       Queue to Dexie (state: pending)
directly       Show offline indicator
│               │
▼               │
API returns     ▼
success         (later) Network detected
│               │
▼               ▼
Done.          Sync worker picks up
               pending + failed items
                      │
                      ▼
              POST /api/park/attendance/sync
              with array of mutations
                      │
                      ▼
              Server processes each:
                - If mutationId exists → skip (idempotent)
                - If new → upsert record
                      │
                      ▼
              Server returns per-mutation:
                { mutationId, status: "processed" | "failed", error? }
                      │
                      ▼
              Client updates Dexie:
                - processed → state: "synced"
                - failed → state: "failed", increment retryCount
```

---

## API Endpoints

All park API routes live under `/api/park/` and require one of: `park_admin`, `park_lead`, `murabbi`.

### `GET /api/park/dashboard`

Returns the Park Dashboard data — the first thing a park user sees after login.

**Authorization:** `park_admin`, `park_lead`, `murabbi`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `parkId` | string | Yes (for park_admin/park_lead) | Park to load dashboard for |
| (no parkId needed for murabbi — derived from assignedGroupId) | | | |

**Server Logic:**

1. Validate session and role.
2. For `murabbi`: look up `assignedGroupId` from `StaffMeta`, derive park from the group's batch's park.
3. For `park_admin` / `park_lead`: validate `assignedParkId` matches requested `parkId`.
4. Compute "today" in PKT (`Asia/Karachi`): get current UTC, convert to PKT, extract date.
5. Query `AttendanceEvent` where `eventDate` falls on today PKT, filtered by the relevant groups (all groups in the park for admin/lead, only assigned group for murabbi).
6. Count open vs closed events.
7. Query Dexie queue counts from client (this is a client-side concern — the server response does NOT include queue health; the client merges server data with local Dexie state).
8. Query recent attendance summary (last 7 days) for quick stats.

**Response (200):**

```json
{
  "park": {
    "id": "cklabc123",
    "name": "Gulshan-e-Iqbal Park",
    "cityName": "Karachi"
  },
  "todayDate": "2025-07-15",
  "todayEvents": {
    "total": 4,
    "open": 2,
    "closed": 2
  },
  "recentSummary": {
    "last7DaysEvents": 12,
    "last7DaysAttendanceRate": 0.82,
    "totalParticipants": 68,
    "activeGroups": 4
  },
  "attentionItems": [
    {
      "type": "offline_queue",
      "message": "3 attendance marks pending sync",
      "severity": "warning"
    },
    {
      "type": "unclosed_event",
      "message": "Yesterday's event for Group A is still open",
      "severity": "info"
    }
  ],
  "events": [
    {
      "id": "clevent001",
      "title": "Regular Session - Group A",
      "groupName": "Group A - Morning",
      "eventDate": "2025-07-15T05:00:00.000Z",
      "isClosed": false,
      "participantCount": 18,
      "markedCount": 12,
      "closedAt": null,
      "closedByName": null
    }
  ]
}
```

**Response (401):** `{ "error": "Unauthorized" }`
**Response (403):** `{ "error": "Forbidden" }`

---

### `GET /api/park/attendance`

List today's attendance events for the user's assigned scope.

**Authorization:** `park_admin`, `park_lead`, `murabbi`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `parkId` | string | Yes | Park to filter by |
| `date` | string (YYYY-MM-DD) | No | Defaults to today in PKT |
| `status` | string | No | Filter: `open`, `closed`, or omit for all |

**Server Logic:**

1. Authorize and scope as described in dashboard.
2. Convert `date` (or today PKT) to UTC range for the `eventDate` column query.
3. For `murabbi`: only return events for their `assignedGroupId`.
4. For `park_admin` / `park_lead`: return events for all groups in the park.
5. For each event, include a sub-query count of `AttendanceRecord` to compute `markedCount`.
6. Also include `participantCount` from the group's participant count (only active participants with `state = 'active'`).

**Response (200):**

```json
{
  "date": "2025-07-15",
  "parkId": "cklabc123",
  "events": [
    {
      "id": "clevent001",
      "title": "Regular Session - Group A",
      "groupId": "clgroup001",
      "groupName": "Group A - Morning",
      "eventDate": "2025-07-15T05:00:00.000Z",
      "isClosed": false,
      "closedAt": null,
      "closedByName": null,
      "participantCount": 18,
      "markedCount": 12,
      "presentCount": 9,
      "absentCount": 1,
      "lateCount": 2,
      "excusedCount": 0
    },
    {
      "id": "clevent002",
      "title": "Regular Session - Group B",
      "groupId": "clgroup002",
      "groupName": "Group B - Morning",
      "eventDate": "2025-07-15T05:00:00.000Z",
      "isClosed": true,
      "closedAt": "2025-07-15T08:30:00.000Z",
      "closedByName": "Ahmed Khan",
      "participantCount": 15,
      "markedCount": 15,
      "presentCount": 12,
      "absentCount": 1,
      "lateCount": 2,
      "excusedCount": 0
    }
  ]
}
```

---

### `GET /api/park/attendance/[eventId]`

Get the full roster for a specific attendance event — the participants and their current attendance status. This is the data payload for the Attendance Roster screen.

**Authorization:** `park_admin`, `park_lead`, `murabbi`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | The attendance event ID |

**Server Logic:**

1. Authorize.
2. Fetch the `AttendanceEvent` with its `group` relation (to get `groupId`).
3. **Scope check:** For `murabbi`, verify `event.groupId === staffMeta.assignedGroupId`. For `park_admin`/`park_lead`, verify the group's batch's park matches their `assignedParkId`.
4. Fetch all `Participant` records where `groupId = event.groupId` AND `state = 'active'`, ordered by `name` ASC.
5. Fetch all `AttendanceRecord` records for this `eventId`.
6. Join participants with their records (left join). Participants without a record have `status: null` (unmarked).
7. Also check for any offline-queued items from the client that haven't synced yet (the client handles this merge; the server only returns synced records).

**Response (200):**

```json
{
  "event": {
    "id": "clevent001",
    "title": "Regular Session - Group A",
    "groupId": "clgroup001",
    "groupName": "Group A - Morning",
    "eventDate": "2025-07-15T05:00:00.000Z",
    "isClosed": false,
    "closedAt": null,
    "closedByName": null
  },
  "roster": [
    {
      "participantId": "clpart001",
      "participantName": "Ahmed Ali",
      "phone": "03001234567",
      "status": "present",
      "recordId": "clrec001",
      "markedAt": "2025-07-15T06:15:00.000Z",
      "markedByName": "Br. Usman"
    },
    {
      "participantId": "clpart002",
      "participantName": "Bilal Hassan",
      "phone": "03009876543",
      "status": null,
      "recordId": null,
      "markedAt": null,
      "markedByName": null
    },
    {
      "participantId": "clpart003",
      "participantName": "Daniyal Khan",
      "phone": null,
      "status": "late",
      "recordId": "clrec003",
      "markedAt": "2025-07-15T06:22:00.000Z",
      "markedByName": "Br. Usman"
    }
  ],
  "summary": {
    "total": 18,
    "present": 9,
    "absent": 1,
    "late": 2,
    "excused": 0,
    "unmarked": 6
  }
}
```

**Response (404):** `{ "error": "Event not found" }`
**Response (403):** `{ "error": "Forbidden - event not in your scope" }`

---

### `POST /api/park/attendance/[eventId]`

Upsert (create or update) a single attendance record for a participant in an event. This is the primary marking endpoint used when the device is online.

**Authorization:** `park_admin`, `park_lead`, `murabbi`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | The attendance event ID |

**Request Body:**

```json
{
  "participantId": "clpart002",
  "status": "present",
  "mutationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "editReason": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participantId` | string | Yes | The participant to mark |
| `status` | string | Yes | One of: `present`, `absent`, `late`, `excused` |
| `mutationId` | string (UUID) | Yes | Client-generated UUID for idempotency |
| `editReason` | string? | No | Required when updating an existing record |

**Server Logic:**

1. Authorize and scope-check the event (same as GET roster).
2. Validate the event is NOT closed (`isClosed === false`), unless the user is `park_admin` or `park_lead` with an `editReason` provided.
3. Validate `participantId` belongs to the event's group and is active.
4. Validate `status` is one of the four allowed values.
5. **Idempotency check:** Look up if a record already exists with the same `eventId + participantId`. If it does, and the `mutationId` matches a previously processed mutation (tracked via an in-memory or DB-set of seen mutationIds within the session), return the existing record without modification. **Implementation note:** For SQLite, idempotency is enforced via the `@@unique([eventId, participantId])` constraint — an upsert (create-or-update) naturally handles duplicates. The `mutationId` is logged in the audit trail but the actual dedup is via the unique constraint.
6. **Upsert:**
   - If no record exists: `prisma.attendanceRecord.create({ data: { eventId, participantId, status, markedBy: staffMetaId, markedAt: new Date() } })`
   - If record exists: `prisma.attendanceRecord.update({ where: { eventId_participantId: { eventId, participantId } }, data: { status, markedBy: staffMetaId, markedAt: new Date(), editReason } })`
7. Log to `AuditLog`: action = `attendance_mark` or `attendance_update`.

**Response (200):**

```json
{
  "success": true,
  "record": {
    "id": "clrec010",
    "eventId": "clevent001",
    "participantId": "clpart002",
    "status": "present",
    "markedAt": "2025-07-15T06:30:00.000Z",
    "markedByName": "Br. Usman"
  }
}
```

**Response (400):** `{ "error": "Invalid status value" }` or `{ "error": "editReason required for updates" }`
**Response (403):** `{ "error": "Event is closed" }`
**Response (409):** `{ "error": "Participant not in this group" }`

---

### `POST /api/park/attendance/sync`

Batch sync endpoint for offline-queued attendance marks. Accepts an array of mutations and returns per-mutation results.

**Authorization:** `park_admin`, `park_lead`, `murabbi`

**Request Body:**

```json
{
  "mutations": [
    {
      "mutationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "eventId": "clevent001",
      "participantId": "clpart002",
      "status": "present",
      "markedAt": "2025-07-15T06:15:00.000Z"
    },
    {
      "mutationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "eventId": "clevent001",
      "participantId": "clpart005",
      "status": "absent",
      "markedAt": "2025-07-15T06:16:00.000Z"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mutations` | array | Yes | Array of mutations (max 50 per request) |
| `mutations[].mutationId` | string (UUID) | Yes | Client-generated idempotency key |
| `mutations[].eventId` | string | Yes | Attendance event ID |
| `mutations[].participantId` | string | Yes | Participant ID |
| `mutations[].status` | string | Yes | One of: `present`, `absent`, `late`, `excused` |
| `mutations[].markedAt` | string (ISO 8601) | Yes | When the user originally marked this |

**Server Logic:**

1. Authorize.
2. Validate `mutations` array length ≤ 50.
3. For each mutation:
   a. Scope-check: verify the event belongs to the user's scope.
   b. Validate event is not closed.
   c. Validate participant belongs to the event's group.
   d. Validate status value.
   e. **Upsert** using `prisma.attendanceRecord.upsert`:
      - `where: { eventId_participantId: { eventId, participantId } }`
      - `create: { eventId, participantId, status, markedBy: staffMetaId, markedAt: parseISO(markedAt) }`
      - `update: { status, markedBy: staffMetaId, markedAt: parseISO(markedAt) }`
   f. If any step fails, mark that mutation as failed but continue processing the rest.
4. Return per-mutation results.

**Response (200):**

```json
{
  "results": [
    {
      "mutationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "processed",
      "recordId": "clrec010",
      "error": null
    },
    {
      "mutationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "status": "processed",
      "recordId": "clrec011",
      "error": null
    }
  ],
  "summary": {
    "total": 2,
    "processed": 2,
    "failed": 0
  }
}
```

**Response (200) with partial failure:**

```json
{
  "results": [
    {
      "mutationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "processed",
      "recordId": "clrec010",
      "error": null
    },
    {
      "mutationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "status": "failed",
      "recordId": null,
      "error": "Event is closed"
    }
  ],
  "summary": {
    "total": 2,
    "processed": 1,
    "failed": 1
  }
}
```

**Response (400):** `{ "error": "Max 50 mutations per sync request" }`

---

### `PATCH /api/park/attendance/[eventId]/close`

Close an attendance event. Once closed, attendance records become read-only (except for park_admin/park_lead with explicit edit reason).

**Authorization:** `park_admin`, `park_lead` only (murabbi CANNOT close events)

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | The attendance event ID |

**Request Body:**

```json
{
  "reason": "Session completed"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Reason for closing (stored in audit log) |

**Server Logic:**

1. Authorize. Reject if role is `murabbi`.
2. Scope-check the event (park_admin/park_lead must have the event's park in their scope).
3. Verify event is not already closed.
4. Update: `prisma.attendanceEvent.update({ where: { id: eventId }, data: { isClosed: true, closedAt: new Date(), closedBy: staffMetaId } })`.
5. Log to `AuditLog`: action = `event_close`, entity = `attendance_events`.

**Response (200):**

```json
{
  "success": true,
  "event": {
    "id": "clevent001",
    "isClosed": true,
    "closedAt": "2025-07-15T08:30:00.000Z",
    "closedByName": "Br. Usman"
  }
}
```

**Response (403):** `{ "error": "Forbidden - only park_admin and park_lead can close events" }`
**Response (409):** `{ "error": "Event is already closed" }`

---

## UI Components & Screens

All Park UI components live under `src/components/modules/park/`. They are rendered by the client-side SPA router (no Next.js file-based routing for pages).

### 1. Park Dashboard Screen

**Component:** `src/components/modules/park/park-dashboard.tsx`

This is the landing screen for all park-role users after login. It provides an at-a-glance summary and a clear path to the next action.

**Layout (Mobile-First):**

```
┌─────────────────────────────┐
│  Park Dashboard             │
│  Gulshan-e-Iqbal Park       │
│  Karachi                    │
├─────────────────────────────┤
│ ┌─────────┐ ┌─────────┐    │
│ │   4     │ │   2     │    │
│ │ Today's │ │  Open   │    │
│ │ Events  │ │ Events  │    │
│ └─────────┘ └─────────┘    │
│ ┌─────────┐ ┌─────────┐    │
│ │  68     │ │  82%    │    │
│ │ Total   │ │ 7-Day  │    │
│ │ Shabab  │ │ Attend. │    │
│ └─────────┘ └─────────┘    │
├─────────────────────────────┤
│ ⚠️ Attention Items          │
│ ┌──────────────────────────┐│
│ │ 📴 3 marks pending sync  ││
│ └──────────────────────────┘│
│ ┌──────────────────────────┐│
│ │ ℹ️ Yesterday event open   ││
│ └──────────────────────────┘│
├─────────────────────────────┤
│ ⚡ Next Action               │
│ ┌──────────────────────────┐│
│ │  Mark Group A Attendance  ││  ← Large, tappable button
│ │  12/18 marked • Open      ││
│ └──────────────────────────┘│
├─────────────────────────────┤
│ 📋 Today's Events            │
│ ┌──────────────────────────┐│
│ │ Group A - Morning         ││
│ │ 12/18 marked • Open      ││
│ │ [Mark Attendance →]      ││
│ ├──────────────────────────┤│
│ │ Group B - Morning         ││
│ │ 15/15 marked • Closed    ││
│ │ [View Summary →]         ││
│ ├──────────────────────────┤│
│ │ Group C - Afternoon       ││
│ │ 0/16 marked • Open       ││
│ │ [Mark Attendance →]      ││
│ └──────────────────────────┘│
├─────────────────────────────┤
│ 📴 Offline Queue (3 pending)│  ← Collapsible panel, red badge if > 0
│ [Retry All] [View Details]  │
└─────────────────────────────┘
```

**Data Sources:**

- Server data from `GET /api/park/dashboard`
- Client-side Dexie counts for offline queue (pending/failed counts)
- Merged in the component via `useQuery` + Dexie live query

**Key Behaviors:**

- On mount: fetch dashboard data. Simultaneously, get Dexie queue counts using `offlineDB.queue.where('state').equals('pending').count()`.
- "Next Action" button navigates directly to the first open, incompletely-marked event's roster.
- Attention items use color-coded severity: `warning` = amber, `error` = red, `info` = blue.
- Offline queue panel at the bottom is always visible (collapsed by default, auto-expands if there are failed items).
- Pull-to-refresh triggers a refetch of dashboard data AND triggers sync if online.

---

### 2. Today's Events Board

**Component:** `src/components/modules/park/today-events-board.tsx`

A card-based list of all attendance events for today. This can also be shown as a section within the dashboard or as a standalone page navigated to from the sidebar.

**Layout:**

```
┌─────────────────────────────┐
│  Today's Events    Jul 15   │
│  ─────────────────────────  │
│                             │
│  Filter: [All] [Open] [Closed]  ← Chip filters
│                             │
│ ┌─────────────────────────┐ │
│ │ 🟢 Open                 │ │
│ │                         │ │
│ │ Group A - Morning       │ │
│ │ Regular Session         │ │
│ │                         │ │
│ │ 👥 18 participants      │ │
│ │ ✅ 12 marked            │ │
│ │                         │ │
│ │ ████████████░░░░ 67%    │ │  ← Progress bar
│ │                         │ │
│ │ [  Mark Attendance  → ] │ │  ← Primary action button
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🔒 Closed               │ │
│ │                         │ │
│ │ Group B - Morning       │ │
│ │ Regular Session         │ │
│ │                         │ │
│ │ 👥 15 participants      │ │
│ │ ✅ 15 marked            │ │
│ │                         │ │
│ │ ████████████████ 100%   │ │
│ │                         │ │
│ │ [  View Summary  → ]    │ │  ← Secondary action
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🟢 Open                 │ │
│ │                         │ │
│ │ Group C - Afternoon     │ │
│ │ Regular Session         │ │
│ │                         │ │
│ │ 👥 16 participants      │ │
│ │ ⬜ 0 marked             │ │
│ │                         │ │
│ │ ░░░░░░░░░░░░░░░░ 0%    │ │
│ │                         │ │
│ │ [  Mark Attendance  → ] │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Key Behaviors:**

- Filter chips at the top toggle between All / Open / Closed.
- Each card shows: event status icon (green circle = open, lock = closed), group name, participant count, marked count, progress bar.
- Progress bar color: green ≥ 80%, amber 50-79%, red < 50%.
- Tapping the action button on an open event navigates to the Attendance Roster.
- Tapping on a closed event navigates to a read-only summary view.
- Cards for events with 0 marks are subtly highlighted to draw attention (pulse animation on the progress bar).
- TanStack Query with `queryKey: ['park-events', parkId, date]` and `refetchInterval: 30000` (poll every 30s when on this screen).

---

### 3. Attendance Roster Screen

**Component:** `src/components/modules/park/attendance-roster.tsx`

**THIS IS THE KEY SCREEN — the most important UI in the entire application.** It is where attendance is actually marked. Every design decision here prioritizes speed, accuracy, and usability on a mobile phone with one hand.

**Layout (Mobile — 375px width):**

```
┌──────────────────────────────┐
│  ← Back   Group A - Morning  │
│  Regular Session  📴 Offline  │  ← Offline indicator (pulsing amber dot)
├──────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │  12  │ │  3   │ │  0   │  │
│ │  P   │ │  L   │ │  A   │  │  ← Live summary badges
│ │resent│ │  ate  │ │  bsen│  │
│ └──────┘ └──────┘ └──────┘  │
│ Unmarked: 6  │  Total: 18   │
├──────────────────────────────┤
│ 🔍 Search participants...    │  ← Search bar
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │  Ahmed Ali          🟢 P │ │  ← Row: name left, status button right
│ └──────────────────────────┘ │  ← 48px minimum row height
│ ┌──────────────────────────┐ │
│ │  Bilal Hassan       ⬜ — │ │  ← Unmarked = gray dash
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  Daniyal Khan       🟡 L │ │  ← Late = amber
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  Farhan Siddiqui    🟢 P │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  Hamza Tariq        🔴 A │ │  ← Absent = red
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  Irfan Ahmed        🟢 P │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  Junaid Raza        ⬜ — │ │
│ └──────────────────────────┘ │
│        ... more rows ...     │
│                              │
├──────────────────────────────┤
│ [Close Event]                │  ← Only for park_admin/park_lead
└──────────────────────────────┘
```

**Row Interaction — The Status Toggle:**

When the user taps a participant's row (or specifically the status button on the right), a status picker appears. There are two interaction models (implemented together):

**Model A: Quick Cycle Tap** (default, fastest)
- Tapping the status button cycles through: `null → present → absent → late → excused → null`
- Each tap immediately saves (online) or queues (offline) and updates the button.
- A subtle haptic vibration (`navigator.vibrate(10)`) fires on each tap for tactile feedback.

**Model B: Status Picker Sheet** (long-press or expand)
- Long-pressing the row opens a bottom sheet with four large buttons:
```
┌──────────────────────────────┐
│   Mark: Ahmed Ali            │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │      ✅ Present         │  │  ← 56px tall, green bg
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │      🔴 Absent          │  │  ← 56px tall, red bg
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │      🟡 Late            │  │  ← 56px tall, amber bg
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │      🔵 Excused         │  │  ← 56px tall, blue bg
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │      Cancel             │  │  ← 44px tall
│  └────────────────────────┘  │
└──────────────────────────────┘
```
- This is for users who prefer explicit selection over cycling.

**Status Button Colors:**

| Status | Background | Text | Icon |
|--------|-----------|------|------|
| `null` (unmarked) | `bg-muted` | `—` | `Circle` (Lucide, outline) |
| `present` | `bg-green-100 dark:bg-green-900/30` | `P` | `CheckCircle2` (filled green) |
| `absent` | `bg-red-100 dark:bg-red-900/30` | `A` | `XCircle` (filled red) |
| `late` | `bg-amber-100 dark:bg-amber-900/30` | `L` | `Clock` (filled amber) |
| `excused` | `bg-sky-100 dark:bg-sky-900/30` | `E` | `ShieldCheck` (filled sky) |

**Mobile-First Sizing:**

- Row height: minimum `48px` (exceeds 44px WCAG touch target guideline)
- Status button: `44px × 44px` minimum
- Font size: participant name `16px` (`text-base`), status letter `14px` (`text-sm`) bold
- Search input: `48px` height
- Summary badges: `44px × 44px`
- Bottom sheet buttons: `56px` height

**Offline Indicator:**

When the device is offline, a persistent bar appears at the top of the roster:

```
┌──────────────────────────────────────┐
│ 📴 You're offline. Marks will sync   │
│    automatically when connected.     │
│    3 marks queued.                   │
└──────────────────────────────────────┘
```

- Background: `bg-amber-100 dark:bg-amber-900/40`
- This bar is always visible when offline, not dismissible.
- It shows the current pending count from Dexie.

**Sync Status Per Row:**

When a mark is made while offline, the status button shows a small sync icon overlay:

```
┌────────────────────────────────┐
│  Ahmed Ali               🟢 P ↻ │  ← ↻ = queued, not yet synced
└────────────────────────────────┘
```

After successful sync, the `↻` icon disappears. If sync failed, it changes to `⚠` with a red tint.

**Optimistic Updates:**

1. User taps status → button immediately shows new status + sync icon (`↻`).
2. If online: fire `POST /api/park/attendance/[eventId]`. On success, remove sync icon. On failure, queue to Dexie and keep sync icon.
3. If offline: queue to Dexie immediately, show sync icon.

**Search and Quick-Scroll:**

- The search input filters the visible list by participant name (case-insensitive, Urdu-compatible if names include Urdu characters).
- On the right edge of the list, an alphabetical quick-scroll index appears when the list has 10+ participants. Tapping a letter scrolls to that section.
- The search bar supports a "Show unmarked only" toggle button (filter icon) to quickly find participants who haven't been marked yet.

**Pull-to-Refresh:**

- Standard pull-to-refresh gesture on the roster list.
- Triggers a re-fetch of the roster data from the server AND initiates sync of any pending offline items.

**Summary Bar:**

The summary bar at the top shows live counts that update as marks are made:

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  12  │ │  3   │ │  0   │ │  6   │
│  P   │ │  L   │ │  A/E │ │  —   │
│resent│ │  ate  │ │bsnt/ │ │Unmkd │
└──────┘ └──────┘ └──────┘ └──────┘
```

- Present count (green)
- Late count (amber)
- Absent + Excused count (red/sky)
- Unmarked count (gray) — this number decreasing is the user's goal

**Event Closed State:**

When the event is closed, the entire roster becomes read-only:

```
┌──────────────────────────────────────┐
│  ← Back   Group A - Morning          │
│  🔒 Event Closed at 8:30 PM         │
│  Closed by: Br. Usman                │
├──────────────────────────────────────┤
│ (summary badges shown, but no        │
│  interactive elements)               │
├──────────────────────────────────────┤
│  Ahmed Ali                      🟢 P │  ← Non-interactive
│  Bilal Hassan                   🔴 A │  ← Non-interactive
│  ...                               │
└──────────────────────────────────────┘
```

- No status buttons are tappable.
- No search bar (or search is still visible but list is not filterable).
- A banner at the top indicates the event is closed with timestamp and closer name.
- Park admin/park_lead see an "Edit Record" option (opens the record with an edit reason dialog).

---

### 4. Offline Queue Panel

**Component:** `src/components/modules/park/offline-queue-panel.tsx`

A panel (collapsible, accessible from the dashboard and the roster screen's bottom bar) that shows the state of the offline queue.

**Layout (Expanded):**

```
┌──────────────────────────────────┐
│  Offline Queue                   │
│  ──────────────────────────────  │
│                                  │
│  ⏳ 3 Pending  │  ❌ 1 Failed    │
│                                  │
│  [🔄 Retry All] [🗑️ Clear Done] │
│                                  │
│  Pending:                        │
│  ┌────────────────────────────┐  │
│  │ Ahmed Ali → Present        │  │
│  │ Group A • Queued 6:15 PM   │  │
│  │ [Retry]                    │  │
│  ├────────────────────────────┤  │
│  │ Bilal Hassan → Absent      │  │
│  │ Group A • Queued 6:16 PM   │  │
│  │ [Retry]                    │  │
│  ├────────────────────────────┤  │
│  │ Daniyal Khan → Late        │  │
│  │ Group A • Queued 6:22 PM   │  │
│  │ [Retry]                    │  │
│  └────────────────────────────┘  │
│                                  │
│  Failed (after 5 retries):       │
│  ┌────────────────────────────┐  │
│  │ Farhan Siddiqui → Present  │  │
│  │ Group A • Error: Network   │  │
│  │ [Retry] [Remove]           │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Key Behaviors:**

- Shows counts of pending and failed items.
- "Retry All" button: resets all failed items to `pending` state and triggers the sync worker.
- "Clear Done" button: deletes all `synced` items from Dexie (housekeeping).
- Each pending item shows: participant name, status being applied, queue timestamp.
- Failed items show the error message and have both "Retry" (reset to pending) and "Remove" (delete from queue) buttons.
- Items that are currently `syncing` show a spinner animation.
- Uses Dexie's `useLiveQuery` hook for reactive updates.
- A red badge on the dashboard's "Offline Queue" link shows the count of `pending + failed` items.

**Sync Animation:**

When the sync worker is actively processing, a subtle progress indicator appears:

```
🔄 Syncing... 3/5 processed
```

---

### 5. Event Close Confirmation Dialog

**Component:** `src/components/modules/park/event-close-dialog.tsx`

A confirmation dialog shown when a park_admin or park_lead taps "Close Event."

**Layout:**

```
┌──────────────────────────────────┐
│                                  │
│     🔒 Close Event?              │
│                                  │
│  Are you sure you want to close  │
│  this attendance event?          │
│                                  │
│  Group A - Morning               │
│  12/18 participants marked       │
│                                  │
│  ⚠️ 6 participants are unmarked. │
│  They will remain without a      │
│  record for this session.        │
│                                  │
│  Reason (required):              │
│  ┌────────────────────────────┐  │
│  │ Session completed          │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌──────────┐ ┌──────────────┐  │
│  │  Cancel  │ │ Close Event  │  │
│  └──────────┘ └──────────────┘  │
└──────────────────────────────────┘
```

**Key Behaviors:**

- Shows a warning if any participants are unmarked (with the count).
- Requires a reason (text input) — this is sent to the server and stored in the audit log.
- "Close Event" button is red/destructive styled.
- On success, navigates back to the events list and shows a success toast.
- Uses the shared `ConfirmDialog` component as a base but extends it with the reason input and unmarked warning.
- Only renders for `park_admin` and `park_lead` roles (check `useAuthStore`).

---

## Complete Task Breakdown

### Task 1: Dexie Database Setup and Schema for Offline Queue

**File:** `src/lib/offline/db.ts`

- Install `dexie` package (`bun add dexie`).
- Create `ShababOfflineDB` class extending `Dexie`.
- Define version 1 with `queue` table: indexed on `mutationId` (PK), `eventId`, `participantId`, `state`, `queuedAt`.
- Export the singleton `offlineDB` instance.
- Export the `OfflineQueueItem` TypeScript interface.
- Write a unit test that creates the DB, adds an item, reads it back, and deletes it.

### Task 2: Offline Queue Store (Zustand)

**File:** `src/stores/useOfflineStore.ts`

- Create a Zustand store for managing offline queue state.
- State: `pendingCount: number`, `failedCount: number`, `isSyncing: boolean`, `lastSyncError: string | null`.
- Actions:
  - `addItem(item: Omit<OfflineQueueItem, 'queuedAt' | 'retryCount' | 'lastError' | 'syncedAt' | 'state'>)` — generates `mutationId` via `crypto.randomUUID()`, sets `state: 'pending'`, `queuedAt: new Date().toISOString()`, inserts into Dexie.
  - `removeItem(mutationId: string)` — deletes from Dexie.
  - `retryFailed()` — updates all `failed` items to `pending` in Dexie, clears `lastError`.
  - `clearSynced()` — deletes all `synced` items from Dexie.
  - `refreshCounts()` — reads `pending` and `failed` counts from Dexie, updates state.
  - `setSyncing(isSyncing: boolean)` — updates sync state.
  - `setLastSyncError(error: string | null)` — stores last sync error.
- Subscribe to Dexie changes using `offlineDB.queue.hook('create', ...)` etc. to auto-refresh counts.
- Ensure `mutationId` is generated with `crypto.randomUUID()` — never on the server.

### Task 3: Online/Offline Detection Hook

**File:** `src/hooks/use-online-status.ts`

- Create a custom hook `useOnlineStatus()` that returns `{ isOnline: boolean }`.
- Listen to `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`.
- Initialize with `navigator.onLine`.
- Debounce state changes by 500ms to avoid rapid toggling.
- On transition from offline to online: automatically trigger `useOfflineStore.getState().syncNow()` (defined in Task 10).

### Task 4: Park Dashboard API

**File:** `src/app/api/park/dashboard/route.ts`

- Implement `GET` handler.
- Authorize: `park_admin`, `park_lead`, `murabbi`.
- Scope: derive park from `assignedParkId` (admin/lead) or from `assignedGroupId → group → batch → park` (murabbi).
- Compute today's date in PKT using `src/lib/timezone.ts` utilities.
- Query events, counts, and recent summary.
- Return JSON response matching the schema defined above.
- Validate with Zod response schema.

### Task 5: Park Dashboard UI

**File:** `src/components/modules/park/park-dashboard.tsx`

- Create the Park Dashboard screen component.
- Use `useQuery` with `queryKey: ['park-dashboard', parkId]` to fetch from `GET /api/park/dashboard`.
- Merge server data with offline queue counts from `useOfflineStore`.
- Render: park name, stat cards, attention items, next action button, today's events list, offline queue panel.
- Use `DataCard` (shared component) for the stat cards.
- Use `Framer Motion` for staggered card entrance animation.
- Handle loading state with `LoadingState`.
- Handle error state with `ErrorState` + retry button.

### Task 6: Today's Events List API

**File:** `src/app/api/park/attendance/route.ts`

- Implement `GET` handler for listing events.
- Query params: `parkId` (required), `date` (optional, default today PKT), `status` (optional filter).
- Scope: same logic as dashboard.
- For each event, compute `markedCount`, `presentCount`, `absentCount`, `lateCount`, `excusedCount` via sub-queries or a single aggregation query.
- Return JSON response matching the schema.

### Task 7: Today's Events List UI

**File:** `src/components/modules/park/today-events-board.tsx`

- Create the Today's Events Board component.
- Use `useQuery` with `queryKey: ['park-events', parkId, date]`.
- Render filter chips (All / Open / Closed) using shadcn `ToggleGroup`.
- Render event cards with: status indicator, group name, participant count, marked count, progress bar.
- Progress bar component: use shadcn `Progress` or build a simple div-based bar with color thresholds.
- Action button navigates to roster (`navigateTo('attendance-roster', { eventId })`).
- Auto-refetch every 30 seconds via `refetchInterval`.
- Empty state: "No events scheduled for today" using `EmptyState` component.

### Task 8: Attendance Roster API (Get Event + Participants + Current Records)

**File:** `src/app/api/park/attendance/[eventId]/route.ts`

- Create the dynamic route directory and `route.ts`.
- Implement `GET` handler for fetching roster data.
- Scope-check: verify the event's group belongs to the user's scope.
- Query: fetch event + group, fetch all active participants (ordered by name), fetch all attendance records for the event.
- Join participants with records (use a Map keyed by `participantId` for O(n) lookup).
- Compute summary counts.
- Return JSON with `event`, `roster[]`, and `summary` objects.

### Task 9: Attendance Roster UI (The Main Marking Screen)

**File:** `src/components/modules/park/attendance-roster.tsx`

- **This is the most important single component in the entire application.**
- Use `useQuery` with `queryKey: ['attendance-roster', eventId]`.
- Merge server-returned records with pending offline queue items from Dexie (if an item is queued for a participant, show the queued status, not the server status).
- Render: header with back button + event name + offline indicator, summary badges, search bar, participant list, bottom action bar.
- Each participant row: `48px` minimum height, name on left, status button (`44px × 44px`) on right.
- Implement quick-cycle tap (toggle through statuses on tap).
- Implement long-press → status picker bottom sheet.
- On status change: call the marking function (Task 10 or 11).
- Optimistic UI: update local state immediately, show sync icon on the button.
- Search: filter visible rows by name. "Unmarked only" toggle.
- Quick-scroll alphabetical index (conditional on 10+ participants).
- Pull-to-refresh using a touch event handler or a library.
- Closed event: disable all interactions, show closed banner.
- Use `useOnlineStatus()` hook to show/hide the offline indicator bar.

### Task 10: Online Attendance Marking (Direct API Call)

**File:** `src/lib/attendance/mark-attendance.ts`

- Create a function `markAttendanceOnline(params: { eventId: string; participantId: string; status: AttendanceStatus; editReason?: string }): Promise<MarkResult>`.
- Generate `mutationId` with `crypto.randomUUID()`.
- Call `POST /api/park/attendance/[eventId]` with the body.
- On success: return the record.
- On failure: fall through to offline queue (Task 11) — the caller should handle this.
- Include proper error typing.

### Task 11: Offline Attendance Marking (Queue to Dexie)

**File:** `src/lib/attendance/queue-attendance.ts`

- Create a function `markAttendanceOffline(params: { eventId: string; participantId: string; status: AttendanceStatus })`.
- Generate `mutationId` with `crypto.randomUUID()`.
- Insert into Dexie via `useOfflineStore.getState().addItem(...)`.
- Return the `mutationId` for reference.
- This is called when `navigator.onLine === false` or when the online call fails.

### Task 12: Sync Worker

**File:** `src/lib/attendance/sync-worker.ts`

- Create an async function `syncOfflineQueue()`.
- Fetch all items with `state === 'pending'` from Dexie.
- If none, return early.
- Set `isSyncing: true` in the store.
- For each item (or in batches of up to 50), set `state: 'syncing'` in Dexie.
- Call `POST /api/park/attendance/sync` with the batch.
- Process results:
  - For each `status: 'processed'`: update Dexie item to `state: 'synced'`, set `syncedAt`.
  - For each `status: 'failed'`: update Dexie item to `state: 'failed'`, increment `retryCount`, set `lastError`. If `retryCount >= MAX_RETRIES` (5), leave as failed permanently.
- Set `isSyncing: false` in the store.
- If any items failed, set `lastSyncError` in the store.
- After sync, auto-clean: delete all `synced` items older than 1 hour.
- Expose `syncNow()` as a public function callable from the hook and the UI.

### Task 13: Sync Result Handling (Remove Processed, Keep Failed)

**File:** (integrated into `src/lib/attendance/sync-worker.ts` and `src/stores/useOfflineStore.ts`)

- After sync completes, Dexie live queries automatically update the UI counts.
- `synced` items are cleaned up (deleted from Dexie after 1 hour).
- `failed` items persist with visible error messages.
- The offline queue panel re-renders reactively via Dexie's `useLiveQuery`.

### Task 14: Queue Health Display (Pending Count, Failed Count)

**Files:** `src/components/modules/park/offline-queue-panel.tsx`, `src/components/business/queue-health-badge.tsx`

- Create `QueueHealthBadge`: a small badge component showing `⏳ 3` (pending) or `❌ 1` (failed).
- Use Dexie's `useLiveQuery` for reactive counts.
- Badge is shown in:
  - Dashboard's offline queue section header.
  - Roster screen's header (next to offline indicator).
  - App shell's bottom navigation (if applicable).
- Badge is hidden when counts are 0.

### Task 15: Event Close Functionality (API + UI)

**Files:** `src/app/api/park/attendance/[eventId]/close/route.ts`, `src/components/modules/park/event-close-dialog.tsx`

- Implement `PATCH /api/park/attendance/[eventId]/close`.
- Authorize: `park_admin`, `park_lead` only. Reject `murabbi`.
- Require `reason` field in request body.
- Update event: `isClosed: true`, `closedAt: now`, `closedBy: staffMetaId`.
- Audit log the action.
- UI: `EventCloseDialog` component (described above) triggered from the roster's bottom bar.
- On success: invalidate the roster query, show toast, navigate back to events list.

### Task 16: Attendance Record Upsert with Idempotency

**Files:** `src/app/api/park/attendance/[eventId]/route.ts`, `src/app/api/park/attendance/sync/route.ts`

- Implement `POST /api/park/attendance/[eventId]` for single record upsert.
- Implement `POST /api/park/attendance/sync` for batch upsert.
- Both use `prisma.attendanceRecord.upsert()` with the `eventId_participantId` unique constraint.
- The `mutationId` is accepted in the request body but the actual deduplication is handled by the database unique constraint on `[eventId, participantId]`. The `mutationId` is stored/logged for audit purposes but not used as a database-level idempotency key (SQLite doesn't support conditional conflict resolution as elegantly as Postgres, so the unique constraint on the composite key is the primary guard).
- On upsert create: set `markedAt` from the request's `markedAt` field (preserves the original offline timestamp).
- On upsert update: update `status` and `markedAt`, require `editReason` if the record already existed.

### Task 17: PKT Timezone Handling for "Today" Events

**File:** `src/lib/timezone.ts` (extend existing)

- Add helper function `getTodayPKT(): string` — returns today's date in `YYYY-MM-DD` format based on `Asia/Karachi` timezone.
- Add helper function `toPKT(utcDate: Date): string` — formats a UTC Date in PKT.
- Add helper function `fromPKT(pktDateString: string): { start: Date; end: Date }` — converts a PKT date string to a UTC range for querying. For example, `2025-07-15` in PKT becomes `2025-07-14T19:00:00.000Z` to `2025-07-15T19:00:00.000Z` in UTC (PKT is UTC+5, no DST).
- All API routes that filter by "today" MUST use `fromPKT(getTodayPKT())` for the date range.
- All UI date displays MUST use `toPKT()` for formatting.

### Task 18: Pull-to-Refresh for Roster

**File:** `src/hooks/use-pull-to-refresh.ts`

- Create a `usePullToRefresh(onRefresh: () => Promise<void>)` hook.
- Listen to `touchstart`, `touchmove`, `touchend` events on the target element.
- When the user pulls down beyond a threshold (60px), show a refresh indicator.
- On release: call `onRefresh()`, show a loading spinner, hide indicator when complete.
- `onRefresh` for the roster: invalidate TanStack Query cache for `['attendance-roster', eventId]` AND call `syncNow()`.
- For the dashboard: invalidate `['park-dashboard', parkId]` AND call `syncNow()`.

### Task 19: Auto-Sync When Coming Back Online

**File:** `src/hooks/use-online-status.ts` (extend from Task 3)

- When the `online` event fires:
  1. Set a 2-second debounce (avoid triggering sync during brief connectivity blips).
  2. After debounce, call `syncNow()` from the sync worker.
  3. Show a brief toast: "Back online. Syncing 3 marks..."
  4. After sync completes, show a success/error toast.
- This is handled in the `useOnlineStatus` hook's effect, which calls `useOfflineStore.getState().syncNow()`.

### Task 20: Roster Search and Quick-Scroll

**Files:** `src/components/modules/park/attendance-roster.tsx` (integrated)

- **Search:** A text input at the top of the roster list. Uses local state to filter the rendered participant array. Case-insensitive matching on `participantName`. Updates on every keystroke (debounced by 150ms). Shows "No matching participants" empty state when filter yields zero results.
- **Filter toggle:** A button/icon next to the search input to toggle "Unmarked only" mode. When active, only participants with `status === null` are shown.
- **Quick-scroll:** When the roster has ≥ 10 participants, render an alphabetical index strip on the right edge of the screen. Each letter is a small (20px) tappable button. On tap, scroll the roster list to the first participant whose name starts with that letter. Use `element.scrollIntoView({ behavior: 'smooth' })`.
- **Keyboard support:** On desktop, the search input is auto-focused. Arrow keys navigate between rows. Space/Enter toggles the status.

---

## Dependencies

| Dependency | Type | Description |
|-----------|------|-------------|
| Module 1: Auth & Foundation | Hard | Provides authentication (NextAuth session), `requireRole()` authorization, `AuditLog` model, `User`/`StaffMeta` models for scope resolution. |
| Module 2: City Operations | Hard | Provides `City`, `Park`, `Batch`, `Group`, `Participant` models. The attendance roster needs groups and participants. Events are scoped to parks via the batch → park relationship. |
| `dexie` (npm) | New package | IndexedDB wrapper for offline queue. Must be installed: `bun add dexie`. |
| `uuid` or `crypto.randomUUID()` | Built-in | For generating `mutationId` UUIDs. Use `crypto.randomUUID()` (available in modern browsers and Node 19+) — no extra package needed. |

### Integration Points

1. **Auth session → API routes:** Every park API route calls `getServerSession(authOptions)` and checks role + scope via `authorize()`.
2. **StaffMeta → scope resolution:** The `assignedParkId` and `assignedGroupId` fields on `StaffMeta` determine which events a user can see and modify.
3. **Group → Participants:** The roster query joins `Group` → `Participant` (where `state = 'active'`).
4. **AttendanceEvent → Group → Batch → Park:** The scope chain for authorization: event belongs to a group, group belongs to a batch, batch belongs to a park.
5. **TanStack Query cache:** When attendance is marked (online or after sync), invalidate the `['attendance-roster', eventId]` and `['park-events', parkId, date]` query keys to refresh the UI.
6. **AppRouter (SPA):** The roster screen is rendered when `useAppStore(s => s.currentPage) === 'attendance-roster'` and `useAppStore(s => s.selectedEventId)` is set.

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Park user sees today's events immediately on login | Login as `park_admin`, verify the Park Dashboard loads with today's events within 2 seconds. |
| 2 | Tapping an event opens the roster | Tap "Mark Attendance" on an event card. Verify the Attendance Roster screen renders with all participants. |
| 3 | Marking attendance works online (instant save) | With network active, tap a participant's status button. Verify: (a) button updates immediately, (b) no sync icon appears (or it flashes briefly and disappears), (c) refresh the page — the mark persists. |
| 4 | Marking attendance works offline (queued, synced later) | Enable airplane mode. Tap a participant's status. Verify: (a) button updates to new status, (b) sync icon appears, (c) offline indicator bar appears. Disable airplane mode. Verify: (a) auto-sync triggers, (b) sync icon disappears, (c) mark is persisted on server (check DB). |
| 5 | Sync shows clear status (pending/synced/failed) | Queue 3 items offline. Go to Offline Queue Panel. Verify counts match. Come online. Watch counts update: pending → 0, synced → 3. |
| 6 | Failed items can be retried | Simulate a server error (e.g., stop the server). Queue an item. Watch it fail. Verify it appears in "Failed" section. Tap "Retry". Restart server. Tap "Retry" again. Verify it succeeds. |
| 7 | Only participants in the event's group appear | Open a roster for Group A. Verify no participants from Group B are listed. Check the API response. |
| 8 | Murabbi only sees their group's events | Login as a `murabbi` assigned to Group A. Verify the dashboard only shows Group A's event. Verify the events list only has Group A. Attempt to access Group B's event by ID — verify 403. |
| 9 | Closed events cannot be marked (except by authorized roles) | As `murabbi`: open a closed event's roster. Verify all status buttons are disabled. As `park_admin`: verify you can see an "Edit" option but it requires an `editReason`. |
| 10 | Mobile layout is excellent (large touch targets, readable text) | Open the app on a 375px-wide viewport (iPhone SE). Verify: (a) all status buttons are ≥ 44px, (b) participant names are readable at 16px, (c) no horizontal scrolling, (d) bottom action bar is always visible, (e) the status picker bottom sheet is easy to use with one hand. |
| 11 | "Today" is correct for PKT timezone | Set the device timezone to UTC. Verify "today's events" shows events for the PKT date, not the UTC date. Test near midnight UTC (which is 5 AM PKT). |
| 12 | Idempotency — duplicate syncs don't create duplicate records | Sync a queued item. Then manually re-sync the same item (simulating a retry of an already-processed mutation). Verify only one `AttendanceRecord` exists for that event+participant combo. |
| 13 | Pull-to-refresh works on roster | Pull down on the roster list. Verify the refresh indicator appears. Verify data re-fetches. |
| 14 | Search filters participants | Type a name in the search bar. Verify only matching participants are shown. |
| 15 | Summary counts update in real-time | Mark 3 participants as present. Verify the summary badge for "Present" increments from N to N+3 and "Unmarked" decrements accordingly. |

---

## Files to Create/Modify

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/offline/db.ts` | Dexie database class, `OfflineQueueItem` interface |
| 2 | `src/stores/useOfflineStore.ts` | Zustand store for offline queue management |
| 3 | `src/hooks/use-online-status.ts` | Online/offline detection hook with auto-sync trigger |
| 4 | `src/hooks/use-pull-to-refresh.ts` | Pull-to-refresh gesture hook |
| 5 | `src/lib/attendance/mark-attendance.ts` | Online attendance marking function |
| 6 | `src/lib/attendance/queue-attendance.ts` | Offline attendance queueing function |
| 7 | `src/lib/attendance/sync-worker.ts` | Batch sync worker (Dexie → server) |
| 8 | `src/lib/attendance/types.ts` | Shared attendance types (`AttendanceStatus`, `MarkResult`, etc.) |
| 9 | `src/app/api/park/dashboard/route.ts` | Park dashboard API endpoint |
| 10 | `src/app/api/park/attendance/route.ts` | Today's events list API endpoint |
| 11 | `src/app/api/park/attendance/[eventId]/route.ts` | Roster data + single mark API endpoint |
| 12 | `src/app/api/park/attendance/[eventId]/close/route.ts` | Event close API endpoint |
| 13 | `src/app/api/park/attendance/sync/route.ts` | Batch sync API endpoint |
| 14 | `src/components/modules/park/park-dashboard.tsx` | Park Dashboard screen |
| 15 | `src/components/modules/park/today-events-board.tsx` | Today's Events Board component |
| 16 | `src/components/modules/park/attendance-roster.tsx` | **Attendance Roster screen (key screen)** |
| 17 | `src/components/modules/park/attendance-roster-row.tsx` | Single participant row in the roster |
| 18 | `src/components/modules/park/status-picker-sheet.tsx` | Bottom sheet for status selection |
| 19 | `src/components/modules/park/offline-queue-panel.tsx` | Offline queue panel (collapsible) |
| 20 | `src/components/modules/park/event-close-dialog.tsx` | Event close confirmation dialog |
| 21 | `src/components/business/queue-health-badge.tsx` | Reusable queue health badge |
| 22 | `src/components/business/attendance-summary-bar.tsx` | Reusable attendance summary bar (P/L/A/E/— counts) |

### Modified Files

| # | File | Change |
|---|------|--------|
| 1 | `prisma/schema.prisma` | Add `@@index([groupId, eventDate])` and `@@index([eventDate])` to `AttendanceEvent`; add `@@index([eventId])` and `@@index([participantId])` to `AttendanceRecord` |
| 2 | `src/lib/timezone.ts` | Add `getTodayPKT()`, `toPKT()`, `fromPKT()` helpers |
| 3 | `src/types/api.ts` | Add attendance-related API response types (dashboard, roster, sync result) |
| 4 | `src/types/index.ts` | Add `AttendanceStatus` type union, `OfflineQueueItem` re-export |
| 5 | `src/stores/useAppStore.ts` | Add `selectedEventId` to navigation context if not already present |
| 6 | `src/components/layout/app-shell.tsx` | Register park module pages in the `PageRenderer` |
| 7 | `package.json` | Add `dexie` dependency |

---

## Implementation Order

The tasks should be implemented in this sequence, as later tasks depend on earlier ones:

```
Phase A — Foundation (Tasks 1-3)
  1. Dexie DB setup
  2. Offline queue store (Zustand)
  3. Online/Offline detection hook

Phase B — Backend (Tasks 4, 6, 8, 15, 16, 17)
  4. Park dashboard API
  6. Today's events list API
  8. Attendance roster API
  16. Attendance record upsert with idempotency
  17. PKT timezone handling
  15. Event close API

Phase C — Core Frontend (Tasks 5, 7, 9, 10, 11)
  5. Park dashboard UI
  7. Today's events list UI
  9. Attendance roster UI
  10. Online attendance marking
  11. Offline attendance marking

Phase D — Sync & Polish (Tasks 12, 13, 14, 18, 19, 20)
  12. Sync worker
  13. Sync result handling
  14. Queue health display
  18. Pull-to-refresh
  19. Auto-sync when coming back online
  20. Roster search and quick-scroll
```

**Estimated Total Tasks:** 20
**Critical Path:** Tasks 1 → 2 → 9 → 10/11 → 12 → 19 (the offline marking + sync loop)