# Gemini packet — ATT01 attendance frontend integration

Read `AGENTS.md`, `docs/delivery/tasks/ATT01.md`,
`docs/delivery/reports/ATT01_BASELINE_AUDIT.md`, and
`docs/delivery/reports/ASTRA_ATT01_DEEPSEEK_REVIEW.md` before editing.

## Approved backend contract

The existing group-session attendance APIs remain unchanged except for this
reactivation rule:

`POST /api/admin/students/:id/dropout` with `action: "reactivate"` requires:

```json
{
  "action": "reactivate",
  "reason": "at least 10 characters",
  "effectiveDate": "YYYY-MM-DD"
}
```

The server rejects absent, future, and pre-dropout rejoin dates. It preserves
historical attendance, excludes the dropout-to-rejoin interval, and resumes
attendance on the rejoin date. The server authorizes every request.

The roster phone number is an owner-approved, scoped operational-contact
exception: attendance staff may call or send WhatsApp to the guardian of an
absent student. Preserve the existing absence-only call/WhatsApp actions; do
not surface phone numbers elsewhere.

## Allowed files

- `src/components/modules/student-profile/profile-page.tsx`
- `src/components/modules/student-profile/profile-page.test.ts`
- `src/components/modules/park/mobile-attendance-page.tsx`
- `src/components/modules/park/mobile-attendance-page.test.ts`
- `docs/delivery/reports/GEMINI_ATT01_FRONTEND.md`

Do not edit APIs, schemas, migrations, generated clients, package files,
authentication, offline queue internals, workbook data, or production config.
Preserve unrelated dirty work.

## Required frontend work

1. In the existing reactivation control, show a labelled rejoin-date input only
   for a dropout participant. Include it in the reactivation request, require
   it before enabling the action, clear it after success, and preserve the
   existing visual design. Do not change manual dropout behavior.
2. Add an interaction test that verifies the valid reactivation payload carries
   the selected date, and that missing date prevents submission. Keep tests
   synthetic; do not use real contact data.
3. Compare the existing mobile attendance screen to these exact references:
   - `docs/pwa screens/Screenshot 2026-09-04 211804.png`
   - `docs/pwa screens/Screenshot 2026-09-04 212033.png`
   - `docs/pwa screens/Screenshot 2026-09-04 212138.png`
   Preserve the established mobile design and real behavior. Make only
   concrete fixes needed for reference parity or truthful states.
4. Preserve group/date selection, marking, offline queue, failures/conflicts,
   closed session controls, and absence-only call/WhatsApp action. Do not add
   sample contacts, test credentials, local-only fake attendance, or an
   alternate desktop layout.

## Verification and return

Run focused component tests, scoped ESLint, TypeScript if possible, and scoped
`git diff --check`. Return exact changed files, visual/reference evidence,
commands/exits/test totals, and unresolved limits. Do not claim Astra review,
release, deployment, or production readiness.
