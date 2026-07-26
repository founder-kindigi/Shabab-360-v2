# LAHORE-UAT-001 — Candidate Handover Pack

**Task ID:** LAHORE-UAT-001-CANDIDATE-HANDOVER-PACK
**Release type:** Current-system Lahore UAT (not a new-feature release)
**Base commit:** `343491e` — `test(security): cover active API origin proxy`
**Branch:** `agent/antigravity/LAHORE-UAT-001-candidate-handover`
**Date prepared:** 2026-07-26
**Environment:** Restricted staging/testing only — **never public pilot or production**

---

## 1. Candidate Scope

### 1.1 Included Modules

The following modules are included in this UAT candidate. They reflect **existing implemented functionality** backed by real Lahore Batch 4 data on staging.

| # | Module | Coverage summary |
| --- | --- | --- |
| 1 | **Login and password reset** | Email/password authentication, first-login forced reset, session management, role-aware portal landing. |
| 2 | **Role portals** | Super Admin, Program Head, City Head, Park Lead, Park Admin, Murabbi, Guardian, and Shabab portals with role-specific dashboards and navigation. |
| 3 | **Hierarchy and organisation** | Cities, parks, batches, groups, and the group→batch→park→city invariant. Park creation by City Head. |
| 4 | **Attendance** | Shabab class attendance: event creation, marking, correction, closure, reopening. Offline attendance foundation (Dexie local queue, sync, conflict display). |
| 5 | **Students** | Student roster, profiles, search, scoped listing, bulk import foundation. |
| 6 | **Guardians** | Guardian records, linking to students, phone-based lookup (exact match, masked return), scoped management. |
| 7 | **Admissions** | Admission pipeline: application form, screening, candidate tracking, decisions, allocation. |
| 8 | **Fees and payments** | Fee events, payment recording, waivers, receipts, and financial reporting foundation. |
| 9 | **Reports** | Attendance reports, fee reports, and scoped Excel exports. |
| 10 | **Access Management** | AM-001 through AM-005: controlled capability catalogue, role-default matrix, named-user overrides (grant/revoke/expiry/audit), fail-closed capability enforcement alongside hierarchy scope. Super Admin workspace. |
| 11 | **Notifications** | In-app notification polling, outbox foundation, announcement publishing. |
| 12 | **Existing mobile repairs** | Responsive layout fixes and mobile-targeted UI corrections already merged at the base commit. |
| 13 | **Collaboration teams** | Sports, Skills, Tadreeb, Media, and Muawin teams deployed to staging (membership is portal-managed, not workbook-inferred). |
| 14 | **City Head staff management** | City-scoped provisioning: create, activate, deactivate, reset, and assign roles for Park Leads, Park Admins, and Murabbis within the assigned city. |

### 1.2 Explicitly Excluded

The following are **out of scope** for this UAT candidate. They must not be tested, claimed, or expected.

| Exclusion | Reason |
| --- | --- |
| Media module | Future module — not implemented |
| Calling system expansion | Policy approved but no complete module exists; only POC-level design |
| Events module expansion | Missing as a complete module; only placeholder routes exist |
| Mashwara (weekly meetings) expansion | Approved as future module; requires immutable review/audit behaviour |
| Broad folder/architecture refactors | Structural improvements deferred to post-UAT stabilisation |
| File uploads and private storage | Avatar and document uploads remain disabled; no private object storage approved |
| Public production launch | This candidate is for restricted testing only |
| Content Planner | Missing; currently managed outside the system |
| Murabbi Training module | Missing |
| Procurement and Inventory | Missing |
| Messaging and Community | Deferred until safeguarding rules approved |
| Guardian consent and safeguarding | Missing; policy and access rules must be approved first |
| External notification delivery (email/WhatsApp/SMS) | In-app only; external channels incomplete |
| Multi-role user switching | Pending product-owner decision |

---

## 2. Preconditions

### 2.1 Environment Restrictions

> [!CAUTION]
> This candidate must be deployed and tested **only in a restricted staging/testing environment**. It must **never** be deployed to a public-facing pilot or production URL.

| Requirement | Detail |
| --- | --- |
| **Target environment** | `shabab360-staging` Supabase PostgreSQL project (or equivalent restricted staging instance) |
| **Never target** | Pilot-production Supabase project, any public URL, or any environment containing real operational data not approved for testing |
| **Database** | PostgreSQL via `prisma/postgres/schema.prisma`; all migrations deployed via `npm run db:postgres:deploy` |
| **Build command** | `npm run build:postgres` (PostgreSQL production build) |
| **Deployment platform** | Vercel (restricted preview/staging deployment only) |
| **Domain** | Staging-only domain or Vercel preview URL; no custom production domain |

### 2.2 Data State

The staging database should contain the owner-approved Lahore Batch 4 import:

| Data | Quantity | Source |
| --- | --- | --- |
| Cities | 1 (Lahore) | Import |
| Parks | 6 | Import |
| Batches | 6 | Import |
| Groups | 13 | Import |
| Participants (active) | 257 | Import |
| Participants (dropout) | 20 | Import |
| Historical attendance events | 180 | Import |
| Historical attendance records | 2,967 | Import |
| Staff placeholders | 51 (inactive, `example.invalid` email) | Import |
| Collaboration teams | 5 (Sports, Skills, Tadreeb, Media, Muawin) | Migration |
| Super Admin | 1 | Bootstrap |

> [!IMPORTANT]
> If a staging data reset is needed before UAT, use the owner-approved `npm run db:reset:staging-data` command (staging-locked; refuses pilot-production targets). Then re-import with `npm run import:lahore:staging` and re-bootstrap the Super Admin with `npm run bootstrap:super-admin`.

### 2.3 Credential and Secret Requirements

| Secret | Requirement |
| --- | --- |
| `DATABASE_URL` | Staging PostgreSQL connection string (owner-private; rotated 2026-07-16) |
| `NEXTAUTH_SECRET` | Unique staging value; never reuse a value from Git history |
| `NEXTAUTH_URL` | Staging deployment URL |

> [!WARNING]
> Database passwords were rotated on 2026-07-16. Old connection strings from Git history must not be used. `NEXTAUTH_SECRET` and any historic third-party credentials still require rotation or revocation before UAT begins.

### 2.4 Pre-UAT Verification Gates

Before handing to testers, the deploying engineer must confirm:

- [ ] CI is green: Prisma generation, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build:postgres`
- [ ] PostgreSQL migrations deployed successfully (`npm run db:postgres:deploy`)
- [ ] Staging data import reconciles to expected counts (see §2.2)
- [ ] Super Admin can sign in and reach the dashboard
- [ ] An unauthenticated request to a protected API returns `401`
- [ ] A cross-origin mutation request returns `403`
- [ ] No `.env` file, SQLite database, credential, or production data is in Git
- [ ] Staging URL is not publicly listed or indexed (check `robots.txt` and meta tags)

---

## 3. Test Roles and Accounts

UAT requires active accounts for each of the eight canonical roles. Staff placeholder accounts from the import are **inactive** and use `example.invalid` emails; the Super Admin must provision real test accounts or activate and assign credentials to selected placeholders before testing.

| Role | Scope | Expected portal |
| --- | --- | --- |
| **Super Admin** | Global | System administration, access management, audit |
| **Program Head** | National | Programme governance, all-city oversight |
| **City Head** | Lahore | City operations, park/staff management |
| **Park Lead** | One Lahore park | Park operations, attendance management |
| **Park Admin** | One Lahore park | Daily administration, attendance marking |
| **Murabbi** | One assigned group | Group roster, attendance |
| **Guardian** | Linked children | Child tracking, attendance view |
| **Shabab** | Own record | Own schedule, attendance, profile |

> [!NOTE]
> First-login forced password reset applies to all newly provisioned accounts. Testers should expect to set a new password on first sign-in.

---

## 4. UAT Test Scenarios

### 4.1 Authentication and Session Management

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| AUTH-01 | Sign in with valid credentials for each role | Role-appropriate portal dashboard loads |
| AUTH-02 | Sign in with incorrect password | Clear error; no session created |
| AUTH-03 | First-login forced password reset | Prompted to change password; old password rejected after reset |
| AUTH-04 | Sign out and confirm session invalidation | Protected pages redirect to login; API returns `401` |
| AUTH-05 | Access a protected URL while unauthenticated | Redirect to login page |

### 4.2 Role Portal Boundaries

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| PORTAL-01 | Each role lands on its designated dashboard | Correct portal with role-appropriate navigation and data |
| PORTAL-02 | City Head cannot access Cities management | Navigation absent; direct URL returns denial |
| PORTAL-03 | Park Lead/Admin cannot access other parks | Only assigned-park data visible; API rejects cross-park requests |
| PORTAL-04 | Murabbi sees only assigned group | Group roster limited to assignment; API rejects other groups |
| PORTAL-05 | Guardian sees only linked children | No access to unlinked students or other families |
| PORTAL-06 | Shabab sees only own record | No access to other students' data |

### 4.3 Organisation and Hierarchy

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| ORG-01 | View Lahore city, parks, batches, and groups | Data matches import counts |
| ORG-02 | City Head creates a new park | Park created within Lahore; visible in park list |
| ORG-03 | Group→batch→park→city invariant | Groups correctly link to their batch's park and city |

### 4.4 Attendance

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| ATT-01 | Park Lead creates an attendance event | Event created for park; correct group roster loaded |
| ATT-02 | Park Admin marks attendance | Marks saved; status visible immediately |
| ATT-03 | Park Lead corrects a marked record | Correction saved with audit trail |
| ATT-04 | Park Lead closes an event | Event locked; further marking prevented |
| ATT-05 | View historical attendance (imported data) | 180 events and 2,967 records accessible via reports |
| ATT-06 | Offline attendance (if testable) | Local queue stores marks; sync recovers when online |

### 4.5 Students and Guardians

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| STU-01 | View student roster for a group | Correct students displayed with profiles |
| STU-02 | Search for a student | Name/ID search returns correct results within scope |
| STU-03 | View guardian linked to a student | Guardian details accessible via student record |
| GRD-01 | Guardian phone lookup (exact match) | Returns at most one active match; phone is masked; no CNIC or address exposed |
| GRD-02 | Guardian views linked children | Only linked Shabab visible |

### 4.6 Admissions

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| ADM-01 | Create a new admission application | Form accepts input; application saved in pipeline |
| ADM-02 | View admission pipeline | Applications listed with status |
| ADM-03 | Process an admission decision | Decision recorded; status updated |

### 4.7 Fees and Payments

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| FEE-01 | Create a fee event | Fee created within scope |
| FEE-02 | Record a payment | Payment linked to student; receipt generated |
| FEE-03 | View fee reports | Scoped financial summaries available |

### 4.8 Access Management

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| AM-01 | Super Admin views role-default capability matrix | All capabilities and role defaults displayed |
| AM-02 | Super Admin creates a named-user override | Override saved with reason and optional expiry |
| AM-03 | Super Admin revokes an override | Override revoked; user's effective capabilities updated |
| AM-04 | Expired override has no effect | After expiry, capability reverts to role default |
| AM-05 | City Head provisions a new Park Lead | Account created within city; forced reset active |
| AM-06 | City Head cannot modify Super Admin or City Head accounts | Attempt denied at server and UI level |
| AM-07 | Role/scope change invalidates session | Changed user must re-authenticate |

### 4.9 Reports and Notifications

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| RPT-01 | View attendance report for a park | Report reflects actual attendance data |
| RPT-02 | Export scoped report to Excel | File downloads with correct scoped data |
| NTF-01 | Publish an announcement | Announcement visible to target audience |
| NTF-02 | Notification polling | In-app notifications appear for targeted users |

### 4.10 Security Boundaries

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| SEC-01 | Cross-origin mutation (forged Origin header) | Returns `403` |
| SEC-02 | Unauthenticated API access | Returns `401` |
| SEC-03 | Attempt to access a scope outside assignment | Denied at server; no data leaked |
| SEC-04 | Audit log for sensitive actions | Redacted audit entries exist for role changes, access changes, and financial actions |
| SEC-05 | Unimplemented/unlisted capability | Denied by default (fail-closed) |

---

## 5. Known Limitations and Risks

| # | Item | Impact | Mitigation |
| --- | --- | --- | --- |
| 1 | Staff placeholders are inactive with `example.invalid` emails | Cannot be used as-is for testing | Super Admin must provision real test accounts or activate/reassign selected placeholders |
| 2 | Admissions has a confirmed data-loss defect (per Module Catalogue) | Application data may be lost in certain flows | Document reproduction steps during UAT; do not rely on admissions data integrity |
| 3 | Offline attendance requires manual browser/mobile testing | Automated coverage is limited | Manual test with network disconnect/reconnect cycle |
| 4 | File uploads disabled | No avatar or document uploads | Expected; private storage not approved |
| 5 | External notifications not functional | No email/WhatsApp/SMS delivery | In-app notifications only during UAT |
| 6 | Browser connector instability | In-app browser automation may not activate controls (last observed 2026-07-18) | Use Chrome directly for manual testing |
| 7 | Some permission decisions are pending owner approval | 12 items listed in Role-Based Access Matrix §Pending | Test current enforced behaviour; document gaps found |
| 8 | No production-grade backup/restore | Staging database only | Acceptable for restricted testing; not for real operational data |

---

## 6. Acceptance Criteria

This UAT candidate is accepted for restricted testing when **all** of the following are true:

1. **Pre-UAT gates pass** — All items in §2.4 are checked off by the deploying engineer.
2. **All eight roles can sign in** — Each role reaches its correct portal dashboard.
3. **Scope boundaries hold** — No role can access data outside its assigned scope (city/park/group/linked/own).
4. **Core CRUD operations work** — Attendance, student/guardian viewing, admissions, and fee operations execute without server errors for authorised users.
5. **Access management enforces** — Capability grants, denials, and overrides behave as documented in the Access Management Matrix.
6. **Security boundaries hold** — Cross-origin, unauthenticated, and out-of-scope requests are denied.
7. **Imported data is intact** — Lahore Batch 4 counts match §2.2; historical attendance is queryable.
8. **No credential exposure** — No `.env`, database URI, or secret appears in the deployed build, client bundle, or Git history at the test commit.

---

## 7. UAT Process

1. **Deploy** — Deploying engineer completes §2.4 checklist and deploys to the restricted staging URL.
2. **Provision accounts** — Super Admin creates test accounts for all eight roles (or activates placeholders with real credentials).
3. **Execute scenarios** — Testers work through §4 scenarios, recording pass/fail and screenshots for each.
4. **Report findings** — Findings are recorded in a UAT results document (separate from this handover). Each finding should note the scenario ID, steps to reproduce, actual vs expected result, and severity.
5. **Decide** — Owner reviews results and decides: accept (proceed to next phase), accept-with-conditions (proceed with documented workarounds), or reject (return for fixes).

> [!IMPORTANT]
> This UAT is a **stabilisation pass** over existing functionality with real Lahore data. Its purpose is to surface operational gaps, scope-boundary failures, and data-integrity issues before any new module development or public release. Testers should focus on whether the system correctly serves the eight roles in the Lahore context — not on missing future modules.

---

## 8. Document Control

| Field | Value |
| --- | --- |
| Prepared by | Agent (Antigravity) |
| Reviewed by | Pending owner review |
| Task ID | LAHORE-UAT-001-CANDIDATE-HANDOVER-PACK |
| Complexity | C2 |
| Base commit | `343491e` |
| Branch | `agent/antigravity/LAHORE-UAT-001-candidate-handover` |
