# PKG-PROFILE-IMPLEMENTATION — Implementation Evidence

**Status:** Implementation-eligible static candidate. Browser UAT pending.

## Routes

| Method | Path | Capability | Scope |
|--------|------|-----------|-------|
| GET | `/api/admin/students/[participantId]/profile` | `students.profile.view` (+ `.sensitive.view` for includeSensitive) | `resolveActorCity` + `canAccessParticipantProfile` |
| PUT | `/api/admin/students/[participantId]/profile` | `students.profile.manage` (+ `.sensitive.manage` for sensitive fields) | Same |
| GET | `/api/me/profile` | `students.profile.view` | Student self-ownership |
| GET | `/api/guardian/children/[participantId]/profile` | `students.profile.view` | GuardianChild link |

## Capabilities Added

- `students.profile.view` (USER_OVERRIDE: yes)
- `students.profile.manage` (USER_OVERRIDE: yes)
- `students.profile.sensitive.view` (USER_OVERRIDE: no — role-level only)
- `students.profile.sensitive.manage` (USER_OVERRIDE: no — role-level only)

## Migration

- Migration `20260723155921_add_student_extended_profile` applied to SQLite.
- PostgreSQL schema aligned (`prisma/postgres/schema.prisma`).
- Additive only. Rollback: disable routes, remove capability codes. No destructive DROP.

## Browser UAT Cases

| Case | Description | Status |
|------|-------------|--------|
| B1 | City Head creates profile for participant in own city | Pending |
| B2 | City Head reads profile without includeSensitive (sensitive omitted) | Pending |
| B3 | City Head reads profile with includeSensitive=true (sensitive visible) | Pending |
| B4 | City Head writes sensitive fields without sensitive.manage (403) | Pending |
| B5 | Student reads own profile at /api/me/profile | Pending |
| B6 | Guardian reads linked child profile | Pending |
| B7 | Park Admin reads profile (403 — no profile.view) | Pending |
| B8 | HQ reads profile without cityId (400) | Pending |
| B9 | City Head reads profile for another city participant (403) | Pending |
| B10 | Mobile tabbed profile UI renders correctly | Pending |

## Test Summary

| File | Tests |
|------|-------|
| `src/lib/auth/capabilities.test.ts` | 14 (incl. 7 profile-specific) |
| `src/__tests__/api/student-profile/zod.test.ts` | 8 |
| `src/__tests__/api/student-profile/audit.test.ts` | 3 |
| **Total** | **25 passing** |
