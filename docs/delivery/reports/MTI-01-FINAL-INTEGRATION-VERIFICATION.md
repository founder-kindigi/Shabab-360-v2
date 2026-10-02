# MTI-01 final integration verification — 2026-10-01

Status: **local integration gates green; no production release or deployment performed**. This review uses current source and independent commands, not agent handoff claims. No live migration, real form publication, production data, or deployment was used.

## Findings and scoped corrections

- The generic admin/public route tests already covered manager authentication and capability, wrong roles, missing and cross-city scope, invalid drafts, stale versions, publish/close conflicts, immutable revision records, hidden/closed intake, invalid answers, and same-key retry/race behavior. Added explicit tests that an oversized body is rejected before DB access and an identical retry still returns its saved receipt after closure.
- The public page could reset an applicant's review/success state after query refetch. State transitions now preserve in-progress review and completed receipt; a UI regression test exercises review after refetch.
- The public fields lacked associated accessible labels; inputs, city selector, radio group and Other City input now have labels. The staff sidebar exposed the raw `nav.registrationForms` key; English and Urdu labels are present.
- The full suite's calling-import CLI tests depended on `npx` downloading an undeclared runner during execution. `tsx` is now pinned locally and the tests invoke Node with `--import tsx`, avoiding shell parsing, network access and worker timeouts.
- The production build depended on downloading Google Fonts. Geist is now pinned and loaded from its packaged local font files, so the build is deterministic without Google Fonts access.

## Gate results

| Gate | Result |
| --- | --- |
| Focused generic API, definition, portal UI and public UI tests | **Pass:** 12 files, 74 tests |
| SQLite schema validation: `npx prisma validate --schema prisma/schema.prisma` | **Pass** |
| PostgreSQL schema validation: `npx prisma validate --schema prisma/postgres/schema.prisma` | **Pass** with disposable dummy connection environment values |
| `npm run lint` | **Pass:** 0 errors, 6 existing unused-disable warnings in `scripts/*.cjs` |
| `npm run typecheck` | **Pass** after correcting the new test's typed fetch mock |
| `npm test -- --maxWorkers=4 --reporter=dot` | **Pass:** 263 files passed, 2 skipped; 2,066 tests passed, 23 skipped; no worker timeout (247.58 seconds). |
| `npm run build:postgres` | **Pass** with disposable dummy PostgreSQL connection values. Compilation and TypeScript completed; route output includes the generic admin registration APIs, public form APIs and `/register/forms/[slug]`. No database connection or migration was attempted. |

## Browser checks with disposable synthetic data

A separate SQLite file contained only two synthetic cities, two synthetic staff identities, disposable forms, one published revision and one synthetic applicant. The generated Prisma client was temporarily switched to SQLite to run a loopback-only local dev server, then restored to the checkout's PostgreSQL target. The synthetic file and browser tabs were removed after testing.

- Public mobile viewport: published form, eligibility/fee copy, required answers, review and consent were visible; synthetic submission returned HTTP 201 and a `REG-` receipt in the success view.
- Public desktop viewport (1366×768): form and inputs rendered within the centered card layout.
- Authenticated staff desktop: a synthetic Super Admin created an Atfal-style draft for Synthetic Lahore, added required privacy/contact consent, saved it, published revision 1, viewed the public receipt in the submissions list, and opened the private answer detail.
- Authenticated staff mobile (390×844): the submission list and private answer sheet rendered without losing fields or actions. The public route also rendered the closed-intake state at the mobile viewport.
- City Head scope: `/api/admin/cities` returned the expected 403, while the normal Create Draft flow still used the authenticated user's assigned city. The resulting disposable draft recorded `ownerCityId = mti-city-lahore`; it did not infer ownership from parks or allow another city.
- Lifecycle: the public form accepted one synthetic submission with HTTP 201 and a `REG-` receipt. After staff closed the form, reloading the same public URL showed “This registration form is no longer accepting submissions.”

## Data, security, migration and rollback

- Submission answers are stored as private `answersJson` on a version-linked record. The public API returns only the published definition and an unguessable receipt; it does not expose answers or a receipt lookup. Staff submission detail requires authenticated manager role, `admissions.manage`, and owner-city scope; list/detail responses use no-store. Scope is based on owning city, never an applicant's city answer. Audit submission records contain form/version metadata, not answers.
- Request bodies and schemas are bounded, server answer validation and consent are authoritative, and retry keys are hashed/uniquely constrained. The per-form durable quota remains 500 submissions per 15 minutes. Any stronger abuse control is a programme launch decision based on expected audience and exposure.
- Owner retention decision (2026-09-30): keep the current retention behavior and decide the period per programme before launch. MTI-01 therefore adds no automatic deletion. Each real programme still requires an explicit retention decision before intake opens.
- SQLite and PostgreSQL migrations add the same three registration tables, indexes and restrictive foreign keys. Existing tables/data are not dropped by these MTI migrations. No live migration was run. Rollback of the application should first close/disable public intake while retaining submitted records; do not drop the new tables if receipts or applications need preservation. A database rollback requires a separate data-retention/export decision and tested backup restore.

## Completion boundary

All required MTI-01 local implementation and integration gates are evidenced. Production migration, real form publication and deployment remain separate release actions. Before each real programme opens, the owner must choose its retention period and decide whether the existing coarse submission quota is sufficient for that programme's exposure.
