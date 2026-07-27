# LAHORE-UAT-004: Artifact Consistency Audit

## Conclusion
**CHANGES REQUIRED FIRST** — The UAT document set contains non-canonical role names and unverified present-tense claims of live staging environment availability. It is **not safe to distribute** to the testing team until these issues are remediated.

---

## Findings

### 1. Canonical Role Names
**Rule:** Must use only canonical roles (Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi, Student, Guardian).

* **`docs/product-discovery/UAT-ROLE-001-ROLE-BROWSER-CHECKLIST.md`** (Lines 13, 67)
  * **Finding:** Introduces "External Support Caller" as one of the 8 canonical roles (replacing Program Admin).
  * **Severity:** P0 (Invalidates role-based coverage and introduces unverified role)
* **`docs/product-discovery/UAT-002-lahore-current-system-role-workflow-uat-plan.md`** (Lines 11, 70)
  * **Finding:** Uses "Shabab" as a role name instead of "Student".
  * **Severity:** P1 (Non-canonical role name)

### 2. Execution-Status Honesty & Unsupported Claims
**Rule:** No claims of deployment or database availability without current evidence. Current availability of staging is unverified, so historical execution must be treated as a stale/current-applicability risk.

* **`docs/verification/LAHORE-UAT-001-CANDIDATE-HANDOVER.md`** (Line 16)
  * **Finding:** Contains a present-tense claim that modules are currently "backed by real Lahore Batch 4 data on staging." This is an unverified current-state claim since staging availability is currently unverified.
  * **Severity:** P1 (Unverified current-state claim of live deployment)
* **`docs/product-discovery/UAT-005-EXECUTION-EVIDENCE-LOG.md`** (Lines 24-25, 47-73)
  * **Finding:** Provides exact timestamps for an execution window and claims a "read-only Prisma query was executed against the staging PostgreSQL database", outputting DB counts. Because the current staging environment availability is unverified, this historical claim poses a stale/current-applicability risk for the upcoming test cycle.
  * **Severity:** P1 (Stale execution evidence / Applicability risk)
* **`docs/product-discovery/UAT-005-EXECUTION-EVIDENCE-LOG.md`** (Lines 80-87)
  * **Finding:** Logs a count of 44 inactive placeholders and flags a contradiction with UAT-001 (which claims 51). Presenting this "unresolved variance" to testers is confusing and invalidates baseline trust.
  * **Severity:** P1 (Contradictory and confusing claim)

### 3. Screenshot Rules
**Rule:** Must use format `<Scenario-ID>-<Role>-<Viewport>-<Index>.png`.

* **`docs/product-discovery/UAT-004-TEST-DATA-ISOLATION-RUNBOOK.md`** (Line 146)
  * **Finding:** Provides the example filename `UAT-002-02-sidebar-375px.png`. This violates the mandatory format (missing Role, missing Index).
  * **Severity:** P1 (Incorrect tester instruction)

### 4. Secret Values / Destructive Commands
* **Finding:** No finding. Documents appear clear of credentials and personal data.
