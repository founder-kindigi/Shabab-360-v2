# CP-IMPORT-001: Dry-Run Import Decisions

**Status:** Approved for dry-run implementation only. No import execution or
database write is authorized by this decision record.

## Operator-Supplied Scope

Every preview run requires explicit operator context for city, target plan,
and applicable batch or park. The importer must never infer these values from
a workbook title, sheet name, staff name, or row value. Server-side scope
validation remains authoritative.

## Approved Workbook Columns

The preview may interpret only these columns from the reviewed Batch 4 content
workbook:

| Workbook column | Dry-run treatment |
| --- | --- |
| `Week` | Session display sequence |
| `Day` | Session display sequence |
| `Date` | Scheduled session date, validated strictly |
| `Exercises` | Sports-owned content block |
| `Sports` | Sports-owned content block |
| `Skills` | Skills-owned content block |
| `Tadreeb` | Tadreeb-owned content block |
| `Areas to Focus` | Optional session focus text |

An explicit, recognized off-day or cancellation marker may be reported as an
off-day candidate. Unrecognized values must be reported as validation issues,
not converted into a status.

## Mandatory Unsupported-Column Reporting

The dry run must report, without writing or guessing, all of the following:

- Any workbook column outside the approved list.
- External-resource or URL columns, pending a separate approved link policy.
- Media and Muawin work, because this workbook has no authoritative columns
  for either team.
- Staff names, team membership, assignee, role, city, batch, park, or group
  data. These values must not be used to infer scope or membership.
- Empty future placeholder rows. They remain source-only and must not produce
  plan sessions.

## Zero-Write Rule

The preview must perform no database mutation, create no plan/session/block,
and never alter existing template or park-override data. Its output is a
bounded reconciliation report using synthetic test fixtures only; no real
workbook data is committed.
