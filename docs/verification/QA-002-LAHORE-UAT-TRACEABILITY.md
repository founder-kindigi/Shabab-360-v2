# QA-002 — Lahore UAT Traceability Matrix

**Task ID:** QA-002-LAHORE-UAT-TRACEABILITY
**Scope:** Lahore Batch 4 Restricted UAT
**Status:** NOT_EXECUTED (Pending evidence generation)

> [!IMPORTANT]
> This document is the master traceability execution matrix. It reconciles LAHORE-UAT-001 (Handover) and LAHORE-UAT-002 (Evidence Register). Do not mark any item as `PASSED` or `FAILED` without providing actual browser/screenshot evidence following the naming convention.

---

## 1. Out of Scope (Deferred/Future Modules)
The following features are explicitly **deferred or excluded** from this UAT execution and must not be tested:
- **Expansions:** New Calling, New Events, New Mashwara expansions
- **New Modules:** Media, Murabbi Training, Procurement and Inventory, Messaging and Community
- **Data/Platform:** File uploads, Private object storage, Public production launch
- **Features:** Guardian consent, External notification delivery (email/WhatsApp/SMS), Multi-role user switching

---

## 2. Acceptance Gates

Before declaring UAT complete, the following gates must be passed:
1. **Evidence Reconciled:** Every scenario in the execution matrix has a status other than `NOT_EXECUTED` or `BLOCKED` and is linked to physical screenshot evidence.
2. **Role Coverage:** All eight canonical roles (Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi, Guardian, Student) have been used to generate evidence.
3. **No Unresolved Blockers:** No `P0` defects remain unresolved.
4. **Data Safety:** No real operational data (passwords, real people, secrets, production DBs) was exposed during the execution.

---

## 3. UAT Execution Matrix

*Status options: `NOT_EXECUTED`, `BLOCKED`, `PASSED`, `FAILED`*

| Scenario ID | Module / Capability | Canonical Role | Route / Workflow | Required Viewport | Expected Result | Evidence Path & Name | Status | Dependencies / Notes |
|---|---|---|---|---|---|---|---|---|
| **AUTH-01** | Authentication | All Roles (x8) | `/login` → `/dashboard` | Both | Role-appropriate dashboard loads upon valid login. | `docs/uat-evidence/AUTH-01-<Role>-<Viewport>-01.png` | NOT_EXECUTED | Pre-provisioned test accounts required |
| **AUTH-02** | Authentication | Any | `/login` | Both | Rejects incorrect password, no session created. | `docs/uat-evidence/AUTH-02-Any-<Viewport>-01.png` | NOT_EXECUTED | |
| **AUTH-03** | Authentication (Forced Reset) | Any (New Account) | `/login` → `/reset` | Both | Prompts to change password on first login; old password rejected. | `docs/uat-evidence/AUTH-03-Any-<Viewport>-01.png` | NOT_EXECUTED | Requires newly provisioned account |
| **AUTH-04** | Session Management | Any | `/logout` → `/dashboard` | Both | Logout invalidates session; protected pages redirect to `/login`. | `docs/uat-evidence/AUTH-04-Any-<Viewport>-01.png` | NOT_EXECUTED | |
| **AUTH-05** | Access Boundaries | Unauthenticated | `/dashboard` | Both | Redirects to login page. | `docs/uat-evidence/AUTH-05-None-<Viewport>-01.png` | NOT_EXECUTED | |
| **PORTAL-01** | Role Portals | All Roles (x8) | `/dashboard` | Both | Correct portal layout, data, and navigation for the specific role. | `docs/uat-evidence/PORTAL-01-<Role>-<Viewport>-01.png` | NOT_EXECUTED | |
| **PORTAL-02** | Access Boundaries | City Head | `/admin/cities` | Both | Cannot access global Cities management; URL returns denial/403. | `docs/uat-evidence/PORTAL-02-CityHead-<Viewport>-01.png` | NOT_EXECUTED | |
| **PORTAL-03** | Access Boundaries | Park Lead | `/park/:id` | Both | Can only view assigned park; cross-park requests rejected. | `docs/uat-evidence/PORTAL-03-ParkLead-<Viewport>-01.png` | NOT_EXECUTED | |
| **PORTAL-04** | Access Boundaries | Murabbi | `/group/:id` | Mobile (375px/390px) | Views assigned group only; cross-group access rejected. | `docs/uat-evidence/PORTAL-04-Murabbi-<Viewport>-01.png` | NOT_EXECUTED | Mobile stabilization focus |
| **PORTAL-05** | Access Boundaries | Guardian | `/guardian/students`| Mobile (375px/390px) | Views linked children only; unlinked access rejected. | `docs/uat-evidence/PORTAL-05-Guardian-<Viewport>-01.png` | NOT_EXECUTED | Mobile stabilization focus |
| **PORTAL-06** | Access Boundaries | Student | `/student/profile` | Mobile (375px/390px) | Views own record only; cross-student access rejected. | `docs/uat-evidence/PORTAL-06-Student-<Viewport>-01.png` | NOT_EXECUTED | Mobile stabilization focus |
| **ORG-01** | Organisation | Program Admin | `/cities/lahore` | Desktop | Lahore city, 6 parks, 6 batches, 13 groups visible. | `docs/uat-evidence/ORG-01-ProgramAdmin-Desktop-01.png` | NOT_EXECUTED | Validates imported staging data |
| **ORG-02** | Organisation | City Head | `/parks/new` | Desktop | Park successfully created within Lahore. | `docs/uat-evidence/ORG-02-CityHead-Desktop-01.png` | NOT_EXECUTED | |
| **ORG-03** | Hierarchy | City Head | `/groups` | Desktop | Groups strictly link to Batch → Park → City. | `docs/uat-evidence/ORG-03-CityHead-Desktop-01.png` | NOT_EXECUTED | |
| **ATT-01** | Attendance | Park Lead | `/attendance/new` | Both | Event created; correct assigned group roster loaded. | `docs/uat-evidence/ATT-01-ParkLead-<Viewport>-01.png` | NOT_EXECUTED | |
| **ATT-02** | Attendance | Park Admin | `/attendance/mark` | Both | Marks saved and status updated immediately. | `docs/uat-evidence/ATT-02-ParkAdmin-<Viewport>-01.png` | NOT_EXECUTED | |
| **ATT-03** | Attendance | Park Lead | `/attendance/edit` | Both | Corrects a marked record; audit trail visible. | `docs/uat-evidence/ATT-03-ParkLead-<Viewport>-01.png` | NOT_EXECUTED | |
| **ATT-04** | Attendance | Park Lead | `/attendance/close` | Both | Event locked; no further marks allowed. | `docs/uat-evidence/ATT-04-ParkLead-<Viewport>-01.png` | NOT_EXECUTED | |
| **ATT-05** | Attendance | Program Admin | `/reports/attendance`| Desktop | ~180 events and ~2967 records queryable. | `docs/uat-evidence/ATT-05-ProgramAdmin-Desktop-01.png` | NOT_EXECUTED | Validates historical data |
| **ATT-06** | Attendance | Park Admin | `/attendance` (Offline) | Mobile (375px/390px) | Local Dexie queue stores marks; syncs on reconnect. | `docs/uat-evidence/ATT-06-ParkAdmin-Mobile-01.png` | BLOCKED | Requires manual network toggle |
| **STU-01** | Students | Murabbi | `/group/roster` | Both | Correct students displayed with profiles. | `docs/uat-evidence/STU-01-Murabbi-<Viewport>-01.png` | NOT_EXECUTED | |
| **STU-02** | Students | City Head | `/students/search` | Desktop | Name/ID search returns correct results within scope. | `docs/uat-evidence/STU-02-CityHead-Desktop-01.png` | NOT_EXECUTED | |
| **STU-03** | Students | Park Lead | `/student/:id` | Both | Guardian details accessible via student record. | `docs/uat-evidence/STU-03-ParkLead-<Viewport>-01.png` | NOT_EXECUTED | |
| **GRD-01** | Guardians | Park Admin | `/guardian/lookup` | Both | Phone lookup (exact match) returns masked data; no CNIC. | `docs/uat-evidence/GRD-01-ParkAdmin-<Viewport>-01.png` | NOT_EXECUTED | |
| **GRD-02** | Guardians | Guardian | `/dashboard` | Mobile (375px/390px) | Views linked children only. | `docs/uat-evidence/GRD-02-Guardian-<Viewport>-01.png` | NOT_EXECUTED | |
| **ADM-01** | Admissions | Guardian | `/apply` | Both | Application submitted and saved in pipeline. | `docs/uat-evidence/ADM-01-Guardian-<Viewport>-01.png` | NOT_EXECUTED | |
| **ADM-02** | Admissions | Park Admin | `/admissions` | Desktop | Applications listed with correct status. | `docs/uat-evidence/ADM-02-ParkAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **ADM-03** | Admissions | Park Lead | `/admissions/decide` | Desktop | Decision recorded and status updated. | `docs/uat-evidence/ADM-03-ParkLead-Desktop-01.png` | NOT_EXECUTED | |
| **ADM-04** | Admissions | Park Lead | `/admissions/convert` | Desktop | Atomic conversion creates participant, marks app converted. | `docs/uat-evidence/ADM-04-ParkLead-Desktop-01.png` | NOT_EXECUTED | Must verify c42d0ea behavior |
| **ADM-05** | Admissions | Park Lead | `/admissions/convert` | Desktop | Duplicate conversion denied ("already converted"). | `docs/uat-evidence/ADM-05-ParkLead-Desktop-01.png` | NOT_EXECUTED | |
| **FEE-01** | Fees | Park Admin | `/fees/new` | Desktop | Fee created within assigned scope. | `docs/uat-evidence/FEE-01-ParkAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **FEE-02** | Fees | Park Admin | `/fees/payment` | Desktop | Payment linked to student; receipt generated. | `docs/uat-evidence/FEE-02-ParkAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **FEE-03** | Fees | City Head | `/reports/fees` | Desktop | Scoped financial summaries available. | `docs/uat-evidence/FEE-03-CityHead-Desktop-01.png` | NOT_EXECUTED | |
| **AM-01** | Access Mgmt | Super Admin | `/admin/access` | Desktop | Capabilities and role defaults displayed. | `docs/uat-evidence/AM-01-SuperAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **AM-02** | Access Mgmt | Super Admin | `/admin/access` | Desktop | Named-user override saved with optional expiry. | `docs/uat-evidence/AM-02-SuperAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **AM-03** | Access Mgmt | Super Admin | `/admin/access` | Desktop | Override revoked; capabilities updated. | `docs/uat-evidence/AM-03-SuperAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **AM-04** | Access Mgmt | Super Admin | (Wait / Expiry) | Desktop | Expired override yields to role default. | `docs/uat-evidence/AM-04-SuperAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **AM-05** | Access Mgmt | City Head | `/staff/new` | Desktop | Park Lead created in city; forced reset active. | `docs/uat-evidence/AM-05-CityHead-Desktop-01.png` | NOT_EXECUTED | |
| **AM-06** | Access Mgmt | City Head | `/staff/:id` | Desktop | Cannot modify Super Admin or City Head accounts. | `docs/uat-evidence/AM-06-CityHead-Desktop-01.png` | NOT_EXECUTED | |
| **AM-07** | Access Mgmt | Super Admin | `/admin/access` | Desktop | Role/scope change invalidates target user's session. | `docs/uat-evidence/AM-07-SuperAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **SEC-01** | Security | Any | API Route | Any | Cross-origin mutation yields 403. | `docs/uat-evidence/SEC-01-Any-Any-01.png` | NOT_EXECUTED | |
| **SEC-02** | Security | Unauthenticated | API Route | Any | Unauthenticated API access yields 401. | `docs/uat-evidence/SEC-02-None-Any-01.png` | NOT_EXECUTED | |
| **SEC-03** | Security | Murabbi | API Route | Any | Out-of-scope access denied at server; no leak. | `docs/uat-evidence/SEC-03-Murabbi-Any-01.png` | NOT_EXECUTED | |
| **SEC-04** | Security | Super Admin | `/admin/audit` | Desktop | Audit log displays redacted entries for sensitive actions. | `docs/uat-evidence/SEC-04-SuperAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **SEC-05** | Security | Any | API Route | Any | Unimplemented capability denied by default (fail-closed). | `docs/uat-evidence/SEC-05-Any-Any-01.png` | NOT_EXECUTED | |
| **SMOKE-01** | Smoke Test | Program Admin | `/planner` | Desktop | Existing Content Planner screens load without error. | `docs/uat-evidence/SMOKE-01-ProgramAdmin-Desktop-01.png` | NOT_EXECUTED | |
| **SMOKE-02** | Smoke Test | Park Lead | `/events` | Desktop | Existing Events screens load without error. | `docs/uat-evidence/SMOKE-02-ParkLead-Desktop-01.png` | NOT_EXECUTED | |
| **SMOKE-03** | Smoke Test | Park Lead | `/mashwara` | Desktop | Existing Mashwara screens load without error. | `docs/uat-evidence/SMOKE-03-ParkLead-Desktop-01.png` | NOT_EXECUTED | |
| **SMOKE-04** | Smoke Test | Park Admin | `/calling` | Desktop | Existing Calling screens load without error. | `docs/uat-evidence/SMOKE-04-ParkAdmin-Desktop-01.png` | NOT_EXECUTED | |

---

## 4. Defect Record Template

If a scenario fails, copy this template and log the defect. Use severity P0, P1, or P2.

```markdown
### Defect Record: [Defect ID]

- **Defect ID:** [e.g., DEF-001]
- **Severity:** [P0 / P1 / P2]
- **Scenario ID:** [e.g., ADM-04]
- **Role:** [e.g., Park Lead]
- **Route/Screen:** [/path/to/screen]
- **Reproduction Steps:**
  1. 
  2. 
- **Expected Result:** [What should happen]
- **Observed Result:** [What actually happened]
- **Evidence Path:** [docs/uat-evidence/<Filename>.png]
- **Status:** [Pending / Retested]
```

---

## Document Control

| Field | Value |
| --- | --- |
| Prepared by | Agent (Antigravity) |
| Task ID | QA-002-LAHORE-UAT-TRACEABILITY |
