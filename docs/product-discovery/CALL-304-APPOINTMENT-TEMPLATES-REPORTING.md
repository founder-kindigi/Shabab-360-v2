# CALL-304: Appointment Links, Message Templates & Reporting Design

**Task:** CALL-304  
**Owner:** DeepSeek  
**Status:** Draft — pending Codex review  
**Created:** 2026-07-21  
**Scope:** Calling-system appointment/orientation linking, message templates, and
operational reporting. Docs only; depends on CALL-302 (schema/APIs) and
CALL-303 (caller queue/lead timeline).

---

## 1. Purpose

CALL-304 addresses three remaining calling-system features after the core
caller queue (CALL-303) is built:

1. **Appointment/orientation linkage** — connect a call interaction to an
   interview or orientation appointment, record attendance, and surface the
   next-do date on the lead timeline.
2. **Message templates** — city-approved, versioned WhatsApp and SMS templates
   with merge variables. The caller copies the template into a WhatsApp deep
   link or manual message; no automated sending in the pilot.
3. **Reports** — funnel, workload, conversion, and no-show reports for City
   Head, Calling POC, and HQ oversight.

---

## 2. Appointment / Orientation Links

### 2.1 Data Model

The `AdmissionInterview` model already exists and stores `scheduledDate`,
`scheduledTime`, `status` (`scheduled`, `completed`, `cancelled`, `no_show`),
`score1-3`, `totalScore`, `notes`, and `conductedBy`.

**Required additions to the calling model** (CALL-302 schema):

| Field | Table | Purpose |
|-------|-------|---------|
| `appointmentId` | `CallInteraction` (nullable) | Links a call outcome to the scheduled interview or orientation |
| `appointmentType` | `CallInteraction` (nullable) | `interview`, `orientation` — disambiguates which appointment type |
| `confirmedAt` | `AdmissionInterview` (nullable) | Timestamp when the applicant confirmed the slot via call |
| `arrivedAt` | `AdmissionInterview` (nullable) | Timestamp of physical arrival |
| `orientationStatus` | New: `orientation_attendance` or added to `AdmissionInterview` | `scheduled`, `attended`, `no_show`, `cancelled` |
| `orientationDate` | New: on admission application or linked record | The scheduled orientation event date |

### 2.2 Workflow

```
Call outcome = "coming"
  → Create or confirm appointment slot
  → Set confirmedAt on interview record
  → Appointment appears in lead timeline

Call outcome = "reschedule"
  → Show available slots
  → Update scheduledDate/scheduledTime
  → Set confirmedAt on reschedule

Appointment date arrives
  → Park Admin / reception marks arrivedAt or no_show
  → If no_show → queue follow-up call with follow-up task
  → If attended → admission interview proceeds

Orientation scheduled
  → Linked orientation event with date/venue
  → Follow-up call before orientation (reminder)
  → Orientation attendance recorded
  → If no_show → queue re-orientation or admission status review
```

### 2.3 Lead Timeline Integration

The timeline (CALL-303) must display:

```
[Call] 2026-07-21: Answered - Coming (to interview)
[Appt] 2026-07-25: Interview scheduled at 10:00, State Life School
       → confirmed? ✓ | arrived? — | no-show? —
[Call] 2026-07-26: Answered - Coming (to orientation)
[Appt] 2026-08-01: Orientation at 09:00, Iqbal Park
       → arrived? ✓
```

Each appointment card shows:
- Type (interview / orientation)
- Date, time, venue
- Confirmed / arrived / no-show / cancelled status
- Link to the admission interview detail or orientation event

### 2.4 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/admin/calling/appointments` | Schedule or reschedule an appointment linked to a lead |
| `GET` | `/api/admin/calling/appointments?leadId=` | List appointments for a lead |
| `PATCH` | `/api/admin/calling/appointments/[id]/arrival` | Mark arrived (record arrivedAt, reception staff) |
| `PATCH` | `/api/admin/calling/appointments/[id]/no-show` | Mark no-show (queue follow-up task) |
| `GET` | `/api/park/today-appointments` | Park admin view of today's expected arrivals |

### 2.5 Access Rules

| Actor | Appointments visible | Actions |
|-------|--------------------|---------|
| Super Admin / Program Admin | All | Schedule, reschedule, cancel, mark arrival/no-show |
| City Head | Own city only | Same as above within city |
| Calling POC | Own city calls | Schedule/reschedule interviews; view orientation details |
| Park Admin | Own park arrivals | Mark arrived/no-show; view today's list |
| Assigned Caller | Own assigned leads only | Confirm/reschedule; cannot cancel or mark arrival |

---

## 3. Message Templates

### 3.1 Data Model

```typescript
model CallingTemplate {
  id          String   @id @default(cuid())
  cityId      String
  code        String   // e.g. "interview_invite", "orientation_reminder", "follow_up"
  name        String   // Human-readable: "Interview Invite - Lahore"
  channel     String   // "whatsapp" | "sms"
  body        String   // Template text with {{variable}} placeholders
  variables   String   // JSON array of variable names: ["name", "park", "date", "time", "venue"]
  version     Int      @default(1)
  status      String   @default("active") // "active" | "draft" | "archived"
  createdBy   String   // userId
  approvedBy  String?  // userId who approved
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  city City @relation(fields: [cityId], references: [id])

  @@unique([cityId, code, version])
  @@index([cityId, status])
  @@map("calling_templates")
}
```

### 3.2 Template Variables

Standard variables available for substitution:

| Variable | Source | Example |
|----------|--------|---------|
| `{{name}}` | Applicant name | "Ahmed Khan" |
| `{{guardian_name}}` | Guardian name | "Mohammad Khan" |
| `{{park}}` | Allocated/preferred park name | "State Life School" |
| `{{city}}` | City name | "Lahore" |
| `{{date}}` | Appointment date | "25 July 2026" |
| `{{time}}` | Appointment time | "10:00 AM" |
| `{{venue}}` | Park address or venue name | "State Life School, Room 3" |
| `{{tracking_code}}` | Application tracking code | "LHR-2026-0042" |
| `{{campaign}}` | Campaign name if applicable | "Phase 2 - Iqbal Park" |
| `{{caller_name}}` | Caller's name | "Sajid Ali" |
| `{{caller_phone}}` | Caller's contact number (scoped) | "0300-1234567" |

### 3.3 Template Lifecycle

1. City Head or Calling POC creates a draft template.
2. Template is reviewed (approvedBy) — approval is recorded but no strict
   multi-stage workflow in the pilot; a simple "approve" action suffices.
3. Active templates appear in the caller's template picker.
4. Archived templates are hidden but preserved for history.
5. Versioning: a new version of the same `code` increments `version`; previous
   versions remain in the database but are not offered in the picker.

### 3.4 User Experience

**Caller flow:**
1. In the lead timeline, tap "Send WhatsApp" or "Send SMS".
2. A template picker opens showing only active templates for the caller's city.
3. Selecting a template pre-fills the message with resolved variables.
4. Caller reviews, edits if needed (the template is a starting point, not
   enforced), and clicks to open WhatsApp deep link:
   `https://wa.me/923001234567?text={encoded_message}`
5. After sending, caller records the outcome manually: "sent", "read", "replied",
   "no_response".
6. The sent template and outcome are recorded in the call interaction history.

**Important:** The system does not send messages or track delivery. The caller
opens WhatsApp manually and records the result. This is an explicit pilot
constraint.

### 3.5 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/calling/templates?cityId=` | List active templates for a city |
| `POST` | `/api/admin/calling/templates` | Create a new template (draft) |
| `PATCH` | `/api/admin/calling/templates/[id]` | Edit template (resets to draft if previously active) |
| `POST` | `/api/admin/calling/templates/[id]/approve` | Approve template |
| `POST` | `/api/admin/calling/templates/[id]/archive` | Archive template (soft delete) |
| `POST` | `/api/admin/calling/templates/[id]/new-version` | Create new version from existing |

### 3.6 Access Rules

| Actor | Templates visible | Actions |
|-------|------------------|---------|
| Super Admin / Program Admin | All cities | CRUD, approve, archive |
| City Head | Own city | CRUD, approve, archive within city |
| Calling POC | Own city | Create draft, edit own drafts; cannot approve |
| Assigned Caller | Own city active templates only | Read and use in WhatsApp deep link; cannot create/edit |

---

## 4. Reports

### 4.1 Calling Funnel Report

Shows the pipeline from assignment through contact to appointment and outcome.

| Column | Source |
|--------|--------|
| City | `City.name` |
| Campaign | `Campaign.name` or admission source |
| Assigned leads | Count of calling assignments |
| Attempted contacts | Distinct leads with ≥1 call interaction |
| Reached (answered) | Leads with an "answered" outcome |
| Coming | Leads with "coming" prospect response |
| Interview scheduled | Leads with an appointment record |
| Interview attended | Appointments with arrivedAt set |
| Orientation scheduled | Leads with orientation linked |
| Orientation attended | Orientation attendance recorded |
| Enrolled | AdmissionApplication status = "approved" or "enrolled" |
| Referred / closed | Eligibility outcome |

**Filter by:** city, park, campaign, date range, caller.

**Export:** CSV with the same columns (audited, purpose-recorded).

### 4.2 Workload & Productivity Report

| Column | Source |
|--------|--------|
| Caller name | `User.name` |
| City | `City.name` |
| Assigned leads | Count |
| Call attempts | Count of call interactions |
| Answered calls | Count where outcome = "answered" |
| Appointments set | Count of appointments created |
| Last activity date | Max `CallInteraction.createdAt` |
| Overdue follow-ups | Count where follow-up date < now and not completed |

**Filter by:** city, date range.

### 4.3 No-Show Report

| Column | Source |
|--------|--------|
| City | `City.name` |
| Park | `Park.name` |
| Applicant name | `AdmissionApplication.applicantName` |
| Guardian phone | `AdmissionApplication.guardianPhone` |
| Appointment type | interview / orientation |
| Scheduled date | `AdmissionInterview.scheduledDate` |
| No-show date | Timestamp when no_show was recorded |
| Follow-up status | `pending` / `completed` if a follow-up task exists |
| Caller | Last caller who confirmed |

**Filter by:** city, park, date range, appointment type.

**Action:** Each row has a "Queue follow-up call" action that creates a
follow-up task for the assigned caller.

### 4.4 Template Usage Report

| Column | Source |
|--------|--------|
| Template name | `CallingTemplate.name` |
| City | `City.name` |
| Times used | Count of call interactions referencing this template code |
| Last used | Max date |
| Status | active / draft / archived |

**Purpose:** Identify which templates are actually used and retire unused ones.

### 4.5 Dashboard Widgets (Calling POC / City Head)

The calling section of the City Head dashboard should surface:

- **Queue depth:** Assigned leads awaiting first contact
- **Overdue tasks:** Follow-ups past due
- **Conversion rate:** (enrolled / assigned) % over selected period
- **No-show rate:** (no_show / scheduled) % over selected period
- **Caller activity:** Callers with no activity in 48h
- **Top templates:** Most-used templates this week

### 4.6 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/calling/reports/funnel` | Funnel report |
| `GET` | `/api/admin/calling/reports/workload` | Workload & productivity |
| `GET` | `/api/admin/calling/reports/no-shows` | No-show report |
| `GET` | `/api/admin/calling/reports/templates` | Template usage report |
| `GET` | `/api/city-head/calling/dashboard` | City Head calling dashboard widgets |

All report endpoints accept: `?cityId=&parkId=&callerId=&from=&to=&campaign=`
with Zod-validated bounded query params.

### 4.7 Access Rules

| Report | Super Admin / Program Admin | City Head | Calling POC | Caller |
|--------|---------------------------|-----------|-------------|--------|
| Funnel | All cities | Own city | Own city | N/A |
| Workload | All cities | Own city | Own city | Own data only |
| No-shows | All cities | Own city | Own city | Own leads only |
| Template usage | All cities | Own city | Own city | N/A |
| Dashboard | All cities | Own city | Own calls only | N/A |

---

## 5. Data Model Summary (Additions to CALL-302)

```prisma
model CallingTemplate {
  id         String   @id @default(cuid())
  cityId     String
  code       String
  name       String
  channel    String   // "whatsapp" | "sms"
  body       String
  variables  String   // JSON
  version    Int      @default(1)
  status     String   @default("draft")
  createdBy  String
  approvedBy String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  city City @relation(fields: [cityId], references: [id])

  @@unique([cityId, code, version])
  @@index([cityId, status])
  @@map("calling_templates")
}
```

**CALL-302 additions for appointments:**

The `CallInteraction` model (defined in CALL-302) needs:

```prisma
model CallInteraction {
  // ... fields defined in CALL-302 ...
  appointmentId   String?  // FK → AdmissionInterview.id or orientation event
  appointmentType String?  // "interview" | "orientation"
}
```

The `AdmissionInterview` model in the base schema needs:

```prisma
model AdmissionInterview {
  // ... existing fields ...
  confirmedAt DateTime?  // when applicant confirmed via call
  arrivedAt   DateTime?  // when applicant physically arrived
}
```

---

## 6. UI Component Specifications (for CALL-303 frontend work)

These are the UI components needed for the appointment/template features.
They are listed here as design specs for the implementer.

### 6.1 Appointment Card (on Lead Timeline)

```
┌─────────────────────────────────────┐
│ 📅 Interview — 25 July 2026        │
│ 10:00 AM — State Life School       │
│                                     │
│ ● Confirmed                        │
│ ○ Arrived (tap to mark)            │
│ ○ No-show (tap to mark)            │
│                                     │
│ [Reschedule] [Cancel]              │
└─────────────────────────────────────┘
```

### 6.2 Schedule Appointment Dialog

```
┌─ Schedule Appointment ──────────────┐
│ Type:  [Interview ▼]               │
│ Date:  [📅 25/07/2026]             │
│ Time:  [⏰ 10:00 AM]               │
│ Venue: [📍 State Life School ▼]    │
│                                     │
│ Notes: [Optional note...          ] │
│                                     │
│          [Cancel] [Save]            │
└─────────────────────────────────────┘
```

### 6.3 Template Picker (WhatsApp/SMS action)

```
┌─ Choose Template ───────────────────┐
│ Search: [........................]  │
│                                     │
│ ○ Interview Invite ──────────────   │
│   "Assalam-o-Alaikum {{name}},..."  │
│   Last used: 2 days ago             │
│                                     │
│ ○ Orientation Reminder ──────────   │
│   "Dear {{guardian_name}}, this..." │
│   Last used: 5 days ago             │
│                                     │
│ ○ Follow-up ─────────────────────   │
│   "We tried to reach you..."        │
│   Last used: Today                  │
│                                     │
│          [Cancel] [Use Selected]    │
└─────────────────────────────────────┘
```

### 6.4 Template Editor (City Head / POC)

```
┌─ Edit Template ─────────────────────┐
│ Name:    [Interview Invite - Lhr  ]│
│ Code:    [interview_invite_v2     ]│
│ Channel: [WhatsApp ▼]              │
│                                     │
│ Body:                               │
│ ┌─────────────────────────────────┐ │
│ │ Assalam-o-Alaikum {{name}},    │ │
│ │ This is a reminder for your    │ │
│ │ interview at {{park}} on       │ │
│ │ {{date}} at {{time}}. Please   │ │
│ │ confirm your attendance.       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Variables: [{{name}}] [{{park}}]   │
│           [{{date}}] [{{time}}]    │
│                                     │
│ Preview: Assalam-o-Alaikum Ahmed.. │
│                                     │
│ Status: [Draft ▼]                   │
│          [Save Draft] [Approve]     │
└─────────────────────────────────────┘
```

---

## 7. Implementation Dependencies

| Item | Depends on | Notes |
|------|-----------|-------|
| Appointment links | CALL-302 `CallInteraction` model | Adds `appointmentId` + `appointmentType` |
| Interview confirmation | Existing `AdmissionInterview` model | Adds `confirmedAt` + `arrivedAt` |
| Orientation tracking | CALL-302 or existing event model | Orientation is a future event type; earlier milestones use interview model |
| Templates | CALL-302 schema first | New `CallingTemplate` model |
| Reports | CALL-302 + 303 data models | Read-only aggregation queries |
| Template picker UI | CALL-303 lead timeline | New dialog component |
| Funnel report | CALL-303 call interaction data | New report API + UI |
| City Head calling dashboard | Existing city dashboard | New widget section |

---

## 8. Rollback & Data Impact

| Change | Rollback |
|--------|----------|
| `CallInteraction.appointmentId` | Column is nullable; set to NULL, no data loss |
| `AdmissionInterview.confirmedAt` / `arrivedAt` | Columns are nullable; leave in place, no application impact |
| `CallingTemplate` table | Safe to drop if migration is rolled back; templates are authoring data, not operational |
| Report APIs | Rolled back with code; no schema impact |

**Data retention:** Templates are authoring records, not personal data. They
can be retained after rollback. Appointment confirmation timestamps are
operational and safe to retain.

---

## 9. Risks & Owner Decisions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Orientation model not yet defined | Appointment links deferred for orientation | Use interview model for pilot; orientation added when event model exists |
| Template variables leak personal data | Unintended PII in template previews | Audit template bodies; restrict variables to approved list above |
| Caller edits template beyond recognition | Misleading message sent | Templates are starting points; caller takes responsibility for final message |
| No-show report reveals personal data | Phone numbers in export | Limit no-show report to City Head + Calling POC; audit all exports |
| Funnel report spans cities | Cross-city leakage | Always filter by city scope; HQ sees all, city/caller see only own |

**Owner decisions needed:**
1. Whether orientation appointments use the AdmissionInterview model (extended)
   or require a separate `OrientationAttendance` model
2. Whether templates require two-stage approval (draft → pending → approved) or
   single-stage (draft → approved)
3. Export format for reports — CSV only, or also PDF?
4. Whether the funnel report should include a weekly comparison trend or only
   current-period snapshot

---

## 10. Handoff

```
Task ID: CALL-304
Branch and base commit: agent/deepseek/CALL-304-calling-design
  (base: codex/production-hardening @ dffd68a)
PR URL: (created via GitHub — target: codex/production-hardening)
Changed files: docs/product-discovery/CALL-304-APPOINTMENT-TEMPLATES-REPORTING.md
What changed:
  - Appointment/orientation link model: CallInteraction.appointmentId,
    AdmissionInterview.confirmedAt/arrivedAt
  - Full CallingTemplate model with lifecycle, versioning, and variables
  - Appointment scheduling, arrival marking, and no-show handling workflow
  - Template picker and editor UI specifications
  - Four report definitions: funnel, workload, no-show, template usage
  - City Head calling dashboard widget specifications
  - API endpoint inventory for all new features
  - Access rules for every new endpoint and report
What was intentionally excluded:
  - No schema or Prisma model changes (docs only)
  - No application code changes (routes, components, tests)
  - No actual migration or data transformation
  - No automated message sending (pilot constraint)
  - No orientation model design (deferred to event model)
  - No CALL-302 or CALL-303 redefinition
Role/scope and personal-data impact:
  - Personal data appears only in reports that already have access to it
  - Templates use merge variables, never raw personal data storage
  - All reports scoped by city; cross-city access limited to HQ roles
  - Exports audited; no caller-level CSV export
Migration/data impact:
  - Additive only: new nullable columns, new table
  - Full rollback without data loss
  - No existing data transformation required
Commands run and results:
  - No commands run (docs-only task)
Known risks / owner decisions:
  - Orientation model dependency: appointment links deferred for orientation
  - Template variable PII leakage: restricted to approved variable set
  - Four owner decisions pending (see section 9)
Ready for Codex review.
```
