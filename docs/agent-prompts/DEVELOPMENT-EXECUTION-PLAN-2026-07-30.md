# Development Execution Plan - 2026-07-30

**Coordinator mode:** Codex plans, assigns, and reviews. Agents implement only their explicitly bounded task. No agent merges, deploys, changes secrets, or writes real Lahore data.

**Planning base:** `11aadee` on `codex/lahore-uat-candidate`. For every dependent task, Codex must provide the new integrated base SHA before assignment. Do not cherry-pick from mixed-history branches.

**Shared rules:** Every agent must follow [POST-FIX-QUALITY-GATE.md](POST-FIX-QUALITY-GATE.md), read `AGENTS.md`, `.agents/memory/current.md`, and [OWNER-REQUIREMENTS-2026-07-30.md](../product-discovery/OWNER-REQUIREMENTS-2026-07-30.md). Use a clean branch, declare the exact allowed files, add real regression tests, and submit an isolated SHA only.

## Wave 0 - Inputs And Audits (parallel, no feature code)

| Task | Owner input/dependency | Deliverable | Gate |
| --- | --- | --- | --- |
| EVENT-005 | Historical event workbooks | Read-only source analysis and import contract | No code/data writes |
| PERF-001 | None | Current-page performance audit and ranked remediation backlog | No code/data writes |
| CRUD-001 | None | Module CRUD/scope/lifecycle coverage matrix | No code/data writes |
| RTL-001 | None | Urdu RTL audit and component migration plan | No code/data writes |
| ACCESS-006 | Final module action catalogue from audits | Capability gap matrix and implementation sequence | No capability code changes |

## Wave 1 - Attendance Data Foundation (serial, release-critical)

| Task | Depends on | Deliverable | Must not do |
| --- | --- | --- | --- |
| ATT-001 | None | Dual-schema forward migration/data model for unassigned participants, dropout metadata, batch policy, staff attendance, event roster snapshot | Import data, build UI, change existing role defaults |
| ATT-002 | ATT-001 integrated | Shared policy engine and server transitions for manual/automatic dropout and off-day schedule | Build summaries or importer |
| ATT-003 | ATT-001 + ATT-002 integrated | Staff attendance APIs and Student/Murabbi/Class summary APIs | Change workbook importer |
| ATT-004 | ATT-001..003 integrated | Idempotent Lahore reconciliation dry run + guarded execution plan | Execute against Preview/staging |
| ATT-005 | ATT-002 + ATT-003 integrated | Mobile attendance/settings/profile UI and browser-UAT checklist | Change schema/importer |

## Wave 2 - Workbook-Driven Modules (after Attendance starts)

| Task | Depends on | Deliverable |
| --- | --- | --- |
| CP-IMPORT-001 | Attendance release stability | Content Planner dry-run import preview, external links fail-closed |
| MASH-005 | None | Diagnose/fix refresh-stuck page with focused regression test |
| MASH-006 | MASH-005 integrated | Task assignment notifications and lifecycle UX/API tests |
| CALL-009 | Calling source/visual input confirmed | Versioned calling import template and zero-write preview |
| EVENT-006 | EVENT-005 and event workbook decisions | Registration/fee/event-attendance projection implementation plan, then code task split |

## Wave 3 - Cross-Cutting Completion

| Task | Depends on | Deliverable |
| --- | --- | --- |
| RTL-002 | RTL-001 approved | Shared RTL primitives and priority-module implementation |
| PERF-002 | PERF-001 approved | Bounded query/pagination/loading improvements in ranked order |
| CRUD-002 | CRUD-001 approved | Isolated fixes for missing CRUD/lifecycle/security gaps |
| ACCESS-007 | ATT/CP/MASH/CALL/EVENT actions final | Capability catalogue, server gates, UI-context tests, and migration only if required |
| QA-003 | Each integrated module | Updated UAT matrix; no scenario marked passed without browser evidence |

## Agent Prompts

### EVENT-005-EVENT-WORKBOOK-SOURCE-AUDIT
```text
You are implementing EVENT-005-EVENT-WORKBOOK-SOURCE-AUDIT.
Base: 11aadee on codex/lahore-uat-candidate. Branch: agent/<model>/EVENT-005-event-workbook-audit.
Create only docs/reviews/EVENT-005-EVENT-WORKBOOK-SOURCE-AUDIT.md.

Read the owner-provided event workbook(s) read-only. Inventory sheets, headers, formulas, registration, fees, consent, capacity, transport, refunds/waivers, attendance, and summary patterns. Do not expose names, phone numbers, payment amounts tied to people, or raw rows.

Decide and document: canonical event import tables/columns; which columns are required/optional/unsupported; deterministic identity and duplicate rules; how event attendance becomes the single canonical attendance source reflected in regular history without a duplicate AttendanceRecord; fee/registration lifecycle; validation blockers; zero-write dry-run output; execution safeguards; and browser/UAT scenarios.

No application code, schema, migration, seed, DB access, or deployment. Verify git diff contains exactly the one document and git diff --check is clean. Submit the standard handoff.
```

### ATT-001-ATTENDANCE-DATA-FOUNDATION
```text
You are implementing ATT-001-ATTENDANCE-DATA-FOUNDATION.
Base: assigned by Codex after Wave 0 review. Branch: agent/<model>/ATT-001-attendance-data-foundation.

Objective: create the dual-schema, forward-only data foundation needed for Attendance. Allowed files: prisma/schema.prisma, prisma/postgres/schema.prisma, one matching SQLite migration, one matching PostgreSQL migration, and focused schema/migration tests only.

Required model changes:
1. Participant.groupId becomes nullable; relation becomes optional with SetNull. Preserve every existing participant/history record.
2. Participant has nullable dropout metadata: dropoutAt, dropoutReason, dropoutSource (manual|automatic|import). Do not store sensitive free-text beyond an auditable bounded reason.
3. BatchSettings supports: automaticDropoutEnabled default false; dropoutConsecutiveWeeks default 3; selected off weekdays; one-off off dates. Use a normalized model for one-off dates, not an unvalidated JSON blob. Preserve old warning/dropout fields until ATT-002 removes/retires their behavior safely.
4. Add StaffAttendanceRecord linked to AttendanceEvent and StaffMeta, unique per event/staff member, with status/marker/audit fields.
5. Add an AttendanceEvent roster/eligibility snapshot sufficient to keep historical class strength stable after a participant moves group or becomes dropout.

Requirements: both schemas must remain aligned; SQLite/PostgreSQL migrations must be forward-only and preserve current data; create indexes/unique constraints needed for scoped summaries; no generated Prisma edits; no API/UI/import changes.

Tests: schema validation for both schemas; fresh SQLite migration chain; a migration/data-preservation test or documented disposable migration verification; verify nullable group relation and unique staff event record. Run focused tests, lint, typecheck, migration validation, and diff check. Handoff must state migration, data, rollback, and staging-deployment impact.
```

### ATT-002-ATTENDANCE-POLICY-ENGINE
```text
You are implementing ATT-002-ATTENDANCE-POLICY-ENGINE.
Base: ATT-001 integrated SHA supplied by Codex. Branch: agent/<model>/ATT-002-attendance-policy-engine.

Allowed files: src/lib/attendance/**, focused attendance route files/tests, bounded validation schemas, and no UI. Do not edit Prisma/migrations.

Implement one shared server-side policy engine used by online marking and offline sync:
- Saturday/Sunday are default scheduled days, but special sessions on another day are allowed.
- Configured selected weekdays and one-off off dates are excluded from expected sessions and dropout evaluation.
- Manual dropout is an authorized state transition from student profile/API: atomic participant update, audit record, and no future roster eligibility. Historical attendance stays visible.
- Automatic dropout is disabled by default. When enabled, exactly N consecutive completed calendar weeks with no present/late mark triggers state=dropout, metadata source=automatic, and one auditable transition. Leave/excused, N/A, unclosed sessions, off days, and missing/unmarked sessions do not count as absent weeks.
- Never trust a client supplied city/park/group/actor; enforce complete hierarchy scope and capability server-side.
- Avoid duplicate notifications/audit records under retry/concurrency.

Add real unit/route tests for disabled policy, three missed completed weeks, attended break, leave/N/A/off-day exclusion, manual scope allow/deny, repeated invocation idempotency, malformed input, and offline sync parity. Use transactions for state/audit integrity. Run focused tests, eslint, typecheck, diff check. Submit isolated SHA.
```

### ATT-003-ATTENDANCE-SUMMARIES-AND-STAFF-ATTENDANCE
```text
You are implementing ATT-003-ATTENDANCE-SUMMARIES-AND-STAFF-ATTENDANCE.
Base: ATT-002 integrated SHA supplied by Codex. Branch: agent/<model>/ATT-003-attendance-summaries.

Allowed files: attendance summary/staff attendance API routes, existing reports components only if necessary, validations, focused tests. No schema/migration/importer changes.

Build scoped APIs and minimal responsive UI contracts for:
1. Student Summary: eligible closed sessions, present/late/absent/excused, rate, last marked date, missed-week streak, state/dropout metadata.
2. Murabbi Summary: StaffAttendanceRecord-based totals/rate, assignment/title, active/inactive display. Never infer attendance from participant rows.
3. Class Stats: event/group snapshot strength, marked/unmarked, status totals, rate.

All list queries require bounded date range and page/limit. HQ must select a city; scoped users derive it. Return 400/401/403/404 deterministically. Preserve PII minimization and scope in every aggregate. Test all scope classes, empty state, snapshot stability, pagination/range validation, and staff record uniqueness. Include 375px/390px UI tests if UI changes. Verify standard gates and hand off.
```

### ATT-004-LAHORE-ATTENDANCE-RECONCILIATION
```text
You are implementing ATT-004-LAHORE-ATTENDANCE-RECONCILIATION.
Base: ATT-003 integrated SHA supplied by Codex. Branch: agent/<model>/ATT-004-lahore-reconciliation.

Allowed files: scripts/lahore-batch-4-*.cjs, src/lib/lahore-batch-4-*.test.ts, docs/verification/ATT-004-RECONCILIATION-RUNBOOK.md. No UI, schema, deployment, or real database writes.

Implement a zero-write-first reconciler for the supplied workbook. The approved historical cutoff is 2026-07-26. It must:
- Exclude future isolated marks, malformed values, and summary rows.
- Match existing Lahore participant records within city/park using a deterministic reviewed key; never delete a participant or attendance history.
- Produce create/update/no-op/conflict/unmatched counts with source references only, no PII in artifacts.
- Preserve 12 genuine unassigned participants with null groupId.
- Treat historical Dropout cells as auditable proposed imported state, not an automatic unreviewed mutation.
- Require explicit target confirmation and idempotency key for any future execution mode; default remains zero writes.
- Make reconciliation transaction-safe and retry-safe; refuse non-Preview/non-approved connection targets.

Tests must execute the actual parser/reconciler with synthetic fixtures for existing match, new record, duplicate, no-delete divergence, invalid cutoff, replay/no-op, and refusal guards. Do not run execution mode or access real credentials. Submit runbook and isolated SHA.
```

### ATT-005-ATTENDANCE-MOBILE-WORKFLOW
```text
You are implementing ATT-005-ATTENDANCE-MOBILE-WORKFLOW.
Base: ATT-003 integrated SHA supplied by Codex. Branch: agent/<model>/ATT-005-attendance-mobile-workflow.

Allowed files: attendance roster/settings/student-profile related UI/API files, focused tests. No schema/migration/importer changes.

Deliver mobile-first workflows: batch schedule/off-day policy editor for authorized roles; manual dropout action in student profile with confirmation/reason; staff attendance marking; Student/Murabbi/Class Summary views. Use server-resolved capability context, no client role arrays. At 375px/390px, every primary action is reachable, touch targets are at least 44px, tables have an intentional mobile representation, and empty/error/403/409 states are usable.

Verify API authority/scope, responsive component tests, and provide a browser-UAT checklist. Do not claim browser pass without evidence.
```

### MASH-005-REFRESH-STUCK-ROOT-CAUSE-AND-FIX
```text
You are implementing MASH-005-REFRESH-STUCK-ROOT-CAUSE-AND-FIX.
Base: 11aadee. Branch: agent/<model>/MASH-005-refresh-stuck.
Allowed files: Mashwara page/client/ui-context route and focused tests only.

Reproduce the refresh-stuck problem on direct navigation and browser refresh. Identify whether it is an app-shell route wrapper, React Query context gate, hydration/session state, or request failure. Fix the root cause without adding role checks to the client, bypassing server ui-context, or disabling authorization. Ensure clear loading/error/403 state and no protected meetings/detail query before context succeeds. Add component-level regression tests that exercise actual query enabled conditions. Run focused Mashwara tests, targeted lint, typecheck, and diff check. Browser UAT remains required.
```

### MASH-006-TASK-NOTIFICATIONS
```text
You are implementing MASH-006-TASK-NOTIFICATIONS.
Base: MASH-005 integrated SHA supplied by Codex. Branch: agent/<model>/MASH-006-task-notifications.

Implement task assignment, due date, status, completion/reopen lifecycle, and in-app notification delivery for Mashwara action items. Reuse existing Mashwara scopes and Notification models/patterns. Every mutation must be transactional with sanitized audit data; notify only the actual assignee; notification never grants access. Test 401/403 foreign city, inactive assignee, malformed body, task lifecycle conflicts, notification creation, duplicate/retry idempotency, and audit redaction. Add mobile-safe UI only if the API contract is green. No chat or document links.
```

### CP-IMPORT-001-CONTENT-PLANNER-DRY-RUN
```text
You are implementing CP-IMPORT-001-CONTENT-PLANNER-DRY-RUN.
Base: assigned by Codex after Attendance stabilization. Branch: agent/<model>/CP-IMPORT-001-dry-run.

Build a zero-write import preview for the approved content workbook. Operator explicitly provides city, target plan, and park/batch context. Preserve city template vs State Life override, week/session labels, off days, Sports/Skills/Tadreeb blocks, focus area, source sheet/row. URLs must be detected but fail closed: show as blocked proposed resources until allowlist/safe redirect are available. Add parser/reconciliation tests and a concise review report. No real data import, no external fetches, no UI mutation, and no inferred city/scope.
```

### CALL-009-CALLING-IMPORT-TEMPLATE-AND-PREVIEW
```text
You are implementing CALL-009-CALLING-IMPORT-TEMPLATE-AND-PREVIEW.
Base: assigned by Codex after owner supplies/approves visual source pattern. Branch: agent/<model>/CALL-009-import-preview.

Create the versioned Calling import template and zero-write preview. Canonical columns: source reference, campaign code, city code, applicant reference, applicant name, primary mobile, WhatsApp number, status, response, historical note, current note, source date, assignee reference. Campaign/sheet/city must be explicit; applicant matching must be deterministic and scoped; no row may create an admission application. WhatsApp is a secondary contact, not guardian data. Assignees require active approved caller mapping; notes never enter audit logs. Test malformed/unknown columns, foreign scope, unmatched application, duplicate source reference, unrecognized assignee, PII redaction, and no-write default.
```

### PERF-001-PERFORMANCE-AUDIT
```text
You are implementing PERF-001-PERFORMANCE-AUDIT.
Base: 11aadee. Branch: agent/<model>/PERF-001-performance-audit.
Create only docs/reviews/PERF-001-PERFORMANCE-AUDIT.md.

Audit current active module pages/routes for unbounded queries, N+1 patterns, missing pagination, client waterfall/context loops, large response payloads, direct-refresh failures, and mobile loading behavior. Rank P0/P1/P2 findings with exact paths/lines and specific remediation tasks. Do not modify code, run against real data, or claim measured production latency. Include a proposed performance budget and evidence plan.
```

### CRUD-001-MODULE-LIFECYCLE-AUDIT
```text
You are implementing CRUD-001-MODULE-LIFECYCLE-AUDIT.
Base: 11aadee. Branch: agent/<model>/CRUD-001-module-lifecycle-audit.
Create only docs/reviews/CRUD-001-MODULE-LIFECYCLE-AUDIT.md.

Audit Attendance, Content Planner, Events, Mashwara, Calling, Media, Teams, Students, Guardians, Admissions, Fees, and Access Management. For each module/action state create/read/update/delete/archive/close/reopen/assign, record current API/UI support, role/capability, hierarchy scope, audit behavior, error states, tests, and UAT need. Identify gaps and sequence small isolated implementation tasks. Current code evidence wins over old documents. No code or data changes.
```

### RTL-001-URDU-RTL-AUDIT
```text
You are implementing RTL-001-URDU-RTL-AUDIT.
Base: 11aadee. Branch: agent/<model>/RTL-001-urdu-rtl-audit.
Create only docs/reviews/RTL-001-URDU-RTL-AUDIT.md.

Audit shared layout, sidebar, forms, dialogs, tables, date/status presentation, charts, and priority module pages for RTL correctness. Identify hard-coded left/right styles, icon direction, mixed Urdu/English issues, focus order, overflow at 375/390px, and locale/date formatting gaps. Produce a phased, low-regression implementation plan with required visual/browser tests. No code edits.
```

### ACCESS-006-FINAL-MODULE-CAPABILITY-AUDIT
```text
You are implementing ACCESS-006-FINAL-MODULE-CAPABILITY-AUDIT.
Base: assigned by Codex after CRUD-001. Branch: agent/<model>/ACCESS-006-capability-audit.
Create only docs/reviews/ACCESS-006-FINAL-MODULE-CAPABILITY-AUDIT.md.

Using the verified current capability catalogue and CRUD matrix, list every released module action and identify missing/overbroad capability codes, static role checks, UI/server inconsistencies, missing hierarchy scope, and missing tests. Propose a versioned capability/action matrix and safe implementation order. Do not modify defaults, schema, routes, or UI. Never recommend a free-text runtime capability system.
```

## Coordinator Review Checklist

Before accepting any agent handoff, Codex verifies: correct base/isolated history; exact allowed files; actual changed code tested; security/scope behavior; migrations in both schemas; no real data/secrets/deployment; lint/typecheck/diff check evidence; and UAT explicitly pending where no browser evidence exists.
