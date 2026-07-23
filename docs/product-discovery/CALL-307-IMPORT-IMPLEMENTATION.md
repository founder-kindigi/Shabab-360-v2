# CALL-307: Calling Import Implementation & Contract Reconciliation

- **Document Version:** 1.0.2
- **Task ID:** `CALL-307` / `PKG-03`
- **Status:** Complete / Prepared for Handoff
- **Base Commit:** `99f9460` on `codex/production-hardening`
- **Author:** Antigravity Agent
- **Scope:** Documenting document reconciliation across CALL-304, CALL-305, and CALL-306, Data & Privacy Impact Statement, PKG-03 read-only parser architecture, and implementation handoff specification for the follow-up Calling schema package.

---

## 1. Document Reconciliation & Conflict Resolution

During PKG-03 preparation, `CALL-304`, `CALL-305`, and `CALL-306` were reconciled to align all business rules, model mappings, and privacy boundaries.

### 1.1 Reconciled Item 1: Candidate Entity Model (`AdmissionApplication` vs `Participant`)
- **CALL-305 Reference:** Mentioned matching phone against `Participant.phone` or `Guardian.phone`.
- **CALL-304 & CALL-306 Baseline:** Calling Phase 2 operates on pre-admission prospect leads (`AdmissionApplication`). `Participant` records exist only after admission application approval and cohort enrollment.
- **Resolution:** Calling import candidate matching targets `AdmissionApplication` (`applicantName`, `guardianPhone`) and existing `AdmissionInterview` records. Matching does not rely on or require active `Participant` records.

### 1.2 Reconciled Item 2: Explicit Operator Scope vs Sheet Name Inference
- **CALL-305 Note:** Mentioned worksheet names as diagnostic hints.
- **Strict Constraint:** Importers must **never** infer or automatically assign city, park, batch, or campaign scope based on Excel worksheet names, tab titles, or row dates.
- **Resolution:** Both organizational (`--cityId`) and campaign (`--campaignId`) contexts are mandatory explicit operator inputs. Unresolved park names (e.g. cross-city or invalid parks) are masked and fingerprinted in the reconciliation report as `UNRESOLVED_PARK` without modifying scope.

### 1.3 Reconciled Item 3: AdmissionInterview Linkage & Non-Creation Rule
- **CALL-304 & CALL-306 Rule:** `CallInteraction.interviewId` is a nullable reference to `AdmissionInterview`.
- **Strict Constraint:** Read-only import matching looks up existing `AdmissionInterview` records by applicant name or guardian phone.
- **Resolution:** If no existing interview record is found for a candidate, the parser logs `unresolvedInterviewLink` with reason `"No matching AdmissionInterview record found for this applicant"`. The parser **never** creates `AdmissionInterview` records or infers appointment dates.

### 1.4 Reconciled Item 4: Mandatory HMAC Secret Environment Passing
- **CALL-305 Requirement:** Keyed `HMAC-SHA-256` fingerprinting for PII masking.
- **Resolution:** The secret key is strictly required via `IMPORT_HMAC_SECRET` or `options.hmacSecret`. It must **never** be passed as a command-line argument (preventing exposure in shell history and process lists), printed in logs, or written to files. Unkeyed fallback is prohibited.

---

## 2. Data & Privacy Impact Statement

| Dimension | Policy & Safeguard |
| --- | --- |
| **Data Classification** | Candidate names, phone numbers, guardian CNICs, and notes are classified as Sensitive Personal Data. |
| **Zero Database Writes** | PKG-03 is 100% read-only. Importer execution issues only read queries (`SELECT`) to match existing records. Zero database write, insert, update, or delete commands are executed. |
| **PII Masking & Privacy** | Raw names, phones, emails, notes, and unresolved park names are **never** logged, printed to stdout/stderr, or stored in output reports. Names are masked as `Al* K**n`, phones as `+92300*****67`, and unresolved parks as `Un***** Pa** Na**`. |
| **Keyed Fingerprinting** | PII references in reports use mandatory `HMAC-SHA-256` fingerprints via `IMPORT_HMAC_SECRET`. Execution fails closed if secret is missing or empty. |
| **Synthetic Fixtures Only** | All tests and committed repository assets use synthetic test data. No real workbook files, Lahore applicant records, or actual phone numbers are committed. |

---

## 3. PKG-03 Read-Only Importer Architecture

The read-only import foundation is located in `src/lib/calling-import/`:

```
src/lib/calling-import/
├── types.ts              # TypeScript interfaces, options, report types
├── phone.ts              # Pakistan phone normalization (923XXXXXXXXX)
├── pii.ts                # PII masking (maskName, maskPhone) & mandatory HMAC fingerprinting
├── parser.ts             # ExcelJS workbook reader with flexible column mapping
├── normalizer.ts         # Row validation, operator scope check, park mapping
├── duplicates.ts         # Duplicate cluster detection (MERGE_HISTORIC_TIMELINE)
├── interview-matcher.ts  # Read-only AdmissionInterview lookup (Prisma & Mock)
├── importer.ts           # Top-level orchestrator & JSON report generator
└── index.ts              # Re-export module entrypoint
```

### 3.1 Pakistan Phone Normalization (`phone.ts`)
- Standardizes inputs (`+92-300-1234567`, `0300 1234567`, `00923001234567`) to canonical 12-digit format `923XXXXXXXXX`.
- Rejects non-Pakistani or malformed phone numbers (`/^923\d{9}$/`).

### 3.2 Duplicate Clustering (`duplicates.ts`)
- Clusters duplicate entries using primary normalized phone key.
- Generates masked duplicate cluster reports with `MERGE_HISTORIC_TIMELINE` resolution tags.

### 3.3 Dry-Run CLI Tool (`scripts/dry-run-calling-import.ts`)

**Cross-Platform CLI Usage:**

- **Synthetic Dry-Run (forces MockLookup, no DB connection):**
  - *PowerShell (Windows):*
    ```powershell
    $env:IMPORT_HMAC_SECRET="<secret>"; npx tsx scripts/dry-run-calling-import.ts --cityId <city-id> --campaignId <campaign-id> --synthetic --dry-run
    ```
  - *POSIX / Bash (Linux/macOS):*
    ```bash
    IMPORT_HMAC_SECRET="<secret>" npx tsx scripts/dry-run-calling-import.ts --cityId <city-id> --campaignId <campaign-id> --synthetic --dry-run
    ```

- **Operational Dry-Run (requires valid workbook file):**
  - *PowerShell (Windows):*
    ```powershell
    $env:IMPORT_HMAC_SECRET="<secret>"; npx tsx scripts/dry-run-calling-import.ts --cityId <city-id> --campaignId <campaign-id> --file <path-to-file.xlsx> --dry-run
    ```
  - *POSIX / Bash (Linux/macOS):*
    ```bash
    IMPORT_HMAC_SECRET="<secret>" npx tsx scripts/dry-run-calling-import.ts --cityId <city-id> --campaignId <campaign-id> --file <path-to-file.xlsx> --dry-run
    ```

- **Safety Controls:**
  - Mandatory `--cityId` and `--campaignId` options (fails closed if missing).
  - Mandatory `IMPORT_HMAC_SECRET` environment variable (fails closed if missing).
  - Operational runs require valid `--file <path>`.
  - Synthetic runs (`--synthetic`) force mock lookup and never initialize Prisma or connect to `DATABASE_URL`.
  - Replaces CLI error details with safe generic failure logs upon error.

---

## 4. Implementation Handoff for Later Calling Schema Package

This package establishes the verified, read-only import parser. The follow-up Calling schema package will consume this foundation:

1. **Schema Additions:** Implement `CallingCampaign`, `CallingPOC`, `ExternalSupportCaller`, `CallingTemplate`, `CallInteraction`, and `CallingAssignment` models as specified in `CALL-306`.
2. **Import Handoff:** Use `processCallingImport()` output report (`summary`, `duplicates`, `unresolvedParks`, `invalidRows`, `unresolvedInterviewLinks`) along with normalized import processing to drive transactional write-importers when approved by the owner.
3. **Authorization Gates:** Derive caller scope strictly from authenticated session (`StaffMeta.assignedCityId` or active `CallingAssignment`); query params may only narrow scope.
