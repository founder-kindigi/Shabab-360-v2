# Module 10: Family Portals (Guardian & Student)

> **Module ID:** 10
> **Priority:** P2
> **Phase:** 4 (Support Systems)
> **Parallel Group:** B (alongside Modules 4, 6, 9)
> **Status:** Ready for implementation

---

## 1. Module Overview

This module provides read-only web portals for two external-facing roles: **Guardians** and **Students**. These portals give family members visibility into attendance, fee payments, schedules, and announcements without any ability to create, update, or delete data.

### 1.1 Business Context

Parents and guardians of Shabab participants need a simple way to track their children's engagement. Similarly, students benefit from seeing their own attendance records and fee status. Both portals prioritize simplicity and mobile-friendliness — these users are not staff and need a minimal, intuitive interface.

### 1.2 Design Principles

- **Read-only everywhere.** No create, update, or delete operations. No forms, no modals, no action buttons.
- **Data isolation is absolute.** A guardian sees only their linked children. A student sees only their own data. Cross-access is impossible.
- **Mobile-first.** Guardians and students primarily use phones. The layout must work perfectly on 375px+ viewports.
- **Simple navigation.** A condensed sidebar (4-5 items) or bottom tab bar appropriate for the screen size.
- **Reuse aggressively.** Announcement feeds, status badges, and data display components are borrowed from earlier modules.

### 1.3 Role Descriptions

| Role | Landing Workspace | Scope |
|------|-------------------|-------|
| **Guardian** (`guardian`) | Guardian Portal | All participants linked via `guardian_children` table |
| **Student** (`student`) | Student Portal | Only the `Participant` record tied to their `User` account |

---

## 2. Dependencies

This module reads data from tables created and populated by earlier modules. It introduces **no new database tables**.

| Module | Dependency Type | What Is Required |
|--------|----------------|------------------|
| **Module 1** (Auth & Foundation) | Hard | `User` model, NextAuth session, `authorize()` helper, `AppShell`, `Sidebar` |
| **Module 2** (City Operations) | Hard | `Guardian`, `GuardianChild`, `Participant`, `Group`, `Batch`, `Park`, `City` models |
| **Module 3** (Park Attendance) | Hard | `AttendanceEvent`, `AttendanceRecord` models |
| **Module 6** (Fees & Payments) | Hard | `FeeEvent`, `Payment` models |
| **Module 8** (Announcements) | Soft | `Announcement` model, announcement feed component |

### Dependency Graph

```
Module 1 (Auth)
  └── Module 2 (City Ops)
        ├── Module 3 (Attendance)
        │     └── Module 10 (Family Portals) ← you are here
        ├── Module 6 (Fees)
        │     └── Module 10
        └── Module 8 (Announcements)
              └── Module 10
```

---

## 3. Database Schema

No new tables. This module queries existing tables:

### 3.1 Tables Read

| Table | Usage in This Module |
|-------|---------------------|
| `users` | Look up the authenticated user's `id`, resolve to `guardian` or `participant` |
| `guardians` | Fetch guardian profile and verify `isActive` |
| `guardian_children` | Resolve which participants a guardian can access; enforce isolation |
| `participants` | Student self-lookup; guardian child data (name, group, park) |
| `groups` | Group name and batch linkage for display |
| `batches` | Batch name for display |
| `parks` | Park name for display |
| `cities` | City name for display |
| `attendance_events` | Upcoming schedule (future `eventDate`, not yet closed) |
| `attendance_records` | Historical attendance for a participant (status: present/absent/late/excused) |
| `fee_events` | Fee items a participant owes (admission, monthly, event fees) |
| `payments` | Payment records for a participant (amount, method, receipt, date) |
| `announcements` | Announcements scoped to `guardians`, `students`, or `all` audience |

### 3.2 Key Relationships for Data Isolation

```
Guardian Portal Access Path:
  User.id → Guardian.userId → Guardian.id → GuardianChild.guardianId → GuardianChild.participantId → Participant

Student Portal Access Path:
  User.id → Participant.userId → Participant.id (self only)

Announcement Scoping:
  audience IN ('guardians', 'all') AND (cityId IS NULL OR cityId = guardian's city)
  audience IN ('students', 'all') AND (cityId IS NULL OR cityId = student's city)
```

---

## 4. API Endpoints

All endpoints are **GET-only**. Every endpoint validates the session and enforces data isolation before returning any data.

### 4.1 Guardian Endpoints

#### `GET /api/guardian/profile`

Returns the guardian's own profile and a summary of each linked child.

**Authorization:** `guardian` role only.

**Response:**

```json
{
  "guardian": {
    "id": "clx...",
    "name": "Muhammad Ali",
    "phone": "03001234567",
    "cnic": "35201-1234567-1",
    "address": "House 12, Street 5, Lahore"
  },
  "children": [
    {
      "id": "clx...",
      "participantId": "clx...",
      "name": "Ahmad Ali",
      "relation": "father",
      "group": { "id": "clx...", "name": "Group A" },
      "batch": { "id": "clx...", "name": "Jan-Jun 2025" },
      "park": { "id": "clx...", "name": "Jinnah Park", "city": "Lahore" },
      "attendanceSummary": {
        "total": 24,
        "present": 20,
        "absent": 2,
        "late": 2,
        "excused": 0,
        "percentage": 83.3
      },
      "feeSummary": {
        "totalDue": 3000,
        "totalPaid": 2500,
        "outstanding": 500
      }
    }
  ]
}
```

**Implementation Notes:**
- Query `Guardian` with `userId = session.user.id`.
- Include `GuardianChild` → `Participant` → `Group` → `Batch` → `Park` → `City`.
- For each child, compute attendance summary: count `AttendanceRecord` grouped by `status` for the active batch.
- For each child, compute fee summary: sum `FeeEvent.amount` as `totalDue`, sum `Payment.amount` as `totalPaid`, difference as `outstanding`. Only include active `FeeEvent` records.

---

#### `GET /api/guardian/children/[childId]/attendance`

Returns the attendance history for a specific linked child.

**Authorization:** `guardian` role. **MUST verify** `GuardianChild` exists linking this guardian to `childId`. Returns `403` if not linked.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Records per page (max 50) |

**Response:**

```json
{
  "child": {
    "id": "clx...",
    "name": "Ahmad Ali"
  },
  "summary": {
    "total": 24,
    "present": 20,
    "absent": 2,
    "late": 2,
    "excused": 0,
    "percentage": 83.3
  },
  "records": [
    {
      "id": "clx...",
      "eventTitle": "Session 12",
      "eventDate": "2025-03-15T00:00:00Z",
      "status": "present",
      "markedAt": "2025-03-15T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "totalPages": 2
  }
}
```

**Implementation Notes:**
- First verify the guardian-child link: `GuardianChild` where `guardianId = guardian.id` AND `participantId = childId`.
- Query `AttendanceRecord` with `participantId = childId`, include `AttendanceEvent` for title and date.
- Order by `AttendanceEvent.eventDate DESC`.
- Compute summary counts from all records (not just the current page).

---

#### `GET /api/guardian/children/[childId]/fees`

Returns fee and payment history for a specific linked child.

**Authorization:** `guardian` role. **MUST verify** `GuardianChild` link. Returns `403` if not linked.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Records per page (max 50) |

**Response:**

```json
{
  "child": {
    "id": "clx...",
    "name": "Ahmad Ali"
  },
  "summary": {
    "totalDue": 3000,
    "totalPaid": 2500,
    "outstanding": 500
  },
  "feeEvents": [
    {
      "id": "clx...",
      "title": "Monthly Fee - March 2025",
      "feeType": "monthly",
      "amount": 500,
      "dueDate": "2025-03-10T00:00:00Z",
      "paidAmount": 500,
      "status": "paid",
      "payments": [
        {
          "id": "clx...",
          "amount": 500,
          "method": "cash",
          "receiptNo": "RCPT-2025-0042",
          "paidAt": "2025-03-08T11:30:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "totalPages": 1
  }
}
```

**Implementation Notes:**
- Verify guardian-child link first.
- Query `FeeEvent` for the child's batch (via `Participant.group.batch.feeEvents`).
- For each `FeeEvent`, sum `Payment.amount` where `participantId = childId`.
- Derive `status`: `paid` if `paidAmount >= amount`, `partial` if `paidAmount > 0`, `unpaid` if `paidAmount === 0`.
- Order by `FeeEvent.dueDate DESC`.

---

#### `GET /api/guardian/children/[childId]/schedule`

Returns upcoming events for a specific linked child.

**Authorization:** `guardian` role. **MUST verify** `GuardianChild` link. Returns `403` if not linked.

**Response:**

```json
{
  "child": {
    "id": "clx...",
    "name": "Ahmad Ali"
  },
  "events": [
    {
      "id": "clx...",
      "title": "Session 25",
      "eventDate": "2025-04-01T00:00:00Z",
      "isClosed": false
    }
  ]
}
```

**Implementation Notes:**
- Verify guardian-child link first.
- Query `AttendanceEvent` for the child's group where `eventDate >= NOW()` and `isClosed = false`.
- Order by `eventDate ASC`.
- Only return future or today's events.

---

#### `GET /api/guardian/announcements`

Returns announcements scoped for guardians.

**Authorization:** `guardian` role.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Records per page (max 20) |

**Response:**

```json
{
  "announcements": [
    {
      "id": "clx...",
      "title": "Spring Break Schedule",
      "body": "Sessions will be paused from March 20 to March 30.",
      "cityName": "Lahore",
      "parkName": "Jinnah Park",
      "createdAt": "2025-03-15T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

**Implementation Notes:**
- Filter: `audience IN ('guardians', 'all')`.
- Scope by city: `cityId IS NULL` (national) OR `cityId` matches any of the guardian's children's park cities.
- Scope by park: `parkId IS NULL` (city-wide) OR `parkId` matches any of the guardian's children's parks.
- Order by `createdAt DESC`.

---

### 4.2 Student Endpoints

#### `GET /api/student/profile`

Returns the student's own profile and summary data.

**Authorization:** `student` role only.

**Response:**

```json
{
  "student": {
    "id": "clx...",
    "name": "Ahmad Ali",
    "phone": "03001234568",
    "dateOfBirth": "2010-05-15T00:00:00Z",
    "gender": "male",
    "address": "House 12, Street 5, Lahore",
    "state": "active",
    "joinedAt": "2025-01-10T00:00:00Z"
  },
  "group": {
    "id": "clx...",
    "name": "Group A"
  },
  "batch": {
    "id": "clx...",
    "name": "Jan-Jun 2025"
  },
  "park": {
    "id": "clx...",
    "name": "Jinnah Park"
  },
  "city": {
    "id": "clx...",
    "name": "Lahore"
  },
  "attendanceSummary": {
    "total": 24,
    "present": 20,
    "absent": 2,
    "late": 2,
    "excused": 0,
    "percentage": 83.3
  },
  "feeSummary": {
    "totalDue": 3000,
    "totalPaid": 2500,
    "outstanding": 500
  }
}
```

**Implementation Notes:**
- Query `Participant` with `userId = session.user.id`.
- Include `Group` → `Batch` → `Park` → `City`.
- Compute attendance and fee summaries identically to guardian profile.

---

#### `GET /api/student/attendance`

Returns the student's own attendance history.

**Authorization:** `student` role. Data is inherently scoped — the `Participant.userId` determines which records to return.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Records per page (max 50) |

**Response:** Same shape as `GET /api/guardian/children/[childId]/attendance` (without the `child` wrapper).

**Implementation Notes:**
- Look up `Participant` from `session.user.id` to get `participantId`.
- Query `AttendanceRecord` for that `participantId` only.
- Return same summary + paginated records structure.

---

#### `GET /api/student/fees`

Returns the student's own fee and payment history.

**Authorization:** `student` role.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Records per page (max 50) |

**Response:** Same shape as `GET /api/guardian/children/[childId]/fees` (without the `child` wrapper).

**Implementation Notes:**
- Look up `Participant` from `session.user.id`.
- Query fee data for that participant's batch.

---

#### `GET /api/student/schedule`

Returns the student's own upcoming events.

**Authorization:** `student` role.

**Response:** Same shape as `GET /api/guardian/children/[childId]/schedule` (without the `child` wrapper).

**Implementation Notes:**
- Look up participant's group, then query future `AttendanceEvent` records.

---

#### `GET /api/student/announcements`

Returns announcements scoped for students.

**Authorization:** `student` role.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Records per page (max 20) |

**Response:** Same shape as `GET /api/guardian/announcements`.

**Implementation Notes:**
- Filter: `audience IN ('students', 'all')`.
- Scope by the student's own park and city.

---

## 5. Security & Data Isolation

### 5.1 Guardian Data Isolation

Every guardian endpoint follows this enforcement pattern:

```typescript
// src/app/api/guardian/children/[childId]/attendance/route.ts
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { childId: string } }
) {
  // 1. Role check
  const authError = await authorize(["guardian"]);
  if (authError) return authError;

  const session = await getServerSession(authOptions);
  const guardianUserId = session!.user.id;

  // 2. Resolve guardian record
  const guardian = await db.guardian.findUnique({
    where: { userId: guardianUserId },
  });
  if (!guardian) {
    return NextResponse.json({ error: "Guardian record not found" }, { status: 403 });
  }

  // 3. CRITICAL: Verify child link
  const link = await db.guardianChild.findUnique({
    where: {
      guardianId_participantId: {
        guardianId: guardian.id,
        participantId: params.childId,
      },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // 4. Now safe to query child data
  // ...
}
```

### 5.2 Student Data Isolation

Every student endpoint follows this pattern:

```typescript
// src/app/api/student/attendance/route.ts
export async function GET(request: NextRequest) {
  const authError = await authorize(["student"]);
  if (authError) return authError;

  const session = await getServerSession(authOptions);

  // 1. Resolve participant record from session
  const participant = await db.participant.findUnique({
    where: { userId: session!.user.id },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant record not found" }, { status: 403 });
  }

  // 2. All queries use participant.id — no user-supplied ID
  const records = await db.attendanceRecord.findMany({
    where: { participantId: participant.id },
    // ...
  });

  // ...
}
```

### 5.3 Security Rules Summary

| Rule | Guardian | Student |
|------|----------|---------|
| Role check | `authorize(["guardian"])` | `authorize(["student"])` |
| Entity resolution | `Guardian` by `userId` | `Participant` by `userId` |
| Access verification | `GuardianChild` link check | Inherent (self only) |
| Cross-access prevention | `GuardianChild` composite unique key | No external ID accepted |
| On failure | HTTP `403 Forbidden` | HTTP `403 Forbidden` |

---

## 6. UI Screens

All portal pages are rendered inside `AppShell` with a simplified sidebar. The `Sidebar` component (from Module 1) must support a condensed mode for guardian/student roles showing only 4-5 navigation items.

### 6.1 Navigation Items

**Guardian Sidebar:**

| Item | Icon (Lucide) | Page Key |
|------|---------------|----------|
| Dashboard | `LayoutDashboard` | `guardian-dashboard` |
| My Children | `Users` | `guardian-children` |
| Announcements | `Megaphone` | `guardian-announcements` |
| Schedule | `Calendar` | `guardian-schedule` |

**Student Sidebar:**

| Item | Icon (Lucide) | Page Key |
|------|---------------|----------|
| Dashboard | `LayoutDashboard` | `student-dashboard` |
| Attendance | `ClipboardCheck` | `student-attendance` |
| Fees | `CreditCard` | `student-fees` |
| Schedule | `Calendar` | `student-schedule` |
| Announcements | `Megaphone` | `student-announcements` |

### 6.2 Guardian Portal Screens

#### Guardian Dashboard (`guardian-dashboard`)

**Layout:** Vertical stack, mobile-optimized.

**Sections:**

1. **Welcome Banner** — "Assalam o Alaikum, {guardian.name}" with today's date formatted in PKT.
2. **Children Summary Cards** — One card per linked child, laid out as a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).

Each **Child Card** contains:
- Child's name (large, bold)
- Relation label (e.g., "Son" / "Daughter")
- Group name and batch name
- Park name and city name
- Attendance percentage (color-coded: green ≥ 80%, yellow ≥ 60%, red < 60%)
- Fee status badge: "Clear" (green) if `outstanding === 0`, "Outstanding: Rs {amount}" (red) otherwise
- **"View Details"** button that sets `selectedChildId` in `useAppStore` and navigates to `guardian-child-detail`

3. **Recent Announcements** (optional, top 2) — Truncated preview with "View All" link.

**Components Used:** `DataCard`, `StatusBadge`, `Button` (shadcn/ui).

---

#### Guardian Child Detail View (`guardian-child-detail`)

**Layout:** Tabbed interface. On mobile, tabs scroll horizontally.

**Tabs:**

1. **Attendance Tab**
   - Summary row: 4 metric cards (Present, Absent, Late, Excused) with counts + attendance % bar
   - Recent attendance table: columns `Date`, `Session`, `Status`, `Marked At`
   - Status rendered with `AttendanceStatusIcon` from shared business components
   - "Load More" button for pagination

2. **Fees Tab**
   - Summary row: 3 metric cards (Total Due, Total Paid, Outstanding)
   - Outstanding highlighted in red if > 0
   - Fee event list: each item shows title, fee type badge, amount, due date, payment status badge, and expandable payment details
   - Payment details: amount, method, receipt number, date
   - "Load More" for pagination

3. **Schedule Tab**
   - Upcoming events list: date, title, status (upcoming / in progress)
   - Empty state if no upcoming events: "No upcoming sessions"

**Navigation:** Back button returns to `guardian-dashboard`.

**Components Used:** `DataCard`, `DataTable`, `StatusBadge`, `Tabs` (shadcn/ui), `AttendanceStatusIcon`, `EmptyState`, `LoadingState`.

---

#### Guardian Announcements (`guardian-announcements`)

**Layout:** Reuse the announcement feed component from Module 8 (read-only mode).

- List of announcement cards with title, body preview, park/city scope, date
- Click to expand full body (inline, no modal)
- Paginated with "Load More"
- No action buttons (no edit, no delete)

**Component:** Reuse `AnnouncementFeed` from Module 8 (pass `readOnly: true`).

---

#### Guardian Schedule (`guardian-schedule`)

If a child is selected via `useAppStore.selectedChildId`, show that child's upcoming events. If no child is selected, show a child selector (simple list of linked children).

**Layout:** Chronological list of upcoming events grouped by date.

---

### 6.3 Student Portal Screens

#### Student Dashboard (`student-dashboard`)

**Layout:** Vertical stack, mobile-optimized.

**Sections:**

1. **Welcome Banner** — "Assalam o Alaikum, {student.name}" with today's date in PKT.
2. **My Info Card** — Name, group, batch, park, city, member since (joinedAt).
3. **Quick Stats Row** — Two metric cards:
   - Attendance: percentage with color coding
   - Fees: "Clear" or "Outstanding: Rs {amount}"
4. **Quick Links** — Row of icon buttons:
   - "View Attendance" → navigates to `student-attendance`
   - "View Fees" → navigates to `student-fees`
   - "My Schedule" → navigates to `student-schedule`
   - "Announcements" → navigates to `student-announcements`
5. **Recent Announcements** (top 2, truncated preview).

---

#### Student Attendance (`student-attendance`)

**Layout:**
- Summary row: 4 metric cards (Present, Absent, Late, Excused) + attendance % bar
- Table: columns `Date`, `Session`, `Status`
- Status uses `AttendanceStatusIcon`
- Paginated with "Load More"

---

#### Student Fees (`student-fees`)

**Layout:**
- Summary row: 3 metric cards (Total Due, Total Paid, Outstanding)
- Fee event list: each item shows title, type badge, amount, due date, payment status
- Expandable payment details (receipt number, method, date)
- Paginated

---

#### Student Schedule (`student-schedule`)

**Layout:**
- Chronological list of upcoming events: date, title, status
- Empty state: "No upcoming sessions"

---

#### Student Announcements (`student-announcements`)

**Layout:** Same as guardian announcements — reuse `AnnouncementFeed` from Module 8 (read-only).

---

## 7. State Management

### 7.1 AppStore Additions

Add to `src/stores/useAppStore.ts`:

```typescript
interface AppState {
  // ... existing fields ...

  // Family Portal state
  selectedChildId: string | null;
  setSelectedChild: (id: string | null) => void;
}
```

### 7.2 TanStack Query Keys

| Query Key | Endpoint | Stale Time |
|-----------|----------|------------|
| `["guardian-profile"]` | `GET /api/guardian/profile` | 2 minutes |
| `["guardian-child-attendance", childId, page]` | `GET /api/guardian/children/[childId]/attendance` | 2 minutes |
| `["guardian-child-fees", childId, page]` | `GET /api/guardian/children/[childId]/fees` | 2 minutes |
| `["guardian-child-schedule", childId]` | `GET /api/guardian/children/[childId]/schedule` | 5 minutes |
| `["guardian-announcements", page]` | `GET /api/guardian/announcements` | 5 minutes |
| `["student-profile"]` | `GET /api/student/profile` | 2 minutes |
| `["student-attendance", page]` | `GET /api/student/attendance` | 2 minutes |
| `["student-fees", page]` | `GET /api/student/fees` | 2 minutes |
| `["student-schedule"]` | `GET /api/student/schedule` | 5 minutes |
| `["student-announcements", page]` | `GET /api/student/announcements` | 5 minutes |

### 7.3 Custom Hooks

Create thin query hooks for consistency:

```typescript
// src/lib/queries/guardian-queries.ts
export function useGuardianProfile() { ... }
export function useChildAttendance(childId: string, page: number) { ... }
export function useChildFees(childId: string, page: number) { ... }
export function useChildSchedule(childId: string) { ... }
export function useGuardianAnnouncements(page: number) { ... }
```

```typescript
// src/lib/queries/student-queries.ts
export function useStudentProfile() { ... }
export function useStudentAttendance(page: number) { ... }
export function useStudentFees(page: number) { ... }
export function useStudentSchedule() { ... }
export function useStudentAnnouncements(page: number) { ... }
```

---

## 8. Task Breakdown

| # | Task | Description | Est. Complexity |
|---|------|-------------|-----------------|
| 1 | Guardian profile API | `GET /api/guardian/profile` — fetch guardian, linked children, attendance/fee summaries | Medium |
| 2 | Guardian child data APIs | `GET /api/guardian/children/[childId]/attendance`, `fees`, `schedule` — paginated child data | Medium |
| 3 | Guardian data isolation enforcement | Verify `GuardianChild` link in every guardian child endpoint; return 403 on mismatch | High (critical) |
| 4 | Guardian announcements API | `GET /api/guardian/announcements` — audience + city/park scoping | Low |
| 5 | Student profile API | `GET /api/student/profile` — self-lookup + summaries | Low |
| 6 | Student data APIs | `GET /api/student/attendance`, `fees`, `schedule` — paginated self data | Low |
| 7 | Student data isolation enforcement | Ensure student endpoints only use `Participant.userId` — no external IDs | Medium (critical) |
| 8 | Student announcements API | `GET /api/student/announcements` — audience + city/park scoping | Low |
| 9 | Guardian dashboard UI | Welcome banner, children summary cards with attendance % and fee status, quick links | Medium |
| 10 | Guardian child detail UI | Tabbed view (Attendance / Fees / Schedule) for a selected child | Medium |
| 11 | Student dashboard UI | Welcome banner, info card, quick stats, quick links, recent announcements | Medium |
| 12 | Student detail views UI | Attendance table, fee list, schedule list, announcements feed | Medium |
| 13 | Sidebar navigation for family roles | Add guardian/student nav items to `Sidebar` component (condensed, 4-5 items) | Low |
| 14 | Announcements integration | Reuse Module 8 `AnnouncementFeed` component in read-only mode for both portals | Low |
| 15 | AppStore additions + query hooks | Add `selectedChildId` state, create guardian and student query hook files | Low |

---

## 9. Acceptance Criteria

### 9.1 Guardian Portal

- [ ] Guardian sees only children linked to their `Guardian` record via `guardian_children`
- [ ] Guardian cannot access another guardian's children (returns `403`)
- [ ] Guardian profile shows correct name, phone, CNIC, address
- [ ] Each child card shows correct group, batch, park, city
- [ ] Attendance percentage is accurate (present / total events × 100)
- [ ] Fee status accurately reflects total due vs. total paid
- [ ] Attendance history is paginated and sorted by date (newest first)
- [ ] Fee history shows all fee events with correct payment status
- [ ] Schedule shows only future, unclosed events for the child's group
- [ ] Announcements are scoped to guardian audience and relevant city/park

### 9.2 Student Portal

- [ ] Student sees only their own data (determined by `Participant.userId`)
- [ ] Student cannot access another student's data (impossible by design — no external IDs)
- [ ] Student profile shows correct name, group, batch, park, city
- [ ] Attendance percentage is accurate
- [ ] Fee status is accurate
- [ ] All data views are paginated
- [ ] Announcements are scoped to student audience and relevant city/park

### 9.3 Cross-Cutting

- [ ] All endpoints return `401` when session is missing
- [ ] All endpoints return `403` when role does not match
- [ ] All endpoints return `403` when data isolation check fails
- [ ] Portals render correctly on 375px viewport (mobile)
- [ ] Portals render correctly on 768px+ viewport (tablet/desktop)
- [ ] No create/update/delete operations exist in portal code
- [ ] Sidebar shows only relevant items for guardian and student roles
- [ ] Navigation between portal pages works via Zustand `navigateTo`
- [ ] Back button on child detail returns to guardian dashboard
- [ ] Loading states display while data is fetching
- [ ] Error states display with retry option on API failure
- [ ] All dates are displayed in PKT (Asia/Karachi) timezone
- [ ] Currency amounts are displayed with "Rs" prefix

---

## 10. Files to Create/Modify

### 10.1 API Routes (Create)

| File | Purpose |
|------|---------|
| `src/app/api/guardian/profile/route.ts` | Guardian profile with linked children and summaries |
| `src/app/api/guardian/children/[childId]/attendance/route.ts` | Child attendance history |
| `src/app/api/guardian/children/[childId]/fees/route.ts` | Child fee and payment history |
| `src/app/api/guardian/children/[childId]/schedule/route.ts` | Child upcoming schedule |
| `src/app/api/guardian/announcements/route.ts` | Guardian-scoped announcements |
| `src/app/api/student/profile/route.ts` | Student self-profile |
| `src/app/api/student/attendance/route.ts` | Student own attendance history |
| `src/app/api/student/fees/route.ts` | Student own fee history |
| `src/app/api/student/schedule/route.ts` | Student own upcoming schedule |
| `src/app/api/student/announcements/route.ts` | Student-scoped announcements |

### 10.2 Query Hooks (Create)

| File | Purpose |
|------|---------|
| `src/lib/queries/guardian-queries.ts` | TanStack Query hooks for all guardian API calls |
| `src/lib/queries/student-queries.ts` | TanStack Query hooks for all student API calls |

### 10.3 UI Components — Guardian Portal (Create)

| File | Purpose |
|------|---------|
| `src/components/modules/guardian/guardian-dashboard.tsx` | Guardian dashboard with children cards |
| `src/components/modules/guardian/guardian-child-detail.tsx` | Child detail view with tabs (attendance, fees, schedule) |
| `src/components/modules/guardian/guardian-announcements.tsx` | Guardian announcements page (wrapper around shared feed) |
| `src/components/modules/guardian/guardian-schedule.tsx` | Guardian schedule page with child selector |
| `src/components/modules/guardian/child-card.tsx` | Individual child summary card component |
| `src/components/modules/guardian/attendance-summary.tsx` | Attendance metrics row (reusable by student too) |
| `src/components/modules/guardian/fee-summary.tsx` | Fee metrics row (reusable by student too) |
| `src/components/modules/guardian/attendance-table.tsx` | Attendance records table (reusable by student too) |
| `src/components/modules/guardian/fee-list.tsx` | Fee events list with expandable payments (reusable by student too) |

### 10.4 UI Components — Student Portal (Create)

| File | Purpose |
|------|---------|
| `src/components/modules/student/student-dashboard.tsx` | Student dashboard with info and quick links |
| `src/components/modules/student/student-attendance.tsx` | Student attendance history page |
| `src/components/modules/student/student-fees.tsx` | Student fee history page |
| `src/components/modules/student/student-schedule.tsx` | Student upcoming schedule page |
| `src/components/modules/student/student-announcements.tsx` | Student announcements page (wrapper around shared feed) |

### 10.5 Shared Components (Modify)

| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` | Add guardian and student navigation item arrays (condensed, 4-5 items each) |
| `src/components/modules/announcements/announcement-feed.tsx` | Ensure `readOnly` prop support (Module 8 may already have this) |
| `src/stores/useAppStore.ts` | Add `selectedChildId` state and `setSelectedChild` action |

### 10.6 Page Renderer Registration (Modify)

| File | Change |
|------|--------|
| `src/components/layout/page-renderer.tsx` | Add cases for guardian and student page keys: `guardian-dashboard`, `guardian-child-detail`, `guardian-announcements`, `guardian-schedule`, `student-dashboard`, `student-attendance`, `student-fees`, `student-schedule`, `student-announcements` |

---

## 11. Implementation Notes

### 11.1 Timezone Handling

All dates stored in the database are UTC. Display all dates in PKT (Asia/Karachi, UTC+5). Use the existing `src/lib/timezone.ts` utilities from Module 1:

```typescript
import { toPKT } from "@/lib/timezone";

// Format for display
const displayDate = toPKT(record.eventDate).toLocaleDateString("en-PK", {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
});
```

### 11.2 Currency Formatting

Format all amounts in Pakistani Rupees:

```typescript
const formatPKR = (amount: number) =>
  `Rs ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
```

### 11.3 Attendance Percentage Calculation

```typescript
const calcAttendancePercentage = (summary: {
  present: number;
  total: number;
}) => {
  if (summary.total === 0) return 100; // No events yet = perfect by default
  return Math.round((summary.present / summary.total) * 1000) / 10; // 1 decimal
};
```

### 11.4 Empty States

Both portals must handle the case where a guardian has no linked children, or a participant has no attendance/fee records yet. Use the shared `EmptyState` component from Module 1 with contextual messages:

- Guardian with no children: "No children are linked to your account yet. Please contact your park admin."
- No attendance records: "No attendance records found for this period."
- No fee records: "No fee records found."
- No upcoming events: "No upcoming sessions scheduled."
- No announcements: "No announcements at this time."

### 11.5 Responsive Design

Both portals must be fully functional on mobile (375px+). Key responsive patterns:

- **Cards:** Single column on mobile (`grid-cols-1`), 2 columns on tablet, 3 columns on desktop
- **Tabs:** Horizontal scroll on mobile, normal on desktop
- **Tables:** Horizontal scroll wrapper on mobile, or switch to card layout below `md` breakpoint
- **Sidebar:** Collapsible, auto-collapses on mobile
- **Font sizes:** Use responsive Tailwind classes (`text-sm md:text-base`)

### 11.6 Reusable Components Strategy

Several components are shared between guardian and student portals. These should be created in the `guardian` folder but exported for use by student components:

- `attendance-summary.tsx` — Used by both `guardian-child-detail` and `student-attendance`
- `fee-summary.tsx` — Used by both `guardian-child-detail` and `student-fees`
- `attendance-table.tsx` — Used by both portals
- `fee-list.tsx` — Used by both portals

Alternatively, these can be moved to `src/components/business/` as shared business components. The choice depends on whether other modules (e.g., Module 4 Dashboards) also need them. If unsure, place them in `guardian/` and refactor later.

### 11.7 No Audit Logging Required

Since all portal endpoints are read-only with no data mutations, no audit log entries are needed for this module.

---

## 12. Testing Checklist

1. **Guardian isolation:** Log in as Guardian A, note their children's IDs. Attempt `GET /api/guardian/children/[ChildB-Id]/attendance` (where ChildB belongs to Guardian B). Expect `403`.
2. **Student isolation:** Log in as Student A. There are no external IDs to manipulate, but verify the API only returns Student A's own data by checking participant IDs in response.
3. **Role mismatch:** Log in as `park_admin`, call `GET /api/guardian/profile`. Expect `403`.
4. **No session:** Call any endpoint without authentication. Expect `401`.
5. **Empty data:** Create a guardian with no linked children. Verify dashboard shows empty state.
6. **Mobile rendering:** Use browser dev tools at 375px width. Verify all screens are usable.
7. **Announcement scoping:** Create a city-scoped announcement for City X. Guardian in City Y should not see it.
8. **Pagination:** Verify attendance/fees APIs paginate correctly with `page` and `limit` params.
9. **Attendance percentage accuracy:** Manually count records and verify the API returns the correct percentage.
10. **Fee outstanding accuracy:** Manually sum fee events and payments, verify outstanding amount.