# ATT01 attendance pilot and iteration plan

**Owner:** Shabab 360 operations  
**Module:** ATT01 — group-session attendance  
**Status:** Operational plan; pilot results determine the next repair packet  
**Scope:** A controlled rollout of group attendance, followed by weekly evidence-led repairs. This is not production-release approval.

## Purpose

Provide field teams a dependable, narrowly scoped way to mark group attendance during a real class, learn from actual use, and improve the application in weekly releases without compromising attendance history, access scope, or account security.

The first pilot is an attendance pilot. It should not be presented as a final, error-free system or as approval for unrelated modules.

## Pilot scope

### Included roles and work

| Role | Pilot responsibility | Required boundary |
| --- | --- | --- |
| Park Lead / Park Admin | Open the assigned park, enter group attendance, support staff | See only the assigned park |
| Assigned Murabbi | Open and mark the assigned group roster | See and mark only the assigned group |
| City Head | Review city-scoped dashboard, parks, and reports | See only the assigned city |
| Program Head / System Owner | Operational oversight and support | Use privileged access only for support and verification |

### Excluded from the first attendance pilot

- Muawin access to group or attendance data
- Shabab and Guardian attendance workflows
- Unimplemented modules, sample-data pages, and incomplete navigation surfaces
- Production migration, production import, or deployment work until separate approval

## Entry criteria before a real class

All items below must be complete for each pilot park.

1. The pilot roster is named and small enough to support directly.
2. Every pilot staff account has a verified role, active state, and correct city, park, and group assignment.
3. Each staff member can sign in and complete a password reset where required.
4. The selected group roster matches the approved local source-of-truth data.
5. The correct scheduled class date/session can be opened for attendance.
6. Park Lead, Murabbi, and City Head role boundaries have been browser-tested on the pilot environment.
7. The current local-data reconciliation report has no unresolved attendance-blocking mismatch.
8. A backup and rollback procedure is documented for the environment being used.
9. A manual fallback attendance sheet and a designated operations contact are ready.

Do not begin digital marking for a park that fails any attendance-data, login, roster, or scope check.

## Pre-class practice

Run a short practice exercise before the class begins.

1. Park Lead opens the assigned park and attendance workspace.
2. Assigned Murabbi opens only their own group.
3. Mark a small, agreed practice subset using Present, Absent, Late, and Excuse.
4. Refresh the page and confirm the records persist.
5. Confirm a wrong-role or wrong-group account cannot access the roster.
6. Reset only the agreed practice session if the reset is authorized and the reset result is confirmed.
7. Record the session date, pilot park, participants, and outcome in the pilot log.

Practice results must never be mistaken for imported historical attendance. Preserve the audit trail and record any authorized reset.

## During-class operating procedure

### Park Lead / Park Admin

1. Open the Park workspace from Parks.
2. Confirm the displayed park and group before opening attendance.
3. Select the real scheduled session date and group.
4. Assist the Murabbi only within the assigned park.
5. Escalate any roster mismatch before staff mark records.

### Assigned Murabbi

1. Open Group Attendance from Home.
2. Confirm the displayed park, group, and selected session date.
3. Mark each participant once using Present, Absent, Late, or Excuse.
4. Wait for confirmation before leaving the roster.
5. Refresh once after completion to confirm the saved state.
6. Do not mark another group, use another person's account, or invent a session on an unscheduled date.

### City Head

1. Confirm the city name and dashboard values are real and city-scoped.
2. Review parks and attendance summaries for the assigned city only.
3. Report any cross-city value, fabricated KPI, or missing city assignment as an access/correctness issue immediately.

## Success criteria

A pilot class is successful only when all applicable checks are true:

- Staff sign in successfully with their assigned account.
- The correct park, group, roster, and scheduled date are displayed.
- Present, Absent, Late, and Excuse save successfully.
- Saved values remain after refresh and do not duplicate.
- Attendance actions are denied outside the authorized role, city, park, or group.
- City Head sees truthful city-only data.
- No attendance mutation is left as an unexplained failure or conflict.
- The session can be reconciled against the expected roster and attendance totals.

## Stop and fallback rules

Stop digital marking for the affected park and use the approved manual fallback when any of the following happens:

- The roster is wrong, incomplete, or belongs to another group or park.
- A user can access data outside their authorized scope.
- A mark does not save, duplicates, or changes after refresh.
- The session/calendar date is wrong or cannot be identified safely.
- The device is offline and the team cannot confirm the queued operation's status.
- An account, password-reset, or role assignment blocks attendance during the class.

When stopping:

1. Record the incident details before changing data.
2. Continue with the manual attendance fallback.
3. Do not repeatedly retry or reset records without identifying the session and error.
4. Preserve screenshots, timestamps, request/error codes, and the affected role/park/group.
5. Escalate the issue to the ATT01 owner for classification.

## Pilot issue intake

Every issue must contain enough evidence to reproduce it without exposing unnecessary personal data.

| Field | Required content |
| --- | --- |
| Pilot session | Date, approximate time, and pilot environment |
| Reporter role | Park Lead, Park Admin, Murabbi, City Head, or support |
| Scope | City, park, group, and session date; use IDs where possible |
| Action | Exact action attempted |
| Expected result | What should have happened |
| Actual result | What happened, including visible error text/code |
| Evidence | Screenshot, redacted browser console/API detail, or audit reference |
| Impact | Blocker, attendance correctness, access/scope, usability, or enhancement |
| Manual outcome | Whether manual fallback was used |

Do not include passwords, handoff contents, full phone numbers, guardian information, or unnecessary participant details.

## Triage rules

| Priority | Meaning | Required response |
| --- | --- | --- |
| P0 | Scope leak, lost/corrupted attendance, credential exposure, or inability to take attendance across the pilot | Stop affected digital workflow; preserve evidence; fix before next pilot |
| P1 | Incorrect roster/session, failed persistence, login block, or wrong attendance result for a pilot group | Fix and regression-test before the next class |
| P2 | Truthfulness, navigation, labels, slow workflow, or unclear empty/error state | Schedule in the next weekly repair packet |
| P3 | Visual polish or future capability | Backlog; do not delay a safe attendance repair |

Each issue must be reproduced from evidence, mapped to an API/UI/data contract, assigned an owner, and covered by a regression test before being marked resolved.

## Weekly iteration cycle

### Immediately after the pilot

1. Freeze the pilot evidence: issue log, screenshots, audit references, and reconciliation output.
2. Classify every issue using the priority rules.
3. Separate real data discrepancies from UI defects, authorization defects, and environment/device issues.
4. Decide whether a data correction requires an explicit owner-approved operation.

### Weekday repair cycle

1. Reproduce P0/P1 issues with safe synthetic fixtures where possible.
2. Repair the smallest correct layer: data mapping, server authorization, API contract, or UI.
3. Add regression tests for the trigger and the relevant denial/failure path.
4. Run focused tests while iterating, then lint, typecheck, and required broader verification.
5. Review the actual diff and preserve unrelated work.
6. Re-run local reconciliation if a data, import, attendance, or migration path changed.
7. Prepare a concise repair handoff: changed files, evidence, risks, and explicit limits.

### Next-weekend release

Ship:

- all accepted P0/P1 repairs;
- selected P2 usability fixes that have passed regression checks; and
- at most one additional module that has completed its own scoped verification.

Do not combine unverified new modules with a critical attendance repair solely to increase scope.

## Data protection and reconciliation

Before every pilot update:

1. Create the approved environment backup.
2. Verify the current workbook-to-database reconciliation report.
3. Record imported totals and any authorized pilot-session changes separately.
4. Never overwrite imported history to hide a mismatch.
5. Use aggregate counts, deterministic IDs/hashes, and mismatch categories in delivery reports; keep private rows and credentials out of reports and agent packets.

The current expected Batch 4 local baseline is:

| Measure | Expected value |
| --- | ---: |
| Parks | 6 |
| Groups | 18 |
| Valid participants | 339 |
| Attendance events | 460 |
| Historical attendance records | 6,210 |
| Calendar dates | 74 |

Any difference requires classification before the next pilot. A difference caused by an authorized pilot attendance session must be recorded as a pilot delta, not treated as an import error.

## Release gates beyond the local pilot

The team pilot does not authorize production rollout. Before a broader release, complete:

1. Reviewed source inventory and commit boundary.
2. Reconciliation of workbook and local SQLite data.
3. PostgreSQL migration-history compatibility preflight.
4. Approved operational backup, import, provisioning, and rollback runbook.
5. Authorized production migration and deployment task.
6. Post-deployment role smoke tests and a controlled attendance session.

## Post-pilot review template

Use this outline after each pilot:

1. **Pilot facts:** date, parks, groups, roles, and sessions tested.
2. **Successes:** completed attendance actions and verified scope checks.
3. **Issues:** table using the issue-intake fields and priority.
4. **Data result:** reconciliation totals, pilot deltas, and unresolved mismatches.
5. **Decision:** proceed, proceed with limits, pause affected parks, or stop pilot.
6. **Next repair packet:** owners, boundaries, verification required, and target weekend.

## Current limits

- This plan does not approve production deployment, production database writes, or a full-team rollout.
- Attendance remains the first pilot module. New modules must not weaken or distract from attendance reliability.
- Every operational change must remain server-authorized, scope-limited, auditable, and reversible through an approved procedure.
