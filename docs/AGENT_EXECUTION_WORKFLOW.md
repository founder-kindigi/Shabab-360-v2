# Shabab 360 Multi-Agent Execution Workflow

## 1. Operating Model

Codex owns integration, security review, migrations, staging execution,
deployment, final verification, commits to the integration branch, and merge
approval. Claude, Gemini and DeepSeek work on one narrow task per branch.

**Integration branch:** `codex/production-hardening`  
**Agent branch format:** `agent/<agent>/<task-id>-<short-name>`  
Examples: `agent/claude/HIER-002-migration-design`,
`agent/gemini/CP-UI-001-planner-read-ui`,
`agent/deepseek/CALL-305-parser-tests`.

No agent may push to `main`, force-push shared branches, deploy to Vercel, run
staging/production migrations, execute imports, edit `.env`, or handle secrets.

## 2. Mandatory Branch Cycle

1. Codex marks a task `READY` and gives the agent the exact task prompt.
2. Agent creates its branch from the current approved integration commit.
3. Agent changes only allowed files, runs required tests, commits and pushes the
   branch, then opens a PR targeting `codex/production-hardening`.
4. Agent posts the required handoff in the task/PR; it does not merge.
5. Codex reviews code, authorization, migration/data impact, tests and diff.
6. Codex either approves and merges, or posts precise required changes.
7. The same agent revises the same branch; repeat until approved or rejected.
8. Codex verifies the merged integration branch, updates `TASKS.md`, and only
   then releases the next dependent tasks.

## 3. Coordinator Loop

Use a dedicated low-cost coordinator session (Gemini Flash preferred) to keep
`docs/AGENT_TASK_BOARD.md` current. Every three minutes it must:

1. Read the board and inspect the listed agent branches only; it does not edit
   application code.
2. Move valid handoffs from `HANDOFF_READY` to `REVIEW`, and notify Codex with
   the branch, commit, changed files, and verification summary.
3. Identify an idle agent and assign the highest-priority `READY` task whose
   dependencies are `DONE` and whose allowed files do not overlap an active
   task.
4. Mark a task `BLOCKED` when an owner decision, approved API contract, or
   missing dependency prevents safe progress. It must not invent a contract.
5. Never merge, deploy, execute migrations/imports, read secrets, or approve
   its own work.

The coordinator can dispatch automatically only when the host platform permits
one agent to create or message the other agent sessions. Without that platform
capability, it still keeps the board current and prepares the exact next prompt;
the operator starts the listed session. Codex remains the approval gate in both
models.

## 3. Baseline Gate

No new implementation branch starts until `BASELINE-001` is approved.

| ID | Owner | Required outcome |
| --- | --- | --- |
| `BASELINE-001` | Codex | Repair current TypeScript failure, complete hierarchy migration design, add/repair regression tests, pass generation/lint/typecheck/tests/build, and create an approved integration commit. |
| `BASELINE-002` | Codex | Deploy the reviewed hierarchy migration to staging only after explicit owner approval; reconcile Lahore city/batch/park/group records. |

The hierarchy rule to preserve is: **Batch belongs to City; Group belongs to
exactly one Batch and one Park in that same City.**

## 4. Agent Strengths And Task Allocation

| Agent | Best use | Do not assign |
| --- | --- | --- |
| Claude Opus | Architecture, high-risk security/data-model review, migration and authorization design, complex cross-module code review | Independent production changes, broad cosmetic UI work |
| Claude Sonnet | Complex backend implementation after contract approval, API refactors, focused integration tests, design-to-code review | Secrets, deployments, irreversible migrations, final approval |
| Gemini 3.1 Pro | Product workflow design, difficult frontend flows, browser UAT plans, broad-but-isolated component work | Authorization redesign, data writes, final approval |
| Gemini 3.5 Flash | Coordinator loop, narrow UI components, responsive fixes, docs, small focused tests | Schema changes, security architecture, migration execution |
| DeepSeek v4 Flash | Parser/dry-run utilities, route-level regression tests, bounded validation, mechanical backend changes | Secrets, deployment, data writes, cross-cutting auth policy |
| GPT-5.4-mini | Independent test plans, UAT evidence, runbooks, static review checklists, focused test implementation | Authoritative security/schema decisions, final approval |
| Codex | Product/API contract, integration, auth/scope, migrations, security/data review, merge/release checks, staging execution | Delegating final approval |

### Delivery Pods

For a feature with stable requirements, form a temporary pod with no file
overlap:

| Lane | Suggested owner | Starts when | Output |
| --- | --- | --- | --- |
| Contract | Codex, reviewed by Opus | Owner decision exists | API schema, authorization/scope rules, allowed files |
| Backend | Sonnet or DeepSeek | Contract is approved | API/schema implementation and focused allow/deny tests |
| Frontend | Gemini Pro or Flash | API contract is stable | Page/component branch with no backend edits |
| Quality | GPT-5.4-mini or DeepSeek | Contract is approved | Regression/UAT tests and evidence checklist |
| Coordination | Gemini Flash | Always | Board updates, dependency checks, handoff routing |

Codex integrates only after backend, frontend, and quality lanes pass review.

## 5. Approved Execution Waves

Tasks in the same wave must not overlap files or database models.

### Wave 0: Stabilise The Integration Baseline

| ID | Agent | Scope | Allowed files | Required evidence |
| --- | --- | --- | --- | --- |
| `HIER-001` | DeepSeek | Repair the fee-waiver syntax regression only. | `src/app/api/admin/fees/[id]/waiver/route.ts` and its focused test | Focused test, typecheck |
| `HIER-002` | Claude | Review city-owned Batch / park-owned Group migration and write forward/rollback/reconciliation design. No code. | `docs/` only | Exact SQL/data transformation plan, risks |
| `HIER-003` | Gemini | Build manual UI regression checklist for city batch + park group flows. No code. | `docs/product-discovery/` only | Browser scenarios, allowed/denied scope cases |

Codex integrates `HIER-001`, reviews `HIER-002/003`, then implements the
migration and runs the full verification suite.

### Wave 1: Product Designs Without Schema Conflicts

| ID | Agent | Scope | Allowed files |
| --- | --- | --- | --- |
| `EVENT-301` | Claude | Event, temporary event-team, responsibility and handover design from Mashwara decisions. No code. | `docs/product-discovery/` |
| `CALL-304` | DeepSeek | Calling template, appointment/orientation and reporting design. No external sends or code. | `docs/product-discovery/` |
| `UAT-ROLE-001` | Gemini | Execute/revise role UAT only when owner supplies approved test accounts locally; no passwords shared. | `docs/product-discovery/` |

Codex consolidates approved designs before creating any event/calling schema.

### Wave 2: Content Planner

| ID | Agent | Scope | Allowed files | Dependencies |
| --- | --- | --- | --- | --- |
| `CP-API-001` | Codex | Review and test scoped planner API paths. | Planner API/test files | `BASELINE-001` |
| `CP-IMPORT-001` | DeepSeek | Parser tests for template, State Life override, links and placeholders. | `scripts/`, focused tests | `CP-API-001` |
| `CP-UI-001` | Gemini | Read-only planner list/calendar UI. | New planner UI files only | Approved planner APIs |
| `CP-UI-002` | Claude | City manager/session and own-team draft workflow design review; code only after Codex approval. | Planner UI/API files named by Codex | `CP-UI-001` |

### Wave 3: Teams, Events And Mashwara

| ID | Agent | Scope | Allowed files | Dependencies |
| --- | --- | --- | --- | --- |
| `TEAM-001` | Gemini | Super Admin team membership UI. | New team UI files | `BASELINE-001` |
| `TEAM-002` | DeepSeek | Membership API tests and audit behavior. | Team API/test files | Codex API contract |
| `MASHWARA-301` | Claude | Final design revision only. | Mashwara design document | Owner decisions |
| `EVENT-302` | Codex | Event/responsibility schema and scoped APIs. | Schema, migration, APIs, tests | `EVENT-301` |
| `MASHWARA-302` | Codex | Mashwara schema, lifecycle and access implementation. | Schema, migration, APIs, tests | `EVENT-302` |
| `MASHWARA-303` | Gemini | Mashwara UI after APIs are approved. | New Mashwara UI files | `MASHWARA-302` |

### Wave 4: Calling System

| ID | Agent | Scope | Allowed files | Dependencies |
| --- | --- | --- | --- | --- |
| `CALL-302` | Codex | Calling schema, temporary External Support Caller entitlement, scoped APIs and audit tests. | Schema, migration, APIs, tests | `EVENT-302` |
| `CALL-303` | Gemini | Caller queue, lead timeline and responsive assigned-lead workspace. | New calling UI files | `CALL-302` |
| `CALL-305` | DeepSeek | Non-writing spreadsheet parser, duplicate report and import fixtures. | `scripts/`, tests | `CALL-302` |
| `CALL-306` | Codex | Review report, gain owner approval, staging-only import and reconciliation. | Execution command only | `CALL-305` |

## 6. Required Agent Handoff

Every handoff must contain:

```text
Task ID:
Branch and base commit:
PR URL:
Changed files:
What changed:
What was intentionally excluded:
Role/scope and personal-data impact:
Migration/data impact:
Commands run and results:
Known risks / owner decisions:
Ready for Codex review.
```

## 7. Codex Review Standard

Codex rejects or requests changes when any of these are missing:

- exact server-side authorization, including a denial test;
- bounded Zod validation for untrusted input;
- SQLite/PostgreSQL schema alignment and a safe forward migration;
- data reconciliation and rollback for any staging write;
- required focused tests, lint, typecheck and applicable build;
- a narrow diff that respects the assigned file boundary.

## 8. Immediate Agent Prompts

### DeepSeek: `HIER-001`

```text
Create branch agent/deepseek/HIER-001-fee-waiver-fix from the approved base
commit. Fix only the TypeScript syntax/duplicate-block regression in
src/app/api/admin/fees/[id]/waiver/route.ts. Preserve the intended city-owned
batch change. Add or update only the focused route test if needed. Run the
focused test and npm run typecheck. Commit, push, open a PR to
codex/production-hardening, and provide the required handoff. Do not edit
schemas, migrations, auth, deployment, secrets, staging data, or unrelated files.
```

### Claude: `HIER-002`

```text
Create branch agent/claude/HIER-002-hierarchy-migration-design from the approved
base commit. Write a migration/reconciliation design for changing Batch from
park-owned to city-owned and making Group link Batch plus Park. Include the
PostgreSQL forward migration sequence, existing Lahore data transformation,
same-city invariant, indexes/FKs, rollback/recovery, dry-run checks and tests.
Change docs only. Do not edit schema, code, migrations, secrets, deployments or
data. Commit, push, open a PR to codex/production-hardening, and provide the
required handoff.
```

### Gemini: `HIER-003`

```text
Create branch agent/gemini/HIER-003-hierarchy-uat-plan from the approved base
commit. Create a manual browser UAT plan for the city-owned Batch and
park-specific Group model. Cover Super Admin, City Head, Park Lead, Park Admin
and Murabbi; include create/read/edit/denied cross-city and cross-park cases,
empty/error states and mobile checks. Change docs only. Do not edit application
code, schemas, migrations, secrets, deployment or data. Commit, push, open a PR
to codex/production-hardening, and provide the required handoff.
```
