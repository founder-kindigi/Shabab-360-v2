# CALL-305-DESIGN: Calling Workbook Import Mapping Contract

- **Document Version:** 1.3.0
- **Task ID:** `CALL-305-DESIGN`
- **Status:** `PREPARED` / Pending Codex Review
- **Integration Base:** `2a3fcc7`
- **Scope:** Technical specification for importing `Calls for Phase 2.xlsx` workbook data into proposed Shabab 360 Calling Models, defining mapping schemas, PII rules, read-only dry-run validations, scope derivations, and parser acceptance tests.

---

## 1. Safety Rules & PII Protection Guidelines

To protect applicant contacts and personally identifiable information (PII) on staging:

- **Email Sanitization:** Real prospect, guardian, or caller emails must never be committed or written. All temporary emails must use a `.invalid` suffix: `prospect_<id_or_fingerprint>@example.invalid`.
- **Phone Sanitization / Mocking:** If staging outbound services (SMS/WhatsApp notifications) are active, phone numbers must be overwritten with `+9230099900` + 2-digit serial index, or masked using custom test scopes.
- **Access Bounds:** Calling data imports must remain restricted to their target city context. Cross-city importing or cross-city data exposure is strictly prohibited.
- **Keyed Fingerprinting:** Real names, phones, or notes must never be exposed or logged in raw form. All PII references in reports must be protected by keyed `HMAC-SHA-256` fingerprints. The HMAC secret key must be loaded from a secure local environment variable (e.g. `IMPORT_HMAC_SECRET`) or secure runtime input prompt. It must never be passed via CLI arguments (preventing exposure in shell history and process listings), logged, or stored in the database.
- **Zero Writing Staging Runs:** Importer dry-runs must be completely read-only. They must perform only read-only `SELECT` queries to validate existence and mapping integrity. They must never perform database write, insert, update, delete operations, nor rely on database transaction rollback structures for safety.

---

## 2. City, Event & Campaign Scope Derivation

During parser execution, the organizational and campaign scope must be explicitly passed by the operator:

- **City Derivation:** The target city ID must be passed as an explicit runtime argument (`--cityId <approved-city-id>`) to the importer, bounding all records to that city.
- **Campaign / Event Scope Input:** Campaign scopes must be explicitly specified via command-line arguments (e.g. `--campaignId <approved-campaign-id>`). Importers must never automatically create, infer, or assign a campaign based on worksheet names. Worksheet names may only be reported in dry-runs as diagnostic suggestions.
- **Appointment & Interview Linkage:** Temporary records must map strictly onto the existing `AdmissionInterview` model. A future `CallInteraction.interviewId` may only reference an explicitly matched existing `AdmissionInterview` record (matched via applicant/participant link). If no matching interview record is found, the parser must output `unresolvedInterviewLink` in the reconciliation report and must never create or infer appointments from worksheet dates.

---

## 3. Source-Column Mapping Contract

The workbook `Calls for Phase 2.xlsx` maps onto the schema models as follows:

| Source Sheet Column | Destination Model | Destination Field | Data Type | Constraint / Rule |
| --- | --- | --- | --- | --- |
| **Prospect Name** | `Participant` | `name` | `String` | Required. Checked for non-empty string. |
| **Contact Phone** | `Participant` | `phone` | `String (Optional)` | Normalized to digits only. |
| **Guardian Name** | `Guardian` | `name` | `String` | Required if guardian record exists. |
| **Guardian Phone** | `Guardian` | `phone` | `String` | Normalized. Used as backup contact key. |
| **Guardian CNIC** | `Guardian` | `cnic` | `String (Optional)`| Stripped of dashes and validated format. |
| **Allocated Park** | `Park` | `name` | `String` | Resolved to local `Park.id` via name match. |
| **Call Outcome** | `CallInteraction` *(Proposed)* | `attemptOutcome` | `Enum` | Proposed future calling model. Mapped to: `answered`, `unanswered`, `busy`, `wrong_number`, `whatsapp_sent`. |
| **Prospect Status** | `CallInteraction` *(Proposed)*| `prospectResponse`| `Enum` | Proposed future calling model. Mapped to: `coming`, `not_coming`, `reschedule`, `confused`, `interested`, `not_interested`, `pending`. |
| **Call Notes** | `CallInteraction` *(Proposed)* | `note` | `String (Optional)` | Proposed future calling model. Bounded to 500 characters. |
| **Preferred Date** | `AdmissionInterview` *(Existing)* | `scheduledDate`, `scheduledTime` | `DateTime?`, `String?` | Existing admissions model. Mapped only if an existing interview record matches the applicant; otherwise logs `unresolvedInterviewLink`. |

---

## 4. Duplicate Detection Keys

To prevent importing duplicate records across multiple campaign sheets:

- **Primary Match Key:** Normalized 11-digit phone number match (`Participant.phone` or `Guardian.phone`).
- **Secondary Match Key (Phonetic Name Match):** Match on lowercase alphabetic characters of `Participant.name` when phone number is missing or invalid.
- **Conflict Resolution Policy:**
  - If a prospect matches on Phone: Merge historic notes into a single append-only timeline.
  - If duplicate name is found but phone numbers differ: Import as a separate prospect lead.

---

## 5. Invalid-Row and Reconciliation Report Format

The dry-run parser must generate a structured JSON reconciliation output. To ensure privacy compliance, the output **must not expose raw phone numbers, names, or notes**. All PII must be masked or represented using keyed `HMAC-SHA-256` fingerprints using a secret key loaded from a secure environment variable:

```json
{
  "summary": {
    "totalRowsProcessed": 0,
    "validLeadsCount": 0,
    "invalidLeadsCount": 0,
    "duplicateClustersCount": 0,
    "unresolvedParksCount": 0,
    "unresolvedInterviewLinksCount": 0
  },
  "invalidRows": [
    {
      "rowNumber": 12,
      "sheetName": "Campaign 1",
      "prospectNameMasked": "Al* K**n",
      "prospectNameFingerprint": "hmac_sha256_hash_value_here",
      "reason": "Missing required field: Contact Phone and Guardian Phone are both empty"
    }
  ],
  "unresolvedParks": [
    {
      "rowNumber": 45,
      "providedParkName": "Central Playground",
      "resolvedParkId": null,
      "status": "UNRESOLVED_PARK"
    }
  ],
  "unresolvedInterviewLinks": [
    {
      "rowNumber": 67,
      "sheetName": "Interview Lists",
      "prospectNameMasked": "Za**d A**ad",
      "prospectNameFingerprint": "hmac_sha256_hash_value_for_name",
      "reason": "No matching AdmissionInterview record found for this applicant",
      "status": "unresolvedInterviewLink"
    }
  ],
  "duplicates": [
    {
      "maskedPhone": "+92300*****67",
      "phoneFingerprint": "hmac_sha256_hash_value_for_phone",
      "matchingRows": [
        { "rowNumber": 10, "sheetName": "Phase 2 Remaining" },
        { "rowNumber": 89, "sheetName": "Interview Lists" }
      ],
      "resolution": "MERGE_HISTORIC_TIMELINE"
    }
  ]
}
```

---

## 6. Non-Writing Dry-Run Behavior

The import module must support a strict `--dry-run` flag with the following execution flow:

1. **Load Schema Models:** Execute read-only `SELECT` queries to retrieve master data for `City`, `Park`, `Batch`, `Group`, and `AdmissionInterview`. No modifications are permitted.
2. **Workbook Parsing:** Open file, parse sheets, and validate columns against mapping contract.
3. **In-Memory Normalization & Fingerprinting:** Deduplicate entries, normalize phone numbers, and apply PII HMAC-SHA-256 fingerprinting and masking rules using the key loaded from the environment variable.
4. **Referential Resolution:** Map park strings to database records. Unresolved names are logged in `unresolvedParks`. Match applicant records to existing `AdmissionInterview` rows; unmatched assignments are logged as `unresolvedInterviewLink`.
5. **No-Write Gate:** End execution without issuing any database `INSERT`, `UPDATE`, or `DELETE` commands.

---

## 7. Importer Parser Acceptance Tests

The future parser must pass these logical assertions:

### Test Case 1: Phone Normalization
* **Input Phone:** `+92-300-1234-567`
* **Assertion:** Normalizes to `923001234567` before matching or schema lookup.

### Test Case 2: Incomplete Lead Rejection
* **Input Row:** `{ name: "UAT Prospect", phone: "", guardianPhone: "" }`
* **Assertion:** Rejects row and appends an entry to the `invalidRows` log with reason `"Missing phone numbers"`.

### Test Case 3: Duplicate Merge
* **Input Rows:** Two rows matching phone `923005555555` across different worksheets.
* **Assertion:** Associates call interactions under exactly 1 `Participant` record.

### Test Case 4: Scope Validation
* **Input Params:** `--cityId <approved-city-id>` (pointing to Lahore)
* **Workbook Park:** `"Clifton Park"` (which belongs to Karachi)
* **Assertion:** Marks park as unresolved in `unresolvedParks` and raises a scope warning.

### Test Case 5: Unmatched Interview Log
* **Input Row:** Worksheet contains interview details for an applicant with name fingerprint `xyz` and phone fingerprint `abc`, but no `AdmissionInterview` record exists in the database.
* **Assertion:** Records the row in `unresolvedInterviewLinks` with status `unresolvedInterviewLink` and reason `"No matching AdmissionInterview record found"`.

---
*End of Calling Workbook Import Mapping Contract.*