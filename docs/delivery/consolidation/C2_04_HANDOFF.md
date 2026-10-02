# C2-04 handoff — nullable participant-group compatibility

Candidate: `D:/iBuild/Shabab-360-c0-20260911/c2-null-placement-20260914`, branch `codex/c2-null-placement-20260914`. The original v2 checkout, UI, operational databases and accounts were not edited.

## Change

Both Prisma schemas now match the intended nullable `Participant.groupId` / `Group?` relation with `SET NULL`. SQLite history already had this behavior. Native PostgreSQL replay exposed that `20260909050000_align_modeled_constraints` had later reintroduced `NOT NULL` and `CASCADE`; a new additive PostgreSQL migration, `20260914123000_restore_participant_group_setnull`, restores the preserved-row contract.

Unassigned participants are retained. Group-scoped certificate, detail and guardian-link operations return a conflict/denial; personal/guardian views return null or empty group-derived data; analytics, dashboard and group lists exclude unassigned people from group metrics. Admissions still require a group.

## Evidence

- Both schemas validated; Prisma Client 6.19.3 generated for SQLite and PostgreSQL after explicit owner authorization.
- Disposable SQLite 3.50.4: deleting a synthetic group preserved `participant1` with `groupId = NULL`; `foreign_key_check` was clean.
- Native disposable PostgreSQL 18.6: fresh replay applied 32 migrations; the first replay reproduced participant deletion, and the repaired replay preserved `participant1` with a null group ID.
- Focused routes: 20/20 tests passed. Updated release schema/migration baseline tests: 161/161 passed.
- SQLite and PostgreSQL-configured production builds completed and released their Next build locks.
- Nullable-relation TypeScript errors were resolved. `npm run typecheck` remains nonzero only because existing `src/__tests__/api/v2-editor-recovery.test.tsx` imports missing `@testing-library/react`; this is unrelated to C2-04 and was not changed.

## Outcome

**Lead outcome: accepted bounded compatibility candidate with the explicit unrelated test-dependency typecheck limit. It is not independent review, merge approval, deployment approval, or release approval.**
