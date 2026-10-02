# ATT01 — operational group-session attendance

Assigned to: Astra. Module: group-session-attendance. Status: blocked. Depends
on: U01.

Production bootstrap prerequisites remain unresolved as recorded in
`docs/delivery/reports/ATT01_PRODUCTION_BOOTSTRAP_BLOCKED.md`. The owner started
Murabbi Training induction work on 2026-09-29; MTI-01 is now the sole active task.
ATT01 local changes and evidence remain preserved for resumption.

## Outcome and boundary

Deliver a reliable mobile-first daily attendance workflow for the team. An
authorized Park Lead, Park Admin, or Murabbi selects an in-scope group session,
marks each eligible participant as present, absent, late, or excused, sees the
saved state immediately, and can use the existing authorised offline queue.
The server remains authoritative for scope, closure, reopening, corrections,
conflicts, and audit evidence.

This task covers **Shabab group/class sessions only**. It excludes staff,
Mashwara, team, and event attendance. The owner expanded ATT01 on 2026-09-16
to include the Lahore Batch 4 attendance-data refresh for local and explicitly
identified live databases: reset application data while preserving Super Admin
accounts, import historical workbook marks through 2026-09-13, and load future
class-calendar dates without future attendance marks. This is a destructive,
backup-gated operation and cannot run until its dry-run, rollback evidence, and
database identity checks are accepted.

Unassigned U01 participants must never appear in a group-session roster.

## Owner and source inputs

- Master blueprint §§8.4, role matrix, and attendance/offline requirements.
- Current attendance routes, `mobile-attendance-page.tsx`, sync hook, queue
  panel, and their tests.
- Exact relevant images under `docs/pwa screens/` and the Batch 4 attendance
  workbook are inventory inputs only. No private workbook rows are put in agent
  packets or imported during ATT01.

## Initial contract to audit and preserve

- `GET /api/park/attendance`: in-scope daily group-session list only.
- Event/roster/read, record mutation, prepare, sync, close, reopen, and reset
  endpoints: bounded input, server authorization, version/conflict handling,
  and audit behavior.
- Roles are limited by actual server capability and hierarchy checks; missing
  park/group scope denies access.
- Offline mutations retain the latest local status per session/person until a
  confirmed server result; failures and conflicts remain visible.
- Closed sessions reject prohibited changes server-side. Any permitted reopen
  or reset action requires the current authorised route and audit trail.

The audit will identify any discrepancy before Gemini receives a frontend
packet. Do not invent final status effects, warning/dropout rules, or expanded
role permissions; leave them outside ATT01 unless the existing implementation
already enforces a documented safe rule.

## Owner-approved attendance lifecycle policy — 2026-09-16

- Closing a session records attendance only. It must never automatically change
  a participant to `dropout`, regardless of a legacy batch setting.
- Dropout and reactivation are separate, authorised, audited actions.
- Reactivation requires an effective rejoin date. Existing attendance records
  remain historical evidence; sessions in the dropout-to-rejoin interval are
  ineligible and excluded from roster and denominator calculations. Attendance
  resumes on and after the rejoin date.
- The existing `dropoutAt` and `reactivatedAt` fields are sufficient for the
  current single interruption/rejoin lifecycle; no schema or migration change
  is authorized in ATT01.
- Attendance is an explicit operational-contact exception to the ordinary
  directory privacy projection. A scoped attendance user may receive the
  minimum guardian phone number needed to call or send a WhatsApp message about
  that student's absence. It must not be exposed in exports, general lists, or
  any unrelated client workflow.

## Owner-approved batch calendar policy — 2026-09-16

- Every newly created batch must have an editable start date and end date.
- Attendance creation and marking are server-enforced only for scheduled class
  dates within the inclusive batch range. Historical records remain readable.
- The Lahore Batch 4 data refresh uses 2026-05-23 through 2027-01-31. It imports
  attendance records only through 2026-09-13 and imports later dates as schedule
  data only.
- Staff profiles may be imported from the workbook, but no active account may be
  created without an approved login email and role/scope assignment.

## Delivery sequence

1. Astra audits the actual API/UI/offline route flow, role and scope checks,
   tests, data model, and reference images. Record real gaps and acceptance
   cases in an ATT01 audit report. Baseline audit: 20 files and 94 tests pass;
   `docs/delivery/reports/ATT01_BASELINE_AUDIT.md` records the operational
   automatic-dropout policy hold.
2. Astra fixes confirmed backend, authorization, concurrency, or data issues
   with focused route tests.
3. Gemini receives only an accepted API contract and exact mobile reference
   mapping for bounded frontend corrections.
4. Astra verifies the integrated candidate with route, offline and browser
   checks appropriate to the changed behavior.
5. DeepSeek performs the bounded clean-code pass. Astra reviews its real diff,
   repeats relevant verification, writes a team operator handoff, then marks
   ATT01 done.

## Definition of done

- A scoped authorized user can complete an in-scope group-session roster online.
- A forbidden or cross-scope user cannot read or mutate it.
- Closed/reopened/reset behavior is server-enforced and auditable.
- Offline queue, retry, failure and conflict states are truthful.
- Unassigned, inactive, or out-of-group participants are excluded.
- Mobile UI preserves the established reference design and covers loading,
  empty, error, denied, offline and conflict states where supported.
- Focused tests, lint, typecheck and a production build pass; a concise team
  runbook records exactly what operators should test before use.

## Return to Astra

Exact changed files, test/route/browser evidence, schema and rollback impact,
unresolved owner decisions, and team handoff limits. No self-approval,
deployment, or unrelated refactor.
