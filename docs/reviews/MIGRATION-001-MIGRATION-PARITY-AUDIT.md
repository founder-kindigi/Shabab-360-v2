# MIGRATION-001: Migration Parity Audit

- **Document Version:** 2.0.0
- **Task ID:** `MIGRATION-001-MIGRATION-PARITY-AUDIT`
- **Complexity:** C2
- **Status:** `COMPLETE` — Audit findings and remediation plan (docs only, no code or migration files modified)
- **Base:** `159ba85` (`origin/codex/production-hardening`)
- **Objective:** Investigate `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` emitting a full SQLite schema instead of an empty diff, and assess PostgreSQL migration parity before any staging deploy.

---

## 1. Migration Chain Inventory (at Base `159ba85`)

### 1.1 SQLite Chain (`prisma/migrations/`, provider: `sqlite`)

3 migrations in chronological order:

| # | Timestamp | Name | What It Creates |
|---|-----------|------|-----------------|
| 1 | `20260723160000` | `add_student_extended_profile` | `student_extended_profiles` table + index |
| 2 | `20260723200000` | `add_events_and_calling_foundation` | `events`, `temporary_event_teams`, `event_team_memberships`, `event_planner_items`, `event_responsibilities`, `calling_campaigns`, `calling_templates`, `calling_template_uses`, `calling_assignments`, `call_interactions`, `external_support_callers` |
| 3 | `20260724200000` | `add_mashwara_module` | `mashwara_meetings`, `mashwara_attendees`, `mashwara_decisions`, `mashwara_action_items`, `mashwara_meeting_shares` |

**Total: 3 migrations. No initial-baseline migration exists.** The foundational schema — approximately 25 models (User, City, Park, Batch, Group, StaffMeta, CollaborationTeam, StaffTeamMembership, ContentPlan, ContentPlanSession, ContentPlanBlock, ContentPlanResource, ActivityPlanItem, Guardian, GuardianChild, Participant, BatchSettings, AttendanceEvent, AttendanceRecord, FeeEvent, Payment, ReceiptSequence, AdmissionApplication, AdmissionInterview, Announcement, Notification, ReportPreset, Event, CallingPOCAssignment, CallingCampaign, etc.) — was applied outside migration history, almost certainly via `prisma db push`.

### 1.2 PostgreSQL Chain (`prisma/postgres/migrations/`, provider: `postgresql`)

11 migrations in chronological order:

| # | Timestamp | Name | What It Creates |
|---|-----------|------|-----------------|
| 1 | `20260714200000` | `init_postgres` | Complete baseline: all core tables, enums (ParticipantState, AttendanceStatus, etc.), indices, FK constraints |
| 2 | `20260714223000` | `add_on_leave_participant_state` | Additive |
| 3 | `20260715123000` | `add_admission_application_details` | Additive |
| 4 | `20260716210000` | `add_access_management_overrides` | Additive (`role_capability_overrides`, `user_capability_overrides`) |
| 5 | `20260720100000` | `add_participant_age_and_grade_class` | Additive |
| 6 | `20260720190000` | `add_collaboration_teams` | Additive |
| 7 | `20260720210000` | `add_content_planner_foundation` | Additive |
| 8 | `20260721090000` | `expand_city_batch_park_group` | Additive |
| 9 | `20260723160000` | `add_student_extended_profile` | Additive (same as SQLite #1) |
| 10 | `20260723200000` | `add_events_and_calling_foundation` | Additive (same as SQLite #2) |
| 11 | `20260724200000` | `add_mashwara_module` | Additive (same as SQLite #3) |

**Total: 11 migrations.** The `init_postgres` baseline was generated via `prisma migrate diff --from-empty --to-schema-datamodel ... --script` and captures the full schema. All 10 subsequent additive migrations build on it.

### 1.3 Migration Lock Files

| File | Provider | Correct? |
|------|----------|----------|
| `prisma/migrations/migration_lock.toml` | `sqlite` | Yes |
| `prisma/postgres/migrations/migration_lock.toml` | `postgresql` | Yes |

### 1.4 Migration Naming and Order

Migrations 9–11 in PostgreSQL use identical timestamps and names to SQLite migrations 1–3. Within each chain, migrations are strictly chronological. No ordering mismatch exists.

---

## 2. Diff Reproduction at Base `159ba85`

### 2.1 SQLite: `migrate diff --from-migrations ... --to-schema-datamodel ...`

**Command:**
```bash
npx prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma --script
```

**Result:** The command emits a **complete schema rebuild** — every `CREATE TABLE`, `CREATE INDEX`, `CREATE UNIQUE INDEX` statement for all ~25 models, followed by indices and FK constraints.

This is not a bug. It is the correct, internally consistent output for a migration chain that has **no initial baseline**. Prisma has no way to know which tables were created by the 3 additive migrations vs. which were created independently (via `db push`). Its only safe option is to emit the entire schema as "unmanaged."

Concretely: the 3 additive migrations cover only `student_extended_profiles`, events/calling, and Mashwara. The remaining core tables have no migration lineage and are therefore reported by `migrate diff` as needing creation.

**The diff is correct; the migration chain is incomplete.**

### 2.2 PostgreSQL: `migrate diff` — Blocked

**Command:**
```bash
npx prisma migrate diff --from-migrations prisma/postgres/migrations \
  --to-schema-datamodel prisma/postgres/schema.prisma --script
```

**Result:** Error: `You must pass the --shadow-database-url if you want to diff a migrations directory.`

PostgreSQL `migrate diff` against a migrations directory requires a live shadow database to compute the schema. It cannot be run dry. A disposable PostgreSQL shadow database is required (see §4.3).

The `init_postgres` baseline exists at the file level, but **parity remains unverified** until a shadow-database diff confirms the 11 migrations produce the exact current schema with no drift.

---

## 3. Root-Cause Analysis

### 3.1 Primary Gap: Missing SQLite Baseline Migration

The SQLite chain begins with an **additive** migration (`add_student_extended_profile`), but the 20+ core models it builds on were never captured in a migration file.

**Evidence:**
- `git ls-tree -r 159ba85 --name-only prisma/migrations/` shows exactly 3 migration files.
- Each migration file contains only its specific additive changes, not the foundational schema.
- The `migrate diff` output confirms the entire core schema is reported as unmanaged.

**Presumptive cause:** `prisma db push` was used during initial development to apply the schema to SQLite. This is a common local-development workflow, but it creates a divergence between the migration directory and the actual database state.

### 3.2 Inventory Is Orderly; Executable Parity Is Still Required

The three shared additive migrations have matching names and timestamps in both providers. That inventory check is useful, but it does **not** establish that either migration chain reproduces the current schema. Only an executable diff against a fresh SQLite database and a PostgreSQL shadow database can establish parity.

The missing SQLite baseline is confirmed. No additional migration-schema drift should be claimed absent those executable checks.

### 3.3 PostgreSQL Baseline Exists but Parity Is Unverified

File review confirms:
- `init_postgres` contains a complete schema baseline (all tables, enums, indices).
- Migrations 2–11 are additive and consistent with that baseline.
- Migrations 9–11 match the SQLite chain identically.

However, file review cannot detect drift that may have occurred if:
- A schema change was applied to PostgreSQL via `db push` after the baseline was created.
- A migration was edited after generation.
- An environment-specific configuration (e.g. extensions, collation) alters the schema.

**Parity requires shadow-database diff verification** before any staging deploy (see §4.3).

---

## 4. Remediation Plan

### 4.1 Recommended Path: Add a Pre-Baseline Migration to SQLite

> **Status:** Documentation only. Execution requires owner approval. See §5 (Owner/Codex) for commands.

The SQLite chain needs an initial-baseline migration that captures the schema **as it existed immediately before `20260723160000_add_student_extended_profile`**. This avoids creating duplicate-table migrations on a fresh database.

**Steps:**

1. **Freeze `prisma/schema.prisma`.** No schema changes during this operation.

2. **Use the verified pre-additive schema revision.** The baseline must match the schema before any of the three additive migrations. At this base, that revision is `60bc3f17d992beec3e9b332ae6e16d3d43847642`, the parent of `18501be72b416358645f9317a6ce585d372d6cd2` (the commit that added `StudentExtendedProfile` and the first SQLite migration). Generate baseline SQL from a temporary copy of that historical schema or an isolated worktree at that revision. Do not comment out models or alter the active `schema.prisma`.

3. **Create the migration directory** with a timestamp predating all existing migrations:
   ```
   prisma/migrations/20260701000000_init_sqlite/
   migration.sql
   ```

4. **Verify on a fresh SQLite database:**
   - Create or point to a blank SQLite database (no existing data).
   - Apply the baseline plus all three additive migrations.
   - Run `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`.
   - **Expected:** Empty output (no diff).
   - Run `npx prisma migrate status` and confirm the baseline plus all three additive migrations are recorded as applied.

5. **Assess each existing local SQLite development database before any metadata change:**
   - Inspect its `_prisma_migrations` records and database schema first.
   - Only if the schema matches the proposed baseline and the migration record sequence is understood, use `prisma migrate resolve --applied 20260701000000_init_sqlite` to mark the baseline without re-executing SQL.
   - Confirm `prisma migrate status` shows the expected baseline plus additive migrations.
   - Confirm `migrate diff` now outputs empty.

**Why not generate the baseline from the current schema?** The current schema includes `student_extended_profiles`, events/calling tables, and Mashwara tables. A `--from-empty` diff of the current schema would produce `CREATE TABLE` for every model, including those already created by migrations 1–3. On a fresh database, `migrate dev` would then attempt to create those tables twice, producing duplicates.

### 4.2 Existing-Database Hygiene (for Local SQLite)

The `migrate resolve` command on local SQLite is low-risk because:
- It modifies only the `_prisma_migrations` metadata table (not the schema).
- The local SQLite database is a development artifact, not production.
- The baseline SQL file is pure `CREATE TABLE` — it was already applied via `db push`.

**Even so, the following should be confirmed before any `migrate resolve` on any environment:**

| Check | Why |
|-------|-----|
| `_prisma_migrations` table exists and is readable | Confirms the database is Prisma-managed |
| The 3 existing migrations are listed as `APPLIED` | Confirms the chain has been applied |
| No unapplied migrations exist | Confirms the chain is at the expected state |
| A recent backup or snapshot is available | Enables rollback if `migrate resolve` produces unexpected results |
| Schema confirmation via `migrate diff` | Verifies the actual database matches the schema (independent of migration metadata) |

### 4.3 PostgreSQL Parity Verification (Release Gate)

Before any `migrate deploy` on staging, the following must pass:

1. **Backup confirmation** — recent Supabase snapshot or `pg_dump` of the staging database, verified accessible and restorable.

2. **Disposable PostgreSQL shadow database** — an ephemeral PostgreSQL instance (local Docker container or separate Supabase project) with connection string provided via `SHADOW_DATABASE_URL`.

3. **Shadow-database diff:**
   ```bash
   npx prisma migrate diff \
     --from-migrations prisma/postgres/migrations \
     --to-schema-datamodel prisma/postgres/schema.prisma \
     --shadow-database-url "postgresql://..." \
     --script
   ```
   Expected output: **empty** (no diff), or contains only the exact change intended for the deploy if a new migration is included.

4. **`migrate status` on staging (read-only):**
   ```bash
   npx prisma migrate status --schema=prisma/postgres/schema.prisma
   ```
   Expected: all 11 migrations show as `Already Applied`. Any `Database error` or `Migration not found` requires investigation.

### 4.4 Stop Conditions

The deploy must stop and escalate to the owner if:

| Condition | Action |
|-----------|--------|
| `migrate status` shows an unapplied migration whose name/timestamp is unrecognised | Do not apply. Investigate contents. |
| The shadow-database diff emits unexpected changes | Pause. Cross-reference with `schema.prisma` and `migrate status`. |
| No recent backup can be confirmed | Defer until backup exists. |
| The PostgreSQL shadow database cannot be created or connected | Parity cannot be proven; do not proceed. |
| `migrate status` errors or shows the chain in an unexpected state | Investigate before any write operation. |

### 4.5 Alternative: Document Divergence and Continue with `db push`

If the SQLite migration chain is used only for isolated local development that is regularly reset, the divergence may be tolerable. The trade-offs:

| Risk | Impact |
|------|--------|
| Fresh clones cannot reliably reproduce the local schema from migration history | Developers must use an undocumented `db push` workaround or the baseline must be created |
| CI checks expecting clean `migrate diff` will need the baseline | CI must either create the baseline or skip the check |
| PostgreSQL is unaffected for staging deploy | The staging concern is PostgreSQL, which has a complete chain pending parity verification |

---

## 5. Pre-Deployment Release Gates

These are the minimum checks before any staging deployment:

```
[ ] 1. Staging database backup/snapshot confirmed (within 24h)
[ ] 2. Disposable PostgreSQL shadow database available
[ ] 3. Shadow-database diff: output is empty or matches only the intended change
[ ] 4. `migrate status` on staging: all 11 migrations "Already Applied"
[ ] 5. `git diff --check` passes on the deploy branch
[ ] 6. Lint, typecheck, test suite, and PostgreSQL production build pass
[ ] 7. Owner has reviewed and approved the deploy scope
```

---

## 6. Owner/Codex-Only Execution Section

The following commands must **only** be executed by the repository owner or Codex with explicit approval. They modify a database or create migration files.

| Action | Command | Risk Level |
|--------|---------|------------|
| Generate SQLite pre-baseline migration SQL (local, no DB contact) | `npx prisma migrate diff --from-empty --to-schema-datamodel <temporary schema exported from 60bc3f17> --script > prisma/migrations/20260701000000_init_sqlite/migration.sql` | Low — creates a file, no database contact. The temporary schema must come from the verified historical revision, not a manually edited active schema. |
| Apply baseline to a fresh SQLite database (data-safe) | `npx prisma migrate dev` | Low — fresh database, no data. |
| Mark baseline as applied on existing local SQLite dev database | `npx prisma migrate resolve --applied 20260701000000_init_sqlite --schema=prisma/schema.prisma` | Low — modifies only `_prisma_migrations`. Must confirm backup exists and `migrate status` is clean first. |
| Check PostgreSQL migrate status against staging (read-only) | `npx prisma migrate status --schema=prisma/postgres/schema.prisma` | Low — read-only query. Still connects to staging. |
| Run diff against disposable PostgreSQL shadow database | `npx prisma migrate diff --from-migrations prisma/postgres/migrations --to-schema-datamodel prisma/postgres/schema.prisma --shadow-database-url "..." --script` | Low — uses disposable DB, no staging contact. |
| Deploy PostgreSQL migrations to staging | `npx prisma migrate deploy --schema=prisma/postgres/schema.prisma` | **High** — modifies staging DB schema. Requires all release gates (§5) to pass and owner approval. |
| Reset or revert a staging migration | Owner-restricted. Requires backup-restore procedure. | **Critical** — only under incident escalation. |

---

## 7. Summary of Findings

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| F1 | **SQLite has no initial-baseline migration.** The core schema (~25 models) was created outside migration history. | **High** — `migrate diff` emits full schema; blocks clean CI; confuses onboarding. | File review: 3 additive migrations only; `migrate diff` output is a complete schema. |
| F2 | **PostgreSQL baseline exists but parity is unverified.** The `init_postgres` migration looks complete on file review, but a disposable shadow-database diff is required for certainty. | **Medium** — blocks staging deploy until shadow-database parity is proven. | `migrate diff` on PostgreSQL returns error without shadow DB; file review cannot detect drift. |
| F3 | **No migration naming or ordering mismatch was found at base `159ba85`.** This is not proof of schema parity; only executable diffs against a fresh SQLite database and a PostgreSQL shadow database can establish that. | **Low** — inventory is orderly, but parity remains a release gate. | The three shared additive migrations have matching names and timestamps; executable parity remains pending. |
| F4 | **Both chains share their last 3 migrations** with identical timestamps and names. Migration ordering is correct within each chain. | **None** — confirmed aligned. | Timestamps and file contents match. |
| F5 | **PostgreSQL diff requires a shadow database** and cannot be run locally without one. | **Medium** — adds setup overhead. | Command errors with `--shadow-database-url` required. |

### Action Items

1. **Create SQLite pre-baseline migration** — generate from the schema revision immediately before `20260723160000_add_student_extended_profile`. Verify on a fresh SQLite database.
2. **Verify PostgreSQL parity** — provision a disposable shadow database, run `migrate diff`, confirm empty output. Make this a hard release gate.
3. **Establish a workflow rule** — all future schema changes for both SQLite and PostgreSQL must use `migrate dev --create-only` to keep both chains in sync. Never use `db push` on the primary schema.
4. **Document the SQLite pre-baseline procedure** in the project README or AGENTS.md so developers working on fresh clones know how to bootstrap their local database.

---

## 8. Can a Migration Be Applied Now?

**No staging deployment should proceed** until:
- The PostgreSQL shadow-database diff confirms parity.
- The owner confirms a recent backup exists.
- The owner has reviewed and approved the deploy scope.

**There is no pending migration at base `159ba85`** that needs to be applied. Both chains are at their terminal migration. The release blocker is the SQLite `migrate diff` noise (which is a hygiene issue, not a data issue) and the unverified PostgreSQL parity (which is a safety gate).

**The SQLite chain can be remediated offline** (see §4.1) without affecting staging or production. It is a local-development hygiene fix.

---

*End of MIGRATION-001-MIGRATION-PARITY-AUDIT.md*
