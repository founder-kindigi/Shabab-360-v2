# Audit Data Policy

## Purpose And Scope

Audit records support security investigation and operational accountability. They are not a secondary profile store, notification archive, or analytics feed.

This policy applies to the restricted pilot and must be reviewed before any production handover or expansion of audit fields.

## Access

- Only `super_admin` and `program_admin` may read the administrative audit-log API or UI.
- Audit data must not be exported to chat, issue trackers, or spreadsheets unless an incident requires it and the project owner approves the minimum necessary extract.
- Dashboards and notification history may use aggregate activity metadata only. They must not expose stored before/after audit values.

## Data Minimization

Each audit record may retain the actor ID, action, entity type, entity ID, timestamp, and operationally useful non-sensitive field changes.

The central audit helper redacts password, temporary-password, token, secret, reset URL, name, email, phone, CNIC, address, date-of-birth, free-form content, and message fields before persistence. Free-form reasons are length-limited and redact email, CNIC, and Pakistani mobile-number patterns.

IP addresses, user-agent strings, device fingerprints, and request bodies are not collected for this pilot. Adding any of them requires a new privacy review, a specific purpose, an access rule, a retention period, and updated tests.

## Pilot Retention

- Pilot default: retain audit records for 90 days from creation.
- No automatic purge runs against the current SQLite development data or any Vercel deployment.
- Before Postgres cutover, the owner must approve the retention period against applicable program, contractual, and legal requirements.
- Historical audit records that predate minimization must be excluded from migration or sanitized in the approved migration tooling. Do not copy them to a new production database unchanged.

## Incident Handling

When investigating an incident, collect the smallest relevant time range and entity scope. Do not copy redacted values into other systems, and never reconstruct or retain credentials from operational logs. Follow [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) for audit-write failures, secret exposure, rollback, and escalation.
