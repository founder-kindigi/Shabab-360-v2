# Calling System Source Analysis

**Source:** `Calls for Phase 2.xlsx` (read-only review, 2026-07-21)  
**Purpose:** Replace spreadsheet-based admission calling and follow-up tracking
with a privacy-safe portal module. No workbook data has been imported.

## 1. Source Inventory

The workbook contains 37 sheets: one visible working sheet and 36 hidden
historical, draft, summary, park, interview, attendance, orientation, campaign,
and message-template sheets. The same prospect appears in several sheets as the
workflow advances, so these sheets must not be treated as independent people.

Source workflow groups:

| Source group | Current spreadsheet use | Portal destination |
| --- | --- | --- |
| Campaign and new-admission calls | Prospect allocation and first contact | Admission lead queue and call attempts |
| Phase 1/Phase 2 remaining calls | Repeated retries and historic notes | Chronological call history and next follow-up |
| Interview lists and day lists | Interview invitation, slot and arrival tracking | Interview appointment and attendance link |
| Orientation and absence lists | Event invitation, attendance and no-show follow-up | Orientation event participation and follow-up queue |
| Park lists | Local park allocation and roster handoff | Preferred/allocated park on the admission record |
| Atfal and extras | Eligibility, duplicate, out-of-area or referral handling | Referral/ineligible reason; never a duplicate lead |
| Meta sheet | WhatsApp message wording and links | Approved message templates, versioned by city/campaign |

## 2. Observed Workflow

1. Import or create a campaign/admission lead.
2. Assign a caller and preferred/allocated park where known.
3. Record each phone or WhatsApp attempt, including outcome, response and note.
4. Set a follow-up date/time or schedule an interview/orientation.
5. Record interview/orientation attendance and the reception outcome.
6. Move the applicant through admission decisions, enrolment, referral, or
   closed/lost status without copying the person into a new sheet.

The workbook currently stores old and new status/comment columns. The portal
must replace these with immutable, timestamped interaction records so history is
not overwritten.

## 3. Normalised Calling Model

### Core records

| Record | Purpose |
| --- | --- |
| Admission application / lead | The single canonical applicant record; may originate from campaign, walk-in or public form. |
| Contact person | Applicant, guardian, parent or alternate contact. Store phone/WhatsApp only as needed and label the relationship. |
| Calling assignment | Caller, queue owner, city, optional park, assigned time and active state. |
| Call interaction | One attempted or completed phone/WhatsApp interaction; append-only history. |
| Follow-up task | Next action, owner, due date/time, priority and completion state. |
| Appointment | Interview, orientation or other scheduled attendance-bearing event. |
| Message template | Approved city/campaign template with version, channel and variables. |
| Eligibility/referral outcome | Underage/Atfal, overage, duplicate, wrong contact, out-of-area, declined or another approved reason. |

### Call interaction fields

- Channel: `phone`, `whatsapp`, `in_person`, `other`.
- Attempt outcome: `answered`, `unanswered`, `busy`, `mobile_off`,
  `wrong_number`, `whatsapp_sent`, `duplicate`, `invalid_contact`.
- Prospect response: `coming`, `not_coming`, `reschedule`, `confused`,
  `interested`, `not_interested`, `pending`.
- Contacted person: applicant, guardian/parent, alternate, or unknown.
- Timestamp, caller, bounded note, next-follow-up date/time, and optional
  appointment link.

`Coming`, `Reschedule`, and `Not Coming` must not be a replacement for the
admission status. They are contact outcomes that inform later admissions work.

## 4. Required User Experience

- **Caller queue:** My assigned leads, due follow-ups, overdue items, filters by
  city, park, campaign, response, caller and date.
- **Lead timeline:** One chronological view of calls, WhatsApp attempts,
  appointments, attendance, notes and admissions transitions.
- **Quick actions:** Click-to-call (`tel:`) and prefilled WhatsApp deep link;
  no claim that a message was sent until the caller records the outcome.
- **Follow-up discipline:** A non-terminal interaction requires a next action or
  an explicit no-follow-up reason.
- **Supervisor view:** City-level workload, response funnel, overdue calls,
  conversion, no-show and caller workload; no global cross-city leakage.
- **Templates:** City-approved message templates with variables such as name,
  park, date and venue. No automated sending in the pilot.

## 5. Access And Privacy

- Super Admin and Program Admin: cross-city oversight subject to audit.
- A Mashwara or event creates a time-bounded Calling POC responsibility. POC is
  an operational assignment, not a canonical login role or permanent city post.
- Calling POC: assign and rebalance calls by availability to approved Shabab
  callers in the same city, manage the assigned event/campaign queue and
  templates, and view only the calling history linked to that responsibility.
- Cross-department support (Atfal, Taleem, Islah, or another Alburhan
  department) uses a temporary **External Support Caller** account. It is a
  separate assignment-only workspace, not Shabab portal membership.
- Assigned callers: view only their assigned leads and record interactions,
  follow-ups and approved template handoffs. They cannot browse the full city
  contact list, export contacts, reassign work, or change admission decisions.
- External Support Caller: receives only leads explicitly assigned for one
  event/campaign, may record calls and follow-ups, and cannot access dashboard,
  parks, batches, attendance, people search, admissions decisions, reports,
  exports, teams, Mashwara, documents, or any unassigned lead.
- City Head: city-wide oversight, POC appointment/revocation, queue management
  and audited export authority in the assigned city.
- Guardians and Shabab: no access to internal calling notes or caller queues.
- Phone numbers, addresses, guardian remarks and interview notes are sensitive
  admissions data. Audit reads/writes, mask search results where possible,
  restrict exports, and retain unsuccessful-lead interaction history for 12
  months before archival/restricted retention.

### Approved Pilot Decisions

- WhatsApp uses a click-to-open link with an approved template; the caller logs
  the outcome manually. Automated sending is out of scope.
- Eligibility/referral categories start with `Atfal/underage`, `overage`,
  `duplicate`, `wrong_number`, `out_of_area`, and `not_interested`. City-level
  POC/City Head may add or retire categories through a controlled catalogue;
  historic interactions retain their original category.
- City Head may export city-scoped contacts as CSV only when the export is
  audited with purpose, filters, record count and timestamp. No caller export.
- External Support Caller access must have a mandatory event/campaign scope and
  expiry. City Head creates a pre-approved helper profile; the Calling POC may
  activate/deactivate its assignment within the event window. Every lead view
  and interaction is audited; access ends automatically at expiry or immediately
  when revoked.

## 6. Import Strategy

Do not bulk-import every worksheet. The sheets contain duplicates, inconsistent
phone formats, historic overwrites, empty placeholders and merged workflow
states.

1. Build the model and calling UI first.
2. Create a non-writing parser that produces redacted counts, duplicate clusters,
   invalid-phone findings, candidate admission matches and unresolved mappings.
3. Owner reviews the matching policy and historic-note retention policy.
4. Import only approved canonical leads plus append-only historical call events.
5. Reconcile counts by source category and preserve a source reference, never
   spreadsheet hyperlinks or raw message templates as authoritative actions.

## 7. Decisions Needed Before Build

1. Approve the event and Mashwara responsibility model that creates temporary
   Calling POC assignments.
2. Approve the detailed note-retention/archive procedure before historic import.

**Approved pilot authentication:** External Support Callers use the current
email/password invitation flow with mandatory first-login password reset. A
future OTP/passwordless option is deferred.

## 8. Delivery Sequence

1. `CALL-301`: calling policy approved; link Calling POC to the forthcoming
   event/Mashwara responsibility model.
2. `CALL-302`: add schema, migration, scoped APIs and audit tests.
3. `CALL-303`: build caller queue, lead timeline and follow-up workspace.
4. `CALL-304`: add appointment/orientation links, templates and reports.
5. `CALL-305`: build and review the non-writing workbook migration dry run.
6. `CALL-306`: execute an explicitly approved staging import and reconcile.
