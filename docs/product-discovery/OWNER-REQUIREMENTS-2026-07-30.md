# Owner Requirements Addendum - 2026-07-30

**Status:** Confirmed decisions and implementation targets

This addendum records the product-owner requirements received after the Lahore workbook review. It is authoritative for implementation planning alongside the master blueprint.

## 1. Events

- Events are special programme classes/activities, including swimming, trips, camps, and similar sessions.
- An event supports pre-registration, eligibility/capacity, optional fee collection, payment state, and relevant consent/safety information.
- Event attendance is the canonical attendance for that occurrence. It must also appear in regular attendance history and summaries without creating a second `AttendanceRecord` or requiring double marking.
- The event workbook(s) will define historical-import columns and operational variations. They are required before the event importer is designed or enabled.

## 2. Attendance

- Normal online classes occur on Saturday and Sunday. These are the default scheduled attendance days for a batch.
- Authorized staff may add a special class on another day; no hard-coded weekday restriction may block that workflow.
- Off days/weekends are configurable per batch, including selected weekdays and one-off dates. They are excluded from attendance expectations and dropout calculations.
- Dropout is configurable per batch:
  - Authorized staff can manually mark a student as dropout from the student profile.
  - Manual dropout discontinues future attendance eligibility but retains history.
  - Automatic dropout is optional and defaults to disabled until configured.
  - The baseline automatic rule is three consecutive completed weeks without present/late attendance. Leave, N/A, unclosed sessions, and configured off days do not count as missed weeks.
- Lahore reconciliation uses the latest completed session from the supplied workbook: `2026-07-26`. It is an upsert/reconciliation, never a replacement or deletion of existing Lahore history.

## 3. Attendance Summaries

- **Student Summary:** attendance totals/rate, state, last attendance, missed-week streak, dropout metadata, and scope/date filters.
- **Murabbi Summary:** staff attendance, assignment/title, attendance totals/rate, and historical/inactive assignment visibility. It requires staff-attendance records; student records must not be reused.
- **Class Stats:** per-session/group strength, marked/unmarked, status totals, and attendance rate. Historical strength must be snapshot-based when a session is closed.

## 4. Content Planner

- The workbook is the source of operational structure: city template plus park override, weekly/session sequence, Sports, Skills, Tadreeb, off days, focus area, and source-row traceability.
- The application must preserve this structure, not flatten it into generic notes. External resource links remain subject to the approved allowlist and safe-redirect policy.

## 5. Mashwara And Tasks

- Mashwara includes task management: assignment, due date, status, completion/reopen lifecycle, and immutable/auditable meeting linkage.
- An assigned task sends an in-app notification to the assignee. Notification delivery never expands city, park, group, or meeting scope.
- The Mashwara refresh-stuck defect is a required P0 investigation before browser acceptance.

## 6. Calling And Imports

- Calling workflow and UI must follow the operational calling sheets and supplied visual examples, not a generic CRM assumption.
- A standard import contract applies to every module: versioned template, explicit city/module/context, source-row identity, zero-write dry run, validation/reconciliation report, explicit execution acknowledgement, idempotent write, audit summary, and rollback/recovery plan.
- Calling import requires approved standard columns before implementation: source reference, campaign code, city code, applicant reference, applicant name, primary mobile, WhatsApp number, status/response, historical/current note, source date, and assignee reference. Only a deterministic application match may create/update a calling record.

## 7. UX, Reliability, And Access

- Shabab 360 is mobile-first. Each workflow requires 375px and 390px acceptance evidence; desktop remains supported.
- Urdu must be RTL-capable across navigation, layouts, forms, tables, dialogs, and status presentation. Mixed Urdu/English content must remain legible.
- Performance is a functional requirement: bounded list queries, server pagination/filtering, no unbounded dashboard aggregation, responsive mobile interactions, and observable loading/error states.
- Each active module requires complete authorized CRUD, meaningful empty/loading/error/forbidden/conflict states, server scope enforcement, audit coverage for sensitive mutations, and browser acceptance.
- Access Management must be re-reviewed after the final module catalogue is settled. Every released module/action needs a controlled capability code, default role policy, scope enforcement, and UI/API consistency test.

## 8. Dependencies And Sequence

1. Complete Attendance data foundation, policy engine, staff attendance, summaries, reconciliation importer, and UAT.
2. Complete Content Planner import and workbook-aligned UI/UAT.
3. Use supplied event sheets to finalize event registration/fee/import requirements, then implement event-to-attendance projection.
4. Repair Mashwara refresh behavior, then implement task notifications and UAT.
5. Finalize Calling spreadsheet template and UI/import flow.
6. Conduct final Access Management catalogue and capability review once the released module actions are known.

## Required Inputs

- Previous event workbook(s), with any registration, fee, consent, transport, capacity, or attendance tabs.
- Calling screenshots/visual examples if they are not already represented by the supplied calling workbook.
- Any exception to the baseline three-week automatic-dropout policy.
