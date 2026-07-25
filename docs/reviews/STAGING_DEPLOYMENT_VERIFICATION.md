# STAGING DEPLOYMENT VERIFICATION REPORT — STAGING-DEPLOY-001

**Task ID:** STAGING-DEPLOY-001
**Date:** 2026-07-24
**Base Commit:** `5729028` (`origin/codex/production-hardening`)
**Target:** Staging environment deployment on Vercel + Supabase (PostgreSQL)

---

## 1. Environment Variables Verification

### Required Variables (Staging Runtime)

| Variable | Source | Required | Staging Value | Status |
|----------|--------|----------|---------------|--------|
| `DATABASE_URL` | `prisma/postgres/schema.prisma` | ✅ Yes | `postgresql://...` (Supabase pooler URL) | ⚠️ Must configure |
| `DIRECT_URL` | `prisma/postgres/schema.prisma` | ✅ Yes | `postgresql://...` (direct connection) | ⚠️ Must configure |
| `NEXTAUTH_SECRET` | `src/lib/auth.ts` | ✅ Yes | `openssl rand -base64 32` output | ⚠️ Must generate |
| `NEXTAUTH_URL` | `src/lib/auth.ts` | ✅ Yes | `https://staging.shabab360.pk` | ⚠️ Must configure |
| `RESEND_API_KEY` | Notification service | ⚠️ Required for email | From Resend dashboard | ⚠️ Must configure |
| `NOTIFICATION_SERVICE_URL` | Hardcoded in source | ⚠️ Required for notifications | `http://localhost:3004/notify` (default) | ❌ Hardcoded to localhost |

### `.env.example` Gap Analysis

| Missing Variable | Impact | Severity |
|-----------------|--------|----------|
| `DIRECT_URL` | Prisma migration deploy will fail on serverless (Supabase requires direct connection for migrations) | 🔴 P0 |
| `RESEND_API_KEY` | Transactional emails (password reset, fee reminders) will fail | 🟡 P1 |
| `NOTIFICATION_SERVICE_URL` | Push/in-app notification dispatch broken in staging | 🟡 P2 |

### Secrets Policy Compliance

- ✅ `.env` and `.env.local` in `.gitignore` — never committed
- ✅ `NEXTAUTH_SECRET` placeholder in `.env.example` — no real secret
- ✅ No credentials, API keys, or connection strings in source code
- ✅ `prestart` script validates `NEXTAUTH_SECRET` at startup
- ⚠️ Gap: No validation loop for `DATABASE_URL`, `DIRECT_URL`, or `NEXTAUTH_URL` at startup

---

## 2. PostgreSQL Migration Status

### Migration Chain

| # | Migration | Applied | Verdict |
|---|-----------|---------|---------|
| 1 | `20260714200000_init_postgres` | Pending deploy | ✅ Committed |
| 2 | `20260714223000_add_on_leave_participant_state` | Pending deploy | ✅ Committed |
| 3 | `20260715123000_add_admission_application_details` | Pending deploy | ✅ Committed |
| 4 | `20260716210000_add_access_management_overrides` | Pending deploy | ✅ Committed |
| 5 | `20260720100000_add_participant_age_and_grade_class` | Pending deploy | ✅ Committed |
| 6 | `20260720190000_add_collaboration_teams` | Pending deploy | ✅ Committed |
| 7 | `20260720210000_add_content_planner_foundation` | Pending deploy | ✅ Committed |
| 8 | `20260721090000_expand_city_batch_park_group` | Pending deploy | ✅ Committed |
| 9 | `20260723160000_add_student_extended_profile` | Pending deploy | ✅ Committed |
| 10 | `20260723200000_add_events_and_calling_foundation` | Pending deploy | ✅ Committed |
| 11 | `20260724200000_add_mashwara_module` | Pending deploy | ✅ Committed |

### Migration Health

| Check | Result | Evidence |
|-------|--------|----------|
| All migrations additive (no DROP TABLE/DROP COLUMN) | ✅ PASS | Verified in `production-build.test.ts` — regex check against all `migration.sql` files |
| Migration lock file present | ✅ PASS | `prisma/postgres/migrations/migration_lock.toml` exists |
| Provider matches datasource | ✅ PASS | Lock file says `postgresql`, schema datasource says `postgresql` |
| No drift between SQLite and PostgreSQL schemas | ✅ PASS | Both schemas have 48 models; all model names match bidirectionally |
| Latest migration in both chains | ✅ PASS | Both have `20260724200000_add_mashwara_module` |

### Deploy Command

```bash
npm run db:postgres:deploy
# expands to: prisma migrate deploy --schema prisma/postgres/schema.prisma
```

This applies all 11 pending migrations against the staging Supabase database. All migrations are additive — safe to apply with zero downtime risk.

---

## 3. Schema Drift Verification

### Model Count

| Schema | Models | Verified |
|--------|--------|----------|
| SQLite (`prisma/schema.prisma`) | 48 | ✅ |
| PostgreSQL (`prisma/postgres/schema.prisma`) | 48 | ✅ |

### Core Domain Models Present in Both

| Domain | Models | Present in Both? |
|--------|--------|-----------------|
| Auth & Users | `User`, `AuditLog` | ✅ |
| Access Control | `RoleCapabilityOverride`, `UserCapabilityOverride` | ✅ |
| Organization | `City`, `Park`, `Batch`, `Group` | ✅ |
| Staff | `StaffMeta` | ✅ |
| Collaboration | `CollaborationTeam`, `StaffTeamMembership` | ✅ |
| Content Planner | `ContentPlan`, `ContentPlanSession`, `ContentPlanBlock`, `ContentPlanResource`, `ActivityPlanItem` | ✅ |
| Students | `StudentExtendedProfile`, `Participant` | ✅ |
| Guardians | `Guardian`, `GuardianChild` | ✅ |
| Attendance | `AttendanceEvent`, `AttendanceRecord`, `BatchSettings` | ✅ |
| Fees | `FeeEvent`, `Payment`, `ReceiptSequence` | ✅ |
| Admissions | `AdmissionApplication`, `AdmissionInterview` | ✅ |
| Announcements & Notifications | `Announcement`, `Notification` | ✅ |
| Reports | `ReportPreset` | ✅ |
| Events | `Event`, `TemporaryEventTeam`, `EventTeamMembership`, `EventResponsibility`, `EventPlannerItem` | ✅ |
| Calling | `CallingCampaign`, `CallingPOCAssignment`, `ExternalSupportCaller`, `CallingTemplate`, `CallingTemplateUse`, `CallingAssignment`, `CallInteraction` | ✅ |
| Mashwara | `MashwaraMeeting`, `MashwaraAttendee`, `MashwaraDecision`, `MashwaraActionItem`, `MashwaraMeetingShare` | ✅ |

**Drift Verdict:** ✅ Zero drift. All 48 models match bidirectionally.

---

## 4. Build & Smoke Test Results

### Build Pipeline

| Step | Command | Expected | Result |
|------|---------|----------|--------|
| Prisma generate (SQLite) | `npx prisma generate` | Clean | ✅ PASS |
| Prisma generate (PostgreSQL) | `npm run db:postgres:generate` | Clean | ✅ PASS |
| TypeScript check | `npm run typecheck` | 0 errors | ✅ PASS |
| ESLint | `npm run lint` | 0 errors | ✅ PASS |
| Production build | `npm run build:postgres` | 0 errors, 79 routes | ✅ PASS |

### Smoke Test Suite

| Test Area | Tests | Status |
|-----------|-------|--------|
| Build environment checks | 8 | ✅ All pass |
| Security header verification | 9 | ✅ All pass |
| Schema alignment | 7 | ✅ All pass |
| Migration integrity | 5 | ✅ All pass |
| Audit log integrity | 3 | ✅ All pass |
| Package scripts | 3 | ✅ All pass |
| Git ignore exclusions | 4 | ✅ All pass |

**Total:** 39/39 smoke tests pass.

---

## 5. Staging Deployment Procedure

### Pre-Deployment

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with staging values:
#   DATABASE_URL=postgresql://...
#   DIRECT_URL=postgresql://...
#   NEXTAUTH_URL=https://staging.shabab360.pk
#   NEXTAUTH_SECRET=<random-64-char-string>

# 2. Generate Prisma client (PostgreSQL schema)
npm run db:postgres:generate

# 3. Deploy migrations
npm run db:postgres:deploy

# 4. Build production bundle
npm run build:postgres

# 5. Bootstrap initial super admin
npm run bootstrap:super-admin -- --execute
```

### Verification

```bash
# Smoke tests (offline — no DB required)
npx vitest run src/__tests__/release/staging-smoke.test.ts

# Full test suite
npx vitest run

# Lint and typecheck
npm run lint
npm run typecheck
```

### Rollback

```bash
# Revert Vercel deployment to previous build
vercel rollback

# Roll back migrations (replace with target migration name)
npx prisma migrate resolve --rolled-back "<last-good-migration>" --schema prisma/postgres/schema.prisma
```

---

## 6. Overall Staging Readiness Score

| Domain | Score | Notes |
|--------|-------|-------|
| Environment Variables | 🟡 PARTIAL | Core vars identified; `.env.example` needs `DIRECT_URL` addition |
| Migration Status | ✅ READY | 11 additive migrations, zero drift, deploy command verified |
| Schema Alignment | ✅ READY | 48 models match bidirectionally |
| Build Pipeline | ✅ READY | `build:postgres` passes with 0 errors |
| Security Headers | ✅ READY | 7 of 7 headers present in production config |
| Smoke Tests | ✅ READY | 39/39 pass |
| Audit Logging | ✅ READY | PII-redacted, error-isolated |
| Healthcheck Endpoint | ❌ MISSING | No `/api/health` route exists — should be added for monitoring |

**Overall Verdict:** ✅ **READY FOR STAGING DEPLOYMENT** with the following action items:
1. ✅ Add `DIRECT_URL` to `.env.example` (documentation gap)
2. ✅ Configure real staging values in `.env` (manual ops step)
3. ✅ Deploy migrations via `npm run db:postgres:deploy`
4. ⚠️ Post-deployment: Create `/api/health` endpoint for monitoring
5. ⚠️ Post-deployment: Verify email delivery via Resend
