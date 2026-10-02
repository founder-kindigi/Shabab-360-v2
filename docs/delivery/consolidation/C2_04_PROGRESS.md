# C2-04 progress — nullable participant-group compatibility

The isolated candidate is `D:/iBuild/Shabab-360-c0-20260911/c2-null-placement-20260914`, branch `codex/c2-null-placement-20260914`, based on C2-01 plus C2-03 schema mappings.

Fresh evidence shows the retained SQLite attendance migration and PostgreSQL `20260802100000_repair_participant_group_nullable` already define `participants.groupId` as nullable with `ON DELETE SET NULL`. C2-04 corrects the Prisma schema drift; it does not add a migration, change historical checksums, assign people, or delete data.

The candidate policy is conservative: an unassigned participant is retained; group-scoped operations return a conflict or denial; schedules and group-derived data are empty/null; park dashboards omit unassigned historic records; reports label a historical unassigned relation rather than failing. Admission conversion continues to require a group.

Guards now cover certificate preparation, participant/guardian administrative detail, park guardian linking, guardian schedules/dashboard, user profile, park dashboard/roster/participants, report export and analytics. Native PostgreSQL required one new repair migration because a later historical migration reintroduced `CASCADE`; fresh replay proves the repaired behavior. See [C2_04_HANDOFF.md](C2_04_HANDOFF.md). No API/UI lifecycle is enabled and no operational database is touched.
