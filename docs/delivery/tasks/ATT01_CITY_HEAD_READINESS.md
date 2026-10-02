# ATT01 — City Head readiness (backend authorization and API contract)

Owner: Astra. Module: group-session-attendance (ATT01). Status: implementation
complete for local review. Date: 2026-09-18.

This document records the reviewed role matrix, the approved City Head
capabilities, the explicit denials, the API assumptions the fixes rely on, and
the frontend/live-data follow-up that is **not** part of this task.

## Boundary and blast radius

In scope: server-side authorization and API contracts for the City Head role.

Out of scope and untouched: mobile/desktop UI components, Prisma schemas,
migrations, database contents, accounts, credentials, packages, deployment
configuration, and any new endpoint. No live database, browser, or production
environment was exercised for this change.

## Reviewed role matrix

Internal persisted role names are unchanged. Only the presentation label is
product-facing.

| Product label | Internal role | Hierarchy kind | Required assignment | Fails closed when |
| --- | --- | --- | --- | --- |
| Program Head | `program_admin` | HQ (cross-city) | none (may narrow by `cityId`) | never for scope |
| City Head | `city_head` | city | `assignedCityId` + active city | city missing or inactive |
| Park Lead | `park_lead` | park | `assignedParkId` + active park | park missing or inactive |
| Park Admin | `park_admin` | park | `assignedParkId` + active park | park missing or inactive |
| Murabbi | `murabbi` | group | active group, or park-only with no group data | group/park missing |
| Muawin | `muawin` | park (content view only) | `assignedParkId` | park missing |
| Shabab | `student` | self | participant record | — |
| Guardian | `guardian` | own children | guardian record | — |

`super_admin` remains a technical system-owner identity. It is not an operating
role and is never presented as one; its product label is `System Owner`.

Internal role names stay as-is because they are persisted in `StaffMeta.role`
and referenced by existing capability and migration data. Renaming them would be
a schema/data change outside this task.

## Approved City Head capabilities

Exactly `ROLE_DEFAULT_CAPABILITIES.city_head` in `src/lib/auth/capabilities.ts`
(individual overrides still apply through `userHasCapability`):

`dashboard.view`, `organisation.view`, `organisation.manage`, `people.view`,
`students.manage`, `guardians.manage`, `admissions.manage`, `attendance.mark`,
`attendance.correct`, `attendance.staff.manage`, `fees.manage`,
`announcements.manage`, `reports.view`, `access.city_staff.manage`,
`content.view`, `content.manage`, `events.view`, `events.manage`,
`events.responsibilities.manage`, `calling.view`, `calling.poc.manage`,
`calling.templates.manage`, `calling.export.manage`, `students.profile.view`,
`students.profile.manage`, `students.profile.sensitive.view`,
`students.profile.sensitive.manage`, `mashwara.view`, `mashwara.manage`,
`reports.export`.

Relative to Program Head, City Head is granted `access.city_staff.manage` and is
**not** granted `audit.view` or `settings.manage`.

Capability grants never widen hierarchy scope: every capability still passes
through the resource-scope checks below.

## Explicit denials

- **Missing city assignment.** A `city_head` with no `assignedCityId` is denied
  (403) on every city-scoped surface. It never falls through to an unscoped or
  empty-payload response.
- **Cross-city identifiers.** A `cityId`, `parkId`, or `groupId` belonging to
  another city is denied with 403 and no rows or counts are read. A name is never
  echoed back for a denied identifier.
- **Non-city roles on city-level reports.** `park_lead`, `park_admin`, `murabbi`,
  `muawin`, `student`, and `guardian` are denied (403 "This operation requires
  city-level scope") on the city-level report and export routes, even when a
  capability override grants `reports.view`.
- **Administrative powers.** `audit.view`, `settings.manage`,
  `access.role_defaults.manage`, `access.user_overrides.manage`, and
  `access.scope.manage` are not available to City Head.
- **Attendance marking.** Unchanged. City Head is an oversight role for the park
  and group roles, but the approved capability policy already grants
  `attendance.mark`/`attendance.correct`, so City Head marking remains permitted
  **inside their own city only**. It is not widened anywhere by this change.
- **Staff directory.** `/api/admin/people` remains HQ-only. City Head staff
  provisioning continues through `/api/admin/users`, which pins them to their
  assigned city.

## Confirmed findings

1. **Cross-city query parameters (high).** `GET /api/admin/reports/admissions`,
   `/reports/fees`, and `/reports/attendance` applied the request `cityId`/
   `parkId`/`groupId` *before* the City Head branch, so a City Head could request
   another city's aggregate totals by query string.
2. **Missing city assignment fell open (high).** The same three routes had no
   `else` denial: a City Head with no `assignedCityId` produced an unstamped
   `where`, returning all-city totals and city breakdowns.
3. **Unscoped city filter (high).** `GET /api/admin/reports/attendance-report`
   assigned `parkWhere.cityId = user.assignedCityId` unconditionally; an
   unassigned City Head produced `cityId: undefined`, which Prisma treats as "no
   filter", returning every city's attendance rows.
4. **Export ignored the resolved scope (high).** `POST /api/admin/reports/export`
   computed a `scopeWhere` it never used. The attendance case used raw request
   values, so a City Head could export another city's rows, or export all cities
   when no filter was supplied. The admissions/fees cases filtered on the raw
   `cityId` and fell open without one.
5. **Mashwara listing fell open (medium).** `GET /api/admin/mashwara` only
   filtered when `assignedCityId` was present, so an unassigned City Head saw
   every city's meetings (and could name another city via `cityId`).
6. **Empty cross-city payload instead of denial (medium).**
   `GET /api/admin/dashboard` returned `200 {}` for a City Head with no city
   rather than a denial.
7. **Non-approved roles could read org reports (high).** Because
   `reports.view` is default-granted to `guardian` and `student` for their own
   portals, those roles could call the admin report routes and receive
   organisation-wide aggregates.
8. **Inconsistent group scoping (medium).** `GET /api/city-head/dashboard`
   derived city groups from `batch.parkId` only, contradicting the authoritative
   rule that a group's own `parkId` wins with the batch park used only as a
   fallback for a null group park. A group whose own park sat outside the city
   could be counted into that city's metrics, and a group whose own park was
   inside the city but whose batch park was outside was wrongly excluded.
9. **Confusing role label source (low).** No server response emitted
   "Main admin"; the confusion is client-derived. The session response carried
   only the internal `role` name.
10. **Group scope read through the batch park (P1, found in review).** The
    attendance aggregate report, the detailed attendance report, and the
    attendance CSV export all filtered through `Group.batch.parkId`. Because the
    authoritative rule is `Group.parkId` with the batch park used only as a
    fallback for a null group park, a group whose *own* park sat in another city
    was included in a City Head's results whenever its batch park was in scope —
    and a group whose own park was in scope was dropped when its batch park was
    not. The detailed report and CSV also *displayed* the batch park's name and
    city, so a mismatched group could print another city's name into a City Head
    response.

## Repairs

- All four report routes plus the CSV export now resolve scope through the
  existing `resolveRequestedCityScope` helper: HQ may select a city (unscoped
  means all cities), City Head is pinned to their assigned city, every other role
  is denied, and a requested park/group must belong to the resolved city.
- Group-level filtering in the attendance aggregate report, the detailed
  attendance report, and the attendance CSV export now goes through the
  established authoritative helpers (`hierarchyGroupWhere` for a city scope,
  `groupParkWhere` for a park scope) instead of `Group.batch.parkId`. A group
  whose own park is outside the resolved park or city is never included merely
  because its batch park is inside it, and a null group park still resolves
  through the batch park.
- The detailed attendance report and the CSV export now label each row with the
  group's authoritative park and city (`group.park ?? group.batch.park`), and
  the export audit records the resolved scope. A conflicting batch park can no
  longer print another city's name or park name into a City Head response.
- Cross-city `parkId`/`groupId` now return 403 (or 404 when the record does not
  exist) before any aggregate is read.
- `/api/admin/reports/attendance-report` fails closed per role, validates a
  requested group against the resolved park/city, and labels the scope it
  actually queried instead of echoing request values.
- `/api/admin/dashboard` and `/api/admin/mashwara` deny a City Head without a
  city assignment.
- `/api/city-head/dashboard` uses the same group predicate shape as
  `groupParkWhere` for city group counts, participant counts, the group list,
  and per-park group lists.
- A stable product-facing label is now returned where role metadata already
  existed: the NextAuth session (`session.user.roleLabel`) and the
  `actor.roleLabel` field of `GET /api/admin/pilot/verify-scopes`.

## API assumptions

- `session.user.role` and `assignedCityId` are re-derived from active `StaffMeta`
  on every JWT refresh (`resolveActiveIdentity`), so a revoked or re-scoped City
  Head loses authority without a re-login. The API still denies when the value is
  absent.
- `resolveRequestedCityScope` is the single city-scope resolver: HQ → requested
  city or null; `city_head` → assigned city or 403; anything else → 403. Client
  values may only narrow, never broaden.
- `groupParkWhere` / `hierarchyGroupWhere` encode the authoritative hierarchy
  rule: a present `Group.parkId` always wins; the batch park is a fallback only
  for a null group park.
- Every group-scoped report filter and every reported park/city label uses that
  same rule, so a group's authoritative park and the displayed park always agree.
  `Group.batch.parkId` must never be the sole basis for including a group.
- `roleLabel` is derived from `role` and is never an independent source of
  truth; an unknown role yields `null` rather than a guessed label.
- Report routes now return 404 for a non-existent requested park/group, where
  they previously returned an empty result set.
- Denials do not read counts or names, so a denied caller cannot infer the
  existence of a park, group, or city.

## Frontend follow-up (not done here)

1. `src/components/modules/park/mobile-parks-page.tsx`,
   `mobile-park-detail-page.tsx`, `mobile-inventory-page.tsx`, and
   `mobile-evaluation-page.tsx` still derive labels locally and emit
   "Main admin" for `super_admin`/`program_admin`, and some still assume a
   `main_admin` role string. Gemini should switch these to the server-provided
   `roleLabel`. Internal role comparison must keep working while the labels
   change.
2. The mobile Parks screen defaults to `"main_admin"` when the session role is
   missing; that default should become an explicit unauthenticated/denied state.
3. `GET /api/park/attendance/summaries` requires a park context and returns
   `400 "Select an authorized park"` for a City Head with no park selected. No
   city-level roll-up summary endpoint was created. If acceptance testing needs a
   city-wide attendance summary, that is a new approved contract, not a repair.
4. `GET /api/park/dashboard` serves a City Head the *first* park in their city.
   The City Head portal should use `GET /api/city-head/dashboard` instead.
5. Report screens must present the `403 "This operation requires city-level
   scope"` denial for park-scoped staff rather than an empty chart.

## City Head acceptance checklist (browser, to be performed by the team)

Preconditions: a City Head account with an active city assignment and at least
one park; a second city with its own park and group; a Program Head account.

1. Sign in as City Head. The home/dashboard loads only the assigned city, with
   truthful zeroes where the city has no data.
2. Open the park list. Only assigned-city parks appear; no other city's park name
   is visible anywhere in the response.
3. Open a group/batch view. Only assigned-city groups appear, including legacy
   groups that resolve through their batch park. A group whose *own* park is in
   another city must not appear even when its batch park is in this city.
4. Open attendance reports for a park in the city, and export the attendance CSV.
   Sessions, rows and totals are limited to that park or city, every row names
   the group's own park and city, and no other city's name appears in the rows,
   totals or CSV.
5. Attempt a cross-city id by URL or query (e.g. another city's `parkId`). Expect
   a denial, not an empty chart, and no name or count from the other city.
6. Temporarily remove the city assignment (owner-approved test account only) and
   reload. Every city-scoped screen denies instead of showing an empty payload.
7. Sign in as Program Head. Cross-city reporting still works, and selecting a
   city narrows it.
8. Sign in as Park Lead / Park Admin / Murabbi / Muawin. Each remains limited to
   their existing park or group scope; none gains a city-level report.
9. Confirm the displayed role label matches the product hierarchy wording and
   never shows "Main admin".
10. Mark attendance as City Head inside the city, then close and reopen a
    session, to confirm the existing lifecycle still behaves as before.

## Verification (local only)

Commands run from the repository root with `NODE_ENV` cleared.

- Focused Vitest: `city-head-scope.test.ts` (36), `reports-ui.test.ts` (15),
  `reports/attendance-report` (1), `city-head/dashboard` (8), `mashwara-api`
  (28), `admin/dashboard` (2), `pilot/__tests__/scopes` (3), `lib/auth.test.ts`
  (13), `lib/auth/role-labels.test.ts` (5) — **9 files, 111 tests, exit 0**.
- Authoritative-scope regression block (6 tests) drives intentionally
  conflicting fixtures: `Group.parkId` in Lahore with `batch.parkId` in Karachi,
  the reverse, and a null group park resolved through the batch park. A
  batch-only filter returns 2 Lahore sessions where the authoritative rule
  returns 3, so the conflict is discriminating rather than incidental.
- **Guard proof:** reverting the three scope filters to `Group.batch.parkId`
  (attendance aggregate, detailed report, CSV export) makes **10 of 36**
  `city-head-scope.test.ts` tests fail, including all 6 new conflict tests and
  the 4 rewritten contract tests. The filters were restored and the file returned
  to 36/36 green. The tests therefore guard the fix rather than merely describe
  it.
- Corpus regression slice (`src/__tests__`, `src/lib/auth`, `src/app/api/auth`,
  `src/app/api/admin/reports`, `src/app/api/admin/pilot`, `src/app/api/city-head`,
  `src/app/api/admin/dashboard`, `src/app/api/admin/mashwara`,
  `src/app/admin/reports`, `src/app/api/admin/students`, `src/app/api/admin/parks`)
  — **47 files, 630 passed, 5 failed (635 total)**.
- The 5 failures are pre-existing and unrelated: `master-production-signoff`
  (2), `pilot-production-health` (2), and `staging-smoke` (1) assert hard-coded
  migration-folder counts. The working tree already contained two untracked
  migration folders per provider (`20260916080000_add_muawin_assistance`,
  `20260917193000_add_operation_receipts`), so SQLite counts 19 where the test
  expects 17 and PostgreSQL counts 33 where it expects 31. This change modifies
  no Prisma schema, migration, or database file. Re-baselining those counts is
  out of scope for ATT01 and was deliberately not done.
- `npx tsc --noEmit` — **exit 0** (baseline before the change was also exit 0).
- Scoped ESLint over the changed source/test files — **exit 0, no warnings**.
- `git diff --check` scoped to the changed tracked files — **exit 0**, no
  whitespace errors. No new file contains trailing whitespace.
- `git diff --numstat` on the changed files shows only the intended small line
  counts; no line-ending or whole-file churn.

Not claimed: browser testing, live database validation, deployment, independent
review, or release readiness.
