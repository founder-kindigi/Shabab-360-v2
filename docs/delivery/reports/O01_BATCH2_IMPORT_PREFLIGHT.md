# O01 Batch 2 profile import preflight

Date: 2026-09-14. This is a read-only design. It imports no records, creates
no accounts, and includes no source-row values.

## Source identity

| Property | Value |
| --- | --- |
| Workbook | `Batch 2 _ Profiles (1).xlsx` |
| SHA-256 | `9AEC418BDB36B23E432EACED5C284F1980AA96E7CAAF87CA551C8628C6F79531` |
| Structure | Two sheets: W2.01 profile grid and W2.02 vertical text reference |
| W2.01 disposition | Stage candidates only; observed A1:BJ17, with 54 formula cells excluded from record creation |
| W2.02 disposition | Hold; determine whether it is a field dictionary or non-record reference before mapping |

## Intended grain and boundaries

One accepted staged row may describe a participant profile, a related guardian
contact, and historical Batch/Group context. It is not permission to create a
login account and it is not proof that a source name identifies one person.
Every candidate must retain workbook hash, worksheet index, source row and
field disposition. Private values stay in a local staging store and never enter
logs, packets, test fixtures or client bundles.

## Field disposition before a dry run

| Field family | Candidate target | Dry-run disposition |
| --- | --- | --- |
| Person name and approved contact string | Participant | Validate and stage only after stable identity resolution |
| School, education and non-sensitive development fields | StudentExtendedProfile | Stage only; write after participant identity is resolved |
| Guardian relationship/contact | Guardian and GuardianChild | Stage only; no auto-merge by name or contact alone |
| Address and family data | Restricted profile data | Hold pending field-lifecycle mapping |
| Wellbeing/sensitive information | Sensitive profile fields | Hold; do not stage into application persistence |
| Source age | Derived participant attribute | Hold pending owner-approved as-of date |
| Batch/group context | Historical membership assignment | Hold pending reviewed canonical city/park/batch/group identifiers and effective dates |
| Formula/summary cells | None | Exclude from record creation; preserve only source provenance |

## Required dry-run algorithm

1. Verify the workbook hash and structural sheet indices before parsing.
2. Extract only W2.01 candidate cells into a private local staging table with
   source provenance. Do not process W2.02 as participant records.
3. Validate bounded text, date and phone-string formats without coercing
   leading zeros, prefixes or Urdu text.
4. Match only with owner-approved stable keys. A missing, duplicate or
   conflicting key becomes `ambiguous`; it never becomes a name-based merge.
5. Produce counts for `accepted`, `rejected`, `duplicate`, `ambiguous`,
   `held`, and `unmatched hierarchy` by worksheet/index. Error output uses
   source row references only.
6. In a disposable SQLite and PostgreSQL database, transactionally apply only
   the approved, non-held set with a repeatable import-batch identity. Re-run
   the same batch to prove no duplicates; interrupt and resume to prove
   rollback/recovery.
7. Reconcile staged, accepted and rejected counts, then present a concrete
   report for owner approval before any target import.

## Decisions required before implementation

1. Stable identity key hierarchy for participant and guardian matching.
2. As-of date for source age and rules for blank/contradictory age values.
3. Canonical historical Batch/Group mapping, including effective dates and
   treatment of unmatched placement.
4. Address/family and sensitive-profile retention/visibility lifecycle.
5. Approval of a concrete dry-run report before any non-disposable write.
