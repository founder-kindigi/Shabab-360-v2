# Lahore Real Workbook Import Analysis

**Prepared:** 2026-07-30  
**Scope:** Read-only analysis of the owner-provided Lahore workbooks. No database was read or written by this analysis.

## Decision Summary

These files are operational source workbooks, not direct database seed files. They contain merged headings, formulas, rich text, presentation tabs, and personal data. They must pass through a module-specific adapter and a zero-write reconciliation before any approved transactional import.

Priority is fixed as follows:

1. Attendance: reconcile and import only after blocking records are resolved.
2. Content Planner: import a city template and a State Life override after the external-link policy is applied.
3. Calling: prepare a campaign-per-sheet reconciliation after applications and caller assignments are mapped.

## 1. Attendance Workbook

### Observed Structure

- The workbook has summary/reporting sheets plus six park tabs.
- Park tabs use a roster section, group-marker rows, and many `C1...Cn` attendance columns.
- Attendance values include present, absent, late, leave, explicit off markers, dropout markers, and one malformed value.
- The source includes profile attributes (age and grade/class), staff labels, formulas, and derived totals. Derived totals must never be imported as attendance records.

### Fresh Read-Only Reconciliation

The owner approved the last completed attendance session as the reconciliation cutoff. The workbook has isolated `Leave` values in future-dated columns through `2026-08-30`; those are not complete sessions and must not be imported. The latest date with records for all six parks and all 13 groups is **2026-07-26**. That is the approved reconciliation cutoff for this workbook revision.

| Measure | Result |
| --- | ---: |
| Parsed numbered students | 262 |
| Genuine unnumbered student candidates | 12 |
| Formula-derived group summary rows excluded | 14 |
| Completed session date | 2026-07-26 |
| Completed-session coverage | 6 parks / 13 groups / 211 marked records |

| Issue | Count | Required disposition |
| --- | ---: | --- |
| Dropout markers | 42 | Reconcile their explicit historical dropout state; future automatic policy is configurable. |
| Unnumbered student candidates | 12 | Import as participants with no group assignment after the `Participant.groupId` nullable migration. |
| Formula-derived rows misread as candidates | 14 | Exclude. They are Strength/Absent/Leave/Present/Late/Total/Percentage summary rows, not people. |
| Group with no Murabbi | 1 | Import group without Murabbi; assign later. |
| Malformed attendance value | 1 | Ignore; record the source-row exclusion in the reconciliation report. |
| Age/grade schema requirement | 1 | Confirm the deployed schema matches the approved profile fields before writing. |
| Missing student phone | 85 | Review-only unless participant identity cannot be matched. |
| Staff rows needing assignment nomination | 57 | Never activate/create staff from the workbook without named owner approval. |

The source must reconcile with the existing Lahore data (rather than replace it). The reconciler must upsert by approved scoped identity, preserve existing records, add only newly completed attendance, and produce a no-delete variance report before any write. A raw roster count difference is not permission to remove a participant.

### Owner-Approved Attendance Policy

- Manual dropout: an authorized staff member may mark a participant as dropout from the student profile. This ends future attendance eligibility while preserving all historical records.
- Automatic dropout: configurable per batch; default policy is disabled until configured. When enabled, three consecutive **completed calendar weeks** with no present/late attendance mark the participant as dropout. `Leave`, `N/A`, an unclosed event, and configured off days do not count as an absence week.
- Weekend/off days: configurable per batch using selected weekday values and explicit one-off off dates. The workbook's `OFF` formula is source metadata only; the application policy is authoritative going forward.
- Historical workbook `Dropout` cells: retain the first valid marker as the reconciliation recommendation, then write an auditable manual/imported dropout state only after the reconciler matches the participant.

### Import Pattern

- Treat each park tab as an adapter input, never as the canonical import format.
- Derive sessions from `C` columns and date rows; ignore formulas used solely for off/weekend display.
- Match a participant only within the declared city, park, and group. A name alone is never sufficient identity.
- Create attendance only for records on or before the owner-confirmed completed-through date.
- Use one atomic transaction per approved import batch and report source-row references without exposing names or phone numbers.

## Attendance Product Design From Summary Sheets

The workbook has three useful summary products, but they must be calculated from normalized application records rather than imported as spreadsheet totals.

### Student Summary

Per participant, scoped by city/park/batch/group/date range: enrolled date, current state, completed sessions eligible to the participant, present, late, absent, excused, attendance rate, last marked date, consecutive missed weeks, and dropout reason/date. `N/A` and configured off days are excluded from the denominator.

### Murabbi Summary

Per active or historical staff assignment, scoped by city/park/date range: role/title, assigned park/group, scheduled staff sessions, present, late, absent, excused, attendance rate, and assignment state. This requires a new `StaffAttendanceRecord` linked to an `AttendanceEvent` and `StaffMeta`; staff attendance must not be stored in student `AttendanceRecord` rows.

### Class Stats

Per group event, scoped by city/park/batch/group/date range: scheduled roster strength, marked count, present, late, absent, excused, unmarked count, and attendance rate. For historical accuracy, an event needs an eligibility/roster snapshot at close time; later group changes must not rewrite past class strength.

## Implementation Sequence

1. **Attendance data foundation:** make participant group assignment nullable, add audited dropout metadata, batch off-day/dropout policy fields, and a staff-attendance model in both schemas with forward SQLite/PostgreSQL migrations.
2. **Policy engine:** centralize completed-week calculation, manual/automatic dropout transitions, event-close roster snapshots, and idempotent notification/audit behavior. Remove the current event-count-based dropout interpretation.
3. **Scoped APIs and UI:** batch policy editor, student-profile dropout action, staff attendance marking, and the three summaries. Server scope remains city/park/group derived and fail-closed.
4. **Reconciliation importer:** add an idempotent update mode that accepts exactly `2026-07-26`, ignores malformed data, preserves unassigned students, and produces create/update/no-op/variance counts before a confirmation-gated transaction.
5. **UAT:** verify manual and automatic dropout, configured weekend/off days, unassigned roster handling, student/Murabbi/class summaries, mobile attendance marking, and reconciliation idempotency.

## 2. Content Plan Workbook

### Observed Structure

- `All Parks` is a city template and `State Life School` is a park-specific override.
- Both sheets use the same eight business columns: Week, Day, Date, Exercises, Sports, Skills, Tadreeb, and Areas to Focus.
- Week/day values are labels such as `Week 1` and `Day 1`; Day is a program-session sequence, not a weekday number.
- Content is rich text with timings, multiple activities in a single cell, and external document/video references.
- Off-day rows are explicit and must create a zero-block session rather than a normal session.

### Parser Compatibility Result

The parser now preserves rich-text content and accepts the real labelled week/day values. The supplied workbook produces this read-only result:

| Measure | Result |
| --- | ---: |
| Recognised sheets | 2 |
| Parsed sessions with content/off-day state | 24 |
| Parsed blocks | 54 |
| Sports blocks | 42 |
| Skills blocks | 5 |
| Tadreeb blocks | 7 |
| Off days | 2 |
| Parser errors | 0 |

### Import Pattern

- Import `All Parks` only as a Lahore city template.
- Import `State Life School` only as an override with the template as its base plan.
- Keep source sheet and row references for auditability.
- Keep the four existing categories. Exercises and Sports map to the Sports team by the current approved mapping.
- Extract each URL as a proposed resource, but do not persist it until the external-link allowlist and safe-redirect policy are implemented. Text content remains importable without URLs.

## 3. Calling Workbook

### Observed Structure

The source has four different operational queues: Phase 2, remaining Phase 1, new admissions, and a park-specific Phase 2 sheet. They contain a mix of full name, mobile number, WhatsApp number, assignee, historic/new status, response, comments, action-link formulas, and some dated attendance-like columns.

### Compatibility Result

Before this update, the generic parser recognised zero rows because `Full Name` and `Mobile Number` were not aliases. Those aliases now map safely to applicant name and primary mobile number. WhatsApp is deliberately **not** treated as a guardian phone; the present data model has no distinct secondary-contact field.

### Import Pattern

- One campaign per selected source queue. Never merge all four tabs into one campaign automatically.
- The operator provides city, campaign, selected sheet(s), source date range, and import HMAC secret; the importer does not infer them.
- A row must match an existing Admission Application/Interview through an approved deterministic key. Phone/name matching may produce a review recommendation, but cannot itself create a new admission or a Calling assignment.
- Historic and new comments become a redacted interaction-timeline proposal. They must not be copied into audit logs.
- Assignees must map to active approved caller records; unrecognised names become review rows, not assignments.
- Duplicate phone clusters are reviewed and merged into a single historic timeline only after an owner-approved rule.

## 4. Import Readiness

| Module | Read-only adapter state | Write readiness |
| --- | --- | --- |
| Attendance | Existing parser runs and reports exact blockers | Blocked on owner dispositions and cutover decision |
| Content Planner | Real workbook parses with zero parser errors | Blocked on template/override approval and external-link policy |
| Calling | Header mapping repaired; campaign/app matching still required | Blocked on campaign-per-sheet and identity mapping decisions |

No real workbook values, credentials, or personal details were copied into this repository.
