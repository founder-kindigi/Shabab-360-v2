# Worksheet disposition register

Owner: Astra. Date: 2026-09-11. Scope: all six workbook structures and all 57 worksheet indices. Source identities and sanitized cell-type/header evidence: [WORKSHEET_EVIDENCE.json](WORKSHEET_EVIDENCE.json). Worksheet titles are deliberately omitted because some contain private names. Use the one-based index within the hash-matched workbook.

This is an intake disposition, not an approved import mapping or data-quality result. No source workbook was changed and no rows were imported. Dimensions below bound observed nonempty cells; row counts include headers, formulas and summaries and are **not person counts**. All stored cells were traversed, with only fixed field vocabulary/type counts exported. Header recognition is partial; token matches in body rows are not automatically headers. Formulas were counted, not executed or copied into reports.

## Workbook key and mapping policies

| Key | Exact workbook | Meaning and initial model/API direction |
| --- | --- | --- |
| W1 | B4_ Shabab Content Plan (2).xlsx | Both sheets: A:C week/day/date; D:G Exercises/Sports/Skills/Tadreeb; H focus notes. Session-date rows with several category blocks, not one lesson per spreadsheet row. Reuse ContentPlan, ContentPlanSession, ContentPlanBlock and resource relations; `/api/admin/content-planner/*`. Decide version/batch ownership and schedule overlap before import. |
| W2 | Batch 2 _ Profiles (1).xlsx | Profile grid plus vertical reference. Participant, StudentExtendedProfile, Guardian/GuardianChild and historical Group/Batch links; `/api/admin/students/*`, guardian/profile APIs. Do not merge by name alone. Source age needs an as-of date; preserve phone strings and Urdu. Restrict address/family fields; hold sensitive fields until their lifecycle is approved. |
| W3 | Calls for Phase 2 (1).xlsx | Repeated calling/shortlist views, a wide registration copy, summaries and irregular tabs. AdmissionApplication plus CallingCampaign/CallingAssignment/CallInteraction. Reconcile duplicated people and copied tabs before creating records; do not turn each nonempty row into a separate applicant or treat one call-status column as complete interaction history. |
| W4 | Murabbi Training Lahore.xlsx | A2 gives a historical period; C2:R2 are Day-1 through Day-16. A3:B16 contain time/session descriptions; intersections C3:R16 hold curriculum. Day ordinal x session/time-slot grain. Map programme content separately from staff attendance/completion. No dedicated Training/TrainingCompletion model exists in the current schema; reuse content foundations only after contract review. A planner entry is not attendance or clearance evidence. |
| W5 | RegistrationRequests-06-08-2026.xls | OOXML export, 69 columns A:BQ, 760 nonempty rows including header. Applicant/event-registration record candidates. A:M identity/registration/call/payment metadata; N:AL demographic/organisation/schedule/family fields; AN medical; AX:BC contact roles; BF:BJ sensitive spiritual information; remaining fields need per-column disposition. AdmissionApplication/Participant/Guardian links and source provenance are candidates. Never import source payment status as a posted Payment, or flags as verified consent. |
| W6 | Shabab_Batch_4_Attendance (1).xlsx | Consolidated/formula rosters, park attendance matrices, date/status calendars and references. Participant/StaffMeta identity -> Group/Batch -> AttendanceEvent/Record or StaffAttendanceEvent/Record. Unpivot dated columns and preserve historic membership, blank/absent/excused differences, closure/reset/version and source provenance. Summary/formula rows must not duplicate base attendance. |

All mapping work is owned by Astra; implementation and DeepSeek cleanup follow one bounded module at a time. W1/W4 depend on content/calendar contracts; W2/W5 on identity/admissions; W3 on admissions/calling; W6 on identity, calendar and attendance semantics. Independent intake can finish while import application stays gated.

## Per-sheet dispositions

Generated table follows from the inspected structure and explicit index policies. `Stage` means eligible for a later dry-run design, never permission to apply data. `Hold` is a definite disposition to preserve and exclude until the stated interpretation is resolved. Full field-level mapping belongs to the named module packet.

| Worksheet | Observed bounds | Nonempty rows | Formula cells | Disposition |
| --- | --- | ---: | ---: | --- |
| W1.01 | A1:H69 | 69 | 0 | Stage content sessions/blocks; reconcile overlapping dates and plan version. |
| W1.02 | A1:H26 | 26 | 0 | Stage content sessions/blocks; reconcile overlapping dates and plan version. |
| W2.01 | A1:BJ17 | 15 | 54 | Stage profile-grid candidates; exclude formula/summary cells; identity matching required. |
| W2.02 | A1:A71 | 69 | 0 | Hold vertical text reference (A1:A71); determine field-dictionary versus record layout before import. |
| W3.01 | A1:L130 | 130 | 261 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.02 | A1:L275 | 275 | 548 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.03 | A1:I64 | 62 | 112 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.04 | A1:L31 | 29 | 42 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.05 | A1:BR521 | 521 | 1004 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.06 | A1:R137 | 137 | 277 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.07 | A1:G10 | 10 | 0 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.08 | A1:S206 | 206 | 283 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.09 | A1:T205 | 205 | 281 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.10 | A1:S103 | 103 | 169 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.11 | A1:R138 | 138 | 280 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.12 | A1:R139 | 138 | 280 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.13 | A1:BQ518 | 518 | 3 | Stage registration-copy reconciliation against W5; never import both as new people. |
| W3.14 | A1:Q136 | 136 | 279 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.15 | A1:J31 | 31 | 2 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.16 | A1:J24 | 24 | 3 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.17 | A1:J26 | 26 | 2 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.18 | A1:J26 | 26 | 1 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.19 | A1:J8 | 8 | 0 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.20 | A1:J22 | 22 | 0 | Stage shortlist/attendance-status candidate view; deduplicate against calling/registration source. |
| W3.21 | A1:BM134 | 134 | 14 | Hold headerless/irregular calling snapshot; map columns and predecessor template explicitly. |
| W3.22 | A1:U209 | 209 | 434 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.23 | A1:S582 | 582 | 1304 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.24 | A1:S486 | 486 | 1104 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.25 | A1:R132 | 132 | 265 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.26 | A1:BQ61 | 61 | 120 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.27 | A1:BQ349 | 349 | 716 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.28 | A1:N48 | 48 | 94 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.29 | A1:BQ37 | 37 | 72 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.30 | A1:K330 | 330 | 659 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.31 | A1:Q96 | 96 | 191 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.32 | A1:P261 | 260 | 721 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.33 | A1:Q334 | 334 | 669 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.34 | A1:Q120 | 120 | 241 | Hold headerless/irregular calling snapshot; map columns and predecessor template explicitly. |
| W3.35 | A1:I104 | 104 | 308 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W3.36 | A1:D9 | 9 | 13 | Exclude from base imports: call-status formula summary; use only for reconciliation. |
| W3.37 | A1:A1 | 1 | 0 | Hold single text-cell reference; no operational records inferred. |
| W3.38 | A1:J24 | 24 | 46 | Stage calling-view candidates; separate formulas, contact/status fields and copied registrations. |
| W4.01 | A1:R16 | 16 | 0 | Stage day x session curriculum; 16 day columns; no staff completion inferred. |
| W5.01 | A1:BQ760 | 760 | 0 | Stage registration export with sensitive-field exclusions; payment/consent remain unverified source claims. |
| W6.01 | A1:L315 | 309 | 2902 | Reconciliation-only formula roster view; resolve base person rows before creating records. |
| W6.02 | A1:A1 | 0 | 0 | Exclude empty worksheet; retain source identity. |
| W6.03 | A1:L75 | 69 | 633 | Reconciliation-only formula roster view; resolve base person rows before creating records. |
| W6.04 | A1:AK77 | 77 | 2516 | Stage date/status calendar policy; summary formulas are reconciliation-only. |
| W6.05 | A1:CH127 | 116 | 5050 | Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas. |
| W6.06 | A1:CH97 | 93 | 5341 | Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas. |
| W6.07 | A1:CH61 | 58 | 3007 | Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas. |
| W6.08 | A1:CH87 | 84 | 4816 | Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas. |
| W6.09 | A1:CH77 | 72 | 3481 | Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas. |
| W6.10 | A1:CH41 | 39 | 2063 | Stage park attendance matrix; unpivot date columns, split staff/student grain, exclude summary formulas. |
| W6.11 | A1:D77 | 77 | 0 | Stage date/status calendar policy; summary formulas are reconciliation-only. |
| W6.12 | A1:AI57 | 51 | 71 | Hold park/staff formula summary; reconcile counts and distinguish input cells from derived values. |
| W6.13 | A1:C32 | 28 | 0 | Hold small text reference; resolve legend/configuration meaning, never infer person records. |

## Import acceptance requirements

1. Preserve workbook SHA, worksheet index and source row/cell provenance. Detect OOXML by content even for `.xls`. Reset incorrect declared dimensions before traversal: W5 claims a tiny range but actually stores A1:BQ760. Independent XML checks must prevent silent truncation.
2. Define field-by-field accepted/ignored/derived/sensitive/ambiguous dispositions, row grain and source precedence. Resolve W3 repeated copies, W2 vertical reference and W6 summaries without double imports. Names and worksheet titles do not prove hierarchy assignments.
3. Parse string dates, Excel dates, local time and day ordinals explicitly. W1 has date cells; W4 has historical day ordinals; many W6 date headings are strings/formulas. Do not infer missing years or convert a blank attendance cell into absent. Preserve source formulas for reference, but import approved values with independently reconciled totals.
4. Stage with stable source identities and bounded validation. Report accepted/rejected/duplicate/ambiguous totals without private values. Unique constraints and transactions must make retries/concurrent repeats safe. Test the same batch twice and interruption/restart.
5. Test schema changes, synthetic upgrades, rollback/recovery and reconciliation in disposable SQLite and PostgreSQL. Financial and safeguarding data require their approved lifecycle. Full raw portal exports must remain outside public assets/client bundles.
6. Real target selection and a concrete reconciled import report precede any live application. This register does not authorize database mutations, account provisioning, provider sends or migration execution.
