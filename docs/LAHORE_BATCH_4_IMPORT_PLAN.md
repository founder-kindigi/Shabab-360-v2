# Lahore Batch 4 Data Onboarding Plan

## Purpose

Safely onboard the real Lahore Batch 4 programme into the empty Pilot Production database without fabricating data, weakening role scope, or losing the source workbook as the historical record.

This document is based on the supplied `Shabab_Batch_4_Attendance.xlsx` workbook. It is an execution plan, not authorization to write real data. Production import begins only after the owner approves the mapping report and a tested backup exists.

## Verified Source Profile

- Programme: Shabab Batch 4, labelled `2026-2027`.
- City: Lahore.
- Parks: Gulberg, Gulshan Iqbal, Griffin, Johar Town, Gulshan Ravi, and State Life.
- Student summary: 255 student rows across those six parks.
- Planned class columns: 74 sessions per park, from 23 May 2026 through 31 January 2027.
- Workbook attendance values: `Present`, `Absent`, `Late`, `Leave`, `OFF`, `Sat Off`, `Dropout`, blanks, and one malformed `Absent(` value.
- Source also contains Park Lead, Murabbi, and additional responsibilities such as Sports, Skills, Tadreeb, Media, and Muawin.

Do not treat all 74 scheduled dates as historical attendance. The import must only include completed dates with validated data, never future scheduled sessions.

## Current-System Fit

### Supported now

The current database and authorization model can safely represent:

| Source concept | Current representation |
| --- | --- |
| Lahore | `City` with code `LHR` |
| Six named parks | `Park` records scoped to Lahore |
| Batch 4 per park | One `Batch` per park, all using a consistent approved name |
| Student group | `Group` within that park's batch |
| Student | `Participant`, optionally linked to a `User` and `Guardian`, with nullable `age` and `gradeClass` fields |
| Class attendance | `AttendanceEvent` plus one `AttendanceRecord` per student |
| Super Admin | `User` plus `StaffMeta(role: super_admin)` |
| Program Admin, City Head, Park Lead, Park Admin, Murabbi | `User` plus canonical scoped `StaffMeta` role |

### Not supported without a reviewed schema change

| Source concept | Gap | Required treatment |
| --- | --- | --- |
| Staff/team attendance and Mashwara attendance | Attendance records can only target a student participant | Add a separate team/member attendance model before importing this history |
| Multiple simultaneous staff responsibilities | `StaffMeta` has one role and one city/park/group assignment | Add reviewed staff role, team, and title assignment/history tables |
| Sports, Skills, Tadreeb, Media, Muawin memberships | These are not valid authorization roles and the current team model is absent | Add separate collaboration-team membership/history and team workspaces for documents, activity planning, and discussions; never use membership as a replacement for the six canonical staff roles or their scope |
| Multiple park/group assignments for one person | Current staff scope is single-assignment | Do not duplicate people or broaden scope; add multi-assignment support first |
| Guardian relationships | The workbook has student contact data but no verified guardian-child relationship dataset | Import guardians only after a separate reviewed guardian mapping is provided |

## Account Bootstrap Plan

### Canonical roles

The current application supports these staff roles only:

1. `super_admin`
2. `program_head`
3. `city_head`
4. `park_lead`
5. `park_admin`
6. `murabbi`

It also supports `guardian` and `student` portal users. A title such as Sports Lead is not a login role at this stage.

### First production accounts

Create these accounts through a reviewed database bootstrap command, not by editing tables manually:

| Account | Required scope | Notes |
| --- | --- | --- |
| Super Admin | None | One named owner account; `mustResetPwd: true`; no shared credential |
| Program Head | None | One named accountable person; optional until nominated |
| Lahore City Head | Lahore | Required before park-scoped staff are activated |
| Park Lead | One named Lahore park | One account per nominated person, not automatically one per park |
| Park Admin | One named Lahore park | One account per nominated person |
| Murabbi | One named Lahore group | Create only after group assignment has been verified |
| Student | Own participant record | Create in a later invite batch, not automatically for every phone number |
| Guardian | Own guardian record | Create only after a verified guardian-child mapping exists |

The reviewed `npm run bootstrap:super-admin` command is the only approved first-account path. It defaults to a non-writing dry run and requires both `--execute` and `--reveal-temporary-password` before it can write. It refuses an existing email or any existing Super Admin, uses the PostgreSQL `DIRECT_URL`, creates a forced-reset credential with bcrypt cost 12, and writes only redacted role/reset metadata to the audit log. No default or shared passwords are allowed.

An existing Super Admin is never replaced by default. A deletion-and-replacement path requires the separate `--replace-existing-super-admin` execution flag and an explicit owner decision. It deletes the prior user and cascaded staff metadata; historical audit records remain but their actor reference becomes null because of the database's `SetNull` relation.

Before the approved fresh Lahore import, `db:reset:staging-data` may be used only against the locked `shabab360-staging` pooler target with both `--execute` and `--confirm-staging-data-reset`. It deletes every application row, including audit and access-override records, while preserving the schema and `_prisma_migrations`. It is irreversible; no audit row is retained because the owner approved a full data clear.

## Data Mapping Rules

### Organization and roster

1. Create or verify the Lahore city with immutable code `LHR`.
2. Create the six parks exactly once, using normalized display names and source-sheet aliases for traceability.
3. Create one Batch 4 record for each park using owner-approved start and end dates.
4. Build a mapping table from every source group header to one system group. Resolve decorated, inconsistent, or missing group headings before write.
5. Deduplicate students by normalized name plus phone where available. Ambiguous matches go to an exception report, never automatic merge.
6. Import student names, phone, age, grade, and source park/group. Age and grade require a documented destination field or an approved schema extension; do not silently discard them.
7. Create student portal accounts only for an owner-approved subset with a unique email or verified invite channel. Phone numbers alone are not an email login identifier.

### Historical student attendance

1. Create an attendance event only for a completed source date that contains at least one validated student attendance value.
2. Use `Regular Session - Batch 4` unless the owner provides a more accurate session title.
3. Convert source values as follows:

| Source value | Target action |
| --- | --- |
| `Present` | `present` |
| `Late` | `late` |
| `Absent` | `absent` |
| `Leave` | `excused` |
| `OFF`, `Sat Off`, blank, `N/A` | No attendance record; do not create a false absence |
| `Dropout` | Hold for review; update participant state only after the owner confirms the effective dropout date and whether earlier attendance must remain visible |
| malformed values such as `Absent(` | Exception report; owner correction required before import |

4. Use a dedicated immutable import service account as `markedBy`; never falsely attribute historical records to a named staff member.
5. Close imported past sessions. Preserve the import timestamp in audit notes and retain the workbook unchanged as source evidence.
6. Run reconciliation: source rows, parks, groups, students, events, and status totals must match the approved mapping report. Any mismatch blocks production write.

## Execution Stages

### Stage 0: Decisions and backup

- Confirm the Super Admin's name and email.
- Nominate the initial Program Admin, Lahore City Head, and each initial Park Lead, Park Admin, and Murabbi with their email, park, and group scope.
- Confirm whether Batch 4 has one batch per park and the correct batch dates.
- Confirm which source dates are complete and eligible for historical import.
- Export a Supabase production backup and record the restoration procedure.

### Stage 1: Build and test importer locally

- Implement a versioned, dry-run-only importer plus a mapping/exception report.
- Add schema support for missing student profile fields only if owner-approved. Completed in code for nullable `age` and `gradeClass`; database deployment remains a separate approved step.
- Do not import staff attendance until the required attendance schema is built and tested.
- Test with a sanitized copy of the workbook against staging.

### Stage 2: Staging rehearsal

- Import Lahore organizational structure and a sanitized roster.
- Exercise Super Admin, City Head, Park Lead, Park Admin, Murabbi, Student, and Guardian scope boundaries.
- Verify at least one group and class history against the workbook, including present, absent, late, leave, OFF, dropout, and malformed-value handling.
- Test restore from the staging backup.

### Stage 3: Owner mapping approval

- Review the generated mapping and exception report with Lahore leadership.
- Resolve duplicate people, missing/ambiguous group labels, staff responsibility mappings, bad status values, and dropout dates.
- Approve exact row counts and a production write window.

### Stage 4: Pilot Production import

- Freeze writes.
- Take and verify a new backup.
- Run dry-run, then approved production import exactly once with an import manifest.
- Reconcile counts and run role-based browser UAT.
- Keep source workbook, mapping report, import manifest, and reconciliation report in restricted project storage.

## Acceptance Gates

- No database credentials or temporary passwords are recorded in source control, logs, reports, or chat.
- Every staff account has a canonical role and complete required scope; incomplete scope remains inactive.
- No student or guardian account is created solely from an unverified phone number.
- Future sessions, OFF dates, blanks, and malformed values do not create attendance records.
- Historic staff/Mashwara attendance is not misrepresented as student attendance.
- A backup restore rehearsal and source-to-target reconciliation pass before production write.
- Lahore leadership approves the exceptions report and final counts.

## Owner Inputs Required Before Account Creation

1. Super Admin name and email.
2. Named holder, email, and scope for each initial staff account.
3. Official batch name and actual Batch 4 start/end dates.
4. Final group assignment for each student and Murabbi.
5. Rule for `Dropout` values: effective date and whether status is final.
6. Decision on student/guardian portal rollout: pilot subset first or all eligible people after contact verification.

## Immediate Next Work

1. Create the one-time secure Super Admin bootstrap command and its verification test.
2. Produce a non-writing workbook parser that generates the roster/group/attendance mapping and exception report.
3. Design the multi-role/team and staff-attendance schema changes as a separate reviewed feature before importing those records.
4. Rehearse the approved student-only import against staging before touching Pilot Production.

## AM-006 Dry-Run Evidence (2026-07-19)

The versioned command `scripts/lahore-batch-4-dry-run.cjs` now parses the supplied workbook in `dry-run-only` mode. It has no Prisma or database client dependency, performs no writes, and creates a locally ignored redacted report under `tool-results/`.

The first evidence run found:

- Six expected parks, 13 source groups, and 74 scheduled session dates per park.
- 254 numbered student roster rows, plus 23 populated but unnumbered student candidates. This conflicts with the earlier source summary of 255 students. The 23 rows remain blocked until Lahore leadership confirms whether they are valid students and supplies stable row identifiers or a corrected workbook.
- 51 staff source rows. They are report-only because login accounts and city, park, group, canonical-role, responsibility, and contact mappings must be nominated rather than inferred.
- 79 numbered students without a phone value. These may be roster records after approval, but cannot automatically become portal accounts or be used for deduplication.
- Age appears on 186 students and grade on 97 students. The owner approved both fields, and the application now has nullable `age` and `gradeClass` support with a staged PostgreSQL migration. No database schema has been deployed, so the roster import remains blocked until staging rehearsal.
- At least one source group has no named Murabbi in its header. This requires an approved group-to-Murabbi mapping before any scoped staff account is created.
- The initial evidence run proposed no historical attendance because it preceded the completed-through decision. The owner subsequently confirmed 19 July 2026; rerun the dry-run report with that cutoff before staging rehearsal.

The report intentionally withholds attendance status conversion until the completed-through date is supplied. When that date is approved, `Present`, `Absent`, `Late`, and `Leave` will be proposed as `present`, `absent`, `late`, and `excused`; `OFF`, `Sat Off`, blanks, and `N/A` remain non-records. `Dropout` and malformed values remain exceptions.

### Owner Decisions Needed Before Staging Rehearsal

1. Review duplicate candidates and preserve source traceability for all accepted roster rows.
2. Rerun the dry-run report using the confirmed 19 July 2026 attendance cutoff.
3. Apply the reviewed nullable profile-field schema to Staging only after an approved backup exists.
4. Provide a staff nomination sheet with canonical login role, email, city, park, group where relevant, and separate team responsibilities/titles.
5. Confirm any remaining blank group-to-Murabbi assignments and the Batch 4 end date.

### Confirmed Owner Decisions

- The authoritative display name is `Batch 4`; no Senior or Junior cohort label is applied to this workbook.
- Preserve all supplied student data, including populated unnumbered candidate rows, subject to duplicate review and source traceability.
- Historical attendance is eligible through 19 July 2026 only.
- Age and grade/class are required participant fields for Lahore and need an approved schema destination before staging import.
- Initial rollout is staff accounts only. Student and guardian accounts wait for verified contact and guardian-child mappings.
- Sports, Skills, Tadreeb, Media, and Muawin are dedicated collaboration teams. They will hold documents, activity plans, and team discussions, while canonical role and hierarchy scope continue to govern application access.

No production or staging database data, real accounts, or attendance history has been created by this work.

### Corrected Approved-Cutoff Dry Run (2026-07-20)

The dry-run was rerun with the approved completed-through date of 19 July 2026. It performed zero writes and reconciled its proposed records to its status totals.

- Proposed historical student attendance: 181 park/group session events and 2,942 records.
- Status totals: 829 present, 1,160 absent, 631 late, and 322 excused. OFF/weekend formulas and blank cells are correctly excluded; 480 future values remain withheld.
- Dropout review: 20 distinct student candidates, with earliest source dates spanning 31 May through 12 July 2026. Their state and effective dates require Lahore leadership confirmation before import.
- One malformed attendance value remains for owner correction. It is held out of the proposed records.
- The remaining 46 blocking gates are 23 accepted-but-unnumbered roster candidates requiring source traceability, 20 dropout decisions, the one malformed value, one blank Murabbi assignment, and the required profile-schema deployment before Staging. Staff nominations and missing phones remain review items, not automatic-account inputs.

The dry-run's formula handling is deliberately narrow: only the workbook's explicit `OFF Weekends` formula pattern is treated as non-attendance. Any other unresolved formula remains a blocking malformed value.
