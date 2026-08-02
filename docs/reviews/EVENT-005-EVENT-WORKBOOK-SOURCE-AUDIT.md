# EVENT-005: Event Workbook Source Audit & Import Contract

## 1. Executive Summary

This document establishes the authoritative source audit and import contract for Shabab 360 Event workbooks. It defines the canonical schema, deterministic identity matching, single-source event attendance integration, fee lifecycle, and zero-write preview requirements.

---

## 2. Event Workbook Inventory & Structures

Workbooks for special events (e.g. Camps, Competitions, One-off Gatherings) contain:
- **Registration Data**: Student Name, Age, Grade/Class, Guardian Name, Primary Contact.
- **Fees & Payment**: Registration fee, payment status (paid, pending, waived, refunded), transaction reference.
- **Consent & Safeguarding**: Guardian consent status, medical conditions/allergies, emergency contacts.
- **Logistics & Transport**: Pick-up/drop-off point, transport assignment, meal preference.
- **Attendance & Check-in**: On-site event check-in records.

---

## 3. Canonical Event Import Contract

### Supported & Required Fields
| Field Name | Type | Required? | Description / Validation |
|---|---|---|---|
| `sourceReference` | String | Yes | Unique row identifier from source workbook |
| `eventCode` | String | Yes | Target event identifier (e.g. `CAMP-2026-LHR`) |
| `cityCode` | String | Yes | Explicit target city scope (`LHR`, `KHI`) |
| `participantReference` | String | Optional | Student identifier if existing participant |
| `participantName` | String | Yes | Full student name |
| `guardianName` | String | Optional | Guardian full name |
| `primaryMobile` | String | Yes | Primary mobile contact (sanitized) |
| `registrationFee` | Decimal | Optional | Fee amount due (default 0) |
| `paymentStatus` | Enum | Optional | `paid`, `pending`, `waived`, `refunded` |
| `consentReceived` | Boolean | Optional | Guardian consent flag (default false) |

---

## 4. Deterministic Identity & Duplicate Rules

1. **Deterministic Participant Matching**:
   - Matches existing `Participant` by `(cityId, participantReference)` OR exact `(cityId, primaryMobile, participantName)`.
   - If unmatched, flagged as `unmatched_participant_candidate` in dry-run preview.
2. **Duplicate Detection**:
   - `sourceReference` must be unique per event import batch.
   - Duplicate registrations for the same participant in the same event generate `duplicate_registration` flags.

---

## 5. Event Attendance & Fee Integration

1. **Single Source of Event Attendance**:
   - Special Event attendance creates an `AttendanceEvent` with `type: "special_event"`.
   - Marks populate `AttendanceRecord` linked to participant and event, preventing duplicate attendance accounting in regular batch stats while preserving historical participant timelines.
2. **Fee Lifecycle**:
   - Event fees track `registrationFee`, `paidAmount`, and status (`pending`, `paid`, `waived`).
   - Refunds or waivers require explicit authorization and auditable reason.

---

## 6. Zero-Write Dry-Run Preview Contract

- All import operations default to `writesPerformed: false` and `mode: "zero_write_preview"`.
- Operator must explicitly supply `cityId` and `eventCode`.
- Output report returns detailed breakdown of valid rows, duplicates, unmatched candidates, blocked PII/URLs, and total metrics without mutating the database.

---

## 7. Verification & UAT Scenarios

1. Zero-write preview execution with sample event workbook data.
2. Verification of PII redaction in dry-run output logs.
3. Verification of deterministic participant matching and duplicate blocking.
