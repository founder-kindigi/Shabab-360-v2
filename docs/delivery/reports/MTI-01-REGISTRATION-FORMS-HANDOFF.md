# MTI-01 reusable registration forms — backend handoff

Date: 2026-09-29. Status: local candidate; MTI-01 remains active. Owner clarified the portal must create and publish any registration form. This extends the earlier training-only foundation without converting its draft cohorts to live forms.

## Implemented

- `RegistrationForm`, immutable `RegistrationFormRevision`, and `RegistrationFormSubmission` in aligned SQLite/PostgreSQL Prisma schemas and additive migrations `20260929100000_registration_forms`. No application database was migrated.
- Admin `GET/POST /api/admin/registration-forms`; `GET/PATCH /api/admin/registration-forms/[id]`; `POST /api/admin/registration-forms/[id]/publish` and `/close`; scoped `GET /api/admin/registration-forms/[id]/submissions` and `/[submissionId]`. Requires existing `admissions.manage`, allowed central/city role, and server-enforced operational city scope; missing city scope denies access. Draft updates, publication and close use optimistic versions; publication freezes a revision.
- Public `GET /api/public/forms/[slug]` exposes only a current published revision. `POST /api/public/forms/[slug]/submissions` checks same origin, 32 KB body limit, bounded dynamic answers, published revision, configured eligibility/window and consent; stores a request-key/hash for idempotent retries and returns only a random receipt. A durable per-form quota uses the existing login-attempt window table. Staff detail is no-store and never sent to the public route.
- Blank and Atfal-style starters. The latter includes the nine inspected fields and 34 named city options plus Other City. Eligibility, fee and applicant city list are configurable per form; Lahore is not coded as an applicant restriction. Operational owner city is selected from active Shabab `City` records.

## Verification

Both Prisma schemas validate; SQLite client generation and TypeScript typecheck pass. The new SQLite migration applies to an in-memory database with a cities parent table. Focused dynamic-form and release baseline tests: 176 passed across seven files. Lint passes with six pre-existing unused-disable warnings. The earlier training-only focused checks passed separately. No live submission, deployment or production migration was performed.
`next typegen` and the delivery workflow check pass. `npm run build` was attempted but cannot fetch the existing Geist and Geist Mono fonts from Google in this network environment, so build success is unverified.

## Remaining before feature completion

Gemini frontend has not been dispatched. Exact approved `docs/pwa screens/` references for the new portal builder and public renderer are not yet present. The prepared packet is `docs/delivery/packets/MTI-01-GEMINI-PENDING.md`. The public route will not be usable by applicants until `/register/forms/[slug]` renders the form. Add route-level tests for publish/close, city denial, idempotency, quota/failure and immutable revision behavior; run broader suite and appropriate builds after frontend integration. DeepSeek bounded cleanup and Astra final review have not occurred. Do not mark MTI-01 complete or publish a live form.

Operational risk: migrations are additive, and existing admissions/staff records are untouched. Submitted personal data would require a retention policy, access review and backup/restore evidence before deployment. Rollback closes published forms and disables the route while retaining data; do not drop submission tables.
