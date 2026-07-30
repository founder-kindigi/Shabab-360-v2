# Module Data Import Contract

**Version:** 1.0  
**Applies to:** Every workbook, CSV, API extract, or third-party data import.

## 1. Non-Negotiable Rules

1. A real-data import is not a seed. Seeds are synthetic, deterministic, and safe to rerun. Real sources use a guarded import pipeline.
2. Every first run is `dry-run` and performs zero writes.
3. The operator supplies explicit scope. An importer never infers city, batch, park, group, campaign, or plan from a workbook name or tab name.
4. Scope is validated against active database records before any matching or write.
5. A source row must have a deterministic source reference and an approved identity/matching rule. Name-only matching is prohibited.
6. Reports redact PII. Raw personal data never appears in console output, committed reports, test snapshots, or audit metadata.
7. Execution requires an explicit environment allowlist, a confirmation flag, an idempotency key, a reviewed dry-run report, and an atomic transaction.
8. Unknown headers, unsupported values, unresolved identity, duplicate ambiguity, foreign scope, and malformed dates are review/error rows. They never become silent defaults.

## 2. Required Import Manifest

Every import request supplies a validated manifest equivalent to:

```json
{
  "formatVersion": "1.0",
  "module": "attendance | content_planner | calling",
  "mode": "dry-run | execute",
  "source": { "fileName": "operator-provided", "sha256": "..." },
  "scope": {
    "cityCode": "LHR",
    "batchCode": "B4",
    "parkCode": null,
    "groupCode": null,
    "campaignCode": null,
    "planCode": null
  },
  "selection": { "sheets": ["..."], "completedThrough": "YYYY-MM-DD" },
  "idempotencyKey": "operator-generated-stable-key"
}
```

Fields irrelevant to a module must be `null`; missing context is an error. The manifest is stored as redacted audit metadata, never with source content.

## 3. Canonical Tables

Styled operational workbooks require an adapter. New imports should use one of these canonical tables after the adapter stage.

### Attendance

`session_date, city_code, batch_code, park_code, group_code, participant_source_ref, attendance_status, source_sheet, source_row`

- Allowed status values: `present`, `absent`, `late`, `excused`.
- Roster data is a separate table: `participant_source_ref, full_name, phone, age, grade_class, city_code, park_code, group_code`.
- Import never creates a participant from an attendance status row.

### Content Planner

`plan_scope, city_code, batch_code, park_code, week_number, session_number, session_date, is_off_day, focus_area, category, block_order, title, content, source_sheet, source_row`

Optional resources are a separate table: `resource_label, resource_url, resource_kind`. URLs are rejected until the configured allowlist and safe-redirect policy approve them.

### Calling

`campaign_code, city_code, source_sheet, source_row, applicant_source_ref, applicant_name, mobile_phone, whatsapp_phone, assigned_park_code, source_status, source_response, historical_note, current_note, source_date`

- `applicant_source_ref` should be an approved admission/application ID whenever possible.
- Caller assignment is separate and only occurs after a mapped active caller is approved.
- Guardian data may only be imported from an explicit guardian column; a WhatsApp number is not a guardian phone.

## 4. Required Outputs

Every dry run creates a redacted reconciliation report containing:

- input SHA-256 and selected sheets;
- parsed, accepted, withheld, review, and rejected row counts;
- scope and source-row references;
- duplicate clusters using HMAC fingerprints;
- unresolved mappings and unsupported values;
- exact proposed create/update counts;
- a `writesPerformed: false` assertion.

Execution emits the same report plus transaction ID, audit action ID, and idempotency result. It must be safe to rerun: same manifest and key produce no duplicate writes.

## 5. Approval Gates

1. Owner approves the scope and source cutoff.
2. Module owner approves every blocking/review disposition.
3. A developer reviews the adapter, Zod schema, scope enforcement, idempotency, transaction, audit redaction, and tests.
4. The deployer confirms the restricted target and current migration state.
5. Execute once; reconcile source counts to resulting records; attach the redacted report to UAT evidence.

