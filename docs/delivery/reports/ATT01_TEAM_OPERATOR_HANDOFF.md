# ATT01 — team operator handoff

Status: local candidate ready for operator validation. It is not deployed or
released by this handoff.

## What this module does

An authorized Park Lead, Park Admin, or Murabbi can select an in-scope group,
record each eligible student's daily attendance, correct it while the session
is open, and lock the finished session. The system supports present, absent,
late, and excused statuses. Unassigned people never appear in a group roster.

When a student is marked absent, authorized attendance staff can call the
guardian or open the prepared WhatsApp absence message. These contact controls
are unavailable for every other attendance status and are not part of general
student lists or exports.

Closing a session never makes a student a dropout. Dropout and return are
separate authorized profile actions. A returning student's rejoin date is
required; attendance resumes from that date and the interruption period remains
out of attendance totals.

## Test this in order

1. Sign in as a Park Lead, Park Admin, or Murabbi assigned to a real test park
   and group.
2. Open **Park Attendance**, choose today's group session, and confirm only
   that group's active, assigned students appear.
3. Mark one student Present, one Absent, one Late, and one Excused. Refresh the
   page and confirm all four saved states remain correct.
4. For the absent student, confirm the **Call** button opens the phone dialer
   and the **WhatsApp** button opens the prepared guardian message. Use only a
   controlled test contact for this check.
5. Lock the session with a reason. Confirm marks can no longer be changed.
6. Reopen it with a correction reason, change one mark, and lock it again.
7. In a test student profile, mark a student as dropout with a reason. Confirm
   the student no longer appears for attendance from that date onward.
8. Reactivate that student. Enter a reason and the rejoin date. Confirm the
   student returns to the roster on that date, but not for dates between the
   dropout and rejoin dates.
9. Optional offline check: disconnect briefly, make one attendance change,
   reconnect, and confirm the queue shows the result as synced or clearly
   reports a conflict/error. Do not assume a queued change saved until the app
   confirms it.

## Report immediately

- A student from another park or group appears in the roster.
- A closed session can be changed without reopening.
- A Call or WhatsApp control appears for a student who is not absent.
- A dropout happens automatically after a session is locked.
- A returning student appears before their selected rejoin date.
- An offline change disappears or claims success without a confirmed sync.

## Local verification evidence

- Focused ATT01 tests: 22 files / 110 tests passed.
- Scoped ESLint and TypeScript passed.
- Production build passed.

No live database, deployment, production browser, or release approval is
included in this handoff.
