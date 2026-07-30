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

The existing non-writing Lahore parser was executed using `2026-07-29` only as an analysis cutoff, not as an owner-approved import cutoff.

| Measure | Result |
| --- | ---: |
| Parsed numbered students | 262 |
| Candidate attendance events | 234 |
| Candidate attendance records | 3,848 |
| Present | 975 |
| Absent | 1,616 |
| Late | 830 |
| Excused / leave | 427 |
| Withheld after analysis cutoff | 958 |
| Blocking issues | 71 |

| Issue | Count | Required disposition |
| --- | ---: | --- |
| Dropout markers | 42 | Owner confirms effective date/status policy before import. |
| Unnumbered student candidates | 26 | Owner accepts, rejects, or maps each candidate to a participant. |
| Group with no Murabbi | 1 | Assign or explicitly allow a group without a Murabbi. |
| Malformed attendance value | 1 | Correct source or choose an allowed replacement status. |
| Age/grade schema requirement | 1 | Confirm the deployed schema matches the approved profile fields before writing. |
| Missing student phone | 85 | Review-only unless participant identity cannot be matched. |
| Staff rows needing assignment nomination | 57 | Never activate/create staff from the workbook without named owner approval. |

The source differs from the earlier Lahore baseline (277 participants and 2,967 historical attendance records). This is expected only if it is a new operational extract; it must not overwrite or duplicate the existing import without an owner-approved cutover/reconciliation.

### Import Pattern

- Treat each park tab as an adapter input, never as the canonical import format.
- Derive sessions from `C` columns and date rows; ignore formulas used solely for off/weekend display.
- Match a participant only within the declared city, park, and group. A name alone is never sufficient identity.
- Create attendance only for records on or before the owner-confirmed completed-through date.
- Use one atomic transaction per approved import batch and report source-row references without exposing names or phone numbers.

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
