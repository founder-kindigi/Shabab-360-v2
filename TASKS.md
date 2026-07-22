# Shabab 360 Remaining Delivery Tasks

**Owner:** Codex is the final reviewer and only approves, commits, pushes, or
deploys work. Claude and Gemini may implement one isolated task at a time.

**Authority:** [Master Blueprint](docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md),
[Build Tasks](docs/CODEX_BUILD_TASKS.md), and current verified code. This file
is the practical delegation queue; it does not replace those authorities.

**Execution workflow:** [Multi-Agent Execution Workflow](docs/AGENT_EXECUTION_WORKFLOW.md)
defines branch ownership, review cycles, agent boundaries and the approved
execution waves.

## Agent Rules

- One task per agent. Do not combine task IDs or edit outside the stated files.
- Never deploy, push, run database migrations, alter staging data, touch
  secrets, or use production credentials.
- Do not edit authentication, role capability defaults, authorization helpers,
  schema/migrations, or imports unless the task explicitly permits it.
- Preserve unrelated work. Re-read files before editing. Use bounded Zod input
  validation and server-side authorization on every route.
- Each handoff must state: task ID, changed files, tests run, allowed/denied
  behaviour, data impact, risks, and `Ready for Codex review.`
- Codex reviews every diff, resolves conflicts, reruns verification, commits,
  and decides whether a staging execution is allowed.

## Current State

- Lahore staging data is imported; do not clear or alter it without explicit
  owner execution approval.
- Five Lahore collaboration teams exist, with no staff memberships yet.
- Content planner schema migration is committed but **not deployed** to staging.
- The city-owned Batch / park-owned Group hierarchy change is not deployable
  until a reviewed forward PostgreSQL migration transforms existing Lahore data
  and proves every group remains in the same city as its batch and park.
- The Batch 4 workbook dry run is non-writing: 18 Lahore template sessions,
  4 State Life School override sessions, and 71 dated placeholder rows for
  review. It must not be imported until the review policy is approved.

## Active Queue

| ID | Priority | Status | Suggested Agent | Scope / Deliverable | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `CP-API-001` | P1 | `IN_REVIEW` | Codex | Review scoped content planner API routes and add focused allow/deny tests. | Content schema foundation |
| `CP-IMPORT-001` | P1 | `READY` | Claude | Add parser tests for template, State Life override, links, and placeholder rows. No database access. | `CP-API-001` review |
| `CP-IMPORT-002` | P1 | `BLOCKED_OWNER` | Codex | Approve import policy for 71 placeholder rows, off days, statuses, and publishing workflow. | `CP-IMPORT-001` |
| `CP-IMPORT-003` | P1 | `PENDING` | Codex | Implement reviewed staging-only planner importer and reconciliation. Requires explicit owner execution. | `CP-IMPORT-002`, deployed migration |
| `CP-UI-001` | P1 | `READY` | Gemini | Build read-only planner list/calendar UI using approved APIs; no mutations or schema edits. | `CP-API-001` |
| `CP-UI-002` | P1 | `PENDING` | Claude | Add city manager plan/session authoring and own-team draft-block workspace. | `CP-UI-001` |
| `CP-UAT-001` | P1 | `PENDING` | Codex | Validate Super Admin, City Head, member, non-member and wrong-city flows in staging. | `CP-UI-002` |
| `TEAM-001` | P1 | `READY` | Gemini | Build Super Admin membership management UI for the five Lahore teams. No role/scope changes. | Existing collaboration migration |
| `TEAM-002` | P1 | `PENDING` | Claude | Add focused membership API and tests: active membership only, city-bound teams, audit log. | `TEAM-001` design review |
| `TEAM-003` | P1 | `PENDING` | Codex | Review membership data entry with owner; activate only confirmed staff. | `TEAM-002` |
| `TEAM-004` | P1 | `PENDING` | Gemini | Team activity list UI using the existing activity-plan schema; no chat/documents. | `TEAM-003` |
| `MASHWARA-301` | P1 | `READY` | Claude | Produce a schema/API design note for weekly Mashwara, Karguzari/MoM, decisions, action items, close/reopen and audit. No code. | Blueprint section 8.6.1 |
| `MASHWARA-302` | P1 | `PENDING` | Codex | Review and implement approved Mashwara schema, authorization, migration and tests. | `MASHWARA-301` |
| `MASHWARA-303` | P1 | `PENDING` | Gemini | Build Mashwara UI only after Codex approves APIs: agenda, MoM, team tasks, status. | `MASHWARA-302` |
| `MASHWARA-304` | P1 | `PENDING` | Codex | Add attendance/calendar/notification links and complete role UAT. | `MASHWARA-303` |
| `EVENT-301` | P1 | `READY` | Codex | Design event, temporary event-team and time-bounded responsibility-assignment model from Mashwara decisions. | Mashwara design |
| `EVENT-302` | P1 | `PENDING` | Codex | Implement event responsibilities, accountable POC, temporary team titles and scoped assignment APIs. | `EVENT-301` |
| `CALL-301` | P1 | `DONE` | Owner + Codex | Approved event-scoped Calling POC, same-city approved callers, manual WhatsApp handoff, 12-month retention, editable category catalogue and audited City Head exports. | Calling source analysis |
| `CALL-302` | P1 | `PENDING` | Codex | Implement audited calling interactions, follow-ups and scoped APIs, linked to event/Mashwara responsibilities and expiry-bound External Support Caller accounts using email/password invites with forced first-login reset. | `CALL-301`, `EVENT-302` |
| `CALL-303` | P1 | `PENDING` | Gemini | Build caller queue and admission timeline UI after Codex-approved APIs. | `CALL-302` |
| `CALL-304` | P1 | `PENDING` | Claude | Add appointment/orientation, approved template and reporting design; no external message sending. | `CALL-302` |
| `CALL-305` | P1 | `PENDING` | Codex | Produce reviewed non-writing workbook import dry run; no real data writes. | `CALL-302` |
| `CALL-306` | P1 | `BLOCKED_OWNER` | Codex | Execute approved staging import and reconciliation. | `CALL-305` |

## Real-Data Stabilisation

| ID | Priority | Status | Suggested Agent | Scope / Deliverable |
| --- | --- | --- | --- | --- |
| `UAT-ROLE-001` | P0 | `HANDOFF_READY` | Gemini | Browser checklist for every role against Lahore data; report defects only, no code. |
| `UAT-ROLE-002` | P0 | `READY` | Claude | API authorization test audit for City Head, Park Lead, Park Admin and Murabbi routes; report gaps only. |
| `DATA-001` | P1 | `BLOCKED_OWNER` | Owner + Codex | Confirm actual staff emails and team memberships; placeholder accounts remain inactive until confirmed. |
| `DATA-002` | P1 | `PENDING` | Codex | Reconcile imported participants, groups, dropouts and attendance with the source workbook. |
| `UX-001` | P1 | `READY` | Gemini | Inventory Lahore-backed screens: retain, remove, modify, missing. No code. |
| `UX-002` | P1 | `PENDING` | Codex | Turn accepted inventory findings into narrow implementation tasks. |
| `REL-001` | P0 | `PENDING` | Codex | Staging acceptance: login, role boundaries, data checks, errors, mobile view and rollback evidence. |

## Platform And Security

| ID | Priority | Status | Suggested Agent | Scope / Deliverable |
| --- | --- | --- | --- | --- |
| `DB-001` | P0 | `PENDING` | Codex | Deploy only reviewed PostgreSQL migrations to staging; verify migration history and rollback plan. |
| `DB-002` | P0 | `PENDING` | Codex | Repeatable backup/restore rehearsal before any pilot production approval. |
| `AUTH-001` | P0 | `READY` | Claude | Review auth/session/reset/rate-limit tests and report missing cases only. |
| `SEC-001` | P0 | `READY` | Gemini | Static security scan: unbounded inputs, missing route auth, sensitive logs, public file exposure. Report only. |
| `SEC-002` | P0 | `PENDING` | Codex | Remediate accepted security findings and verify denial paths. |
| `OBS-001` | P1 | `PENDING` | Claude | Design free-tier error/uptime alerting proposal; no provider configuration. |
| `DEPLOY-001` | P0 | `PENDING` | Codex | Staging/preview environment audit: secrets, database URLs, migration safeguards, Vercel build evidence. |

## Deferred Modules

These remain planned but must not start before real-data stabilisation and their
owner decisions in `docs/CODEX_BUILD_TASKS.md`: complete admissions,
multi-assignment/grouping, rich sessions and activity attendance, calendar and
events, finance, procurement/inventory, community, online resources, private
documents, staff-only chat, email provider, alerts, custom domain and pilot
production release.

## Recommended Delegation Now

1. Assign Claude `MASHWARA-301`.
2. Assign Gemini `UAT-ROLE-001` or `UX-001`.
3. Keep `CP-API-001`, migration execution, imports, role access changes and all
staging writes with Codex.
