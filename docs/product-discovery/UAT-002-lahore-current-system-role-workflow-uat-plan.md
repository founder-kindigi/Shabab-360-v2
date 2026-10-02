# UAT-002: Lahore Current-System Role and Workflow UAT Plan

> Status: Discovery and execution plan only. No application code, Prisma schema, migration, test, deployment, or data files were changed.
>
> Scope: Staging UAT against the already imported Lahore Batch 4 data.
>
> Rule: Use `UAT_TEST_` records only. Never alter real Lahore records.

## 1. Goal

Verify the current Lahore-backed system for the seven role families already in the app: Super Admin, City Head, Park Lead, Park Admin, Murabbi, Guardian, and Shabab.

The plan focuses on login, navigation, scope denial, empty/error states, People/Students/Guardians, groups, attendance history, dashboard counts, mobile attendance, and forced password reset.

## 2. Verified current behavior

1. The app has one user-visible shell entrypoint. `src/app/page.tsx` keeps the client on the auth-aware router, and `src/components/layout/page-router.tsx` only renders `LoginPage`, `ResetPasswordPage`, `AccessPendingPage`, or the app shell. Evidence: [`src/app/page.tsx`](../../src/app/page.tsx#L31-L106), [`src/components/layout/page-router.tsx`](../../src/components/layout/page-router.tsx#L9-L25).
2. Login is handled by NextAuth credentials. Evidence: [`src/app/api/auth/[...nextauth]/route.ts`](../../src/app/api/auth/%5B...nextauth%5D/route.ts#L1-L5).
3. Forced password reset is server-enforced with same-origin protection, session identity, current-password checks for non-forced resets, and token-version invalidation. Evidence: [`src/app/api/auth/reset-password/route.ts`](../../src/app/api/auth/reset-password/route.ts#L23-L90).
4. People, Students, Guardians, and Groups APIs are role/capability guarded and already apply scope filters or explicit denials. Evidence: [`src/app/api/admin/people/route.ts`](../../src/app/api/admin/people/route.ts#L25-L134), [`src/app/api/admin/students/route.ts`](../../src/app/api/admin/students/route.ts#L35-L174), [`src/app/api/admin/guardians/route.ts`](../../src/app/api/admin/guardians/route.ts#L31-L182), [`src/app/api/admin/groups/route.ts`](../../src/app/api/admin/groups/route.ts#L25-L158).
5. Attendance list/create and offline sync already enforce resource scope, close-state checks, payload bounds, and status validation. Evidence: [`src/app/api/park/attendance/route.ts`](../../src/app/api/park/attendance/route.ts#L21-L253), [`src/app/api/park/attendance/sync/route.ts`](../../src/app/api/park/attendance/sync/route.ts#L46-L168).
6. Dashboard routes already return role-specific aggregates and explicit empty/error states when scope is missing or no linked record exists. Evidence: [`src/app/api/admin/dashboard/route.ts`](../../src/app/api/admin/dashboard/route.ts#L18-L31), [`src/app/api/admin/dashboard/route.ts`](../../src/app/api/admin/dashboard/route.ts#L65-L83), [`src/app/api/park/dashboard/route.ts`](../../src/app/api/park/dashboard/route.ts#L17-L63), [`src/app/api/park/dashboard/route.ts`](../../src/app/api/park/dashboard/route.ts#L74-L131), [`src/app/api/guardian/dashboard/route.ts`](../../src/app/api/guardian/dashboard/route.ts#L56-L90), [`src/app/api/guardian/dashboard/route.ts`](../../src/app/api/guardian/dashboard/route.ts#L130-L203), [`src/app/api/student/dashboard/route.ts`](../../src/app/api/student/dashboard/route.ts#L17-L53), [`src/app/api/student/dashboard/route.ts`](../../src/app/api/student/dashboard/route.ts#L75-L143), [`src/app/api/student/dashboard/route.ts`](../../src/app/api/student/dashboard/route.ts#L207-L257), [`src/app/api/city-head/dashboard/route.ts`](../../src/app/api/city-head/dashboard/route.ts#L17-L35), [`src/app/api/city-head/dashboard/route.ts`](../../src/app/api/city-head/dashboard/route.ts#L65-L83), [`src/app/api/city-head/dashboard/route.ts`](../../src/app/api/city-head/dashboard/route.ts#L113-L205).
7. The Master Blueprint still requires Lahore real-data stabilization before broader redesigns, and City Head / park / group scope must be enforced server-side. Evidence: [`docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`](../../docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md#L88-L107), [`docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`](../../docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md#L109-L118).

## 3. Test data rules

- Only staging data may be touched.
- If a scenario needs a fresh record, create it with a `UAT_TEST_` prefix.
- Do not edit or delete imported Lahore Batch 4 rows.
- `UAT_TEST_` accounts, groups, and attendance events must be fully isolated from imported Lahore participants, groups, and historical attendance.
- Never create a test attendance event or attendance record against real Lahore participants/groups/events.
- Cleanup means removing only the test records created for that scenario and then confirming the original imported counts still match.

## 4. Lahore reconciliation baseline (approved)

Use this as the default expected baseline when validating dashboard and list totals:

- 1 city
- 6 parks
- 6 batches
- 13 groups
- 277 participants (257 active, 20 dropout)
- 180 events
- 2,967 attendance records

If observed totals differ, either:

1. Log a defect, or
2. Log an explicit expected-difference note with cause and evidence.

Evidence: [`/.agents/memory/current.md`](../../.agents/memory/current.md#L103-L105).

## 5. Assumptions and owner decisions

- The imported Lahore Batch 4 users already exist for the target roles, or staging operators can provision equivalent `UAT_TEST_` accounts without touching real Lahore people.
- A linked guardian/participant record may not exist for every role account, so the plan includes both normal and empty-state checks.
- Any missing scope assignment on a role account is treated as a valid denial test, not a defect in the test plan.

## 6. UAT matrix

| ID | Role | Precondition | Action | Expected result | Cleanup | Release blocker? |
| --- | --- | --- | --- | --- | --- | --- |
| UAT-002-01 | Super Admin | Valid super-admin login; `mustResetPwd` state known | Sign in | Lands on admin workspace or reset page first if forced; never shows access-pending for a valid privileged account | Sign out; delete any `UAT_TEST_` account if created | Yes |
| UAT-002-02 | City Head | City-scoped account with assigned city | Sign in and open city dashboard | Lands on City Head dashboard; counts reflect only assigned-city Lahore baseline totals unless documented expected differences; missing city assignment yields 403/no-city-assigned behavior | Sign out; remove any `UAT_TEST_` city records | Yes |
| UAT-002-02A | City Head boundary | City Head account with Lahore assignment | Verify no Cities menu/page access, call `/api/admin/cities` directly, and attempt user-management actions outside Lahore or for non-park roles | No Cities navigation; `/api/admin/cities` denied; City Head can manage only Park Lead/Park Admin/Murabbi within assigned city | Revert only `UAT_TEST_` staff-scope changes | Yes |
| UAT-002-03 | Park Lead | Park-scoped account with assigned park | Sign in and open park dashboard | Lands on park dashboard; counts reflect only the assigned park and its active groups | Sign out; remove any `UAT_TEST_` park records | Yes |
| UAT-002-04 | Park Admin | Park-scoped account with assigned park | Sign in and open attendance and roster pages | Lands on park workspace; attendance list is scoped to the park and shows expected counts relative to Lahore baseline | Sign out; remove any `UAT_TEST_` attendance rows if created | Yes |
| UAT-002-05 | Murabbi | Group-scoped account with assigned group | Sign in and open groups plus attendance history | Sees only own group data; attendance history and dashboard counts match the assigned group | Sign out; remove any `UAT_TEST_` group or event rows if created | Yes |
| UAT-002-06 | Guardian | Linked-guardian account, and one no-link account for empty-state check | Sign in as linked guardian, then as no-link guardian | Linked guardian sees only linked children; no-link account returns empty guardian state, not cross-family data | Sign out; delete only `UAT_TEST_` link rows if created | Yes |
| UAT-002-07 | Shabab | Participant-linked account, and one no-link account for empty-state check | Sign in as student and open dashboard, schedule, and attendance history | Sees only own record, own attendance history, and own schedule; no-link account gets empty participant state | Sign out; delete only `UAT_TEST_` participant link rows if created | Yes |
| UAT-002-08 | Cross-role denial | At least one lower-scope role account | Attempt to open People, Students, Guardians, or a foreign city/park/group resource | Request is denied with 403/forbidden or equivalent scoped denial; no data leakage | None, unless a `UAT_TEST_` resource was created for the attempt | Yes |
| UAT-002-09 | People listing | Super Admin or Program Admin account | Open People list with search, role, city, park, and active filters | Only staff-linked users appear; counts and filters respect the selected scope | Remove any `UAT_TEST_` staff/user row created for the test | Yes |
| UAT-002-10 | Students listing | Super Admin or Program Admin account | Open Students list with search, city, park, group, gender, and state filters | Only participants in the selected scope appear; attendance rate and hierarchy fields render | Remove any `UAT_TEST_` participant row created for the test | Yes |
| UAT-002-11 | Guardians listing | Super Admin or Program Admin account | Open Guardians list with search, city, and state filters | Only guardians in scope appear; linked children and attendance rates render; empty city filter returns empty state cleanly | Remove any `UAT_TEST_` guardian/link row created for the test | Yes |
| UAT-002-12 | Groups listing | HQ, City Head, Park Lead, or Murabbi account depending on scope | Open Groups list, then search and filter by batch, park, and status | HQ sees city-wide groups; scoped roles see only allowed groups; Murabbi is limited to own group | Remove any `UAT_TEST_` group row created for the test | Yes |
| UAT-002-13 | Attendance history | Park Lead or Park Admin account | Open attendance history for an active park and then a closed event | Open events show record counts; closed events remain readable but cannot be mutated; empty date range yields empty state | Remove any `UAT_TEST_` event/record rows created for the test | Yes |
| UAT-002-14 | Mobile attendance sync | Park Admin or Murabbi account with one active event | Queue UAT_TEST_ attendance mutations on a mobile-width view and sync them | Sync accepts valid mutations, rejects invalid participants/statuses, and enforces the 50-mutation cap | Delete only the created `UAT_TEST_` attendance records and clear the offline queue | Yes |
| UAT-002-15 | Forced password reset | Any account with `mustResetPwd = true` | Sign in, complete reset, then continue | User is routed to reset first; after reset the session is signed out; user must authenticate again before entering the correct role portal | Remove no real data; sign out and delete any `UAT_TEST_` account if created | Yes |
| UAT-002-16 | Direct API denial: Park Admin | Park Admin account and target IDs not tied to allowed scope | Call batch and group read/mutation endpoints directly | Batch and group reads/mutations return 403; any non-403 access is a defect or documented expected difference | Remove any `UAT_TEST_` objects if created | Yes |
| UAT-002-17 | Direct API denial: Park Lead | Park Lead account with assigned park and one foreign park target | Call groups GET/POST directly for assigned park and foreign park | Assigned-park group read allowed; group mutations return 403; foreign-park access denied | Remove any `UAT_TEST_` objects if created | Yes |
| UAT-002-18 | Direct API denial: Murabbi | Murabbi account with assigned group plus foreign group/event IDs | Call attendance list/create/sync for foreign group/event/participant | Foreign-group attendance read/write returns 403 or explicit forbidden result; no foreign record change | Remove any `UAT_TEST_` objects if created | Yes |

## 7. Execution order

1. Run login, forced reset, and landing checks first.
2. Run dashboard-count checks next, and compare results against the approved Lahore reconciliation baseline.
3. Run People / Students / Guardians / Groups filters after the dashboards.
4. Run direct API denial checks before mobile sync to catch scope leaks early.
5. Run attendance history and mobile sync last, because they are the easiest places to accidentally create test records.
6. Stop immediately on any scope leak, cross-city read, or write into a non-`UAT_TEST_` Lahore record.

## 8. Evidence for release checks

- City Head has no Cities menu entry; role nav includes Parks/Batches/Groups/People and excludes `admin-cities`. Evidence: [`src/components/layout/sidebar.tsx`](../../src/components/layout/sidebar.tsx#L160-L166).
- Cities API is restricted to Super Admin and Program Admin. Evidence: [`src/app/api/admin/cities/route.ts`](../../src/app/api/admin/cities/route.ts#L18-L23), [`src/app/api/admin/cities/route.ts`](../../src/app/api/admin/cities/route.ts#L40-L45).
- City Head user-management scope is restricted to Park Lead/Park Admin/Murabbi within assigned city. Evidence: [`src/app/api/admin/users/route.ts`](../../src/app/api/admin/users/route.ts#L19-L33), [`src/app/api/admin/users/route.ts`](../../src/app/api/admin/users/route.ts#L48-L62), [`src/app/api/admin/users/[id]/route.ts`](../../src/app/api/admin/users/%5Bid%5D/route.ts#L16-L17), [`src/app/api/admin/users/[id]/route.ts`](../../src/app/api/admin/users/%5Bid%5D/route.ts#L109-L121).
- Attendance scope checks reject out-of-scope read/write. Evidence: [`src/app/api/park/attendance/route.ts`](../../src/app/api/park/attendance/route.ts#L36-L57), [`src/app/api/park/attendance/route.ts`](../../src/app/api/park/attendance/route.ts#L202-L207), [`src/app/api/park/attendance/sync/route.ts`](../../src/app/api/park/attendance/sync/route.ts#L94-L101).
- Reset flow signs out invalidated sessions and requires re-authentication. Evidence: [`src/app/api/auth/reset-password/route.ts`](../../src/app/api/auth/reset-password/route.ts#L71-L80), [`src/app/page.tsx`](../../src/app/page.tsx#L81-L94).

## 9. Recommendations

- Keep this UAT pass narrowly tied to the current system and imported Lahore data; do not branch into redesign work.
- Treat any unauthorized read, write, or cross-scope display as a release blocker.
- If an area is empty because the imported data does not contain a linked record, record that as a verified empty-state outcome, not as a defect.
- After this pass, feed the findings back into the Lahore real-data stabilization gate before new features are assigned.

## 10. Handoff note

This document is ready to be used as the staging UAT checklist for UAT-002 without touching real Lahore data.
