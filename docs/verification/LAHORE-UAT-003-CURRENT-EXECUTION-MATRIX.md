# LAHORE-UAT-003 - Current Execution Matrix

**Status:** Active - evidence pending
**Updated:** 2026-07-30
**Candidate branch:** `codex/lahore-uat-candidate`
**Candidate commit:** `cfcc7e40ca656beac3e6005a35443e6725c1bd13`
**Restricted testing URL:** `https://shabab360-git-codex-lahore-uat-candidate-outhecs.vercel.app`

This is the execution source of truth for the Shabab testing team. It supersedes
the old candidate-head references in the handover pack, but does not replace its
scope, defect-severity, or evidence rules. A scenario is **not passed** until a
tester records the observed result and stores the required evidence.

## 1. Verified Readiness At Start Of UAT

| Item | Current state | Tester action |
| --- | --- | --- |
| Candidate deployment | Preview deployment is Ready and the Lahore candidate alias returns HTTP 200. | Test only through the URL above. |
| PostgreSQL schema | The four previously pending Lahore module migrations were applied before fixture seeding. | Do not run migrations or database commands. |
| Module fixtures | Preview fixtures now exist for Content Planner, Collaboration Teams activity, Events, Calling, Mashwara, and Media. | Use records prefixed `Preview UAT -` where they are visible. |
| Generic global selector | Removed from the application shell. Modules retain their own scoped filters. | Run NAV-04 before filing a missing-filter defect. |
| Test accounts | Owner reports all eight role accounts can sign in and load dashboards. | Still execute AUTH-01 and AUTH-03 once per account and attach evidence. |

## 2. Execution Rules

- Use only these roles: Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi, Guardian, and Student.
- Record one execution record and at least one screenshot per role and viewport used.
- Use exactly: `<Scenario-ID>-<RoleSlug>-<Viewport>-<Index>.png`.
- Role slugs are `SuperAdmin`, `ProgramAdmin`, `CityHead`, `ParkLead`, `ParkAdmin`, `Murabbi`, `Guardian`, and `Student`.
- Store screenshots, recordings, exports, and defect notes under `docs/uat-evidence/`.
- Allowed statuses: `NOT_STARTED`, `PASSED`, `FAILED`, `BLOCKED`, `NOT_EXECUTED_BROWSER_BLOCKED`.
- `PASSED` requires a real browser result and evidence. Code review, API checks, or a successful deployment never count as UAT evidence.
- Stop the affected area and file a P0 immediately for data loss, a scope/security bypass, or a workflow unavailable to its intended role.

## 3. Current Scenario Matrix

| Scenario | Tester role | Route or workflow | Viewport | Expected result | Evidence location | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Each canonical role | Sign in with that role's valid account | Desktop | Correct role portal loads | `docs/uat-evidence/AUTH-01-<RoleSlug>-Desktop-01.png` | NOT_STARTED |
| AUTH-02 | Super Admin | Sign in using an incorrect password | Desktop | Clear denial; no session is created | `docs/uat-evidence/AUTH-02-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AUTH-03 | Each newly provisioned role | First sign-in and forced password reset | Desktop | Reset is required; old password stops working | `docs/uat-evidence/AUTH-03-<RoleSlug>-Desktop-01.png` | NOT_STARTED |
| AUTH-04 | Super Admin | Sign out, then revisit a protected page | Desktop | Redirected to login; protected request is denied | `docs/uat-evidence/AUTH-04-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AUTH-05 | Unauthenticated browser | Open a protected application URL | Desktop | Redirected to login | `docs/uat-evidence/AUTH-05-Unauthenticated-Desktop-01.png` | NOT_STARTED |
| PORTAL-01 | Each canonical role | Dashboard and sidebar navigation | Desktop | Correct portal and role-appropriate navigation | `docs/uat-evidence/PORTAL-01-<RoleSlug>-Desktop-01.png` | NOT_STARTED |
| PORTAL-02 | City Head | Try Cities navigation and a direct Cities URL | Desktop | Navigation absent and direct access denied | `docs/uat-evidence/PORTAL-02-CityHead-Desktop-01.png` | NOT_STARTED |
| PORTAL-03 | Park Lead, Park Admin | Open sibling-park records using UI or known link | Desktop | Only assigned-park data is available | `docs/uat-evidence/PORTAL-03-ParkLead-Desktop-01.png` | NOT_STARTED |
| PORTAL-04 | Murabbi | Students and attendance for assigned group | 375px, 390px | Only assigned-group data is available | `docs/uat-evidence/PORTAL-04-Murabbi-375px-01.png` | NOT_STARTED |
| PORTAL-05 | Guardian | Guardian child list and direct child URL | 375px, 390px | Only linked children are visible | `docs/uat-evidence/PORTAL-05-Guardian-375px-01.png` | NOT_STARTED |
| PORTAL-06 | Student | Own profile/schedule and another-student URL | 375px, 390px | Only own record is visible | `docs/uat-evidence/PORTAL-06-Student-375px-01.png` | NOT_STARTED |
| ORG-01 | Super Admin | Cities, parks, batches, and groups | Desktop | Lahore hierarchy is visible and internally consistent | `docs/uat-evidence/ORG-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| ORG-02 | City Head | Create a Lahore park | Desktop | Park is created within Lahore and listed | `docs/uat-evidence/ORG-02-CityHead-Desktop-01.png` | NOT_STARTED |
| ORG-03 | City Head | Inspect group, batch, park, and city links | Desktop | Group links to its batch, park, and Lahore city | `docs/uat-evidence/ORG-03-CityHead-Desktop-01.png` | NOT_STARTED |
| STAFF-01 | City Head | Open Users and list city staff | Desktop | Users menu is available; only Lahore staff are visible | `docs/uat-evidence/STAFF-01-CityHead-Desktop-01.png` | NOT_STARTED |
| STAFF-02 | City Head | Provision Park Lead, Park Admin, or Murabbi | Desktop | Allowed staff role is created in Lahore with reset required | `docs/uat-evidence/STAFF-02-CityHead-Desktop-01.png` | NOT_STARTED |
| STAFF-03 | Program Admin | Attempt foreign-city or out-of-scope staff assignment | Desktop | Scope denial is shown; no unauthorized change | `docs/uat-evidence/STAFF-03-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| ATT-01 | Park Lead | Create attendance event | Desktop | Event uses assigned-park/group roster | `docs/uat-evidence/ATT-01-ParkLead-Desktop-01.png` | NOT_STARTED |
| ATT-02 | Park Admin | Mark student attendance | 375px, 390px | Mark saves and status updates | `docs/uat-evidence/ATT-02-ParkAdmin-375px-01.png` | NOT_STARTED |
| ATT-03 | Park Lead | Correct a marked record | Desktop | Correction saves with an audit trail | `docs/uat-evidence/ATT-03-ParkLead-Desktop-01.png` | NOT_STARTED |
| ATT-04 | Park Lead | Close an attendance event | Desktop | Further marking is prevented | `docs/uat-evidence/ATT-04-ParkLead-Desktop-01.png` | NOT_STARTED |
| ATT-05 | City Head | Historical attendance/report view | Desktop | Imported historical attendance is queryable | `docs/uat-evidence/ATT-05-CityHead-Desktop-01.png` | NOT_STARTED |
| ATT-06 | Park Admin | Mark offline, reconnect, and verify sync | 375px, 390px | Local queue persists and sync recovers | `docs/uat-evidence/ATT-06-ParkAdmin-375px-01.png` | NOT_STARTED |
| STU-01 | Murabbi | Assigned-group student roster | 375px, 390px | Correct students and profiles display | `docs/uat-evidence/STU-01-Murabbi-375px-01.png` | NOT_STARTED |
| STU-02 | Park Lead | Search student within assigned scope | Desktop | Correct scoped result is returned | `docs/uat-evidence/STU-02-ParkLead-Desktop-01.png` | NOT_STARTED |
| STU-03 | Park Lead | Student-to-guardian view | Desktop | Linked guardian is available within scope | `docs/uat-evidence/STU-03-ParkLead-Desktop-01.png` | NOT_STARTED |
| GRD-01 | Program Admin | Exact guardian phone lookup | Desktop | At most one active match; phone masked; no CNIC/address | `docs/uat-evidence/GRD-01-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| GRD-02 | Guardian | Linked children view | 375px, 390px | Only linked students are visible | `docs/uat-evidence/GRD-02-Guardian-375px-01.png` | NOT_STARTED |
| ADM-01 | Program Admin | Create admission application | Desktop | Application enters pipeline | `docs/uat-evidence/ADM-01-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| ADM-02 | Program Admin | View admissions pipeline | Desktop | Applications and statuses display | `docs/uat-evidence/ADM-02-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| ADM-03 | Program Admin | Record admission decision | Desktop | Decision and status persist | `docs/uat-evidence/ADM-03-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| ADM-04 | Program Admin | Convert accepted application | Desktop | One participant is created atomically | `docs/uat-evidence/ADM-04-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| ADM-05 | Program Admin | Retry conversion of same accepted application | Desktop | Safe duplicate/concurrent denial; no duplicate participant | `docs/uat-evidence/ADM-05-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| FEE-01 | City Head | Create a fee event | Desktop | Fee event is created in scope | `docs/uat-evidence/FEE-01-CityHead-Desktop-01.png` | NOT_STARTED |
| FEE-02 | City Head | Record payment and view receipt | Desktop | Payment links to student and receipt is available | `docs/uat-evidence/FEE-02-CityHead-Desktop-01.png` | NOT_STARTED |
| FEE-03 | City Head | Fee reporting | 375px, 390px | Scoped financial summaries are readable with no overflow | `docs/uat-evidence/FEE-03-CityHead-375px-01.png` | NOT_STARTED |
| AM-01 | Super Admin | Access Management role-default matrix | Desktop | Capability matrix loads without horizontal overflow | `docs/uat-evidence/AM-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AM-02 | Super Admin | Create named-user override | Desktop | Override, reason, and optional expiry persist | `docs/uat-evidence/AM-02-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AM-03 | Super Admin | Revoke named-user override | Desktop | Effective capability updates after revocation | `docs/uat-evidence/AM-03-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AM-04 | Super Admin | Inspect an expired override | Desktop | Expired override has no effective capability | `docs/uat-evidence/AM-04-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AM-05 | City Head | Provision a new Park Lead | Desktop | City-scoped account and forced reset are created | `docs/uat-evidence/AM-05-CityHead-Desktop-01.png` | NOT_STARTED |
| AM-06 | City Head | Try to modify Super Admin or City Head account | Desktop | UI and server deny the change | `docs/uat-evidence/AM-06-CityHead-Desktop-01.png` | NOT_STARTED |
| AM-07 | Super Admin | Change a user's role or scope then retest session | Desktop | Changed user must reauthenticate | `docs/uat-evidence/AM-07-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| RPT-01 | City Head | Attendance report for a Lahore park | Desktop | Report reflects in-scope attendance | `docs/uat-evidence/RPT-01-CityHead-Desktop-01.png` | NOT_STARTED |
| RPT-02 | City Head | Export scoped report to Excel | Desktop | Export contains only in-scope data | `docs/uat-evidence/RPT-02-CityHead-Desktop-01.png` | NOT_STARTED |
| NTF-01 | Program Admin | Publish announcement to target audience | Desktop | Target users can see in-app announcement | `docs/uat-evidence/NTF-01-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| NTF-02 | Student | Receive targeted in-app notification | 375px, 390px | Notification appears in app | `docs/uat-evidence/NTF-02-Student-375px-01.png` | NOT_STARTED |
| SEC-01 | Super Admin | Forged cross-origin mutation test, with deployer support | Desktop | Request is denied with 403 | `docs/uat-evidence/SEC-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| SEC-02 | Unauthenticated browser | Call a protected API or open protected URL | Desktop | Access is denied with 401 or redirect | `docs/uat-evidence/SEC-02-Unauthenticated-Desktop-01.png` | NOT_STARTED |
| SEC-03 | Park Lead, Murabbi, Guardian, Student | Attempt a known out-of-scope record | Desktop | No foreign data is disclosed | `docs/uat-evidence/SEC-03-ParkLead-Desktop-01.png` | NOT_STARTED |
| SEC-04 | Super Admin | Audit view after sensitive/access/financial action | Desktop | Audit entry exists and sensitive values are redacted | `docs/uat-evidence/SEC-04-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| SEC-05 | Super Admin | Attempt unavailable capability/action | Desktop | Denied by default | `docs/uat-evidence/SEC-05-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| SMOKE-01 | City Head | Admin -> Content Planner | Desktop, 390px | Workspace and seeded plan load without server error | `docs/uat-evidence/SMOKE-01-CityHead-Desktop-01.png` | NOT_STARTED |
| SMOKE-02 | City Head | Admin -> Events | Desktop, 390px | Workspace and seeded event load without server error | `docs/uat-evidence/SMOKE-02-CityHead-Desktop-01.png` | NOT_STARTED |
| SMOKE-03 | City Head | Admin -> Mashwara | Desktop, 390px | Workspace and seeded meeting load without server error | `docs/uat-evidence/SMOKE-03-CityHead-Desktop-01.png` | NOT_STARTED |
| SMOKE-04 | City Head | Admin -> Calling | Desktop, 390px | Workspace, seeded campaign, and templates load without server error | `docs/uat-evidence/SMOKE-04-CityHead-Desktop-01.png` | NOT_STARTED |
| SMOKE-05 | City Head | Admin -> Collaboration Teams | Desktop, 390px | Team list and seeded activity load without server error | `docs/uat-evidence/SMOKE-05-CityHead-Desktop-01.png` | NOT_STARTED |
| SMOKE-06 | City Head | Admin -> Media | Desktop, 390px | Media workspace and seeded brief load without server error | `docs/uat-evidence/SMOKE-06-CityHead-Desktop-01.png` | NOT_STARTED |
| NAV-01 | Super Admin | Sidebar -> Content Planner | Desktop | Link resolves to a loaded page, not Not Found | `docs/uat-evidence/NAV-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| NAV-02 | City Head | Open a Calling campaign detail from the list | Desktop | Detail page loads; no generic error page | `docs/uat-evidence/NAV-02-CityHead-Desktop-01.png` | NOT_STARTED |
| NAV-03 | City Head | Direct Events and Mashwara workspace navigation | Desktop | Both pages load and are usable | `docs/uat-evidence/NAV-03-CityHead-Desktop-01.png` | NOT_STARTED |
| NAV-04 | Each staff role | Navigate between two modules | Desktop | No global City/Park/Batch/Group selector is shown; module filters remain local | `docs/uat-evidence/NAV-04-<RoleSlug>-Desktop-01.png` | NOT_STARTED |
| MOB-01 | Super Admin | Long desktop sidebar at 1024x720 and 1366x768 | 1024x720, 1366x768 | Sidebar has its own scroll region; Users and Sign Out remain reachable | `docs/uat-evidence/MOB-01-SuperAdmin-1024x720-01.png` | NOT_STARTED |
| MOB-02 | Park Admin | Attendance quick-status controls | 375px, 390px | Controls are usable with no overlap or accidental row opening | `docs/uat-evidence/MOB-02-ParkAdmin-375px-01.png` | NOT_STARTED |
| MOB-03 | Park Lead | Students filters and selection | 375px, 390px | Filters collapse/expand; checkbox and avatar targets do not conflict | `docs/uat-evidence/MOB-03-ParkLead-375px-01.png` | NOT_STARTED |

## 4. Daily Triage

At the end of each testing session, the testing lead should:

1. Update each executed row's status in the team copy of this matrix.
2. Add a scenario record to `LAHORE-UAT-002-TESTER-EVIDENCE-REGISTER.md` for every pass, failure, or block.
3. File failures in the defect register with the exact scenario ID, role, viewport, URL, and evidence path.
4. Send the updated matrix and evidence paths to the release owner. Do not report the candidate accepted while any P0 is unresolved or any required scenario lacks evidence.

## 5. Current Acceptance Snapshot

| Measure | Value |
| --- | --- |
| UAT execution evidence | 0 accepted scenario results recorded in this repository at this update |
| Current module fixtures | Available in restricted Preview for the six newly seeded workspaces |
| Candidate availability | Ready at the restricted URL above |
| UAT decision | Pending Shabab team execution and owner review |

