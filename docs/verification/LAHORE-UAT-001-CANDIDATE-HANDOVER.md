# LAHORE-UAT-001 — Candidate Handover Pack

**Task ID:** LAHORE-UAT-001-CANDIDATE-HANDOVER-PACK
**Release type:** Current-system Lahore UAT (not a new-feature release)
**Candidate branch:** `codex/lahore-uat-candidate`
**Candidate head:** `c42d0ea` — `fix(admissions): make application conversion atomic`
**Date prepared:** 2026-07-26
**Environment:** Restricted staging/testing only — **never public pilot or production**

---

## 1. Candidate Scope

### 1.1 Included Modules

The following modules are included in this UAT candidate. They reflect **existing implemented functionality** intended for verification against Lahore Batch 4 data after the deployer confirms the restricted staging environment.

| # | Module | Coverage summary |
| --- | --- | --- |
| 1 | **Login and password reset** | Email/password authentication, first-login forced reset, session management, role-aware portal landing. |
| 2 | **Role portals** | Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi, Guardian, and Student portals with role-specific dashboards and navigation. |
| 3 | **Hierarchy and organisation** | Cities, parks, batches, groups, and the group→batch→park→city invariant. Park creation by City Head. |
| 4 | **Attendance** | Student class attendance: event creation, marking, correction, closure, reopening. Offline attendance foundation (Dexie local queue, sync, conflict display). |
| 5 | **Students** | Student roster, profiles, search, scoped listing, bulk import foundation. |
| 6 | **Guardians** | Guardian records, linking to students, phone-based lookup (exact match, masked return), scoped management. |
| 7 | **Admissions** | Admission pipeline: application form, screening, candidate tracking, decisions, allocation, and atomic accepted-application-to-participant conversion (c42d0ea). |
| 8 | **Fees and payments** | Fee events, payment recording, waivers, receipts, and financial reporting foundation. |
| 9 | **Reports** | Attendance reports, fee reports, and scoped Excel exports. |
| 10 | **Access Management** | AM-001 through AM-005: controlled capability catalogue, role-default matrix, named-user overrides (grant/revoke/expiry/audit), fail-closed capability enforcement alongside hierarchy scope. Super Admin workspace. |
| 11 | **Notifications** | In-app notification polling, outbox foundation, announcement publishing. |
| 12 | **Existing mobile repairs** | Responsive layout fixes and mobile-targeted UI corrections already merged at the candidate head. |
| 13 | **Collaboration teams** | Sports, Skills, Tadreeb, Media, and Muawin teams deployed to staging (membership is portal-managed, not workbook-inferred). |
| 14 | **City Head staff management** | City-scoped provisioning: create, activate, deactivate, reset, and assign roles for Park Leads, Park Admins, and Murabbis within the assigned city. |
| 15 | **Content Planner** | Session plans, blocks, and planner sessions with scoped API routes. |
| 16 | **Events (existing screens)** | Event CRUD, planner items, responsibilities, and event teams with scoped API routes. New Events expansion is excluded; existing implemented screens and routes are smoke-tested only. |
| 17 | **Mashwara (existing screens)** | Mashwara meeting CRUD with scoped API routes and detail views. New Mashwara expansion is excluded; existing implemented screens and routes are smoke-tested only. |
| 18 | **Calling (existing screens)** | Campaigns, templates, assignments, and interactions with scoped API routes. New Calling expansion is excluded; existing implemented screens and routes are smoke-tested only. |

### 1.2 Explicitly Excluded

The following are **out of scope** for this UAT candidate. They must not be tested as new functionality, claimed, or expected.

| Exclusion | Reason |
| --- | --- |
| New Calling expansion | Policy approved; expansion work not included in this candidate |
| New Events expansion | Expansion work (capacity, consent, risk, transport) not included in this candidate |
| New Mashwara expansion | Expansion work (immutable review/audit, Karguzari/MoM, action items) not included in this candidate |
| Media module | Future module — not implemented |
| Broad folder/architecture refactors | Structural improvements deferred to post-UAT stabilisation |
| File uploads and private storage | Avatar and document uploads remain disabled; no private object storage approved |
| Public production launch | This candidate is for restricted testing only |
| Murabbi Training module | Not implemented |
| Procurement and Inventory | Not implemented |
| Messaging and Community | Deferred until safeguarding rules approved |
| Guardian consent and safeguarding | Not implemented; policy and access rules must be approved first |
| External notification delivery (email/WhatsApp/SMS) | In-app only; external channels incomplete |
| Multi-role user switching | Pending product-owner decision |

---

## 2. Preconditions

### 2.1 Environment Restrictions

> [!CAUTION]
> This candidate must be tested **only in a restricted staging/testing environment**. It must **never** be deployed to a public-facing pilot or production URL.

| Requirement | Detail |
| --- | --- |
| **Target environment** | Restricted staging PostgreSQL instance (or equivalent restricted testing instance) |
| **Never target** | Pilot-production environment, any public URL, or any environment containing real operational data not approved for testing |
| **Database** | PostgreSQL via `prisma/postgres/schema.prisma` |
| **Deployment platform** | Vercel restricted preview/staging deployment only |
| **Domain** | Staging-only domain or Vercel preview URL; no custom production domain |

### 2.2 Data State

The deploying engineer confirms that the staging database contains the owner-approved Lahore Batch 4 data with the following expected counts:

| Data | Expected count |
| --- | --- |
| Cities | 1 (Lahore) |
| Parks | 6 |
| Batches | 6 |
| Groups | 13 |
| Participants (active) | 257 |
| Participants (dropout) | 20 |
| Historical attendance events | 180 |
| Historical attendance records | 2,967 |
| Staff placeholders | 51 (inactive) |
| Collaboration teams | 5 (Sports, Skills, Tadreeb, Media, Muawin) |
| Super Admin | 1 |

> [!IMPORTANT]
> If a staging data reset is needed before UAT, the owner or deploying engineer manages the reset, re-import, and Super Admin bootstrap using the approved staging-locked tooling. Testers do not execute data management commands.

### 2.3 Environment Configuration

The owner or deploying engineer confirms that all required private environment configuration (database connection, authentication secrets, deployment URL) is set in the approved secret store before testing begins.

> [!WARNING]
> No secret values, connection strings, or credentials are listed in this document. The deploying engineer must confirm that all environment variables are current and that no values from prior Git history are reused.

### 2.4 Pre-UAT Deployer Confirmations

Before handing to testers, the deploying engineer confirms:

- [ ] CI is green: Prisma generation, lint, typecheck, tests, and PostgreSQL production build all pass
- [ ] PostgreSQL migrations are deployed successfully to the staging database
- [ ] Staging data reconciles to the expected Lahore Batch 4 counts (see §2.2)
- [ ] Super Admin can sign in and reach the dashboard
- [ ] An unauthenticated request to a protected API returns `401`
- [ ] A cross-origin mutation request returns `403`
- [ ] No `.env` file, SQLite database, credential, or production data is tracked in Git at the candidate head
- [ ] Staging URL is not publicly listed or indexed

---

## 3. Test Roles and Accounts

UAT requires active accounts for each of the eight canonical roles. Staff placeholder accounts from the import are **inactive** and use invalid email addresses; the Super Admin must provision real test accounts or activate and assign credentials to selected placeholders before testing.

| Role | Scope | Expected portal |
| --- | --- | --- |
| **Super Admin** | Global | System administration, access management, audit |
| **Program Admin** | National | Programme governance, all-city oversight |
| **City Head** | Lahore | City operations, park/staff management |
| **Park Lead** | One Lahore park | Park operations, attendance management |
| **Park Admin** | One Lahore park | Daily administration, attendance marking |
| **Murabbi** | One assigned group | Group roster, attendance |
| **Guardian** | Linked children | Child tracking, attendance view |
| **Student** | Own record | Own schedule, attendance, profile |

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
| PORTAL-06 | Student sees only own record | No access to other students' data |

### 4.3 Organisation and Hierarchy

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| ORG-01 | View Lahore city, parks, batches, and groups | Data matches expected import counts |
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
| GRD-02 | Guardian views linked children | Only linked students visible |

### 4.6 Admissions

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| ADM-01 | Create a new admission application | Form accepts input; application saved in pipeline |
| ADM-02 | View admission pipeline | Applications listed with status |
| ADM-03 | Process an admission decision | Decision recorded; status updated |
| ADM-04 | Convert an accepted application to a participant | Atomic transaction succeeds: participant created, application marked as converted, audit record written |
| ADM-05 | Attempt duplicate/concurrent conversion of the same accepted application | Server denies the second conversion safely; returns "already been converted" error; no duplicate participant created |

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

### 4.11 Existing Module Smoke Tests

These modules have existing implemented screens and routes in the candidate. They are **not** tested for new expansion functionality — only for basic visibility and navigation without server errors.

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| SMOKE-01 | Navigate to Content Planner screens | Pages load without server error; data visible if present |
| SMOKE-02 | Navigate to existing Events screens | Pages load without server error; data visible if present |
| SMOKE-03 | Navigate to existing Mashwara screens | Pages load without server error; data visible if present |
| SMOKE-04 | Navigate to existing Calling screens | Pages load without server error; data visible if present |

---

## 5. Known Limitations and Risks

| # | Item | Impact | Mitigation |
| --- | --- | --- | --- |
| 1 | Staff placeholders are inactive with invalid emails | Cannot be used as-is for testing | Super Admin must provision real test accounts or activate/reassign selected placeholders |
| 2 | Offline attendance requires manual browser/mobile testing | Automated coverage is limited | Manual test with network disconnect/reconnect cycle |
| 3 | File uploads disabled | No avatar or document uploads | Expected; private storage not approved |
| 4 | External notifications not functional | No email/WhatsApp/SMS delivery | In-app notifications only during UAT |
| 5 | Browser connector instability | In-app browser automation may not activate controls | Use Chrome directly for manual testing |
| 6 | Some permission decisions are pending owner approval | 12 items listed in Role-Based Access Matrix §Pending | Test current enforced behaviour; document gaps found |
| 7 | No production-grade backup/restore | Staging database only | Acceptable for restricted testing; not for real operational data |
| 8 | Existing Events, Mashwara, Calling, Content Planner screens are smoke-test only | Expansion features are not tested | Record any errors found but do not file defects against unbuilt expansion features |

---

## 6. Defect Process

### 6.1 Severity Definitions

| Severity | Definition | Response |
| --- | --- | --- |
| **P0 — Blocker** | System is unusable, data loss or corruption occurs, security boundary is bypassed, or a core workflow cannot complete for any role. | Stop testing the affected area. File immediately. Resolution required before UAT can continue. |
| **P1 — Major** | A core workflow produces incorrect results, a scope boundary leaks partial data, or a significant UI/UX issue prevents effective use of an included module. | File within the current test session. Resolution required before UAT acceptance. |
| **P2 — Minor** | Cosmetic issue, non-blocking UI defect, unclear error message, or an edge-case failure that has a viable workaround. | File at end of test session. Resolution may be deferred to a post-UAT fix pass. |

### 6.2 Required Reproduction Fields

Every defect report must include:

| Field | Description |
| --- | --- |
| **Scenario ID** | The UAT scenario ID (e.g., `ADM-04`, `SEC-03`) or `AD-HOC` if found outside a listed scenario |
| **Severity** | P0, P1, or P2 |
| **Role** | The canonical role used when the defect was observed |
| **Viewport** | Desktop or Mobile (with approximate dimensions if relevant) |
| **Steps to reproduce** | Numbered steps starting from the portal dashboard |
| **Expected result** | What should have happened |
| **Actual result** | What actually happened |
| **Screenshot(s)** | At least one screenshot (see §6.3) |
| **Browser and version** | e.g., Chrome 130, Safari 18 |
| **URL at failure** | The page URL when the defect occurred (staging URL only) |

### 6.3 Screenshot Naming and Storage

Screenshots must follow this naming convention:

```
<Scenario-ID>-<Role>-<Viewport>-<Index>.png
```

Examples:
- `ADM-04-CityHead-Desktop-01.png`
- `SEC-03-Murabbi-Mobile-01.png`
- `AD-HOC-Guardian-Desktop-01.png`

All UAT evidence files (screenshots, recordings, exports) are stored under:

```
docs/uat-evidence/
```

### 6.4 Browser-Blocked Scenarios

If a scenario cannot be executed because the browser connector or testing environment is unavailable, it must be recorded as:

```
NOT_EXECUTED_BROWSER_BLOCKED
```

A browser-blocked scenario must **never** be marked as `PASSED`. It remains in `NOT_EXECUTED_BROWSER_BLOCKED` status until it is successfully executed in a working browser environment.

---

## 7. Acceptance Criteria

This UAT candidate is accepted for restricted testing when **all** of the following are true:

1. **Pre-UAT gates pass** — All items in §2.4 are confirmed by the deploying engineer.
2. **All eight roles can sign in** — Each role reaches its correct portal dashboard.
3. **Scope boundaries hold** — No role can access data outside its assigned scope (city/park/group/linked/own).
4. **Core CRUD operations work** — Attendance, student/guardian viewing, admissions (including atomic conversion), and fee operations execute without server errors for authorised users.
5. **Access management enforces** — Capability grants, denials, and overrides behave as documented in the Access Management Matrix.
6. **Security boundaries hold** — Cross-origin, unauthenticated, and out-of-scope requests are denied.
7. **Imported data is intact** — Lahore Batch 4 counts match §2.2; historical attendance is queryable.
8. **No credential exposure** — No secret appears in the deployed build, client bundle, or Git history at the candidate head.
9. **No unresolved P0 defects** — All blocker-severity issues are resolved or have owner-approved workarounds.

---

## 8. UAT Process

1. **Deployer confirms** — Deploying engineer completes §2.4 checklist and confirms the restricted staging URL is ready.
2. **Provision accounts** — Super Admin creates test accounts for all eight roles (or activates placeholders with real credentials).
3. **Execute scenarios** — Testers work through §4 scenarios, recording pass/fail/NOT_EXECUTED_BROWSER_BLOCKED and evidence for each.
4. **Report findings** — Defects are filed following §6. Each finding includes the scenario ID, reproduction steps, evidence, and severity.
5. **Decide** — Owner reviews results and decides: accept (proceed to next phase), accept-with-conditions (proceed with documented workarounds), or reject (return for fixes).

> [!IMPORTANT]
> This UAT is a **stabilisation pass** over existing functionality with real Lahore data. Its purpose is to surface operational gaps, scope-boundary failures, and data-integrity issues before any new module development or public release. Testers should focus on whether the system correctly serves the eight roles in the Lahore context — not on missing future modules.

---

## 9. Document Control

| Field | Value |
| --- | --- |
| Prepared by | Agent (Antigravity) |
| Reviewed by | Pending owner review |
| Task ID | LAHORE-UAT-001-CANDIDATE-HANDOVER-PACK |
| Complexity | C2 |
| Candidate head | `c42d0ea` |
| Candidate branch | `codex/lahore-uat-candidate` |
