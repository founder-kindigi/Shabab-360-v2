# Selective context map

Load the smallest useful source set. Search headings first and read only the relevant section unless the whole document is necessary.

| Need | Primary source |
| --- | --- |
| Authority, baseline, roadmap, decisions, done criteria | `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` |
| Module status and implementation order | `docs/MODULE_CATALOG.md` |
| Role permissions and data scope | `docs/ROLE_BASED_ACCESS_MATRIX.md`, then `src/lib/auth/scope.ts` |
| Auth and access provisioning | `docs/modules/MODULE_01_AUTH_FOUNDATION.md` |
| Cities, parks, groups, people | `docs/modules/MODULE_02_CITY_OPERATIONS.md` |
| Attendance and offline attendance | `docs/modules/MODULE_03_PARK_ATTENDANCE.md` |
| Dashboards and role portals | `docs/modules/MODULE_04_DASHBOARDS.md` |
| Access provisioning | `docs/modules/MODULE_05_ACCESS_PROVISIONING.md` |
| Fees and payments | `docs/modules/MODULE_06_FEES_PAYMENTS.md` |
| Admissions | `docs/modules/MODULE_07_ADMISSIONS.md` |
| Announcements | `docs/modules/MODULE_08_ANNOUNCEMENTS.md` |
| Reports and exports | `docs/modules/MODULE_09_REPORTS_EXPORTS.md` |
| Guardian and participant portals | `docs/modules/MODULE_10_FAMILY_PORTALS.md` |
| Database migration | `docs/MIGRATION_DESIGN.md` and `prisma/postgres/migrations/` |
| Audit and personal data | `docs/AUDIT_DATA_POLICY.md` |
| Deployment, incidents, rollback | `docs/OPERATIONS_RUNBOOK.md` |
| Release gates | `docs/reviews/pilot_release_checklist.md` |
| Historical rationale only | Search `worklog.md`; do not load it by default |

Resolve conflicts using the authority order in the blueprint. Verify any implementation claim against current code and fresh evidence.
