# MTI-01 foundation handoff

Date: 2026-09-29. Status: backend foundation implemented locally; MTI-01 remains active. No frontend, publication, live migration or deployment.

## Result

- Added three dedicated models, `TrainingCohort`, `TrainingApplication` and `TrainingApplicationAction`, to both Prisma providers with aligned additive migrations. Training applicants do not enter student admissions or create staff accounts.
- Added bounded, same-origin public submission with a random receipt and a cohort/request-key uniqueness constraint. A same-key/same-payload retry returns the original receipt, including after intake closes. A changed payload conflicts.
- Added a public cohort read endpoint, staff draft-cohort creation/list/edit, city-scoped application list/detail, and version-checked review actions with transactional action/audit writes.
- New cohorts are always created as `draft`. There is deliberately no publish route. Public GET and POST cannot open a draft. This protects the unresolved eligibility, fee, privacy text and abuse-control decisions.
- Existing `admissions.manage` capability plus an explicit Super Admin, Program Admin or City Head role check controls staff access. City Heads are pinned to their assigned city; missing city assignment denies. Park staff, Murabbis and Muawins cannot review induction applications through these routes.

## Implemented HTTP contract

| Method and path | Response and boundary |
| --- | --- |
| `GET /api/public/murabbi-training/[slug]` | Published cohort copy only; `isOpen`; `404` for draft/unknown; no applicant data |
| `POST /api/public/murabbi-training/[slug]/applications` | Strict ≤16 KB JSON; required UUID request key, name, phone, locality, background, connection, motivation, availability, notice version and declaration; `201 {reference}`, identical retry `200`; closed/changed `409` |
| `GET /api/admin/murabbi-training/cohorts` | Scoped, paged draft/published/closed list; max page size 100 |
| `POST /api/admin/murabbi-training/cohorts` | Active city and bounded slug/title/summary/dates/capacity; creates draft and audit; `201 {id,slug,status}` |
| `GET /api/admin/murabbi-training/cohorts/[id]` | Scoped private draft/detail configuration; no-store |
| `PATCH /api/admin/murabbi-training/cohorts/[id]` | Draft-only, strict bounded fields and optimistic version; `200 {version,policyVersion}`; cannot publish or change city/slug |
| `GET /api/admin/murabbi-training/applications` | Scoped, paged list with cohort/status filters; private, no-store |
| `GET /api/admin/murabbi-training/applications/[id]` | Scoped detail and review history; private, no-store |
| `POST /api/admin/murabbi-training/applications/[id]/actions` | Allowed status transition plus optimistic version; `200 {status,version}`, stale/invalid `409`; audit in same transaction |

The form input is intentionally narrower than the planning table: it has no park preference, upload, guardian claim or payment field. Date of birth and email are optional. The public endpoint checks approved copy fields before accepting a submission, but actual eligibility rules, rate limits, cohort publication and capacity/enrolment are not implemented. It must remain unpublished until these are designed and tested.

## Verification

- `npx prisma validate --schema prisma/schema.prisma`: passed.
- PostgreSQL `prisma validate` with placeholder `DATABASE_URL` and `DIRECT_URL`: passed; no connection attempted.
- `npm run db:generate`: passed for the SQLite client in ignored `node_modules`; no generated source was edited.
- Disposable in-memory SQLite migration execution: created all three new tables successfully. No operational database was migrated.
- Focused new API/access suite: 30/30 passed across seven files, including draft editing, retry after closure, public projection and cross-city denial.
- Updated release/migration-count suites: 173/173 passed across six files (77 models per provider; 19 SQLite and 33 PostgreSQL migration folders).
- `npm run typecheck`: passed. `npm run lint`: passed with zero errors and six pre-existing script warnings. `npx next typegen`: passed.
- `node scripts/delivery/check-workflow.mjs`: passed with MTI-01 active and no queued `nextTask`.
- Full `npm test` was attempted. It exposed the expected old release count assertions, which were corrected and verified in the 173-test rerun. The long full run later stopped producing output and was interrupted; there is no final full-suite pass claim.
- `npm run build` failed before compilation completed because Next.js could not fetch existing Geist/Geist Mono fonts from Google in this network-restricted environment. Route type generation and TypeScript passed; the production build remains unverified.

## Data, security and rollback

The migrations create only new tables and indexes, with foreign keys to existing cities/cohorts/applications. Existing rows and tables are untouched. Rollback before use is to stop applying the migrations; after applications exist, disable the module and retain the records until a reviewed retention/export plan exists. Do not drop the new tables as a casual rollback.

PII stays in training application columns; public receipts disclose only a random reference. Staff list/detail are no-store and city scoped. Audit values contain statuses and city, not applicant names or contact fields. The submission route needs durable abuse controls before any publish path is added. Published eligibility must become enforceable policy, rather than relying on text alone. The accepted privacy notice/version, contact purpose, retention period, minor policy and fee treatment remain owner decisions.

## Next work in the same active task

1. Freeze eligibility, fee and privacy copy and enforce the selected eligibility rule server-side; add durable throttling and an authorized, versioned publish/close endpoint.
2. Add transactional enrolment with capacity and its review/audit contract.
3. Approve exact public and staff screen references, then hand the fixed API contract to Gemini for frontend work. Gemini is not connected or dispatched here. DeepSeek clean-code follows integration and is likewise not dispatched.
4. Run both provider migration rehearsals, full suite and successful production builds on an environment with the required tools/network before technical acceptance or release.
