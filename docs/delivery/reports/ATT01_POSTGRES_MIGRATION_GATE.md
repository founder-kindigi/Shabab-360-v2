# ATT01 PostgreSQL migration gate

Date: 2026-09-18. Task: resolve the ATT01 PostgreSQL migration compatibility gate
for release preparation. Mode: **read-only against all external systems**.

No production, staging or external PostgreSQL database was contacted. No `.env`
was read, no credential used, no `prisma migrate deploy`, `db push`, `prisma
generate`, commit, push or deployment was run. `prisma/dev.db`, its backups,
workbooks and live accounts were not touched. Docker is installed locally but was
**not** used, per the task's safety rules.

## 1. Verdict

**`BLOCKED_PENDING_LOCAL_POSTGRES_HARNESS`**

- The chain-level blocker is **fixed**: the duplicate `operation_receipts`
  migration has been removed from both providers, and the static duplicate scan
  now reports no unguarded duplicate object anywhere in the PostgreSQL chain.
- Count agreement is **restored**: 18 SQLite / 32 PostgreSQL folders, matching the
  updated release assertions.
- What remains unproven is the **replay itself**: no self-contained disposable
  PostgreSQL harness is present in the repository, and the historical harness's
  runtime is absent. Installing software, using Docker or connecting remotely was
  not permitted, so a fresh replay was **not run and is not claimed**.

Readiness therefore means *ready to be replayed*, not *verified replayable*.

## 2. The duplicate `operation_receipts` finding

Two migrations created the same table in both chains:

| Provider | Migration | Tracked | SQL effect |
| --- | --- | --- | --- |
| SQLite | `20260909020000_operation_receipts` | **tracked** | `CREATE TABLE "operation_receipts" ("id" TEXT NOT NULL PRIMARY KEY, "requestHash" TEXT NOT NULL, "resultJson" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)` |
| SQLite | `20260917193000_add_operation_receipts` | untracked | identical columns and `PRIMARY KEY` |
| PostgreSQL | `20260909020000_operation_receipts` | **tracked** | same four columns, `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| PostgreSQL | `20260917193000_add_operation_receipts` | untracked | same, with an explicitly named `CONSTRAINT "operation_receipts_pkey" PRIMARY KEY ("id")` |

**Proof of redundancy.** In both providers the later migration produces exactly the
same end state as the tracked one: same table name, same four columns, same types
and defaults, and the same primary key (PostgreSQL auto-names an inline primary
key `<table>_pkey`, so the explicit constraint name matches). It adds no column, no
index, no constraint and no data. No other migration, source file or test depends
on it — the only references were documentation. It was **never applied** to any
database: the PostgreSQL chain was not migrated, and the local `prisma/dev.db`
received its `operation_receipts` table through the guarded local compatibility
tool, not through this migration.

**Action taken.** The untracked duplicate was removed from both chains:

- deleted `prisma/migrations/20260917193000_add_operation_receipts/`
- deleted `prisma/postgres/migrations/20260917193000_add_operation_receipts/`

The tracked `20260909020000_operation_receipts` migration is unchanged, so **no
applied history was altered**. The removal is reversible: the exact deleted SQL is
quoted below and a copy was kept outside the repository for this session.

```sql
-- prisma/migrations/20260917193000_add_operation_receipts/migration.sql (removed)
-- Durable, actor-bound acknowledgements used by retried attendance writes.
CREATE TABLE "operation_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestHash" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- prisma/postgres/migrations/20260917193000_add_operation_receipts/migration.sql (removed)
-- Durable, actor-bound acknowledgements used by retried attendance writes.
CREATE TABLE "operation_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestHash" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operation_receipts_pkey" PRIMARY KEY ("id")
);
```

No new migration was created to compensate, and no SQL was edited merely to make
counts match.

## 3. Migration-count agreement

| Chain | Folders now | Release assertion | Status |
| --- | ---: | ---: | --- |
| SQLite `prisma/migrations` | 18 | 18 | agree |
| PostgreSQL `prisma/postgres/migrations` | 32 | 32 | agree |

Before this task: 19 / 33 with assertions at 17 / 31. The reconciliation is
**19 → 18 → matches 18** (one redundant migration removed, one legitimate new
migration retained) and **33 → 32 → matches 32**. The remaining delta from the
historical baseline of 17 / 31 is the single required
`20260916080000_add_muawin_assistance` migration in each chain; the assertions were
raised to reflect it, and were **not** lowered to hide the duplicate.

Updated assertions (5 previously failing):

- `src/__tests__/release/pilot-production-health.test.ts` — PostgreSQL 32, SQLite 18
- `src/__tests__/release/master-production-signoff.test.ts` — 32 / 18
- `src/__tests__/release/staging-smoke.test.ts` — PostgreSQL 32

`src/__tests__/release/production-build.test.ts` uses `toBeGreaterThanOrEqual`, so
it needed no change.

## 4. Preflight tooling agreement (M01)

`src/lib/migrations/production-preflight.ts` modelled 8 of the pending PostgreSQL
migrations. It now models **9**, appending `20260916080000_add_muawin_assistance`
after `20260909070000_attendance_reset_version`, and the header list and the parity
test's ordered expectation were updated (`toHaveLength(8)` → `9`).

That migration's group carries `checks: []`. This is the model's own convention,
not a weakening: `unconditionalObjects()` classifies collision targets as
tables, unguarded indexes, unguarded `ADD COLUMN`s, primary-key constraints,
functions and triggers. The muawin migration guards its column and index with
`IF NOT EXISTS`, so it contributes none of those.

**Known limitation (reported, not hidden).** That migration's third statement,
`ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_assistsMurabbiId_fkey" …`, is
unguarded and would fail if the constraint already existed. The model's constraint
extractor recognises only primary-key constraints, so it is not modelled — the same
pre-existing convention that leaves the unguarded foreign keys in
`20260909030000_restore_modeled_tables` unmodelled. This is a pre-existing gap in
the collision extractor, not something this gate introduces or should silently
widen. Recommended follow-up (separate, bounded): extend the extractor to unguarded
foreign-key constraints and declare them across the modelled sequence, or guard
this one statement.

## 5. Static chain consistency after the removal

A duplicate-object scan across every migration's extracted objects now reports:

**PostgreSQL (32 migrations)** — no unguarded duplicate remains:

| Repeated object | Migrations | Assessment |
| --- | --- | --- |
| `batch_settings.automaticDropoutEnabled` | `20260730060714`, `20260817120000` | Safe: the later statement is `ADD COLUMN IF NOT EXISTS`. |
| `participants_groupId_fkey` | `20260714200000` (create), `20260730060714`, `20260909050000` | Intended drop-then-re-add; each later `DROP CONSTRAINT` is preceded by an existing constraint, and `20260909050000`'s unguarded `DROP` is covered by the model's `REQUIRED_EXISTING_CONSTRAINTS`. |
| `admission_applications_convertedParticipantId_fkey` | `20260714200000` (create), `20260909050000` | Same intended drop-then-re-add. |

**SQLite (18 migrations)** — two pre-existing conflicts remain, unchanged by this
task and unrelated to ATT01: `batch_settings.automaticDropoutEnabled` and
`batch_settings.dropoutConsecutiveWeeks` are each added by `20260730060714` **and**
`20260817120000`, and SQLite has no `ADD COLUMN IF NOT EXISTS`. This is the
already-documented reason the SQLite chain cannot be replayed in order, alongside
the missing baseline migration; it is **not** a PostgreSQL gate blocker and is out
of scope here.

`node scripts/sqlite-migration-catalog-audit.ts` confirms the same: the
`operation_receipts` replay conflict is gone, leaving only those two
`batch_settings` column conflicts.

## 6. Fresh database versus the operational baseline

- **Fresh database:** the PostgreSQL chain now has exactly one creator per object
  and its only repeated statements are either `IF NOT EXISTS`-guarded or
  drop-then-re-add pairs, so a full 32-migration replay from empty is expected to
  succeed. This is a **static expectation**, not a verified result.
- **Expected operational baseline:** `20260909020000_operation_receipts` remains in
  the pending set, so the table is created once, by the intended migration. The
  nine-migration pending sequence is now the M01 model.

## 7. Validation performed

Commands run from the repository root with `NODE_ENV` cleared for Vitest.

| # | Command | Result | Exit |
| --- | --- | --- | --- |
| 1 | `npx vitest run src/lib/migrations` | **2 files, 37 tests passed** | 0 |
| 2 | `npx vitest run src/__tests__/release` | **6 files, 167 tests passed** (was 162 passed / 5 failed) | 0 |
| 3 | `node scripts/sqlite-migration-catalog-audit.ts` | `operation_receipts` conflict gone; only the 2 pre-existing `batch_settings` conflicts | 0 |
| 4 | `node scripts/sqlite-migration-replay-probe.ts --mode existing` | unchanged: fails at migration 1 (`student_extended_profiles` already exists) — the documented no-baseline SQLite behaviour | 0 |
| 5 | `npm run lint` | **0 errors, 6 pre-existing warnings** | 0 |
| 6 | `npx tsc --noEmit` | pass | 0 |
| 7 | `git diff --check` (scoped to the three edited release tests) | clean | 0 |
| 8 | whitespace scan on the two edited migration-tooling files | 0 trailing-whitespace lines | — |

### Checks not run

- **Fresh disposable PostgreSQL replay** (native or PGlite) — no harness runtime
  present; Docker/installation/remote connection not permitted.
- `npx prisma migrate status`, `db push`, `prisma generate`, `migrate deploy` —
  require a target database and are explicitly out of scope.
- The `--mode empty` SQLite replay probe — unchanged behaviour, not re-run.
- Full repository Vitest suite (has previously stalled); scoped suites were used.
- Browser/device, staging and production validation.

## 8. Rollback and data impact

- **Data impact of this task: none.** No database was written. `prisma/dev.db` is
  byte-unchanged (untouched, still an uncommitted tracked modification).
- **Migration-history impact:** none. The removed folders were untracked and
  never applied, so no recorded history changed and no applied migration was
  rewritten. The tracked `20260909020000_operation_receipts` migration still
  creates the table exactly once.
- **Rollback:** re-create the two deleted folders with the SQL quoted in section 2
  (or copy them back from the session backup). Do not do this without also
  reverting the count assertions and the preflight sequence, which would otherwise
  disagree with the chain. A rollback would also reintroduce the fresh-replay
  failure.
- The three edited release test files and the two edited migration-tooling files
  are uncommitted working-tree changes; reverting them returns the tree to its
  prior state.

## 9. Next safe operator command

Re-provision the harness first (it is git-ignored, so it is not part of the
repository), then run the existing replay. No production system is involved.

```bash
# 1. Restore the disposable PostgreSQL 18 runtime under the ignored path used by
#    the historical harness (no secrets, local trust auth only):
#      .next/astra-native-postgres/runtime
#    or the PGlite runtime at .next/astra-pg-runtime

# 2. Replay the full PostgreSQL chain into the throwaway cluster:
sh docs/reviews/v2-audit-2026-09-08/start-disposable-postgres.sh
bash -lc 'cd /mnt/d/iBuild/Shabab-360-v2 && node docs/reviews/v2-audit-2026-09-08/verify-postgres-migrations.mjs'
sh docs/reviews/v2-audit-2026-09-08/stop-disposable-postgres.sh
```

Expected on success: every one of the 32 migrations applies in order, modeled
columns/constraints/indexes/enums match `prisma/postgres/schema.prisma`, and the
cluster is stopped and discarded. Do not point this at any shared database, and do
not run `prisma migrate deploy` against production from this gate.

No live migration, deployment or team-pilot readiness is claimed.

---

## Appendix — exact migration inventory

Objects below are extracted from each `migration.sql` by scanning quoted
identifiers for `CREATE TABLE`, `CREATE [UNIQUE] INDEX`, `ALTER TABLE … ADD
COLUMN`, `ALTER TABLE … ADD CONSTRAINT`, `CREATE FUNCTION` and `CREATE TRIGGER`,
sorted and de-duplicated. Unquoted DDL (for example the PostgreSQL trigger
functions in `20260909040000_active_city_batch`) is not captured by this
extraction; the M01 collision model covers that migration separately.
```text
### SQLite
1. `20260723160000_add_student_extended_profile` => index:student_extended_profiles_participantId_idx, index:student_extended_profiles_participantId_key, table:student_extended_profiles
2. `20260723200000_add_events_and_calling_foundation` => index:call_interactions_assignmentId_createdAt_idx, index:calling_assignments_callerExternalId_isActive_idx, index:calling_assignments_callerStaffMetaId_isActive_idx, index:calling_campaigns_cityId_name_key, index:calling_campaigns_cityId_status_idx, index:calling_poc_assignments_campaignId_eventResponsibilityId_key, index:calling_template_uses_callerUserId_idx, index:calling_template_uses_templateId_idx, index:calling_templates_cityId_title_version_key, index:event_planner_items_assignedToStaffMetaId_status_idx, index:event_planner_items_dueDate_status_idx, index:event_planner_items_eventId_status_idx, index:event_planner_items_teamId_status_idx, index:event_responsibilities_assignedToStaffMetaId_isActive_idx, index:event_responsibilities_cityId_isActive_idx, index:event_responsibilities_endDate_isActive_idx, index:event_responsibilities_eventId_isActive_idx, index:event_team_memberships_staffMetaId_isActive_idx, index:event_team_memberships_teamId_isActive_idx, index:event_team_memberships_teamId_staffMetaId_key, index:events_cityId_startDate_idx, index:events_cityId_status_idx, index:events_status_startDate_idx, index:external_support_callers_campaignId_isActive_idx, index:external_support_callers_userId_isActive_idx, index:temporary_event_teams_eventId_isActive_idx, index:temporary_event_teams_eventId_title_key, table:call_interactions, table:calling_assignments, table:calling_campaigns, table:calling_poc_assignments, table:calling_template_uses, table:calling_templates, table:event_planner_items, table:event_responsibilities, table:event_team_memberships, table:events, table:external_support_callers, table:temporary_event_teams
3. `20260724200000_add_mashwara_module` => index:mashwara_action_items_assignedToId_status_idx, index:mashwara_action_items_meetingId_status_idx, index:mashwara_attendees_meetingId_idx, index:mashwara_attendees_meetingId_staffMetaId_key, index:mashwara_attendees_staffMetaId_idx, index:mashwara_decisions_meetingId_status_idx, index:mashwara_meeting_shares_meetingId_staffMetaId_isRevoked_idx, index:mashwara_meeting_shares_meetingId_staffMetaId_key, index:mashwara_meeting_shares_staffMetaId_idx, index:mashwara_meetings_cityId_status_idx, index:mashwara_meetings_scheduledAt_idx, table:mashwara_action_items, table:mashwara_attendees, table:mashwara_decisions, table:mashwara_meeting_shares, table:mashwara_meetings
4. `20260725120000_add_login_attempts` => index:login_attempts_identifier_createdAt_idx, table:login_attempts
5. `20260729081417_add_media_briefs` => index:media_briefs_cityId_status_idx, index:media_briefs_mediaType_status_idx, index:media_briefs_priority_status_idx, index:media_briefs_teamId_assignedToStaffMetaId_status_idx, index:media_briefs_teamId_status_idx, table:media_briefs
6. `20260730060714_add_attendance_foundation` => column:batch_settings.automaticDropoutEnabled, column:batch_settings.dropoutConsecutiveWeeks, index:attendance_roster_snapshots_eventId_idx, index:attendance_roster_snapshots_eventId_participantId_key, index:attendance_roster_snapshots_participantId_idx, index:batch_off_dates_batchSettingsId_offDate_idx, index:batch_off_dates_batchSettingsId_offDate_key, index:batch_off_weekdays_batchSettingsId_weekday_key, index:participants_groupId_state_idx, index:participants_userId_key, index:staff_attendance_records_eventId_idx, index:staff_attendance_records_eventId_staffId_key, index:staff_attendance_records_staffId_idx, table:attendance_roster_snapshots, table:batch_off_dates, table:batch_off_weekdays, table:new_participants, table:staff_attendance_records
7. `20260803090000_add_event_registrations` => index:event_registrations_attendanceRecordId_key, index:event_registrations_eventId_participantId_key, index:event_registrations_eventId_status_idx, index:event_registrations_participantId_status_idx, table:event_registrations
8. `20260803100000_add_event_fee_schedules` => column:event_registrations.eventFeeScheduleId, index:event_fee_schedules_batchId_idx, index:event_fee_schedules_eventId_batchId_key, index:event_fee_schedules_feeEventId_key, index:event_registrations_eventFeeScheduleId_idx, table:event_fee_schedules
9. `20260810193000_add_park_staff_attendance` => index:park_staff_attendance_events_eventDate_idx, index:park_staff_attendance_events_parkId_eventDate_idx, index:park_staff_attendance_events_parkId_eventDate_key, index:park_staff_attendance_records_eventId_idx, index:park_staff_attendance_records_eventId_staffId_key, index:park_staff_attendance_records_staffId_idx, table:park_staff_attendance_events, table:park_staff_attendance_records
10. `20260811083000_add_attendance_event_uniqueness` => index:attendance_events_groupId_eventDate_key
11. `20260817090000_add_attendance_schedule` => column:batch_settings.classWeekdays, index:batch_class_dates_batchId_classDate_key, index:batch_class_dates_classDate_idx, index:operational_off_dates_cityId_offDate_key, index:operational_off_dates_offDate_idx, table:batch_class_dates, table:operational_off_dates
12. `20260817120000_add_attendance_dropout_lifecycle` => column:batch_settings.automaticDropoutEnabled, column:batch_settings.dropoutConsecutiveWeeks, column:batch_settings.warningConsecutiveWeeks, column:participants.dropoutAt, column:participants.dropoutReason, column:participants.dropoutSource, column:participants.reactivatedAt
13. `20260827090000_add_team_document_links` => index:team_document_links_createdByStaffMetaId_idx, index:team_document_links_teamId_createdAt_idx, table:external_link_policies, table:team_document_links
14. `20260909010000_login_throttle` => index:login_attempt_windows_resetAt_idx, table:login_attempt_windows
15. `20260909020000_operation_receipts` => table:operation_receipts
16. `20260909040000_active_city_batch` => index:batches_one_active_city, table:_batch_scope_preflight, trigger:batches_fill_city_insert, trigger:batches_fill_city_update, trigger:batches_validate_city_insert, trigger:batches_validate_city_update, trigger:parks_preserve_batch_city
17. `20260909070000_attendance_reset_version` => column:attendance_events.resetVersion
18. `20260916080000_add_muawin_assistance` => column:staff_meta.assistsMurabbiId, index:staff_meta_assistsMurabbiId_idx

### PostgreSQL
1. `20260714200000_init_postgres` => constraint:admission_applications_cityId_fkey, constraint:admission_applications_convertedParticipantId_fkey, constraint:admission_applications_preferredParkId_fkey, constraint:admission_interviews_applicationId_fkey, constraint:announcements_authorId_fkey, constraint:attendance_events_groupId_fkey, constraint:attendance_records_eventId_fkey, constraint:attendance_records_participantId_fkey, constraint:audit_log_userId_fkey, constraint:batch_settings_batchId_fkey, constraint:batches_parkId_fkey, constraint:fee_events_batchId_fkey, constraint:groups_batchId_fkey, constraint:guardian_children_guardianId_fkey, constraint:guardian_children_participantId_fkey, constraint:guardians_userId_fkey, constraint:notifications_recipientId_fkey, constraint:parks_cityId_fkey, constraint:participants_groupId_fkey, constraint:participants_userId_fkey, constraint:payments_feeEventId_fkey, constraint:payments_participantId_fkey, constraint:staff_meta_assignedCityId_fkey, constraint:staff_meta_assignedGroupId_fkey, constraint:staff_meta_assignedParkId_fkey, constraint:staff_meta_userId_fkey, index:admission_applications_convertedParticipantId_key, index:admission_applications_trackingCode_key, index:announcements_expiresAt_idx, index:attendance_events_eventDate_idx, index:attendance_events_groupId_eventDate_idx, index:attendance_records_eventId_idx, index:attendance_records_eventId_participantId_key, index:attendance_records_markedAt_idx, index:attendance_records_participantId_idx, index:batch_settings_batchId_key, index:cities_code_key, index:fee_events_batchId_isActive_createdAt_idx, index:fee_events_isActive_createdAt_idx, index:groups_batchId_isActive_idx, index:guardian_children_guardianId_participantId_key, index:guardians_phone_idx, index:guardians_userId_key, index:notifications_recipientId_idx, index:notifications_status_idx, index:participants_groupId_state_idx, index:participants_userId_key, index:payments_feeEventId_participantId_idx, index:payments_receiptNo_key, index:receipt_sequences_prefix_year_key, index:staff_meta_userId_key, index:users_email_key, table:admission_applications, table:admission_interviews, table:announcements, table:attendance_events, table:attendance_records, table:audit_log, table:batch_settings, table:batches, table:cities, table:fee_events, table:groups, table:guardian_children, table:guardians, table:notifications, table:parks, table:participants, table:payments, table:receipt_sequences, table:report_presets, table:staff_meta, table:users
2. `20260714223000_add_on_leave_participant_state` => (none)
3. `20260715123000_add_admission_application_details` => (none)
4. `20260716210000_add_access_management_overrides` => index:role_capability_overrides_role_capability_key, index:role_capability_overrides_role_idx, index:user_capability_overrides_userId_capability_key, index:user_capability_overrides_userId_isActive_expiresAt_idx, table:role_capability_overrides, table:user_capability_overrides
5. `20260720100000_add_participant_age_and_grade_class` => column:participants.age, column:participants.gradeClass
6. `20260720190000_add_collaboration_teams` => index:collaboration_teams_cityId_code_key, index:collaboration_teams_cityId_isActive_idx, index:staff_team_memberships_staffMetaId_isActive_idx, index:staff_team_memberships_staffMetaId_teamId_startedAt_key, index:staff_team_memberships_teamId_isActive_idx, table:collaboration_teams, table:staff_team_memberships
7. `20260720210000_add_content_planner_foundation` => constraint:activity_plan_items_assignedStaffMetaId_fkey, constraint:activity_plan_items_contentBlockId_fkey, constraint:activity_plan_items_teamId_fkey, constraint:content_plan_blocks_sessionId_fkey, constraint:content_plan_blocks_teamId_fkey, constraint:content_plan_resources_blockId_fkey, constraint:content_plan_sessions_planId_fkey, constraint:content_plans_basePlanId_fkey, constraint:content_plans_batchId_fkey, constraint:content_plans_cityId_fkey, constraint:content_plans_parkId_fkey, index:activity_plan_items_assignedStaffMetaId_status_idx, index:activity_plan_items_teamId_status_idx, index:content_plan_blocks_sessionId_category_sortOrder_key, index:content_plan_blocks_teamId_status_idx, index:content_plan_resources_blockId_idx, index:content_plan_sessions_planId_sessionDate_key, index:content_plan_sessions_sessionDate_status_idx, index:content_plans_basePlanId_idx, index:content_plans_batchId_idx, index:content_plans_cityId_status_idx, index:content_plans_parkId_idx, table:activity_plan_items, table:content_plan_blocks, table:content_plan_resources, table:content_plan_sessions, table:content_plans
8. `20260721090000_expand_city_batch_park_group` => column:batches.cityId, column:groups.parkId, constraint:batches_cityId_fkey, constraint:groups_parkId_fkey, index:batches_cityId_isActive_idx, index:groups_parkId_batchId_isActive_idx
9. `20260723160000_add_student_extended_profile` => index:student_extended_profiles_participantId_idx, index:student_extended_profiles_participantId_key, table:student_extended_profiles
10. `20260723200000_add_events_and_calling_foundation` => constraint:call_interactions_assignmentId_fkey, constraint:call_interactions_callerUserId_fkey, constraint:calling_assignments_applicationId_fkey, constraint:calling_assignments_callerExternalId_fkey, constraint:calling_assignments_callerStaffMetaId_fkey, constraint:calling_assignments_campaignId_fkey, constraint:calling_campaigns_cityId_fkey, constraint:calling_poc_assignments_campaignId_fkey, constraint:calling_poc_assignments_eventResponsibilityId_fkey, constraint:calling_template_uses_assignmentId_fkey, constraint:calling_template_uses_callerUserId_fkey, constraint:calling_template_uses_templateId_fkey, constraint:calling_templates_campaignId_fkey, constraint:calling_templates_cityId_fkey, constraint:event_planner_items_assignedToStaffMetaId_fkey, constraint:event_planner_items_eventId_fkey, constraint:event_planner_items_teamId_fkey, constraint:event_responsibilities_assignedToStaffMetaId_fkey, constraint:event_responsibilities_eventId_fkey, constraint:event_team_memberships_staffMetaId_fkey, constraint:event_team_memberships_teamId_fkey, constraint:events_cityId_fkey, constraint:external_support_callers_campaignId_fkey, constraint:external_support_callers_userId_fkey, constraint:temporary_event_teams_eventId_fkey, index:call_interactions_assignmentId_createdAt_idx, index:calling_assignments_callerExternalId_isActive_idx, index:calling_assignments_callerStaffMetaId_isActive_idx, index:calling_campaigns_cityId_name_key, index:calling_campaigns_cityId_status_idx, index:calling_poc_assignments_campaignId_eventResponsibilityId_key, index:calling_template_uses_callerUserId_idx, index:calling_template_uses_templateId_idx, index:calling_templates_cityId_title_version_key, index:event_planner_items_assignedToStaffMetaId_status_idx, index:event_planner_items_dueDate_status_idx, index:event_planner_items_eventId_status_idx, index:event_planner_items_teamId_status_idx, index:event_responsibilities_assignedToStaffMetaId_isActive_idx, index:event_responsibilities_cityId_isActive_idx, index:event_responsibilities_endDate_isActive_idx, index:event_responsibilities_eventId_isActive_idx, index:event_team_memberships_staffMetaId_isActive_idx, index:event_team_memberships_teamId_isActive_idx, index:event_team_memberships_teamId_staffMetaId_key, index:events_cityId_startDate_idx, index:events_cityId_status_idx, index:events_status_startDate_idx, index:external_support_callers_campaignId_isActive_idx, index:external_support_callers_userId_isActive_idx, index:temporary_event_teams_eventId_isActive_idx, index:temporary_event_teams_eventId_title_key, table:call_interactions, table:calling_assignments, table:calling_campaigns, table:calling_poc_assignments, table:calling_template_uses, table:calling_templates, table:event_planner_items, table:event_responsibilities, table:event_team_memberships, table:events, table:external_support_callers, table:temporary_event_teams
11. `20260724200000_add_mashwara_module` => constraint:mashwara_action_items_assignedToId_fkey, constraint:mashwara_action_items_meetingId_fkey, constraint:mashwara_action_items_teamId_fkey, constraint:mashwara_attendees_meetingId_fkey, constraint:mashwara_attendees_staffMetaId_fkey, constraint:mashwara_decisions_assignedToId_fkey, constraint:mashwara_decisions_meetingId_fkey, constraint:mashwara_decisions_targetTeamId_fkey, constraint:mashwara_meeting_shares_grantedById_fkey, constraint:mashwara_meeting_shares_meetingId_fkey, constraint:mashwara_meeting_shares_staffMetaId_fkey, constraint:mashwara_meetings_cityId_fkey, constraint:mashwara_meetings_createdById_fkey, index:mashwara_action_items_assignedToId_status_idx, index:mashwara_action_items_meetingId_status_idx, index:mashwara_attendees_meetingId_idx, index:mashwara_attendees_meetingId_staffMetaId_key, index:mashwara_attendees_staffMetaId_idx, index:mashwara_decisions_meetingId_status_idx, index:mashwara_meeting_shares_meetingId_staffMetaId_isRevoked_idx, index:mashwara_meeting_shares_meetingId_staffMetaId_key, index:mashwara_meeting_shares_staffMetaId_idx, index:mashwara_meetings_cityId_status_idx, index:mashwara_meetings_scheduledAt_idx, table:mashwara_action_items, table:mashwara_attendees, table:mashwara_decisions, table:mashwara_meeting_shares, table:mashwara_meetings
12. `20260725120000_add_login_attempts` => index:login_attempts_identifier_createdAt_idx, table:login_attempts
13. `20260729081417_add_media_briefs` => index:media_briefs_cityId_status_idx, index:media_briefs_mediaType_status_idx, index:media_briefs_priority_status_idx, index:media_briefs_teamId_assignedToStaffMetaId_status_idx, index:media_briefs_teamId_status_idx, table:media_briefs
14. `20260730060714_add_attendance_foundation` => column:batch_settings.automaticDropoutEnabled, constraint:attendance_roster_snapshots_eventId_fkey, constraint:attendance_roster_snapshots_groupId_fkey, constraint:attendance_roster_snapshots_participantId_fkey, constraint:batch_off_dates_batchSettingsId_fkey, constraint:batch_off_weekdays_batchSettingsId_fkey, constraint:participants_groupId_fkey, constraint:staff_attendance_records_eventId_fkey, constraint:staff_attendance_records_staffId_fkey, index:attendance_roster_snapshots_eventId_idx, index:attendance_roster_snapshots_eventId_participantId_key, index:attendance_roster_snapshots_participantId_idx, index:batch_off_dates_batchSettingsId_offDate_idx, index:batch_off_dates_batchSettingsId_offDate_key, index:batch_off_weekdays_batchSettingsId_weekday_key, index:staff_attendance_records_eventId_idx, index:staff_attendance_records_eventId_staffId_key, index:staff_attendance_records_staffId_idx, table:attendance_roster_snapshots, table:batch_off_dates, table:batch_off_weekdays, table:staff_attendance_records
15. `20260802100000_repair_participant_group_nullable` => (none)
16. `20260803090000_add_event_registrations` => index:event_registrations_attendanceRecordId_key, index:event_registrations_eventId_participantId_key, index:event_registrations_eventId_status_idx, index:event_registrations_participantId_status_idx, table:event_registrations
17. `20260803100000_add_event_fee_schedules` => column:event_registrations.eventFeeScheduleId, constraint:event_registrations_eventFeeScheduleId_fkey, index:event_fee_schedules_batchId_idx, index:event_fee_schedules_eventId_batchId_key, index:event_fee_schedules_feeEventId_key, index:event_registrations_eventFeeScheduleId_idx, table:event_fee_schedules
18. `20260803110000_add_mashwara_notification_channels` => (none)
19. `20260810193000_add_park_staff_attendance` => constraint:park_staff_attendance_events_parkId_fkey, constraint:park_staff_attendance_records_eventId_fkey, constraint:park_staff_attendance_records_staffId_fkey, index:park_staff_attendance_events_eventDate_idx, index:park_staff_attendance_events_parkId_eventDate_idx, index:park_staff_attendance_events_parkId_eventDate_key, index:park_staff_attendance_records_eventId_idx, index:park_staff_attendance_records_eventId_staffId_key, index:park_staff_attendance_records_staffId_idx, table:park_staff_attendance_events, table:park_staff_attendance_records
20. `20260811083000_add_attendance_event_uniqueness` => index:attendance_events_groupId_eventDate_key
21. `20260817090000_add_attendance_schedule` => column:batch_settings.classWeekdays, constraint:batch_class_dates_batchId_fkey, constraint:operational_off_dates_cityId_fkey, index:batch_class_dates_batchId_classDate_key, index:batch_class_dates_classDate_idx, index:operational_off_dates_cityId_offDate_key, index:operational_off_dates_offDate_idx, table:batch_class_dates, table:operational_off_dates
22. `20260817120000_add_attendance_dropout_lifecycle` => column:batch_settings.automaticDropoutEnabled, column:batch_settings.dropoutConsecutiveWeeks, column:batch_settings.warningConsecutiveWeeks, column:participants.dropoutAt, column:participants.dropoutReason, column:participants.dropoutSource, column:participants.reactivatedAt
23. `20260827090000_add_team_document_links` => index:team_document_links_createdByStaffMetaId_idx, index:team_document_links_teamId_createdAt_idx, table:external_link_policies, table:team_document_links
24. `20260907114612_add_evaluations_lessons_planner` => index:park_lessons_parkId_lessonDate_idx, index:park_routine_slots_parkId_idx, index:student_evaluations_parkId_month_year_idx, index:student_evaluations_participantId_month_year_key, table:park_lessons, table:park_routine_slots, table:student_evaluations
25. `20260909010000_login_throttle` => index:login_attempt_windows_resetAt_idx, table:login_attempt_windows
26. `20260909020000_operation_receipts` => table:operation_receipts
27. `20260909030000_restore_modeled_tables` => constraint:digital_resources_targetCityId_fkey, constraint:fee_donations_cityId_fkey, constraint:fee_donations_parkId_fkey, constraint:financial_adjustments_cityId_fkey, constraint:financial_adjustments_parkId_fkey, constraint:park_stocks_itemId_fkey, constraint:park_stocks_parkId_fkey, constraint:point_transactions_studentId_fkey, constraint:purchase_orders_cityId_fkey, constraint:purchase_orders_itemId_fkey, constraint:purchase_orders_parkId_fkey, constraint:stock_audit_logs_itemId_fkey, constraint:stock_audit_logs_parkId_fkey, constraint:stock_requests_itemId_fkey, constraint:stock_requests_parkId_fkey, constraint:stock_transfers_fromParkId_fkey, constraint:stock_transfers_itemId_fkey, constraint:stock_transfers_toParkId_fkey, constraint:student_badges_badgeId_fkey, constraint:student_badges_studentId_fkey, constraint:student_extended_profiles_pkey, constraint:team_chat_messages_authorId_fkey, constraint:team_chat_messages_teamId_fkey, index:badges_code_key, index:digital_resources_category_idx, index:digital_resources_targetCityId_idx, index:fee_donations_cityId_createdAt_idx, index:fee_donations_parkId_createdAt_idx, index:fee_donations_receiptNo_key, index:financial_adjustments_cityId_createdAt_idx, index:financial_adjustments_parkId_createdAt_idx, index:knowledge_articles_category_isPublished_idx, index:knowledge_articles_slug_key, index:park_stocks_itemId_idx, index:park_stocks_parkId_idx, index:park_stocks_parkId_itemId_key, index:point_transactions_category_idx, index:point_transactions_studentId_createdAt_idx, index:procurement_items_sku_key, index:purchase_orders_cityId_createdAt_idx, index:purchase_orders_parkId_createdAt_idx, index:purchase_orders_poNumber_key, index:stock_audit_logs_parkId_createdAt_idx, index:stock_requests_itemId_idx, index:stock_requests_parkId_status_idx, index:stock_transfers_fromParkId_createdAt_idx, index:stock_transfers_toParkId_createdAt_idx, index:student_badges_badgeId_idx, index:student_badges_studentId_badgeId_key, index:student_badges_studentId_idx, index:team_chat_messages_authorId_idx, index:team_chat_messages_teamId_createdAt_idx, table:badges, table:digital_resources, table:fee_donations, table:financial_adjustments, table:knowledge_articles, table:park_stocks, table:point_transactions, table:procurement_items, table:purchase_orders, table:stock_audit_logs, table:stock_requests, table:stock_transfers, table:student_badges, table:team_chat_messages
28. `20260909040000_active_city_batch` => index:batches_one_active_city, trigger:batches_normalize_city, trigger:parks_preserve_batch_city
29. `20260909050000_align_modeled_constraints` => column:event_registrations.checkedInAt, column:event_registrations.feeAmount, column:event_registrations.hasConsent, column:event_registrations.hasMedical, constraint:admission_applications_convertedParticipantId_fkey, constraint:park_lessons_parkId_fkey, constraint:park_routine_slots_parkId_fkey, constraint:participants_groupId_fkey
30. `20260909060000_align_modeled_indexes` => index:event_registrations_participantId_idx, index:park_staff_attendance_records_markedAt_idx
31. `20260909070000_attendance_reset_version` => column:attendance_events.resetVersion
32. `20260916080000_add_muawin_assistance` => column:staff_meta.assistsMurabbiId, index:staff_meta_assistsMurabbiId_idx

```
