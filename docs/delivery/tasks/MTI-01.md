# MTI-01 — Murabbi Training induction foundation

Assigned to: Astra. Module: murabbi-training-induction. Status: done (local integration accepted; release is separate).
Base: `73425a5af08e366d437eed76dc112e6df9f0455e`, with substantial pre-existing dirty ATT01 and other changes preserved. Depends on: U01.

## Outcome and boundary

The owner clarified on 2026-09-29 that **any registration form** must be configurable and publishable from the portal. Build a reusable form definition, immutable published revisions and bounded public submissions. Murabbi Training is the first starter template; Lahore is its initial owning city, while applicant city choices contain the full observed Atfal list and remain editable per form. Eligibility, fee and contact/privacy copy are form settings, not hard-coded product rules. No live database, import or deployment.

Affected files: new training and generic form routes, services/validation/tests, both Prisma schemas and forward migrations, and these task/product documents. Existing authorization primitives may be used. Release test model/migration baselines and the attendance PostgreSQL migration-count test may be updated for the additive migrations; attendance application code remains out of scope.

## Minimal inputs

`docs/product-discovery/MURABBI-TRAINING-INDUCTION-PLAN.md`, blueprint sections 8.2 and 8.5, current auth/scope/Prisma/admissions patterns, and W4 workbook structure in `docs/delivery/baseline/WORKSHEET_MAP.md`. Private workbook rows are excluded.

## Contract and verification

Use the owner clarification and product plan as a starting point and record final implemented paths and response shapes in the handoff. Generic public routes disclose only a published form revision and random submission receipt. Authenticated staff routes require `admissions.manage` plus central/city role and city scope until a dedicated form capability is designed. Validate with strict bounded schemas, return denial/conflict errors, and use transactions for state changes. Test success, invalid input, hidden/closed forms, cross-city denial and repeated submissions. Validate both provider schemas and migration direction; run focused tests, lint, typecheck and builds. Current backend evidence and remaining work are in `docs/delivery/reports/MTI-01-REGISTRATION-FORMS-HANDOFF.md`.

The Gemini frontend candidate is integrated in the shared working tree and its fifth-pass focused verification is recorded in `docs/delivery/reports/MTI-01-GEMINI-FRONTEND-VERIFICATION-5.md`. The screen structure is approved in `docs/pwa screens/PROPOSED_REGISTRATION_SCREENS.md`. DeepSeek's bounded clean-code handoff was returned through the owner's interface and Astra accepted the inspected cleanup in `docs/delivery/reports/ASTRA_MTI01_DEEPSEEK_REVIEW.md`. The current independent gate results are recorded in `docs/delivery/reports/MTI-01-FINAL-INTEGRATION-VERIFICATION.md`. Full tests, both schema validations, lint, typecheck, the PostgreSQL build and authenticated synthetic browser lifecycle are green. The owner retained the current storage behavior and will choose a retention period per programme before launch. MTI-01 is complete as a local integrated candidate; production migration, real publication and deployment require separate authorization.
