# UAT-005: Staging Execution Evidence Log Template

- **Document Version:** 1.1.0
- **Task ID:** `UAT-005`
- **Status:** `PREPARED` / Pending Codex Review
- **Integration Base:** `2a3fcc7`
- **Scope:** Blank staging execution evidence template for role boundaries, HTTP/API checks, UAT-004 isolation validation, screenshot standards, defect tracking, cleanup audits, and final sign-off.

---

## 1. Document Instructions

This document is a blank template for recording execution evidence during staging UAT cycles.

### 1.1 Safety Constraints
* **No Real Lahore Alteration:** All testing must occur in a temporary `UAT_TEST_` organizational scope.
* **TLD restriction:** All test accounts must use the `.invalid` domain.

### 1.2 Screenshot Naming Standard
All screenshots captured during testing must be saved under `docs/uat-evidence/` using the following format:
* Format: `<Scenario-ID>-<Role>-<Device/Viewport>-<Index>.png`
* Examples:
  * `UAT-003-01-cityhead-desktop-01.png`
  * `UAT-003-05-murabbi-mobile-02.png`

---

## 2. General Session Information

* **Staging Base Commit / SHA:** `[Insert SHA]`
* **Execution Start Time (PKT):** `[YYYY-MM-DD HH:MM:SS]`
* **Execution End Time (PKT):** `[YYYY-MM-DD HH:MM:SS]`
* **Tester Name / Model:** `[Name / Model]`
* **Local Test Environment Details:** `[e.g., SQLite version, Node.js version]`

---

## 3. UAT-004 Staging Isolation Baseline Audit

Prior to executing test scenarios, the tester must verify that the database baseline contains only imported Lahore records and has not been contaminated by previous runs.

| Metric | Target Baseline Count | Observed Count (Pre-UAT) | Matches? (Y/N) |
| --- | --- | --- | --- |
| **Total Cities** | 1 (`city-lhr`) | `[Count]` | `[Y/N]` |
| **Total Parks** | 6 | `[Count]` | `[Y/N]` |
| **Total Batches** | 6 | `[Count]` | `[Y/N]` |
| **Total Groups** | 13 | `[Count]` | `[Y/N]` |
| **Total Participants** | 277 | `[Count]` | `[Y/N]` |
| **Total AttendanceEvents** | 180 | `[Count]` | `[Y/N]` |

---

## 4. Scenario Execution Log (UAT-003 Scenarios)

Copy and fill this block for each scenario listed in `UAT-003`:

### Scenario: [Scenario ID - e.g. UAT-003-01: City Head Dashboard Boundaries]
* **Role Under Test:** `[Role]`
* **Test Account Email:** `[uat_test_<role>@example.invalid]`
* **Viewport Size / Device Simulated:** `[e.g., Desktop 1920x1080 / Mobile 375x667]`
* **Execution Status:** `[PENDING / PASSED / FAILED / BLOCKED]`

#### 4.1 Step-by-Step Execution log
| Step | Action Performed | Expected Response | Observed Response | Status (Pass/Fail) |
| --- | --- | --- | --- | --- |
| 1 | `[Action]` | `[Expected]` | `[Observed]` | `[P/F]` |
| 2 | `[Action]` | `[Expected]` | `[Observed]` | `[P/F]` |
| 3 | `[Action]` | `[Expected]` | `[Observed]` | `[P/F]` |

#### 4.2 HTTP/API Evidence Log
| Endpoint | Method | Payload Sent (JSON or Query Params) | Response Status | Response Body / Error Message |
| --- | --- | --- | --- | --- |
| `[Endpoint]` | `[GET/POST/PATCH/DELETE]` | `[Payload]` | `[e.g., 200 / 403]` | `[Response]` |

#### 4.3 Visual Evidence & Screenshot Checklist
- [ ] Screenshot captured showing role boundary/screen/component state.
  * *File Link:* `[docs/uat-evidence/<Filename>.png]`
- [ ] Screenshot captured showing mobile responsiveness / sidebar state (if applicable).
  * *File Link:* `[docs/uat-evidence/<Filename>.png]`

---

## 5. Staging Teardown & Cleanup Audit

The tester must confirm that all temporary `UAT_TEST_` entities have been safely deleted and that the Lahore baseline counts remain unchanged.

### 5.1 Cleanup Checklist
- [ ] Codex-approved dry-run-first cleanup completed; see UAT-004.

### 5.2 Post-Cleanup Baseline Validation
Confirm that baseline counts returned to exact original values:
* **Total Cities:** `[Count] (Expected: 1)`
* **Total Parks:** `[Count] (Expected: 6)`
* **Total Batches:** `[Count] (Expected: 6)`
* **Total Groups:** `[Count] (Expected: 13)`
* **Total Participants:** `[Count] (Expected: 277)`
* **Total AttendanceEvents:** `[Count] (Expected: 180)`

---

## 6. Defect Logging & Reproduction Log

Use this section to document any bugs or security/boundary leakage issues found during execution.

### Defect: [Defect-ID - e.g. BUG-001: City Head Can Access Foreign Fee Summary]
* **Severity:** `[Blocker (P0) / Major (P1) / Minor (P2)]`
* **Affected Scenarios:** `[e.g., UAT-003-02]`
* **Prisma Model / API Route Affected:** `[e.g., /api/city-head/dashboard]`

#### 6.1 Reproduction Steps
1. Log in with test account `[Email]`.
2. Send direct request: `[e.g., GET /api/city-head/dashboard?cityId=foreign-city-id]`.
3. Observe status code and response payload.

#### 6.2 Observed vs Expected Behavior
* **Observed:** `[Observed response payload showing data leak or crash]`
* **Expected:** `[e.g., Return 403 Forbidden with empty metrics]`

#### 6.3 Technical Artifacts / References
* **Log Reference / Screenshot Link:** `[Link]`
* **Reproduction Code / Request Snippet:**
```bash
# Insert cURL or test client request command
```

---

## 7. Final Owner Sign-Off & Acceptance Block

* **Tester Verification Signature:** `[Name/Initials]`
* **Date Signed:** `[YYYY-MM-DD]`
* **Overall Execution Outcome:** `[ACCEPTED (Clean Staging Pass) / REJECTED (Unresolved P0/P1 defects)]`
* **Codex Owner Authorization Sign-Off:** `[Pending Owner Signature]`

---
*End of Staging Execution Evidence Log Template.*
