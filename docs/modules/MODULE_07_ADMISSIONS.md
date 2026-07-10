# Module 7: Admissions Pipeline

> **Priority:** P2 | **Phase:** 3 (Core Operations) | **Parallel Group:** A
> **Dependencies:** Module 1 (Auth & Foundation), Module 2 (City Operations)

---

## 1. Module Overview

The Admissions module provides a public-facing application intake form and an admin-managed pipeline for processing new youth enrollments into Shabab360. Families (guardians) submit applications through a publicly accessible form — no authentication required. Administrators then review submissions, schedule and conduct interviews, make approval/rejection decisions, and convert approved applications into live participant and guardian records.

### Business Flow

```
Public Form (no auth)          Admin Workspace (auth required)
─────────────────────          ──────────────────────────────────
Submit Application ──────────► Pipeline View
(tracking code returned)      │
                              ├─ Schedule Interview
Check Status ◄────────────────┤  (date, time, notes)
(tracking code + phone)       ├─ Complete Interview
                              │  (scores, notes)
                              ├─ Approve / Reject
                              │  (with notes)
                              └─ Convert to Participant + Guardian
                                 (select batch, group)
```

### Key Design Decisions

- **Tracking code** is an 8-character alphanumeric code (e.g., `SHB-A3K9X2M`), unique per application, used for anonymous status lookup.
- **Public endpoints** (`POST /api/admin/admissions`, `GET /api/admin/admissions/status`) do **not** require authentication. All other endpoints require admin-level roles.
- **Conversion** is a one-time operation that atomically creates a `Participant`, a `Guardian`, and a `GuardianChild` link, then updates the application status to `converted`.
- **Status pipeline** is linear: `submitted` → `interview_scheduled` → `interview_completed` → `approved` → `converted`. Rejection can occur at any point before conversion.

---

## 2. Database Tables

### 2.1 `admission_applications`

```prisma
model AdmissionApplication {
  id                     String                  @id @default(cuid())
  trackingCode           String                  @unique
  applicantName          String
  applicantDOB           DateTime?
  gender                 String?
  guardianName           String
  guardianPhone          String
  guardianRelation       String?
  cityId                 String?
  preferredParkId        String?
  status                 String                  @default("submitted")
  notes                  String?
  convertedParticipantId String?
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt

  city                   City?                   @relation(fields: [cityId], references: [id])
  preferredPark          Park?                   @relation(fields: [preferredParkId], references: [id])
  interviews             AdmissionInterview[]
  convertedParticipant   Participant?             @relation("ConvertedFrom")

  @@map("admission_applications")
}
```

**Column Reference:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `trackingCode` | `String` (unique) | 8-char alphanumeric public identifier |
| `applicantName` | `String` | Full name of the youth applicant |
| `applicantDOB` | `DateTime?` | Date of birth of applicant |
| `gender` | `String?` | `male` or `female` |
| `guardianName` | `String` | Full name of the parent/guardian |
| `guardianPhone` | `String` | Guardian's contact phone number |
| `guardianRelation` | `String?` | Relationship to applicant (father, mother, uncle, etc.) |
| `cityId` | `String?` | FK to `cities` — selected city |
| `preferredParkId` | `String?` | FK to `parks` — preferred park within the city |
| `status` | `String` | Pipeline status (see below) |
| `notes` | `String?` | Admin notes on the application |
| `convertedParticipantId` | `String?` | FK to `participants` — set upon conversion |
| `createdAt` | `DateTime` | Application submission timestamp |
| `updatedAt` | `DateTime` | Last update timestamp |

**Status Enum (stored as string):**

| Status | Description |
|--------|-------------|
| `submitted` | Initial state after public submission |
| `interview_scheduled` | Interview has been scheduled |
| `interview_completed` | Interview has been conducted with scores |
| `approved` | Application approved, awaiting conversion |
| `rejected` | Application rejected (terminal state) |
| `converted` | Successfully converted to participant/guardian records (terminal state) |

### 2.2 `admission_interviews`

```prisma
model AdmissionInterview {
  id              String                @id @default(cuid())
  applicationId   String
  scheduledDate   DateTime?
  scheduledTime   String?
  status          String                @default("scheduled") // scheduled, completed, cancelled
  score1          Int?                   // interview score fields
  score2          Int?
  score3          Int?
  totalScore      Int?
  notes           String?
  conductedBy     String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  application     AdmissionApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("admission_interviews")
}
```

**Column Reference:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `applicationId` | `String` | FK to `admission_applications` — cascade delete |
| `scheduledDate` | `DateTime?` | Date the interview is scheduled for |
| `scheduledTime` | `String?` | Time string (e.g., `"14:30"`) — stored as string for flexibility |
| `status` | `String` | `scheduled`, `completed`, or `cancelled` |
| `score1` | `Int?` | First scoring criteria (e.g., knowledge) |
| `score2` | `Int?` | Second scoring criteria (e.g., behavior) |
| `score3` | `Int?` | Third scoring criteria (e.g., motivation) |
| `totalScore` | `Int?` | Computed total of score1 + score2 + score3 |
| `notes` | `String?` | Interviewer notes |
| `conductedBy` | `String?` | FK to `staff_meta.id` — who conducted the interview |
| `createdAt` | `DateTime` | Record creation timestamp |
| `updatedAt` | `DateTime` | Last update timestamp |

---

## 3. API Endpoints

All endpoints are under `/api/admin/admissions`. Public endpoints are marked with **[PUBLIC]** — they do not require authentication.

### 3.1 `POST /api/admin/admissions` — Submit Application **[PUBLIC]**

Submit a new admission application. No authentication required.

**Request Body:**
```json
{
  "applicantName": "string (required, min 2 chars)",
  "applicantDOB": "string (ISO date, optional)",
  "gender": "string (male|female, optional)",
  "guardianName": "string (required, min 2 chars)",
  "guardianPhone": "string (required, valid phone format)",
  "guardianRelation": "string (optional)",
  "cityId": "string (optional, must be valid city ID)",
  "preferredParkId": "string (optional, must belong to selected city)"
}
```

**Response (201):**
```json
{
  "id": "cuid",
  "trackingCode": "SHB-A3K9X2M",
  "applicantName": "...",
  "status": "submitted",
  "createdAt": "ISO datetime"
}
```

**Validation Rules:**
- `applicantName` and `guardianName`: min 2 characters, trimmed
- `guardianPhone`: must match phone pattern (regex: `^03\d{9}$` for Pakistani mobile)
- If `preferredParkId` is provided, `cityId` must also be provided, and the park must belong to that city
- `cityId` must reference an active city if provided

**Tracking Code Generation:**
- Format: `SHB-` prefix + 6 random alphanumeric characters (uppercase + digits)
- Must be unique in the database — retry on collision (extremely unlikely with 36^6 ≈ 2.1 billion combinations)
- Implementation uses `crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6)` or equivalent

### 3.2 `GET /api/admin/admissions/status` — Check Status **[PUBLIC]**

Lookup application status by tracking code and guardian phone. No authentication required.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `trackingCode` | `string` | Yes | The tracking code from submission |
| `phone` | `string` | Yes | Guardian phone number used in application |

**Response (200):**
```json
{
  "trackingCode": "SHB-A3K9X2M",
  "applicantName": "string",
  "status": "submitted",
  "submittedAt": "ISO datetime",
  "cityName": "string | null",
  "parkName": "string | null"
}
```

**Response (404):**
```json
{
  "error": "Application not found. Please verify your tracking code and phone number."
}
```

**Security:** Both `trackingCode` AND `phone` must match. Phone comparison is normalized (strip spaces, dashes).

### 3.3 `GET /api/admin/admissions` — List Applications (Admin)

List all admission applications with optional filters. Requires role: `super_admin`, `program_admin`, `city_head`.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | No | Filter by status |
| `cityId` | `string` | No | Filter by city |
| `parkId` | `string` | No | Filter by preferred park |
| `search` | `string` | No | Search in applicant name, guardian name, tracking code |
| `page` | `number` | No | Page number (default 1) |
| `limit` | `number` | No | Items per page (default 20, max 100) |
| `sortBy` | `string` | No | Sort field (default `createdAt`) |
| `sortOrder` | `string` | No | `asc` or `desc` (default `desc`) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "cuid",
      "trackingCode": "SHB-A3K9X2M",
      "applicantName": "string",
      "guardianName": "string",
      "guardianPhone": "string",
      "status": "submitted",
      "cityName": "string | null",
      "parkName": "string | null",
      "latestInterviewDate": "ISO datetime | null",
      "createdAt": "ISO datetime"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Scope Enforcement:**
- `city_head`: only sees applications for their assigned city
- `program_admin`, `super_admin`: sees all applications

### 3.4 `GET /api/admin/admissions/[id]` — Get Application Detail (Admin)

Get full application detail including interview history. Requires role: `super_admin`, `program_admin`, `city_head`.

**Response (200):**
```json
{
  "id": "cuid",
  "trackingCode": "SHB-A3K9X2M",
  "applicantName": "string",
  "applicantDOB": "ISO date | null",
  "gender": "string | null",
  "guardianName": "string",
  "guardianPhone": "string",
  "guardianRelation": "string | null",
  "cityId": "string | null",
  "cityName": "string | null",
  "preferredParkId": "string | null",
  "preferredParkName": "string | null",
  "status": "submitted",
  "notes": "string | null",
  "convertedParticipantId": "string | null",
  "interviews": [
    {
      "id": "cuid",
      "scheduledDate": "ISO date | null",
      "scheduledTime": "string | null",
      "status": "scheduled",
      "score1": "number | null",
      "score2": "number | null",
      "score3": "number | null",
      "totalScore": "number | null",
      "notes": "string | null",
      "conductedByName": "string | null",
      "createdAt": "ISO datetime"
    }
  ],
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

### 3.5 `PUT /api/admin/admissions/[id]` — Update Application (Admin)

Update admin-facing fields on an application. Requires role: `super_admin`, `program_admin`, `city_head`.

**Request Body (all fields optional):**
```json
{
  "notes": "string",
  "cityId": "string | null",
  "preferredParkId": "string | null"
}
```

**Validation:** Cannot update fields once `status` is `converted`. Cannot update `preferredParkId` without a valid `cityId`.

### 3.6 `POST /api/admin/admissions/[id]/interview` — Schedule Interview (Admin)

Create a new interview record for an application. Requires role: `super_admin`, `program_admin`, `city_head`.

**Pre-conditions:** Application status must be `submitted` or `interview_scheduled`.

**Request Body:**
```json
{
  "scheduledDate": "string (ISO date, required)",
  "scheduledTime": "string (HH:mm format, required)",
  "notes": "string (optional)"
}
```

**Side Effects:** Updates application `status` to `interview_scheduled`.

**Response (201):**
```json
{
  "id": "cuid",
  "applicationId": "string",
  "scheduledDate": "ISO date",
  "scheduledTime": "string",
  "status": "scheduled",
  "notes": "string | null",
  "createdAt": "ISO datetime"
}
```

### 3.7 `PUT /api/admin/admissions/[id]/interview` — Complete Interview (Admin)

Complete the latest scheduled (or a specified) interview with scores. Requires role: `super_admin`, `program_admin`, `city_head`.

**Pre-conditions:** Application must have at least one interview with status `scheduled`.

**Request Body:**
```json
{
  "interviewId": "string (optional — defaults to latest scheduled interview)",
  "score1": "number (required, 0-100)",
  "score2": "number (required, 0-100)",
  "score3": "number (required, 0-100)",
  "notes": "string (optional)"
}
```

**Side Effects:**
- Sets interview `status` to `completed`
- Computes `totalScore = score1 + score2 + score3`
- Sets `conductedBy` to the current staff member's `StaffMeta.id`
- Updates application `status` to `interview_completed`

**Response (200):** Updated interview record.

### 3.8 `POST /api/admin/admissions/[id]/approve` — Approve Application (Admin)

Mark an application as approved. Requires role: `super_admin`, `program_admin`.

**Pre-conditions:** Application status must be `interview_completed`.

**Request Body:**
```json
{
  "notes": "string (optional — approval notes)"
}
```

**Side Effects:** Updates application `status` to `approved`.

**Response (200):** Updated application record.

### 3.9 `POST /api/admin/admissions/[id]/reject` — Reject Application (Admin)

Reject an application. Requires role: `super_admin`, `program_admin`.

**Pre-conditions:** Application status must be one of `submitted`, `interview_scheduled`, `interview_completed`. Cannot reject a `converted` application.

**Request Body:**
```json
{
  "reason": "string (required — rejection reason, min 10 chars)"
}
```

**Side Effects:** Updates application `status` to `rejected`. Appends rejection reason to `notes`.

**Response (200):** Updated application record.

### 3.10 `POST /api/admin/admissions/[id]/convert` — Convert to Participant + Guardian (Admin)

Convert an approved application into live participant, guardian, and guardian-child records. Requires role: `super_admin`, `program_admin`.

**Pre-conditions:** Application status must be `approved`.

**Request Body:**
```json
{
  "batchId": "string (required — target batch)",
  "groupId": "string (required — target group, must belong to batch)"
}
```

**Transaction (atomic — all succeed or all fail):**

1. Create `Participant` record:
   - `name` ← `application.applicantName`
   - `dateOfBirth` ← `application.applicantDOB`
   - `gender` ← `application.gender`
   - `groupId` ← request body `groupId`
   - `state` ← `"active"`
   - `joinedAt` ← `now()`

2. Create `Guardian` record:
   - `name` ← `application.guardianName`
   - `phone` ← `application.guardianPhone`

3. Create `GuardianChild` link:
   - `guardianId` ← newly created guardian ID
   - `participantId` ← newly created participant ID
   - `relation` ← `application.guardianRelation`

4. Update `AdmissionApplication`:
   - `status` ← `"converted"`
   - `convertedParticipantId` ← newly created participant ID

**Response (200):**
```json
{
  "message": "Application converted successfully",
  "participantId": "cuid",
  "guardianId": "cuid",
  "guardianChildId": "cuid"
}
```

**Error Cases:**
- `409` if application is already converted
- `404` if batch or group not found
- `400` if group does not belong to the specified batch
- `400` if application status is not `approved`

---

## 4. UI Screens

### 4.1 Public Application Form

**Route:** Client-side page `public-apply` (rendered outside `AppShell` — no sidebar, no auth)

**Access:** No authentication required. Accessible via direct URL or link.

**Layout:** Centered card on a branded background. Mobile-first, optimized for phone screens.

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| Applicant Name | `Input` | Required, min 2 chars |
| Date of Birth | `Input` (type date) | Optional |
| Gender | `Select` (male/female) | Optional |
| Guardian Name | `Input` | Required, min 2 chars |
| Guardian Phone | `Input` (type tel) | Required, Pakistani phone format |
| Relationship to Applicant | `Select` (father/mother/uncle/other) | Optional |
| City | `Select` | Optional, populated from active cities |
| Preferred Park | `Select` | Optional, cascaded from city selection |

**Post-Submit Behavior:**
- On success: Show a success screen with the tracking code in a large, prominent display. Include a "Copy Code" button. Show a link to the status check page.
- On error: Show inline validation errors. Do not navigate away.

**Tracking Code Display:**
```
┌─────────────────────────────────┐
│  ✓ Application Submitted!       │
│                                 │
│  Your Tracking Code:            │
│  ┌─────────────────────────┐    │
│  │   SHB-A3K9X2M    [📋]  │    │
│  └─────────────────────────┘    │
│                                 │
│  Save this code to check your   │
│  application status later.      │
│                                 │
│  [Check Application Status]     │
└─────────────────────────────────┘
```

### 4.2 Public Status Check

**Route:** Client-side page `public-status` (rendered outside `AppShell` — no sidebar, no auth)

**Access:** No authentication required.

**Layout:** Centered card. Two input fields stacked vertically.

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| Tracking Code | `Input` (uppercase, monospace) | Required |
| Guardian Phone | `Input` (type tel) | Required |

**Result Display:**
```
┌─────────────────────────────────┐
│  Application Status             │
│  ─────────────────────          │
│  Tracking: SHB-A3K9X2M         │
│  Applicant: Muhammad Ahmed      │
│  Submitted: 15 Jul 2025        │
│  City: Lahore                   │
│  Park: Model Town Park          │
│                                 │
│  Status:                        │
│  ┌──────────────────────┐      │
│  │  🟡 Interview        │      │
│  │     Scheduled        │      │
│  └──────────────────────┘      │
│                                 │
│  [Submit Another Application]   │
└─────────────────────────────────┘
```

**Status Display Mapping:**

| Status | Color | Icon |
|--------|-------|------|
| `submitted` | Yellow/amber | Clock |
| `interview_scheduled` | Blue | Calendar |
| `interview_completed` | Purple | ClipboardCheck |
| `approved` | Green | CheckCircle |
| `rejected` | Red | XCircle |
| `converted` | Green | UserCheck |

### 4.3 Admin Admissions Pipeline

**Route:** Client-side page `admin-admissions` (rendered inside `AppShell`)

**Access:** Roles: `super_admin`, `program_admin`, `city_head`

**Layout:** Full-width page with tabbed status filters at top, data table below.

**Status Tabs:**
- All (with count badge)
- Submitted (with count)
- Interview Scheduled (with count)
- Interview Completed (with count)
- Approved (with count)
- Rejected (with count)
- Converted (with count)

**Table Columns:**

| Column | Content |
|--------|---------|
| Tracking Code | Monospace, clickable — navigates to detail |
| Applicant | Name, age (computed from DOB) |
| Guardian | Name, phone |
| City / Park | City name, park name |
| Status | `StatusBadge` component |
| Submitted | Formatted date (PKT) |
| Actions | Contextual action buttons |

**Action Buttons (contextual per status):**

| Application Status | Available Actions |
|--------------------|-------------------|
| `submitted` | View, Schedule Interview, Reject |
| `interview_scheduled` | View, Complete Interview, Reject |
| `interview_completed` | View, Approve, Reject |
| `approved` | View, Convert |
| `rejected` | View |
| `converted` | View (read-only) |

**Filters Row (above table):**
- Search input (applicant name, guardian name, tracking code)
- City dropdown filter
- Park dropdown filter (cascaded from city)

### 4.4 Application Detail View

**Route:** Client-side page `admin-admissions-detail` (parameter: `applicationId`)

**Access:** Roles: `super_admin`, `program_admin`, `city_head`

**Layout:** Two-column on desktop, stacked on mobile. Left: application info card. Right: interview history + action panel.

**Left Column — Application Info:**

| Field | Label |
|-------|-------|
| `trackingCode` | Tracking Code (monospace, copyable) |
| `applicantName` | Applicant Name |
| `applicantDOB` | Date of Birth |
| `gender` | Gender |
| `guardianName` | Guardian Name |
| `guardianPhone` | Guardian Phone (with WhatsApp link) |
| `guardianRelation` | Relationship |
| `cityName` | City |
| `preferredParkName` | Preferred Park |
| `status` | Status (`StatusBadge`) |
| `notes` | Admin Notes |
| `createdAt` | Submitted On |
| `updatedAt` | Last Updated |

**Right Column — Interview History:**
- Timeline of interviews (newest first)
- Each interview card shows: scheduled date/time, status, scores (if completed), notes, conductor name
- "Schedule Interview" button if no active scheduled interview exists

**Action Panel:**
- Contextual action buttons based on current status (same as pipeline table actions)
- Admin notes textarea with save button (calls `PUT /api/admin/admissions/[id]`)

### 4.5 Interview Scheduling Dialog

**Component:** Dialog triggered from pipeline or detail view.

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| Date | `Calendar` (date picker) | Required, must be today or future |
| Time | `Input` (type time) or `Select` with time slots | Required |
| Notes | `Textarea` | Optional |

**Actions:** Schedule (primary), Cancel (secondary)

### 4.6 Interview Completion Dialog

**Component:** Dialog triggered from pipeline or detail view.

**Pre-populated:** Date and time from the scheduled interview (read-only display).

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| Score 1 | `Input` (type number) or `Slider` | Required, 0–100 |
| Score 2 | `Input` (type number) or `Slider` | Required, 0–100 |
| Score 3 | `Input` (type number) or `Slider` | Required, 0–100 |
| Total Score | Computed display (score1 + score2 + score3) | Read-only, auto-calculated |
| Notes | `Textarea` | Optional |

**Actions:** Complete Interview (primary), Cancel (secondary)

### 4.7 Conversion Dialog

**Component:** Dialog triggered from approved application detail or pipeline.

**Fields:**

| Field | Component | Validation |
|-------|-----------|------------|
| Batch | `Select` | Required, populated from active batches |
| Group | `Select` | Required, cascaded from selected batch |

**Preview Section (rendered below fields):**
Before confirmation, show a summary of what will be created:

```
┌─ Preview ──────────────────────────────────┐
│                                              │
│  Participant Record:                         │
│    Name: Muhammad Ahmed                      │
│    DOB: 15 Mar 2012                          │
│    Gender: Male                              │
│    Group: [Selected Group Name]              │
│    Status: Active                            │
│                                              │
│  Guardian Record:                            │
│    Name: Ahmed Khan                          │
│    Phone: 0300-1234567                       │
│                                              │
│  Link: Ahmed Khan (father) → Muhammad Ahmed  │
│                                              │
└──────────────────────────────────────────────┘
```

**Actions:** Confirm Conversion (primary, destructive color confirmation), Cancel (secondary)

**Post-Conversion:**
- Show success toast with participant and guardian IDs
- Navigate to the People page (Module 2) with the new participant highlighted
- Application is no longer editable

---

## 5. Task Breakdown

### Task 1: Admissions Prisma Tables Setup
- Verify `AdmissionApplication` and `AdmissionInterview` models exist in `prisma/schema.prisma`
- Ensure the `Park` model has `admissionApplications AdmissionApplication[]` relation
- Ensure the `City` model has `admissionApplications AdmissionApplication[]` relation
- Run `npx prisma db push` or `npx prisma migrate dev`
- Regenerate Prisma client: `npx prisma generate`

### Task 2: Public Application Submit API
- File: `src/app/api/admin/admissions/route.ts`
- Implement `POST` handler (no auth)
- Zod validation schema for request body
- Tracking code generation utility (8-char alphanumeric with `SHB-` prefix)
- Uniqueness check with retry on collision
- Return 201 with tracking code

### Task 3: Public Status Check API
- File: `src/app/api/admin/admissions/route.ts` (add `GET` handler with query params)
- No auth required
- Validate `trackingCode` + `phone` match (normalize phone for comparison)
- Return minimal status info (no admin notes, no interview scores)
- Return 404 with user-friendly message on mismatch

### Task 4: Admin Admissions List API
- File: `src/app/api/admin/admissions/route.ts` (extend `GET` with auth check)
- Add auth guard: `requireRole(["super_admin", "program_admin", "city_head"])`
- Implement filtering by `status`, `cityId`, `parkId`
- Implement search across `applicantName`, `guardianName`, `trackingCode`
- Pagination support (`page`, `limit`, `sortBy`, `sortOrder`)
- Scope filtering for `city_head` role
- Include city name and park name in response (via `include`)

### Task 5: Application Detail API
- File: `src/app/api/admin/admissions/[id]/route.ts`
- Implement `GET` with auth guard
- Include all application fields with related `city` and `park` names
- Include all `interviews` with `conductedBy` staff member name
- Scope enforcement: `city_head` can only view applications in their city

### Task 6: Interview Scheduling API
- File: `src/app/api/admin/admissions/[id]/route.ts` (or separate sub-route)
- Implement `POST` for `/interview` sub-route
- Validate pre-condition: status is `submitted` or `interview_scheduled`
- Create `AdmissionInterview` record
- Update application status to `interview_scheduled`
- Wrap in Prisma transaction

### Task 7: Interview Completion with Scores API
- File: `src/app/api/admin/admissions/[id]/route.ts` (or separate sub-route)
- Implement `PUT` for `/interview` sub-route
- Validate pre-condition: at least one `scheduled` interview exists
- Validate scores: 0–100 range
- Compute `totalScore`
- Set `conductedBy` from session's `StaffMeta.id`
- Update interview status to `completed`
- Update application status to `interview_completed`
- Wrap in Prisma transaction

### Task 8: Approve/Reject Workflow API
- File: `src/app/api/admin/admissions/[id]/route.ts`
- Implement `POST` for `/approve` — requires `program_admin` or `super_admin` role
- Implement `POST` for `/reject` — requires `program_admin` or `super_admin` role
- Validate status transitions (reject from any non-terminal, approve only from `interview_completed`)
- Append notes/reason to application notes
- Wrap in Prisma transaction

### Task 9: Conversion API
- File: `src/app/api/admin/admissions/[id]/route.ts`
- Implement `POST` for `/convert`
- Validate pre-condition: status is `approved`
- Validate `batchId` and `groupId` (group must belong to batch)
- Atomic transaction:
  1. `db.participant.create()`
  2. `db.guardian.create()`
  3. `db.guardianChild.create()`
  4. `db.admissionApplication.update()` — set `convertedParticipantId` and `status = "converted"`
- Return created IDs
- Audit log the conversion action

### Task 10: Public Application Form UI
- Files:
  - `src/components/modules/admissions/public-application-form.tsx`
  - `src/components/modules/admissions/application-success.tsx`
- Mobile-first, no `AppShell`
- City → Park cascading select (fetch cities on mount, fetch parks on city change)
- Form validation with Zod + react-hook-form (via shadcn `Form` component)
- Submit calls `POST /api/admin/admissions`
- On success, render `ApplicationSuccess` component with tracking code
- Loading states, error handling

### Task 11: Public Status Check UI
- File: `src/components/modules/admissions/public-status-check.tsx`
- Mobile-first, no `AppShell`
- Two-field form (tracking code, phone)
- Calls `GET /api/admin/admissions/status`
- Display status result card with status badge
- Link to application form
- Loading/error states

### Task 12: Admin Admissions Pipeline Page
- File: `src/components/modules/admin/admin-admissions-page.tsx`
- Rendered inside `AppShell`
- Status tabs using shadcn `Tabs` component with count badges
- `FilterBar` with search and city/park dropdowns
- `DataTable` with columns: tracking code, applicant, guardian, city/park, status, submitted date, actions
- Action buttons: `DropdownMenu` per row with contextual actions
- Uses TanStack Query for data fetching with status as query key
- Navigate to detail view on row click

### Task 13: Application Detail View
- File: `src/components/modules/admin/admissions-detail-page.tsx`
- Two-column responsive layout
- Application info card with all fields
- Interview history timeline
- Admin notes editable section
- Action panel with status-appropriate buttons
- Back button to pipeline

### Task 14: Interview Scheduling and Completion Dialogs
- Files:
  - `src/components/modules/admissions/schedule-interview-dialog.tsx`
  - `src/components/modules/admissions/complete-interview-dialog.tsx`
- Scheduling dialog: `Calendar` + time input + notes
- Completion dialog: three score inputs + computed total + notes
- Both use shadcn `Dialog` with `Form` components
- Optimistic update or query invalidation on success
- Validation with error display

### Task 15: Conversion Dialog with Preview
- File: `src/components/modules/admissions/convert-dialog.tsx`
- Batch → Group cascading select
- Preview section showing what will be created (participant, guardian, link)
- Confirmation step with clear "Convert" button
- On success: toast notification, query invalidation, navigate to People page
- Handles errors gracefully (e.g., duplicate guardian phone scenario)

---

## 6. Dependencies

### Required Modules (must be completed first)

| Module | What It Provides |
|--------|-----------------|
| **Module 1: Auth & Foundation** | NextAuth setup, `requireRole` authorization, `SessionProvider`, audit logging, `StaffMeta` model |
| **Module 2: City Operations** | `City`, `Park`, `Batch`, `Group`, `Participant`, `Guardian`, `GuardianChild` models and APIs; `ScopeSelector` component |

### Shared Components Used (from Module 1)

- `PageHeader` — page titles and breadcrumbs
- `LoadingState` — loading skeletons
- `ErrorState` — error display with retry
- `ConfirmDialog` — confirmation modals
- `StatusBadge` — colored status indicators
- `DataTable` — sortable, filterable table
- `FilterBar` — collapsible filter row
- `SearchInput` — debounced search
- `WhatsAppLink` — phone-to-WhatsApp link
- `FormActions` — save/cancel action bar

### Integration Points

- **Navigation store (`useAppStore`):** Add `navigateTo("public-apply")`, `navigateTo("public-status")`, `navigateTo("admin-admissions")`, `navigateTo("admin-admissions-detail", { applicationId })`
- **Page router (`PageRenderer`):** Register new client-side pages for admissions routes
- **Sidebar:** Add "Admissions" menu item for admin roles with count badge showing pending applications
- **Audit log:** Log conversion actions with `logAction()` helper
- **People page (Module 2):** Converted participants should appear in the People list; navigation link from conversion success

---

## 7. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-01 | Public user can submit an application without logging in and receives a unique 8-character tracking code |
| AC-02 | Tracking code is displayed prominently on the success screen with a copy button |
| AC-03 | Public user can check application status using tracking code + guardian phone number |
| AC-04 | Status check returns correct status, submitted date, city, and park name |
| AC-05 | Status check returns 404 when tracking code and phone do not match |
| AC-06 | Admin sees all applications in a table with pagination and sorting |
| AC-07 | Admin can filter applications by status using tabbed navigation |
| AC-08 | Admin can search applications by applicant name, guardian name, or tracking code |
| AC-09 | Admin can filter by city and park |
| AC-10 | `city_head` only sees applications for their assigned city |
| AC-11 | Admin can schedule an interview with date, time, and notes |
| AC-12 | Scheduling an interview updates application status to `interview_scheduled` |
| AC-13 | Admin can complete an interview with three scores (0–100 each) and notes |
| AC-14 | Completing an interview computes total score and updates application status to `interview_completed` |
| AC-15 | Admin can approve an `interview_completed` application with optional notes |
| AC-16 | Admin can reject an application at any non-terminal stage with a required reason (min 10 chars) |
| AC-17 | Conversion creates a `Participant` record with correct name, DOB, gender, and group assignment |
| AC-18 | Conversion creates a `Guardian` record with correct name and phone |
| AC-19 | Conversion creates a `GuardianChild` link with the correct relation |
| AC-20 | Conversion updates application status to `converted` and sets `convertedParticipantId` |
| AC-21 | Converted participant appears in the People page (Module 2) |
| AC-22 | Converted guardian appears in the Guardians page (Module 2) |
| AC-23 | Application status cannot be updated after conversion |
| AC-24 | Conversion dialog shows a preview of all records to be created before confirmation |
| AC-25 | All operations are wrapped in Prisma transactions for atomicity |
| AC-26 | Audit logs are created for approve, reject, and convert actions |

---

## 8. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/admin/admissions/route.ts` | Public submit (POST), public status check (GET), admin list (GET with auth) |
| `src/app/api/admin/admissions/[id]/route.ts` | Admin detail (GET), update (PUT), approve (POST), reject (POST), convert (POST) |
| `src/app/api/admin/admissions/[id]/interview/route.ts` | Schedule interview (POST), complete interview (PUT) |
| `src/components/modules/admissions/public-application-form.tsx` | Public application form page |
| `src/components/modules/admissions/application-success.tsx` | Post-submission success screen with tracking code |
| `src/components/modules/admissions/public-status-check.tsx` | Public status check page |
| `src/components/modules/admin/admin-admissions-page.tsx` | Admin admissions pipeline page |
| `src/components/modules/admin/admissions-detail-page.tsx` | Application detail view |
| `src/components/modules/admissions/schedule-interview-dialog.tsx` | Interview scheduling dialog |
| `src/components/modules/admissions/complete-interview-dialog.tsx` | Interview completion dialog |
| `src/components/modules/admissions/convert-dialog.tsx` | Conversion dialog with preview |
| `src/lib/tracking-code.ts` | Tracking code generation utility |

### Modified Files

| File | Modification |
|------|-------------|
| `prisma/schema.prisma` | Add `AdmissionApplication` and `AdmissionInterview` models (if not already present); ensure `City` and `Park` have `admissionApplications` relations |
| `src/stores/useAppStore.ts` | Add admissions-related navigation pages: `public-apply`, `public-status`, `admin-admissions`, `admin-admissions-detail` |
| `src/components/layout/sidebar.tsx` | Add "Admissions" menu item for admin roles with pending count badge |
| `src/components/layout/app-shell.tsx` | Add routing logic for public admissions pages (rendered without `AppShell`) |
| `src/types/index.ts` | Add admission-related TypeScript types and interfaces |
| `src/types/api.ts` | Add admission API request/response types |