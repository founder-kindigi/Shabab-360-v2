# C2-03 handoff — additive preservation mappings

## Candidate and scope

Candidate: `D:/iBuild/Shabab-360-c0-20260911/c2-preservation-20260912` (`codex/c2-preservation-20260912`), rooted at `401ff322726c3ceab9b05db776b2b076e63bbaf5` with the accepted C2-01 candidate patch. The original dirty v2 checkout, C0 worktrees, UI, application routes, operational databases and accounts were not edited.

Both Prisma schemas now map the six historical table families omitted from the v2 schema: `MediaBrief`, `EventFeeSchedule`, `AttendanceRosterSnapshot`, `BatchOffDate`, `BatchOffWeekday`, and `LegacyStaffAttendanceRecord`. The latter remains distinct from v2 `StaffAttendanceRecord`: its table is `staff_attendance_records` and it relates to ordinary `AttendanceEvent`; v2 retains `park_staff_attendance_records` and `StaffAttendanceEvent`. `EventRegistration` now declares the historical provenance fields and nullable links already present in migration history.

The initial forward migrations were removed after native replay established that the historical migrations already create every intended table and registration field. Keeping them would fail on duplicate columns. This is schema-to-history reconciliation, not an operational data migration.

## Verification

| Check | Result | Evidence / limit |
|---|---|---|
| SQLite and PostgreSQL Prisma schema | pass | Both `prisma validate` commands passed with disposable URLs. |
| SQLite synthetic schema/data test | pass | SQLite 3.50.4; both staff tables, registration linkage, six model round trips, clean FK check, and unique/FK rejection. |
| Native PostgreSQL history | pass | PostgreSQL 18.6 disposable WSL instance; all 31 retained migrations applied. |
| PostgreSQL synthetic query | pass | `r1` has `consentStatus=not_required` and null optional links; all seven expected table identities resolve. |
| Candidate lint, tests, typecheck | pass | `npm run lint`, `npm test`, and `npm run typecheck` exited 0 against candidate source. |
| Prisma client generation | pass | SQLite and PostgreSQL schemas generated Prisma Client v6.19.3 after explicit owner authorization. |
| Candidate production builds | pass | `npm run build` and `npm run build:postgres` completed with disposable settings; each released `.next/lock` and produced `.next/BUILD_ID`. |

SQLite full migration-history replay remains blocked by pre-existing C1-F06: `20260730060714_add_attendance_foundation` lacks its `batch_settings` baseline. C2-03 does not alter applied history to conceal that defect. The SQLite check is schema-created synthetic verification; only PostgreSQL received native full-history replay.

## Data, security, recovery

No data was transformed, imported, deleted, or accessed outside disposable synthetic databases. No workflow, API, capability, payment, consent, retention or notification behavior was enabled. Since C2-03 leaves no forward migration, there is no operational migration rollback; reverting the two schema files returns the prior Prisma mapping while the historical tables remain intact. Any later operational compatibility migration requires an approved backup/recovery rehearsal.

## Open work and outcome

`Participant.groupId` nullability and dependent query/delete semantics remain deliberately untouched. Main rows that require later null-placement compatibility are unsupported. Shared-model reconciliation, C1-F04/F06/F17 integration, operational schema reconciliation, independent review and release approval remain open.

**Lead outcome: bounded candidate accepted as a schema/history reconciliation. It is not independent review, merge approval, deployment approval, or release approval.**
