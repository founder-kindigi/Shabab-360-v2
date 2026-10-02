# ATT01 baseline audit — group-session attendance

Date: 2026-09-16. Candidate: current dirty `v2` workspace. This is a source
and synthetic-test audit, not a production or team-release approval.

## What already works in v2

The module is already a substantial group-session attendance implementation:

- Scoped daily session preparation and listing:
  `GET`/`POST /api/park/attendance` and `POST /prepare`.
- Scoped roster reads and marks with participant membership, attendance
  eligibility, session closure, reset generation, record-version, and
  idempotency checks.
- Server-side close, reopen, reset, correction, and audit paths.
- An account-bound IndexedDB queue, per-owner browser lock, durable mutation
  receipt, explicit retry/failure states, and server sync acknowledgements.
- Existing mobile screen: `mobile-attendance-page.tsx` with group selection,
  roster statuses, bulk mark, close/reopen/reset actions, and queue panel.

The relevant visual references are `Screenshot 2026-09-04 211804.png`
(attendance), `212033.png` (scrolled state), and `212138.png` (date state).
They are mapped to the current mobile attendance component in the frontend
reference report.

## Fresh baseline evidence

`node node_modules/vitest/vitest.mjs run src/app/api/park/attendance
src/lib/attendance src/lib/offline/sync-attendance.test.ts
src/components/modules/park/mobile-attendance-page.test.ts`, with `NODE_ENV`
cleared, passed: **20 files, 94 tests**.

The tested paths include roster scope/mutation, sync acknowledgement,
close/reopen/reset, session preparation, summaries, offline queue behavior,
attendance schemas and schedule/dropout helpers, plus four source-rendered
mobile states.

## Delivery boundary

ATT01 will operationalize **group/class session attendance only**:

1. Select an authorized park/group/date and prepare or open the session.
2. Mark active eligible group members as present, absent, late, or excused.
3. Queue marks offline and retain failed/conflicted marks for resolution.
4. Close, reopen, reset, or correct only through server-authorized actions.

Staff, event, Mashwara/team attendance, historical workbook import, and new
session planning fields are excluded from this first team delivery.

## Release blocker: automatic dropout

Closing a session currently evaluates absence history and, when the batch
setting defaults or resolves to enabled, may change an active participant to
`dropout`. The blueprint explicitly leaves attendance status effects,
warning/dropout rules, and correction policy to an owner decision. This must
not be silently treated as approved operational behavior.

Owner decision, 2026-09-16: automatic dropout is disabled for ATT01. Closing
records attendance only. A separate authorised reactivation needs an effective
rejoin date; historical records remain, sessions in the interruption interval
are excluded, and marking resumes on or after that date. The current code does
not yet enforce all of this; DeepSeek's revised backend packet owns the
bounded correction.

## Next delegated work

DeepSeek receives the bounded backend correction packet first. Gemini
receives the frontend correction packet only after Astra accepts the resulting
API evidence. No production
database, workbook import, migration, deployment, account, or team access has
occurred.

## Owner-approved attendance contact exception — 2026-09-16

Attendance staff who already pass the server's group/session scope checks may
call or send a WhatsApp message to an absent student's guardian. The attendance
roster may therefore include the phone number solely for the existing
absence-follow-up actions. This is an explicit exception to ordinary directory
redaction, not permission to include contact data in exports, general lists,
or unrelated clients.
