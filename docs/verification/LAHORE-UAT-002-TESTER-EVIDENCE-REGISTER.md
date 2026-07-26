# LAHORE-UAT-002 — Tester Evidence Register

**Task ID:** LAHORE-UAT-002-TESTER-EVIDENCE-REGISTER
**Status:** Blank Tester Template (Not execution evidence)
**Companion Document:** [LAHORE-UAT-001-CANDIDATE-HANDOVER.md](LAHORE-UAT-001-CANDIDATE-HANDOVER.md)

> [!IMPORTANT]
> This document is a **blank template** for the Shabab Lahore testing team. It does not represent completed testing, executed scenarios, provisioned accounts, active URLs, or real personal data. Testers should copy this template to record actual UAT findings during the testing window.

---

## 1. Testing-Day Checklist

Before executing any scenarios, the testing lead or deploying engineer must confirm the following conditions:

- [ ] Testing URL confirmed (restricted staging instance only).
- [ ] Correct candidate head confirmed.
- [ ] Eight active accounts confirmed, one for each canonical role.
- [ ] First-login forced-reset verified where applicable.
- [ ] No production data used.

---

## 2. Canonical Roles

Testing scenarios must be executed using the eight designated canonical roles:

1. Super Admin
2. Program Admin
3. City Head
4. Park Lead
5. Park Admin
6. Murabbi
7. Student
8. Guardian

---

## 3. Allowed Status Values

For each scenario record, select exactly one of the following status values:

- **NOT_STARTED:** Testing has not begun for this scenario.
- **PASSED:** The scenario was executed and actual results matched expected results.
- **FAILED:** The scenario was executed, but actual results did not match expected results. A Defect ID must be provided.
- **BLOCKED:** The scenario cannot be executed because of a dependency failure or P0 defect.
- **NOT_EXECUTED_BROWSER_BLOCKED:** The scenario cannot be executed because the browser connector or testing environment is unavailable.

> [!WARNING]
> Work that is blocked due to the browser environment must **never** be marked as PASSED. It remains NOT_EXECUTED_BROWSER_BLOCKED until successfully tested in a working environment.

---

## 4. Evidence Storage and Screenshot Naming

All screenshots and testing evidence must be stored in the following directory:

`docs/uat-evidence/`

Screenshot filenames must follow this exact convention:

`<Scenario-ID>-<Role>-<Viewport>-<Index>.png`

*Examples:*
- `AUTH-01-CityHead-Desktop-01.png`
- `ADM-04-SuperAdmin-Mobile-01.png`
- `STU-02-ParkLead-Desktop-02.png`

---

## 5. Scenario Record Template

Testers must duplicate this block for each scenario tested, referring to the scenario IDs from LAHORE-UAT-001 (e.g., AUTH-01, PORTAL-02, ADM-04).

### Scenario Record: [Scenario ID]

- **Scenario ID:** [e.g., AUTH-01]
- **Role:** [e.g., City Head]
- **Tester:** [Initials or Name]
- **Date/time PKT:** [YYYY-MM-DD HH:MM PKT]
- **Device/browser/viewport:** [e.g., Chrome 130 / Desktop]
- **Preconditions:** [Any required state before steps]
- **Steps performed:**
  1.
  2.
- **Expected result:** [What should happen]
- **Observed result:** [What actually happened]
- **Status:** [NOT_STARTED | PASSED | FAILED | BLOCKED | NOT_EXECUTED_BROWSER_BLOCKED]
- **Defect ID:** [If FAILED, enter Defect ID, else N/A]
- **Screenshot/evidence path:** [docs/uat-evidence/<Filename>]
- **Notes:** [Optional additional context]

---

## 6. Defect Register

Record any issues found during testing here. Refer to the LAHORE-UAT-001 defect severity definitions (P0/P1/P2).

| Defect ID | Severity | Scenario ID | Role | Route/screen | Reproduction steps | Expected/observed result | Evidence path | Owner | Retest status |
|---|---|---|---|---|---|---|---|---|---|
| DEF-001 | [P0/P1/P2] | [Scenario ID] | [Role] | [/path/to/screen] | [1. Do this 2. Do that] | [Expected] / [Observed] | [docs/uat-evidence/...png] | [Name] | [Pending/Retested] |
| DEF-002 | | | | | | | | | |
| DEF-003 | | | | | | | | | |

---

## Document Control

| Field | Value |
| --- | --- |
| Prepared by | Agent (Antigravity) |
| Task ID | LAHORE-UAT-002-TESTER-EVIDENCE-REGISTER |
