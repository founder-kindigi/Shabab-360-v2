# O01 people and profile baseline

Date: 2026-09-14. Evidence source: the integrated candidate
`D:/iBuild/Shabab-360-c0-20260911/n01-notifications-20260914` and the current
O01 packet. No source rows, account records, or production database were read.

## Current contracts

| Surface | Scope and projection | Result |
| --- | --- | --- |
| `GET /api/admin/people` | HQ role guard plus `people.view`; staff accounts only; returns email, phone and reset state | Not a general people directory. It has no participant or account-link projection and is not safe to widen without a visibility decision. |
| `GET /api/admin/students` | `students.profile.view`; hierarchy resolved from city/park/group; participant, group, attendance and guardian projection | It is the scoped participant directory foundation. Its guardian name/phone and participant birth-date fields need an approved staff-view matrix before reuse outside the existing administration flow. |
| Staff profile route | Capability, explicit/derived city, authoritative group hierarchy, sensitive-field redaction and optimistic profile version | Safe foundation retained. |
| Self/guardian profile routes | Linked identity only; sensitive wellbeing fields removed | Safe foundation retained. |

## Reconciliation findings

1. A staff record is a `User` plus `StaffMeta`; a participant/guardian record
   may be unlinked. Neither list returns a safe, explicit link state, so no
   client can infer account eligibility or provision an account safely.
2. The staff directory's email, phone and reset-state projection must stay
   restricted to its present HQ administration path until the owner approves
   exactly which roles may view it.
3. The participant list has correct hierarchy resolution, but its current
   guardian and date-of-birth projection is too broad for a generic directory.
   It must not be reused by community, reporting, or a public-facing screen.
4. Profile writes already use `If-Match`, audit changed fields, and redact
   sensitive values. No replacement profile endpoint is needed.

## Next safe implementation after the owner decision

Define one `people.directory` response with explicit `kind` (`staff` or
`participant`), safe current organisation context, and a boolean account-link
state. Keep email, phone, address, guardian identifiers, birth date, wellbeing
and reset state out unless the approved actor/field matrix permits each field.
Use the existing hierarchy resolver for participant scope. Account provisioning,
relinking, deactivation and Batch 2 import remain separate gated workflows.

## Approved temporary policy

The owner approved a safe default on 2026-09-14: normal directories expose
only name, role/state and current city/park/group; phone, email, address, date
of birth, guardian information, wellbeing data and reset state stay hidden.
Only Super Admin may later receive reset state. This permits the narrow
directory-projection change; account authority and Batch 2 import identity
remain separate decisions.
