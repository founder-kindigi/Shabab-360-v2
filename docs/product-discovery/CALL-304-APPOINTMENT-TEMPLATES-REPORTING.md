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

1. **Appointment linkage** — connect a call interaction to an interview
   appointment (AdmissionInterview only), record arrival and no-show, and
   surface the next-do date on the lead timeline. Orientation appointment links
   are deferred to EVENT-302 when the event/attendance model exists.
2. **Message templates** — city-approved, versioned WhatsApp and SMS templates
   with merge variables. The caller copies the template into a WhatsApp deep
   link or manual message; no automated sending in the pilot.
3. **Reports** — funnel, workload, conversion, and no-show reports for City
   Head and HQ oversight.

---

## 2. Appointment Links

### 2.1 Data Model

The `AdmissionInterview` model already exists and stores `scheduledDate`,
`scheduledTime`, `status` (`scheduled`, `completed`, `cancelled`, `no_show`),
`score1-3`, `totalScore`, `notes`, and `conductedBy`.

**Required additions to the calling model (CALL-302 schema):**

| Field | Table | Purpose |
|-------|-------|---------|
| `interviewId` | `CallInteraction` (nullable) | FK to the AdmissionInterview confirmed during this call |
| `confirmedAt` | `AdmissionInterview` (nullable) | Timestamp when the applicant confirmed the slot via call |
| `arrivedAt` | `AdmissionInterview` (nullable) | Timestamp of physical arrival |

The pilot supports only `AdmissionInterview` linkage. Orientation appointment
linking waits for EVENT-302 when the event model and attendance model exist.

### 2.2 Workflow

```
Call outcome = "coming"
  → Create or confirm interview slot
  → Set confirmedAt on interview record
  → Appointment appears in lead timeline

Call outcome = "reschedule"
  → Show available slots
  → Update scheduledDate/scheduledTime
  → Set confirmedAt on reschedule

Interview date arrives
  → Park Admin / reception marks arrivedAt or no_show
  → If no_show → queue follow-up call with follow-up task
  → If attended → admission interview proceeds
```

### 2.3 Lead Timeline Integration

The timeline (CALL-303) must display:

```
[Call] 2026-07-21: Answered - Coming (to interview)
[Appt] 2026-07-25: Interview scheduled at 10:00, State Life School
       → confirmed? ✓ | arrived? — | no-show? —
```

Each appointment card shows:
- Interview date, time, venue
- Confirmed / arrived / no-show / cancelled status
- Link to the admission interview detail

### 2.4 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/admin/calling/appointments` | Schedule or reschedule an interview linked to a lead |
| `GET` | `/api/admin/calling/appointments?leadId=` | List appointments for a lead |
| `PATCH` | `/api/admin/calling/appointments/[id]/arrival` | Mark arrived (record arrivedAt, reception staff) |
| `PATCH` | `/api/admin/calling/appointments/[id]/no-show` | Mark no-show (queue follow-up task) |
| `GET` | `/api/park/today-appointments` | Park admin view of today's expected arrivals |

### 2.5 Access Rules

| Actor | Appointments visible | Actions |
|-------|---------------------|---------|
| Super Admin / Program Admin | All | Schedule, reschedule, cancel, mark arrival/no-show |
| City Head | Own city only | Same as above within city |
| Calling POC (temporary assignment) | Assigned campaign/event leads only | Schedule/reschedule interviews; cannot cancel or mark arrival |
| Park Admin | Own park arrivals | Mark arrived/no-show; view today's list |
| Assigned Caller | Own assigned leads only | Confirm/reschedule; cannot cancel or mark arrival |

---

## 3. Message Templates

### 3.1 Data Model

```typescript
model CallingTemplate {
  id          String   @id @default(cuid())
  cityId      String
  code        String   // e.g. "interview_invite", "follow_up"
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

### 3.2 Template Variables (Allowlist)

Only the following merge variables are permitted in templates. No fields
containing CNIC, address, date of birth, or free-form guardian remarks may
be exposed as variables. The server must reject templates that reference
unlisted variables.

| Variable | Source | Example |
|----------|--------|---------|
| `{{name}}` | Applicant name | "Ahmed Khan" |
| `{{guardian_name}}` | Guardian name | "Mohammad Khan" |
| `{{park}}` | Allocated/preferred park name | "State Life School" |
| `{{city}}` | City name | "Lahore" |
| `{{date}}` | Interview date | "25 July 2026" |
| `{{time}}` | Interview time | "10:00 AM" |
| `{{venue}}` | Park address or venue name | "State Life School, Room 3" |
| `{{tracking_code}}` | Application tracking code | "LHR-2026-0042" |
| `{{campaign}}` | Campaign name if applicable | "Phase 2 - Iqbal Park" |
| `{{caller_name}}` | Caller's name | "Sajid Ali" |
| `{{caller_phone}}` | Caller's scoped contact number | "0300-1234567" |

### 3.3 Template Lifecycle

1. City Head creates a draft template.
2. Template is reviewed (approvedBy) — a simple "approve" action suffices for
   the pilot.
3. Active templates appear in the caller's template picker.
4. Archived templates are hidden but preserved for history.
5. Versioning: a new version of the same `code` increments `version`; previous
   versions remain in the database but are not offered in the picker.

### 3.4 Immutable Template-Use History

Every use of a template must record an immutable audit snapshot:

```prisma
model TemplateUse {
  id          String   @id @default(cuid())
  interactionId String // FK → CallInteraction
  templateId  String   // FK → CallingTemplate (immutable reference)
  versionUsed Int      // version at time of use
  codeUsed    String   // code at time of use (audit snapshot)
  channel     String   // "whatsapp" | "sms"
  variables   String   // JSON of merge-variable values actually used
  outcome     String?  // caller-recorded: "sent", "read", "replied", "no_response"
  createdAt   DateTime @default(now())

  @@index([templateId, versionUsed])
  @@index([interactionId])
  @@map("template_uses")
}
```

- `templateId` + `versionUsed` provide a durable reference even if the template
  is later edited or archived.
- `codeUsed` is a human-readable snapshot; it is never relied on for
  referential integrity.
- `variables` stores only the merge-variable values actually used (e.g.
  `{"name":"Ahmed Khan","park":"State Life School"}`). It does not store the
  full rendered message body unless required for audit; prefer storing the
  variable map alone.

### 3.5 User Experience

**Caller flow:**
1. In the lead timeline, tap "Send WhatsApp" or "Send SMS".
2. A template picker opens showing only active templates for the caller's city.
3. Selecting a template pre-fills the message with resolved variables.
4. Caller reviews, edits if needed (the template is a starting point, not
   enforced), and clicks to open WhatsApp deep link:
   `https://wa.me/923001234567?text={encoded_message}`
5. After sending, caller records the outcome manually: "sent", "read", "replied",
   "no_response".
6. The template reference (id + version) and resolved variables are recorded in
   a `TemplateUse` record.

**Important:** The system does not send messages or track delivery. The caller
opens WhatsApp manually and records the result. This is an explicit pilot
constraint.

### 3.6 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/calling/templates?cityId=` | List active templates for a city |
| `POST` | `/api/admin/calling/templates` | Create a new template (draft) |
| `PATCH` | `/api/admin/calling/templates/[id]` | Edit template (resets to draft if previously active) |
| `POST` | `/api/admin/calling/templates/[id]/approve` | Approve template |
| `POST` | `/api/admin/calling/templates/[id]/archive` | Archive template (soft delete) |
| `POST` | `/api/admin/calling/templates/[id]/new-version` | Create new version from existing |
| `POST` | `/api/admin/calling/templates/use` | Record a template use (id, version, variables, outcome) |

### 3.7 Access Rules

| Actor | Templates visible | Actions |
|-------|------------------|---------|
| Super Admin / Program Admin | All cities | CRUD, approve, archive |
| City Head | Own city | CRUD, approve, archive within city |
| Calling POC (temporary assignment) | Assigned campaign/event only | Create draft, edit own drafts; cannot approve |
| Assigned Caller | Active templates only | Read and use in WhatsApp deep link; cannot create/edit |
| External Support Caller | Active templates only | Read and use; cannot create/edit |

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
| Interview scheduled | Leads with an interview appointment |
| Interview attended | Appointments with arrivedAt set |
| Enrolled | AdmissionApplication status = "approved" or "enrolled" |
| Referred / closed | Eligibility outcome |

**Filter by:** city, park, campaign, date range, caller.

**Export:** City Head only may export CSV with the same columns. Every export
must be audited: purpose, filters applied, record count, and timestamp are
recorded before the file is served. Calling POC and callers cannot export.

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
| Scheduled date | `AdmissionInterview.scheduledDate` |
| No-show date | Timestamp when no_show was recorded |
| Follow-up status | `pending` / `completed` if a follow-up task exists |
| Caller | Last caller who confirmed |

**Filter by:** city, park, date range.

**Action:** Each row has a "Queue follow-up call" action that creates a
follow-up task for the assigned caller.

### 4.4 Template Usage Report

| Column | Source |
|--------|--------|
| Template name | `CallingTemplate.name` |
| City | `City.name` |
| Times used | Count of TemplateUse records |
| Last used | Max date |
| Status | active / draft / archived |

**Purpose:** Identify which templates are actually used and retire unused ones.

### 4.5 Dashboard Widgets (City Head)

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

The server derives city, event, campaign, and assignment scope from the
authenticated user's role and assigned scope. Query parameters (`?parkId=`,
`?callerId=`, `?from=`, `?to=`, `?campaign=`) may only narrow the authorized
scope. A query parameter that requests data outside the user's scope must be
ignored or return an empty result; it must never return cross-scope data.

API inputs use Zod-validated bounded query params.

### 4.7 Access Rules

| Report | Super Admin / Program Admin | City Head | Calling POC | Caller / External Support |
|--------|---------------------------|-----------|-------------|--------------------------|
| Funnel | All cities | Own city | N/A | N/A |
| Workload | All cities | Own city | N/A | N/A |
| No-shows | All cities | Own city | N/A | N/A |
| Template usage | All cities | Own city | N/A | N/A |
| Dashboard | All cities | Own city | N/A | N/A |

Calling POC, assigned callers, and External Support Callers have no report or
dashboard access. Their view is limited to the lead timeline and call
interaction recording. CSV export is restricted to City Head alone (audited).

---

## 5. Calling POC — Temporary Responsibility Model

Calling POC is **not** a permanent role or a city-wide assignment. It is a
time-bounded operational responsibility created by a Mashwara decision, event,
or campaign.

### 5.1 Lifecycle

1. City Head (or Super Admin) creates a Calling POC assignment linked to a
   specific campaign, event, or Mashwara.
2. The assignment carries: campaign/event ID, city scope, start date, end date
   (mandatory), and accountable staff member (an existing portal user).
3. The Calling POC may assign/rebalance calls to approved Shabab callers
   within the same city, but only for leads belonging to the assigned
   campaign/event.
4. The assignment expires automatically at end date. City Head may revoke it
   earlier.
5. Expired or revoked assignments immediately remove all calling management
   access. Existing caller assignments for the campaign/event remain active
   until the campaign/event end date.

### 5.2 Scope Limits

- Manage only calls for the assigned campaign/event.
- View only calling history linked to that campaign/event.
- Assign leads to approved callers in the same city only.
- Cannot view, edit, or export leads outside the assigned campaign/event.
- Cannot manage templates outside the assigned city.
- Cannot access dashboard, people search, full city contact list, exports,
  admissions decisions, teams, Mashwara, or documents.

---

## 6. External Support Caller

Cross-department support (Atfal, Taleem, Islah, or another Alburhan department)
uses a temporary External Support Caller account. This is a separate
assignment-only workspace, not Shabab portal membership.

### 6.1 Account Rules

- Created via email/password invitation flow with mandatory first-login
  password reset.
- Every access is bound to a specific campaign or event with a mandatory
  expiry date.
- City Head creates a pre-approved helper profile; Calling POC may
  activate/deactivate its assignment within the event window.
- Access ends automatically at expiry or immediately when revoked by City
  Head or Calling POC.

### 6.2 Scope Limits

- Receives only leads explicitly assigned for one event/campaign.
- May record call interactions and follow-ups for assigned leads only.
- May use active message templates (read-only).
- **Cannot access:** dashboard, parks, batches, attendance, people search,
  admissions decisions, reports, exports, teams, Mashwara, documents,
  templates editor, or any unassigned lead.
- Every lead view and interaction is audited.

---

## 7. Data Model Summary (Additions to CALL-302)

### CallingTemplate

```prisma
model CallingTemplate {
  id         String   @id @default(cuid())
  cityId     String
  code       String
  name       String
  channel    String   // "whatsapp" | "sms"
  body       String
  variables  String   // JSON allowlist
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

### TemplateUse (immutable history)

```prisma
model TemplateUse {
  id            String   @id @default(cuid())
  interactionId String   // FK → CallInteraction
  templateId    String   // FK → CallingTemplate
  versionUsed   Int
  codeUsed      String   // audit snapshot, not used for referential integrity
  channel       String   // "whatsapp" | "sms"
  variables     String   // JSON of merge-variable values used
  outcome       String?  // "sent", "read", "replied", "no_response"
  createdAt     DateTime @default(now())

  @@index([templateId, versionUsed])
  @@index([interactionId])
  @@map("template_uses")
}
```

### CALL-302 additions for appointments

The `CallInteraction` model (defined in CALL-302) needs:

```prisma
model CallInteraction {
  // ... fields defined in CALL-302 ...
  interviewId String?  // FK → AdmissionInterview.id (pilot only; orientation deferred to EVENT-302)
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

## 8. Sensitive-Data Audit, Variable Allowlist & Retention

### 8.1 Sensitive-Data Audit

All calling operations that touch personal data must be audited:

| Event | Audit Fields |
|-------|-------------|
| Call interaction recorded | userId, leadId, outcome, timestamp |
| Appointment confirmed | userId, interviewId, confirmedAt |
| Arrival / no-show marked | userId, interviewId, arrivedAt/no-show timestamp |
| Template used | userId, templateId, version, outcome |
| CSV export (City Head only) | userId, purpose, filters, record count, timestamp, campaign/event |
| Lead assigned to caller | assignedBy, callerId, leadId, campaignId |
| Calling POC created/revoked | createdBy, pocUserId, campaignId, startDate, endDate |
| External Support Caller activated/expired | activatedBy, helperUserId, campaignId, expiry |

Audit records must never store passwords, tokens, full rendered message
bodies, or unnecessary personal data.

### 8.2 Merge-Variable Allowlist Enforcement

The server must reject template creation or updates that reference variables
outside the approved allowlist (section 3.2). This prevents accidental
exposure of CNIC, address, date of birth, guardian remarks, or other sensitive
fields through template preview or use.

### 8.3 Data Retention

- Successful-lead interaction history: retained for the active admission
  cycle plus 12 months, then archived.
- Unsuccessful-lead (referred, closed-lost, wrong-number, out-of-area)
  interaction history: retained for 12 months from the last interaction, then
  either archived with restricted access or deleted per owner-approved
  retention policy.
- Archived records are moved to a restricted-access table or cold storage.
  They are not available through the calling queue or reports.
- The encrypted source backup remains the historical record beyond the
  retention period.

---

## 9. Server-Derived Scope

The server must derive city, event, campaign, and assignment scope from the
authenticated user's role and assigned scope. No API endpoint accepts a scope
parameter that could expand the caller's authority.

**Rules:**

1. The authenticated user's `StaffMeta.assignedCityId` (or Super Admin /
   Program Admin global scope) determines the base scope.
2. For Calling POC, the active campaign/event assignment determines the
   effective scope. Expired assignments yield no scope.
3. For External Support Caller, the active campaign/event assignment
   determines the effective scope.
4. Query parameters on list and report endpoints may only **narrow** the base
   scope. Example: a City Head may filter by `parkId` within their city, but
   may not pass another city's ID.
5. Query parameters that request data outside the authorized scope must be
   ignored or return an empty result. The endpoint must never return
   cross-scope data.

---

## 10. UI Component Specifications (for CALL-303 frontend work)

These are the UI components needed for the appointment/template features.
They are listed here as design specs for the implementer.

### 10.1 Appointment Card (on Lead Timeline)

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

### 10.2 Schedule Appointment Dialog

```
┌─ Schedule Appointment ──────────────┐
│ Date:  [📅 25/07/2026]             │
│ Time:  [⏰ 10:00 AM]               │
│ Venue: [📍 State Life School ▼]    │
│                                     │
│ Notes: [Optional note...          ] │
│                                     │
│          [Cancel] [Save]            │
└─────────────────────────────────────┘
```

### 10.3 Template Picker (WhatsApp/SMS action)

```
┌─ Choose Template ───────────────────┐
│ Search: [........................]  │
│                                     │
│ ○ Interview Invite ──────────────   │
│   "Assalam-o-Alaikum {{name}},..."  │
│   Last used: 2 days ago             │
│                                     │
│ ○ Follow-up ──────────────────────  │
│   "We tried to reach you..."        │
│   Last used: Today                  │
│                                     │
│          [Cancel] [Use Selected]    │
└─────────────────────────────────────┘
```

### 10.4 Template Editor (City Head / Calling POC)

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

## 11. Implementation Dependencies

| Item | Depends on | Notes |
|------|-----------|-------|
| Appointment links | CALL-302 `CallInteraction` model | Adds `interviewId` FK to AdmissionInterview |
| Interview confirmation | Existing `AdmissionInterview` model | Adds `confirmedAt` + `arrivedAt` |
| Templates + TemplateUse | CALL-302 schema first | Two new models |
| Reports | CALL-302 + 303 data models | Read-only aggregation queries |
| Template picker UI | CALL-303 lead timeline | New dialog component |
| Funnel report | CALL-303 call interaction data | New report API + UI |
| City Head calling dashboard | Existing city dashboard | New widget section |
| Calling POC assignment model | EVENT-301/302 responsibility model | Time-bounded operational assignment |

---

## 12. Rollback & Data Impact

| Change | Rollback |
|--------|----------|
| `CallInteraction.interviewId` | Column is nullable; set to NULL, no data loss |
| `AdmissionInterview.confirmedAt` / `arrivedAt` | Columns are nullable; leave in place, no application impact |
| `CallingTemplate` table | Safe to drop if migration is rolled back; templates are authoring data, not operational |
| `TemplateUse` table | Safe to drop; immutable audit trail can be regenerated from call interactions |
| Report APIs | Rolled back with code; no schema impact |

**Data retention:** Templates are authoring records, not personal data. They
can be retained after rollback. Appointment confirmation timestamps are
operational and safe to retain.

---

## 13. Risks & Owner Decisions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Orientation model not yet defined | Appointment links limited to interviews | Explicitly deferred to EVENT-302; documented in scope |
| Template variables leak personal data | Unintended PII in template previews | Server-enforced allowlist; audit rejects unknown variables |
| Caller edits template beyond recognition | Misleading message sent | Templates are starting points; caller takes responsibility for final message |
| No-show report reveals personal data | Phone numbers in export | No-show report restricted to City Head; all exports audited |
| Expired POC assignment not cleared | Residual access | Server checks active dates on every request; expired = no scope |
| Unsuccessful-lead data retained indefinitely | Privacy risk | 12-month retention + archival/restricted-access policy |

**Owner decisions needed:**
1. Whether templates require two-stage approval (draft → pending → approved) or
   single-stage (draft → approved)
2. Export format for reports — CSV only, or also PDF in future?
3. Whether the funnel report should include a weekly comparison trend or only
   current-period snapshot
4. Exact archival procedure for records older than 12 months (restricted-access
   table vs. cold storage vs. deletion)

---

## 14. Handoff

```
Task ID: CALL-304
Branch and base commit: agent/deepseek/CALL-304-calling-design
  (base: codex/production-hardening @ dffd68a)
PR URL: (created via GitHub — target: codex/production-hardening)
Changed files: docs/product-discovery/CALL-304-APPOINTMENT-TEMPLATES-REPORTING.md
What changed (revision):
  - Calling POC redefined as temporary Mashwara/event/campaign responsibility
    with mandatory expiry, not a permanent role
  - Added External Support Caller section: email/password + forced reset,
    mandatory event/campaign assignment and expiry, assigned leads only,
    no dashboard/reports/exports/people/teams/Mashwara/documents
  - Removed polymorphic appointmentId+appointmentType; pilot links only
    AdmissionInterview via interviewId FK. Orientation deferred to EVENT-302
  - City Head alone may export CSV, with audit (purpose, filters, count,
    timestamp). POC/callers/External cannot export
  - Added immutable TemplateUse model: templateId + version + minimal audit
    snapshot; no reliance on mutable code references
  - Added sensitive-data audit table, merge-variable allowlist enforcement,
    12-month archival/restricted retention for unsuccessful-lead history
  - Server derives city/event/campaign/assignment scope from auth; query
    params may only narrow authorized scope
  - Removed trailing whitespace throughout
What was intentionally excluded:
  - No schema or Prisma model changes (docs only)
  - No application code changes (routes, components, tests)
  - No automated message sending (pilot constraint)
  - No CALL-302 or CALL-303 redefinition
Role/scope and personal-data impact:
  - External Support Caller access is tightly scoped and temporary
  - Calling POC is time-bounded and campaign/event-scoped
  - Merge-variable allowlist prevents accidental PII exposure
  - 12-month retention with archival for unsuccessful leads
Migration/data impact:
  - Additive only: new nullable columns, three new tables
  - Full rollback without data loss
Commands run and results:
  - No commands run (docs-only task)
Known risks / owner decisions:
  - Orientation dependency on EVENT-302
  - Four owner decisions pending (see section 13)
Ready for Codex review.
```
