# Superseded — ATT01 roster privacy correction

Superseded on 2026-09-16 by the owner's explicit attendance contact exception.
Scoped attendance staff require the existing call and WhatsApp absence-follow-up
workflow. Do not execute this packet.

Read `AGENTS.md`, `docs/delivery/tasks/ATT01.md`, and
`docs/delivery/reports/ASTRA_ATT01_DEEPSEEK_REVIEW.md` before editing.

## Goal

Apply one required server correction: attendance roster clients must not receive
student phone numbers. The owner-approved safe default exposes only the data
needed to mark attendance: participant identity, attendance state, and current
authorized group/session context.

## Allowed files

- `src/app/api/park/attendance/[eventId]/route.ts`
- `src/app/api/park/attendance/[eventId]/route.test.ts`
- `docs/delivery/reports/DEEPSEEK_ATT01_ROSTER_PRIVACY.md`

Do not edit components, schemas, migrations, generated clients, packages,
auth grants, phone/contact features elsewhere, production data, or deployment.

## Required behavior

1. Do not include `phone` in the roster JSON response.
2. Add a focused regression assertion that the response does not contain the
   source phone fixture.
3. Preserve all roster scope, eligibility/rejoin behavior, record versions,
   status counts, and response fields needed for attendance marking.
4. Do not invent a replacement contact workflow. Gemini will remove the
   existing client-only WhatsApp control after this backend correction passes.

Run the focused route test, scoped ESLint, TypeScript if possible, and scoped
`git diff --check`. Return exact files, commands/exits/tests and remaining
risks. Do not claim review, release, deployment, or production readiness.
