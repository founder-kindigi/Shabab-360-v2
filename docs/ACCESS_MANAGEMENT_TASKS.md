# Access Management Build Tasks

**Status:** In progress
**Policy authority:** [ACCESS_MANAGEMENT_MATRIX.md](ACCESS_MANAGEMENT_MATRIX.md)
**Release boundary:** Soft launch is Super Admin-only administration. City Head delegation is explicitly deferred.

## Delivery Order

| ID | Task | Status | Acceptance gate |
| --- | --- | --- | --- |
| AM-001 | Add one fixed capability catalogue and role-default policy in code. | Complete | Unknown capabilities deny; every current user role has explicit defaults; policy tests pass. |
| AM-002 | Add role-default and named-user override storage to SQLite and PostgreSQL, including a forward PostgreSQL migration. | Complete | Both schemas validate; forward migration adds empty tables only; expiry and explicit deny are representable. |
| AM-003 | Build Super Admin-only APIs to read and change role defaults, scope assignments, and user overrides. | Complete | Super Admin APIs validate fixed inputs, audit in the same transaction, invalidate sessions, and have denial/regression coverage. |
| AM-004 | Build the Super Admin Access Management workspace. | Complete | Clear effective-access view, reason/expiry fields, loading/error/empty states, and no client-only authorization. |
| AM-005 | Enforce approved capabilities on existing module APIs, while retaining the current resource-scope checks. | Complete | Each migrated API has allowed-role, denied-role, and wrong-scope tests. |
| AM-006 | Reconcile the access model with the Lahore import model, then prepare a reviewed dry-run import. | In progress - owner decisions required | No guessed staff/team/scope data; reconciliation and rollback evidence pass. |
| AM-007 | Run Super Admin browser UAT and complete soft-launch deployment checks. | Pending | Real-account flow, expiry/revocation, audit visibility, session invalidation, and Vercel/Supabase checks pass. |
| AM-008 | Consider City Head city-scoped override delegation. | Deferred | Separate owner approval plus city-isolation API and browser UAT. |

## Non-Negotiable Rules

- A module capability never replaces city, park, group, participant, guardian, financial, or audit scope checks.
- An explicit user denial wins over the role default. An override cannot change canonical role or organizational scope.
- Capability codes are fixed and version-controlled. Requests never submit arbitrary capability or route names.
- Every access change is audited with a reason and invalidates existing sessions in the same database transaction.
- Future modules remain denied until their requirements and server enforcement exist.

## AM-004 Completion Evidence

- The Super Admin workspace supports role exceptions and named-user allow/deny overrides with required reasons and optional expiry. Browser UAT on 2026-07-18 verified role and named-user create/audit/revert/revoke flows, persisted expiry, effective-access rendering, empty states, and session-invalidation notices.
- UAT exposed and fixed two defects: `datetime-local` values now reach React state through the native input event, and effective-access reads now exclude revoked or expired rows. Expiry persistence and effective-row filtering have regression coverage.
- Capability enforcement is verified across admissions, attendance, certificates, finance and receipts, organization, dashboards, reports, announcements, notification-queue administration, audit, access administration, staff listing/invitation/import and scope changes, student/guardian imports, family-portal reports and schedules, Murabbi groups, staff search, students, guardians, and member-directory/roster APIs.
- Existing role and city/park/group/participant/guardian/financial scope checks remain authoritative alongside capabilities.
- Attendance-event details now reject wrong-role and wrong-scope callers, while scoped event lists and certificate routes fail closed when required city or park assignments are missing.
- Password reset, own-profile access, targeted announcement polling, and personal read-state acknowledgement are intentional authenticated self-service routes; capability overrides cannot disable these account/security essentials.
- Activity history returns only generic metadata: non-HQ users are restricted to their own actions, while global HQ access requires `audit.view`; actor email, entity ID, and stored audit values are excluded.
- Recovery remains fail-safe: Super Admin defaults and all `access.*` role capabilities are immutable, while named-user overrides cannot target access-administration capabilities.
- Final local cleanup confirmed zero active role exceptions and zero active named-user overrides. Lint, typecheck, and all 231 tests pass. No access-management migration has been deployed to production; AM-006 is now ready, while any real Lahore import still requires reconciliation and reviewed dry-run evidence.

## AM-006 Dry-Run Evidence

- A versioned, non-writing parser at `scripts/lahore-batch-4-dry-run.cjs` reads the supplied Lahore Batch 4 workbook and emits only a locally ignored redacted report. It does not import data, create accounts, instantiate Prisma, or connect to a database.
- The first run identified six parks, 13 groups, 254 numbered students, 23 populated unnumbered student candidates, 51 staff rows, 79 numbered students without phones, and source age/grade fields without approved destinations. The previous workbook summary says 255 students, so the roster is not yet authoritative.
- Attendance remains deliberately withheld until the owner supplies a completed-through date; zero events and zero records were proposed. Staff and team titles remain report-only because the current single-role/single-scope staff model cannot safely infer the required real assignments.
- AM-006 cannot advance to a staging rehearsal until Lahore leadership reconciles the roster, confirms attendance eligibility, approves an age/grade treatment, and provides named canonical-role and scope nominations. No production data has been changed.
- The owner has since confirmed the 19 July 2026 attendance cutoff and approved age plus grade/class retention. Additive application support and a forward PostgreSQL migration now exist, but neither schema deployment nor a data import has run. Remaining AM-006 gates are roster reconciliation, named staff/scope mapping, blank Murabbi assignment resolution, backup, and staging rehearsal.
- The corrected cutoff dry run proposes 181 historical attendance events and 2,942 student records, with status reconciliation passing and zero writes. It identifies 20 distinct dropout decisions, one malformed status, 23 unnumbered source candidates, one blank Murabbi assignment, and the pending profile-schema deployment as 46 blocking gates. Details remain in the restricted local report and the Lahore import plan.

## AM-002 Migration Notes

- New tables only: this migration neither changes nor deletes existing user, staff, student, guardian, attendance, fee, or audit records.
- The application will validate `role`, `capability`, and `effect` against fixed source constants before any write. A database row alone cannot grant an unknown capability.
- Rollback before application use is `DROP TABLE "user_capability_overrides"; DROP TABLE "role_capability_overrides";`. After access changes have been made, restore from a verified backup instead of dropping audit-relevant records.
- Do not deploy the migration until AM-003 is implemented and the migration SQL has passed staging review.
