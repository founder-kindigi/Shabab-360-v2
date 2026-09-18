# ATT01 — Lahore Batch 4 workbook-to-local-SQLite reconciliation

Date: 2026-09-18 (refreshed). Task: ATT01 workbook-to-local reconciliation. Mode: **read-only**.
No database, workbook, account, schema or migration was changed by this work.

## Method and reproducibility

Existing read-only tooling:

- `scripts/att01-workbook-reconciliation.ts` + `-impl.ts` — CLI entry point
- `src/lib/attendance/lahore-refresh/reconcile.ts` — pure comparison logic
- `src/lib/attendance/lahore-refresh/reconcile-sqlite.ts` — read-only SQLite reader
- `src/lib/attendance/lahore-refresh/reconcile.test.ts` — 9 focused tests

Command (default workbook and `prisma/dev.db`):

```
node --experimental-strip-types --experimental-detect-module \
  scripts/att01-workbook-reconciliation.ts \
  --input docs/sheets/Shabab_Batch_4_Attendance.xlsx \
  --database prisma/dev.db \
  --output tool-results/att01-reconciliation-run
```

Exit code 0. The tool opens SQLite with `{ readOnly: true }`, parses the workbook
in memory, and outputs aggregate counts, deterministic key hashes and mismatch
categories. It refuses connection URLs and network/UNC paths, and reads no `.env`.

Privacy: participant comparison uses non-reversible truncated SHA-256 digests
(`name|phone` for identity, `name|phone|park|group` for placement). No participant
name, phone, email, password or private workbook row is printed or stored.

## Proof that nothing was written

`prisma/dev.db` fingerprint byte-identical before and after the run:

| Field | Before | After |
| --- | --- | --- |
| bytes | 4,198,400 | 4,198,400 |
| lastWriteTimeUtc | 2026-09-18T14:53:44.547Z | 2026-09-18T14:53:44.547Z |
| `-wal` / `-shm` / `-journal` sidecars | 0 | 0 |

`writesPerformed: false`, `databaseUnchanged: true`.

## Required aggregate totals (Batch 4 baseline)

The workbook parses to the approved Batch 4 baseline on every measure:

| Aggregate | Required | Workbook | Database | Workbook vs required |
| --- | ---: | ---: | ---: | --- |
| Parks | 6 | 6 | 6 | ✅ PASS |
| Groups | 18 | 18 | 18 | ✅ PASS |
| Valid participants | 339 | 339 | 339 | ✅ PASS |
| Attendance events | 460 | 460 | **467** | ✅ PASS (workbook) |
| Historical records | 6,210 | 6,210 | **6,211** | ✅ PASS (workbook) |
| Calendar dates | 74 | 74 | 74 | ✅ PASS |

The workbook matches all six required totals. The database matches four of six; the
two differences (events +7, records +1) are explained in the post-import section below
and are **not** import defects.

## Business-key comparison (workbook vs database)

| Business key | Workbook | Database | Matched | WB-only | DB-only | Equal |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Park placement | 6 | 6 | 6 | 0 | 0 | ✅ |
| Group placement (park\|group) | 18 | 18 | 18 | 0 | 0 | ✅ |
| Participant identity (name\|phone) | 339 | 339 | 339 | 0 | 0 | ✅ |
| Participant placement (identity\|park\|group) | 339 | 339 | 339 | 0 | 0 | ✅ |
| Event date/group pairs | 460 | 467 | 460 | 0 | 7 | ❌ |
| Calendar dates | 74 | 74 | 74 | 0 | 0 | ✅ |
| Per-event record counts | 460 | 467 | 460 | 0 | 7 | ❌ |

Deterministic set hashes (first 16 hex of SHA-256 over sorted digest list):

| Key set | Workbook hash | Database hash |
| --- | --- | --- |
| Parks | `cdcddfeb9be06883` | `cdcddfeb9be06883` |
| Groups | `08977a6edfdba09d` | `08977a6edfdba09d` |
| Participant identity | `8007f38ef039152e` | `8007f38ef039152e` |
| Participant placement | `550f9c92c6ab66bf` | `550f9c92c6ab66bf` |
| Attendance events | `03bf18a86fc70f8d` | `2e0021ad633036a7` |
| Calendar dates | `7e8cedaa9d2adace` | `7e8cedaa9d2adace` |
| Event record counts | `1b385c8a5f46597a` | `198e9a4ffabc5f27` |

All 460 imported events, their group/date placement and per-event record counts
match the workbook exactly (460 matched, 0 workbook-only). Participant identity
and placement match exactly, including 4 identity duplicates present on **both**
sides (same name+phone in different groups) — consistent, not a defect.

### Attendance status totals

| Status | Workbook | Database |
| --- | ---: | ---: |
| present | 1,626 | 1,626 |
| absent | 2,570 | 2,570 |
| late | 1,346 | 1,346 |
| excused | 668 | **669** |

The +1 excused record is a single operator-marked record from browser testing
(attributed in the post-import evidence below).

### Active / dropout / reactivation state

| State | Workbook | Database |
| --- | ---: | ---: |
| active | 231 | 231 |
| dropout | 108 | 108 |
| reactivated (effective rejoin) | 0 | 0 |

Lifecycle state matches exactly.

## Post-import activity detected and classified

The database holds the corrected 339-participant import **plus** browser-testing
activity. All browser-test marks were reset per the task context, but the session
preparation artefacts remain. Aggregate-only evidence:

| Evidence | Value |
| --- | --- |
| `audit_log` actions | `attendance_mark` 14, `attendance_reset` 4, `attendance_session_prepare` 7, `import_lahore_batch_4` 1, `view_dashboard` 5 |
| Events with `resetVersion > 0` | 3 (max resetVersion 2, total 4) |
| Currently open events | 7 |
| Records written by a user (`markedBy` set) | 1 |
| Durable `operation_receipts` rows | 14 |
| Active users | 2 Super Admin + 53 other |
| Active staff roles | super_admin 2, city_head 1, park_lead 6, murabbi 34, muawin 12 |
| Inactive placeholder users | 15 (murabbi 13, pending_assignment 2) |
| Total users | 70 |

### 7 database-only events — browser-test sessions

The 7 database-only events are all post-import browser-test sessions (PKT dates
2026-09-19 and 2026-09-20, after the import cut-off of 2026-09-13):

| Park | Group | PKT date | Open | resetVersion | Records |
| --- | --- | --- | --- | --- | ---: |
| Griffin | Group 1 | 2026-09-19 | yes | 0 | 0 |
| Griffin | Group 2 | 2026-09-19 | yes | 2 | 1 |
| Griffin | Group 3 | 2026-09-19 | yes | 0 | 0 |
| Gulshan Ravi | Group 1 | 2026-09-19 | yes | 1 | 0 |
| Gulshan Ravi | Group 2 | 2026-09-19 | yes | 1 | 0 |
| Gulshan Ravi | Group 1 | 2026-09-20 | yes | 0 | 0 |
| Gulshan Ravi | Group 2 | 2026-09-20 | yes | 0 | 0 |

These sessions were prepared by the `attendance_session_prepare` audit action (7
audit rows match). The reset actions (4 resets across 3 events) cleared the marks.
One mark survives: a single `excused` record on Griffin/Group 2/2026-09-19 with
`markedBy` set, accounting for the +1 excused and +1 overall record totals.

**Classification:** Expected browser-test artefacts. Not import defects.

### Staff placeholder / provisioning divergence

The workbook builds 67 inactive staff placeholders; the database holds 15. The
divergence is fully attributable to the separately authorized Team Access
provisioning:

- 52 placeholders activated — including all 6 `park_lead`, 34 of 47 `murabbi`, the
  1 `park_admin`, and 12 rows that became `muawin` accounts.
- 1 additional active account — the local City Head test account.
- 15 placeholders remain inactive (13 `murabbi`, 2 `pending_assignment`) because no
  valid Team Access row covers them (consistent with the owner note that
  bracketed-name / missing work-email rows cannot be activated).

**Classification:** Provisioning-state divergence. Not attendance-data drift.

## Expected exclusions

| Category | Detail |
| --- | --- |
| Summary/non-roster rows | Workbook rows labelled Present, Absent, Late, Leave, Total Present, Attendance Percentage, Strength — skipped by `NON_PARTICIPANT_LABELS` |
| Rows without integer serial | Retained as unnumbered candidates only if they carry a phone, age, grade, or attendance under an explicit group header |
| Status values `off`, `sat off`, `n/a` | Ignored (weekend/inactive markers, not attendance records) |
| Formula-based OFF weekend markers | Recognized by formula pattern and ignored |
| `Dropout` cells | Classified as lifecycle state; dropout date set, subsequent marks omitted |
| Dates after `attendanceThrough` (2026-09-13) | Excluded from import; calendar dates still registered |
| Dates outside batch range | Excluded |

No unsupported or orphaned source rows were found. All workbook rows are accounted
for as either valid participants, summary rows, staff entries, or expected
exclusions.

## Mismatch summary

| # | Category | Detail | Expected | Actual |
| --- | --- | --- | --- | --- |
| 1 | `aggregate_totals` | attendanceEvents | 460 | 467 |
| 2 | `aggregate_totals` | attendanceRecords | 6,210 | 6,211 |
| 3 | `event_set` | 0 WB-only, 7 DB-only, 460 matched | 460 | 467 |
| 4 | `event_record_counts` | 0 WB-only, 7 DB-only, 460 matched | 460 | 467 |
| 5 | `status_totals` | excused 668 vs 669 | — | — |
| 6 | `staff_state` | placeholder/provisioning totals differ | 67 | 15 |

All six mismatches are explained by two attributable causes:

1. **7 browser-test session events** (post-import, after cutoff, all open) → events +7
2. **1 surviving operator excused mark** (on one of those sessions) → records +1, excused +1
3. **Staff provisioning** (Team Access activation, not attendance data) → placeholder count change

There are **zero** unexplained participant, group, park, calendar-date, identity,
placement, or imported-event mismatches.

## Conclusion

**PASS with expected post-import divergences.**

- The workbook-to-database import is verified correct for all 460 events, 6,210
  records, 339 participants, 18 groups, 6 parks, and 74 calendar dates.
- Every database-only artefact is attributable to audited browser-test sessions or
  authorized Team Access provisioning.
- No workbook-only rows were found (zero data loss).
- No orphaned, duplicated, skipped, or unsupported source rows exist.

## Recommended cleanup task (optional, non-blocking)

The 7 open browser-test events and the 1 surviving mark could be deleted through a
targeted, owner-authorized cleanup script that removes attendance events with dates
after the import cut-off (2026-09-13) and their associated records. This is cosmetic
— the events carry no imported data and do not affect any workbook-imported totals.

## Not performed

No reset, import, backup, restore, migration, schema change, account change,
workbook edit, or database write. PostgreSQL and any live system were not touched.
`.env` was not read. No participant name, phone, password or private workbook row
was printed. This reconciliation does not authorize production migration, PostgreSQL
readiness, or team-pilot approval.
