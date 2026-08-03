# V1 Shabab UAT Execution Matrix

**Status:** Active - browser evidence pending
**Version:** V1
**Testing URL:** `https://shabab360.vercel.app`
**Evidence root:** `docs/uat-evidence/v1/`

This is the current execution matrix for Shabab team testing. It replaces old Preview-only execution references for V1 testing. A scenario is not accepted until a tester records the observed browser result and stores the required evidence.

## 1. Test Rules

- Use only the canonical roles: Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi, Guardian, and Student.
- Use non-sensitive Lahore test records. Do not put passwords, CNICs, raw calling notes, or full personal data in screenshots or defect reports.
- Use one exact viewport per evidence file: `Desktop`, `1024x720`, `1366x768`, `375px`, or `390px`.
- Name evidence exactly: `<Scenario-ID>-<RoleSlug>-<Viewport>-<Index>.png`.
- Role slugs: `SuperAdmin`, `ProgramAdmin`, `CityHead`, `ParkLead`, `ParkAdmin`, `Murabbi`, `Guardian`, `Student`, and `Unauthenticated`.
- Valid statuses: `NOT_STARTED`, `PASSED`, `FAILED`, `BLOCKED`, `NOT_EXECUTED_BROWSER_BLOCKED`.
- `PASSED` requires a real browser result and at least one evidence file. Deployment, code review, API tests, and screenshots from another role do not count.
- File a P0 immediately for data loss, financial integrity failure, password/PII exposure, or a cross-city/park/group access bypass.

## 2. Readiness Checklist

- [ ] Current testing URL opens and displays the intended release.
- [ ] Eight active tester accounts are available.
- [ ] Each tester has completed any required first-login password reset.
- [ ] Lahore city, six parks, Batch 4, groups, and current attendance reconciliation are visible where the role is authorized.
- [ ] Testers have access to the shared evidence folder and defect register.
- [ ] A tester lead is assigned for daily triage.

## 3. Scenario Matrix

| ID | Module | Tester role | Workflow | Viewport | Expected result | Evidence path | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Authentication | Each canonical role | Sign in with valid account | Desktop | Correct portal loads with role-appropriate navigation | `docs/uat-evidence/v1/AUTH-01-<RoleSlug>-Desktop-01.png` | NOT_STARTED |
| AUTH-02 | Authentication | Super Admin | Sign in with wrong password | Desktop | Clear denial and no session | `docs/uat-evidence/v1/AUTH-02-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AUTH-03 | Authentication | Newly provisioned role | First login and forced reset | Desktop | Reset is required; old password no longer works | `docs/uat-evidence/v1/AUTH-03-<RoleSlug>-Desktop-01.png` | NOT_STARTED |
| AUTH-04 | Authentication | Super Admin | Sign out then revisit protected page | Desktop | Redirect to login; page data is unavailable | `docs/uat-evidence/v1/AUTH-04-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| NAV-01 | Navigation | Super Admin | Open each enabled sidebar module | 1024x720 | Sidebar scrolls; every enabled link opens a page rather than Not Found | `docs/uat-evidence/v1/NAV-01-SuperAdmin-1024x720-01.png` | NOT_STARTED |
| NAV-02 | Navigation | City Head | Move between Attendance, Students, Reports, Teams, Calling, Events, Mashwara, Media, and Content Planner | Desktop | No global hierarchy filter; each module uses its own scoped filter | `docs/uat-evidence/v1/NAV-02-CityHead-Desktop-01.png` | NOT_STARTED |
| ORG-01 | Organization | Super Admin | View Lahore cities, parks, batches, and groups | Desktop | Hierarchy is internally consistent | `docs/uat-evidence/v1/ORG-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| ORG-02 | Organization | City Head | View own-city hierarchy and try Cities screen/direct link | Desktop | Lahore hierarchy is visible; Cities access is unavailable | `docs/uat-evidence/v1/ORG-02-CityHead-Desktop-01.png` | NOT_STARTED |
| STAFF-01 | Staff | City Head | View and manage Lahore Park Leads, Park Admins, and Murabbis | Desktop | Only authorized city staff and allowed roles are available | `docs/uat-evidence/v1/STAFF-01-CityHead-Desktop-01.png` | NOT_STARTED |
| STAFF-02 | Staff | City Head | Confirm Lahore City Head shown in staff/assignment views | Desktop | The currently assigned City Head is shown consistently | `docs/uat-evidence/v1/STAFF-02-CityHead-Desktop-01.png` | NOT_STARTED |
| ATT-01 | Attendance | Park Lead | Create/open a class attendance event for assigned group | Desktop | Roster is correct and respects configured class/off days | `docs/uat-evidence/v1/ATT-01-ParkLead-Desktop-01.png` | NOT_STARTED |
| ATT-02 | Attendance | Park Admin | Mark and save student statuses | 375px | Touch controls work; status persists after refresh | `docs/uat-evidence/v1/ATT-02-ParkAdmin-375px-01.png` | NOT_STARTED |
| ATT-03 | Attendance | Murabbi | View and mark only assigned-group attendance | 390px | No sibling-group roster or action is available | `docs/uat-evidence/v1/ATT-03-Murabbi-390px-01.png` | NOT_STARTED |
| ATT-04 | Attendance | Park Lead | Correct then close an attendance event | Desktop | Correction is saved; closed event prevents further marking | `docs/uat-evidence/v1/ATT-04-ParkLead-Desktop-01.png` | NOT_STARTED |
| ATT-05 | Attendance | City Head | Review imported Lahore historical attendance and summaries | Desktop | Reconciled data and summary totals are queryable in city scope | `docs/uat-evidence/v1/ATT-05-CityHead-Desktop-01.png` | NOT_STARTED |
| ATT-06 | Attendance | Park Admin | Mark offline, reconnect, and verify sync | 390px | Queue persists and syncs without duplicate records | `docs/uat-evidence/v1/ATT-06-ParkAdmin-390px-01.png` | NOT_STARTED |
| STU-01 | Students | Murabbi | View assigned-group roster and a student profile | 375px | Only assigned-group students appear | `docs/uat-evidence/v1/STU-01-Murabbi-375px-01.png` | NOT_STARTED |
| STU-02 | Students | Park Lead | Search a student in assigned park | Desktop | Scoped search returns correct result without foreign records | `docs/uat-evidence/v1/STU-02-ParkLead-Desktop-01.png` | NOT_STARTED |
| STU-03 | Students | Program Admin | Edit non-sensitive and permitted sensitive profile fields | Desktop | Authorized edit persists; unauthorized fields remain protected | `docs/uat-evidence/v1/STU-03-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| GRD-01 | Guardians | Program Admin | Exact guardian phone lookup | Desktop | At most one active match; no CNIC/address disclosure | `docs/uat-evidence/v1/GRD-01-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| GRD-02 | Guardians | Guardian | Open child list and direct child profile link | 390px | Only linked children are available | `docs/uat-evidence/v1/GRD-02-Guardian-390px-01.png` | NOT_STARTED |
| ADM-01 | Admissions | Program Admin | Create application and record decision | Desktop | Pipeline status persists | `docs/uat-evidence/v1/ADM-01-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| ADM-02 | Admissions | Program Admin | Convert accepted application; retry conversion | Desktop | One participant is created; retry is safely denied | `docs/uat-evidence/v1/ADM-02-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| FEE-01 | Fees | City Head | Create fee event and record payment | Desktop | Payment is linked to the right student and receipt is available | `docs/uat-evidence/v1/FEE-01-CityHead-Desktop-01.png` | NOT_STARTED |
| FEE-02 | Fees | City Head | Review fee report | 390px | City-scoped values are readable with no overflow | `docs/uat-evidence/v1/FEE-02-CityHead-390px-01.png` | NOT_STARTED |
| RPT-01 | Reports | City Head | View and export an attendance report | Desktop | Report and export contain in-scope Lahore records only | `docs/uat-evidence/v1/RPT-01-CityHead-Desktop-01.png` | NOT_STARTED |
| NTF-01 | Notifications | Program Admin | Publish a targeted announcement | Desktop | Selected audience receives the notification | `docs/uat-evidence/v1/NTF-01-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| NTF-02 | Notifications | Student | Open targeted notification | 375px | Notification is visible only to intended recipient | `docs/uat-evidence/v1/NTF-02-Student-375px-01.png` | NOT_STARTED |
| AM-01 | Access Management | Super Admin | Review role defaults and named-user override | Desktop | Matrix loads, change has reason/expiry, effective result updates | `docs/uat-evidence/v1/AM-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| AM-02 | Access Management | City Head | Attempt to change Super Admin, City Head, or access policy | Desktop | UI and server deny the action | `docs/uat-evidence/v1/AM-02-CityHead-Desktop-01.png` | NOT_STARTED |
| TEAM-01 | Collaboration Teams | City Head | View Lahore teams and open an activity | Desktop | Teams and activities load in city scope | `docs/uat-evidence/v1/TEAM-01-CityHead-Desktop-01.png` | NOT_STARTED |
| TEAM-02 | Collaboration Teams | Authorized manager | Add/end an active membership | Desktop | Same-city member change persists with correct active state | `docs/uat-evidence/v1/TEAM-02-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| CP-01 | Content Planner | Super Admin | Select Lahore city and list plans | Desktop | Plans load only after explicit city selection | `docs/uat-evidence/v1/CP-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| CP-02 | Content Planner | City Head | View Batch 4 template and State Life override sessions/blocks | Desktop | 68 template and 25 override sessions are usable in scope | `docs/uat-evidence/v1/CP-02-CityHead-Desktop-01.png` | NOT_STARTED |
| CP-03 | Content Planner | City Head | Inspect workbook-derived external-link blocks | Desktop | Blocked URLs are not directly opened or auto-published | `docs/uat-evidence/v1/CP-03-CityHead-Desktop-01.png` | NOT_STARTED |
| EVT-01 | Events | Super Admin | Select Lahore and create a planned event with valid values | Desktop | Event saves and list/detail reload correctly | `docs/uat-evidence/v1/EVT-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| EVT-02 | Events | Authorized manager | Create temporary event team and add a same-city member | Desktop | Team/member exists; no raw ID is required in normal workflow | `docs/uat-evidence/v1/EVT-02-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| EVT-03 | Events | Authorized manager | Assign responsibility and add planner item | Desktop | Assignment and planner item save with clear errors on invalid input | `docs/uat-evidence/v1/EVT-03-CityHead-Desktop-01.png` | NOT_STARTED |
| EVT-04 | Events | Authorized manager | Cancel a planned event then attempt edit | Desktop | Cancellation persists; prohibited lifecycle update is denied | `docs/uat-evidence/v1/EVT-04-CityHead-Desktop-01.png` | NOT_STARTED |
| MASH-01 | Mashwara | Super Admin | Open workspace, select Lahore, refresh browser | Desktop | Workspace remains usable after refresh; city selection gates list | `docs/uat-evidence/v1/MASH-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| MASH-02 | Mashwara | City Head | Schedule meeting and add decision/action item | Desktop | Meeting and same-city action save; assignee receives notification | `docs/uat-evidence/v1/MASH-02-CityHead-Desktop-01.png` | NOT_STARTED |
| MASH-03 | Mashwara | Authorized manager | Grant then revoke same-city share | Desktop | Share state changes once; duplicate/revoked state is clearly handled | `docs/uat-evidence/v1/MASH-03-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| CALL-01 | Calling | Super Admin | Select Lahore and view campaigns/templates | Desktop | No data loads before city selection; chosen city loads scoped data | `docs/uat-evidence/v1/CALL-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| CALL-02 | Calling | City Head | Open campaign leads | Desktop | Leads load with tracking/status; PII is masked unless server authorizes caller view | `docs/uat-evidence/v1/CALL-02-CityHead-Desktop-01.png` | NOT_STARTED |
| CALL-03 | Calling | Calling manager | Assign/reassign an unassigned lead to listed same-city caller | Desktop | Assignment persists; assignee can interact; historical assignment is retained | `docs/uat-evidence/v1/CALL-03-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| CALL-04 | Calling | Assigned caller | Open assigned lead and log interaction | 390px | Authorized PII and Log Call action are available only for the assignment | `docs/uat-evidence/v1/CALL-04-Murabbi-390px-01.png` | NOT_STARTED |
| MEDIA-01 | Media | Super Admin | Select Lahore and list/open Media briefs | Desktop | Workspace loads; only authorized city briefs are available | `docs/uat-evidence/v1/MEDIA-01-SuperAdmin-Desktop-01.png` | NOT_STARTED |
| MEDIA-02 | Media | Media manager | Create, assign, progress, and cancel a brief | Desktop | Lifecycle transitions obey capability and show conflict/denial safely | `docs/uat-evidence/v1/MEDIA-02-ProgramAdmin-Desktop-01.png` | NOT_STARTED |
| MEDIA-03 | Media | City Head | Attempt a foreign-city brief or unapproved external URL | Desktop | Access/write is denied; no unsafe external URL is saved | `docs/uat-evidence/v1/MEDIA-03-CityHead-Desktop-01.png` | NOT_STARTED |
| MOB-01 | Mobile | Park Admin | Attendance controls and scrolling | 375px | All controls are tappable; no overlap or accidental row opening | `docs/uat-evidence/v1/MOB-01-ParkAdmin-375px-01.png` | NOT_STARTED |
| MOB-02 | Mobile | Student | Own profile, schedule, and notification flow | 390px | Layout is readable and has no horizontal overflow | `docs/uat-evidence/v1/MOB-02-Student-390px-01.png` | NOT_STARTED |
| SEC-01 | Security | Unauthenticated | Open protected route/API through browser | Desktop | Redirect or 401; no protected data is displayed | `docs/uat-evidence/v1/SEC-01-Unauthenticated-Desktop-01.png` | NOT_STARTED |
| SEC-02 | Security | Park Lead | Attempt known sibling-park record from UI/direct URL | Desktop | Denial; no foreign data disclosure | `docs/uat-evidence/v1/SEC-02-ParkLead-Desktop-01.png` | NOT_STARTED |
| SEC-03 | Security | Murabbi | Attempt known sibling-group record from UI/direct URL | Desktop | Denial; no foreign data disclosure | `docs/uat-evidence/v1/SEC-03-Murabbi-Desktop-01.png` | NOT_STARTED |
| SEC-04 | Security | Super Admin | Review audit after access, financial, or sensitive change | Desktop | Audit entry exists; sensitive values are redacted | `docs/uat-evidence/v1/SEC-04-SuperAdmin-Desktop-01.png` | NOT_STARTED |

## 4. Defect Register

| Defect ID | Severity | Scenario | Role | Route/screen | Reproduction summary | Evidence | Owner | Retest status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V1-DEF-001 | P0/P1/P2 |  |  |  |  | `docs/uat-evidence/v1/...` |  | Pending |

## 5. Daily Triage And Acceptance

1. Update every executed matrix row with its actual status.
2. Record the tester, date/time PKT, device/browser, steps, observed result, and evidence path in the tester evidence register.
3. Link every `FAILED` row to one defect register entry.
4. Retest every fixed defect using the original role and viewport.
5. V1 acceptance requires no open P0 defects, no unreviewed P1 defects, and evidence for every required scenario.

## 6. Known Boundaries

- Content Planner external workbook URLs remain intentionally blocked until V2 configurable allowlisting and safe redirects are delivered.
- Calling historical workbook import and previous-batch imports are V2 work; test only the data currently present and authorized in V1.
- Collaboration chat and document-link workspace are V2 work; V1 covers team/activity and membership workflows only.
