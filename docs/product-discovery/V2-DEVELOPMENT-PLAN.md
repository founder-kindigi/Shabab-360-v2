# Shabab 360 V2 Development Plan

**Status:** Proposed roadmap. Each task requires separate owner approval before implementation.

## V2 Goals

V2 extends the Lahore release without weakening the current production baseline. The priority is reliable historical-data import, then deeper operational workflows, then performance and release hardening.

## Non-Negotiable Delivery Rules

- Server-side authorization and city, park, and group scope remain authoritative.
- Every import supports discovery and dry-run modes before an explicit execution mode.
- Imports must use bounded, versioned templates and provide row-level validation results.
- No import may infer city, park, batch, group, or caller scope where the workbook does not provide an approved matching key.
- Reconciliation is idempotent, auditable, and reports created, updated, unchanged, skipped, and conflicted records.
- Audit records must not contain raw passwords, full calling notes, or unnecessary personal data.
- SQLite and PostgreSQL schemas and forward-only migrations remain aligned when applicable.
- Each delivery slice needs focused tests, lint, typecheck, and an appropriate UAT checklist before release.

## Confirmed Product Decisions

- Team chat is retained until the team is archived.
- Super Admin and City Head can maintain a configurable external-document domain allowlist.
- The external-link warning/interstitial setting is configurable.
- Deactivating a team member dims their profile and preserves past contributions; it does not delete their team history.
- Content Planner workbook URLs remain blocked until the allowlist and safe redirect policy are implemented. This includes the 51 URLs intentionally excluded during Lahore reconciliation.
- Attendance supports configurable off weekends and exception dates across relevant modules.
- Attendance dropouts support a configurable automatic consecutive-absence policy plus manual marking from the student profile; attendance stops after dropout unless the student is reactivated.

## Wave 0: Release Baseline And Import Platform

### V2-001 Release Baseline

1. Tag and document the approved production baseline.
2. Record deployment identity, rollback procedure, and restore-tested backup ownership.
3. Add application error monitoring and a release health checklist.
4. Establish a change log and release-notes format.

**Exit gate:** production baseline, rollback owner, and monitoring owner are documented.

### V2-002 Shared Import Framework

1. Build a common Excel/CSV parser interface for module importers.
2. Define versioned import templates with required, optional, and unsupported columns.
3. Add discovery, dry-run, and explicit execute modes.
4. Provide row-level errors, duplicate detection, matching evidence, and reconciliation reports.
5. Require explicit city, park, batch, group, campaign, or plan context where applicable.
6. Add transaction boundaries, sanitized audit events, and a post-run report.

**Exit gate:** one reusable import framework has tests for malformed input, scope denial, dry run, duplicate handling, and idempotent rerun.

## Wave 1: Historical Data Import

### V2-101 Registrations And Admissions Import

1. Define canonical registration/admission workbook columns.
2. Match applicants using approved source references and deterministic fallback rules.
3. Validate city scope, status, interview data, guardian links, and duplicate candidates.
4. Support dry-run and execute reconciliation with row outcomes.
5. Preserve unsupported source fields in a safe exception report rather than silently dropping them.

**Exit gate:** a representative workbook imports without unresolved conflicts and produces a reconciliation report.

### V2-102 Calling History Import

**Canonical fields:** source reference, campaign code, city code, applicant reference or name, primary mobile, WhatsApp, status, response, source date, assignee reference, and current/history notes.

1. Map workbook rows to approved campaigns and server-derived city scope.
2. Create or reconcile calling applications, assignments, and interaction history.
3. Treat notes as sensitive: exclude raw values from audit payloads and reports.
4. Flag unmatched applicants, callers, and campaigns for operator resolution.
5. Confirm imported PII remains visible only to directly assigned callers.

**Exit gate:** import is dry-run-first, PII-safe, idempotent, and has route-level authorization tests.

### V2-103 Previous Three Batches Import

1. Import cities, parks, batches, groups, Murabbi assignments, students, guardians, and attendance in controlled phases.
2. Reconcile against existing records instead of duplicating them.
3. Preserve valid unassigned students and report them for later assignment.
4. Apply dropout state only where source evidence and approved policy support it.
5. Produce per-batch import counts and conflict reports.

**Exit gate:** each historical batch has a signed reconciliation report and browser spot-check evidence.

## Wave 2: Collaboration Workspace

### V2-201 Team Activity Planner

1. Use `/api/admin/teams` as the canonical Teams API.
2. Implement scoped activity creation, assignment, status transitions, and audit history.
3. Enforce active membership as `isActive === true && endedAt === null`.
4. Preserve past activity contributions for inactive members.

### V2-202 Internal Team Chat

1. Implement city-scoped, membership-authorized chat.
2. Retain messages until team archive.
3. Add archive, moderation, and audit controls.
4. Do not introduce file uploads in the first delivery slice.

### V2-203 Document Links And Safe Redirects

1. Build Super Admin/City Head management for the domain allowlist.
2. Implement configurable warning/interstitial behavior.
3. Validate outbound URLs server-side and audit link creation safely.
4. Reconcile the 51 blocked Content Planner source URLs only after policy configuration is live.

**Exit gate:** team activities, chat, and external links are capability-scoped, tested, and browser-verified.

## Wave 3: Operational Module Expansion

### V2-301 Calling Operations

1. Add workload views, reassignment history, callbacks, and reminders.
2. Add safe WhatsApp deep links without exposing PII outside assigned-caller scope.
3. Add City Head operational exports with server-side scope filtering.
4. Integrate the V2-102 calling-history importer.

### V2-302 Events Operations

1. Add registration, capacity, waitlist, and fee workflows for paid events such as trips, camps, and swimming.
2. Project event attendance into regular attendance so the same attendance is never marked twice.
3. Add event reports and mobile check-in workflows.

### V2-303 Mashwara Operations

1. Add recurring meetings, task lifecycle, reminders, and completion reporting.
2. Notify the assignee when a task is assigned or changed.
3. Add printable/exportable meeting minutes.
4. Extend module-scoped Urdu/RTL support while keeping the global application LTR.

### V2-304 Attendance Operations

1. Complete automated dropout evaluation, manual dropout, reactivation, and policy administration.
2. Add Student Summary, Murabbi Summary, and Class Stats.
3. Support configurable class days, off weekdays, off dates, and special attendance dates.
4. Harden offline synchronization, conflict handling, exports, and mobile attendance workflows.

**Exit gate:** every workflow has server authorization, lifecycle tests, and real-device UAT evidence.

## Wave 4: Quality, Performance, And Reliability

### V2-401 Performance

1. Add response timing, query-count, and payload-size telemetry.
2. Apply pagination and bounded filters to heavy list and report routes.
3. Remove avoidable client request waterfalls.
4. Add indexes only with measured query evidence and migration review.
5. Enforce performance budgets for primary mobile screens.

### V2-402 Mobile-First UX

1. Audit 375px and 390px workflows across every released module.
2. Ensure touch targets, scrolling, dialogs, tables, and actions are usable on phones.
3. Remove generic filters where module-specific filters are clearer and safer.

### V2-403 Security And Release Controls

1. Run dependency and secret exposure reviews.
2. Perform a documented backup restore drill.
3. Rehearse migrations against a staging copy before production deployment.
4. Review audit retention and sensitive-response controls.
5. Run cross-role scope regression tests.

## Wave 5: Acceptance And Rollout

### V2-501 UAT

1. Refresh the UAT execution matrix for all V2 workflows.
2. Capture role, viewport, expected result, and screenshot evidence per scenario.
3. Triage and close blockers before acceptance.

### V2-502 Production Rollout

1. Confirm approved release SHA, migrations, private configuration, and backup readiness.
2. Deploy through the controlled production path.
3. Run post-deployment smoke tests and monitor errors and performance.
4. Publish release notes and known limitations.

## Recommended Sequence

`V2-001` -> `V2-002` -> `V2-101` / `V2-102` / `V2-103` -> `V2-301` -> `V2-304` -> `V2-201` / `V2-202` / `V2-203` -> `V2-302` / `V2-303` -> `V2-401` / `V2-402` / `V2-403` -> `V2-501` -> `V2-502`.

Parallel work is acceptable only when branches have a common approved base and their schemas, routes, and UI files do not overlap. Integration remains controlled, reviewed, and verified after every batch.
