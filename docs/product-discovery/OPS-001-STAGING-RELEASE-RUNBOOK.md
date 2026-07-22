# OPS-001: Staging Release Runbook

**Task:** OPS-001
**Owner:** GPT-5.4-mini
**Status:** Draft — pending Codex review
**Created:** 2026-07-21
**Scope:** Documented release sequence for deploying reviewed and approved
changes to the shared Supabase Staging project. Staging is the pre-production
environment used for role UAT, migration rehearsal, browser tests, storage and
integration verification. It is **not** Pilot Production.

---

## 1. Overview

```
  Codex review ──> Local verification ──> Preview deploy ──> Owner approval ──> Staging deploy
       │                                                                           │
       └── rejected ──> agent revises                                     Rollback if failed
```

All changes flowing to Staging must pass Codex review, local verification, a
Vercel Preview deployment check, and an explicit owner-approval gate. No agent
pushes directly to Staging. No deployment runs a database migration automatically.

---

## 2. Branch Review and Codex Approval Gate

| Step | Who | What |
|------|-----|------|
| 2.1 | Agent | Create branch from `codex/production-hardening`, change only allowed files, commit, push, open PR targeting `codex/production-hardening`. |
| 2.2 | Codex | Review diff for behavioural correctness, server-side authorisation, data isolation, transactional integrity, personal-data impact, migration/data rollback safety, mobile/offline behaviour, and test coverage. |
| 2.3 | Codex | Mark decision: `APPROVED`, `CHANGES_REQUESTED`, or `REJECTED`. If `CHANGES_REQUESTED`, the same agent revises the same branch. |
| 2.4 | Codex | Merge approved PR into `codex/production-hardening` on GitHub. Do not squash unless the commit history contains non-atomic work. |
| 2.5 | Operator | Pull the merged `codex/production-hardening` locally. Run `git log --oneline -5` to confirm the merge commit is present. |

**Exit criteria:** An approved and merged PR on `codex/production-hardening`.

---

## 3. Required Local Verification Commands

All commands run from the repository root on the merged `codex/production-hardening`
branch. Record the output of each command. If any step fails, do not proceed.

```text
# 3.1  Install dependencies and generate Prisma client
npm ci
npm run db:generate

# 3.2  Lint
npx next lint

# 3.3  TypeScript validation
npx tsc --noEmit

# 3.4  Unit and integration tests
npx vitest run --reporter=verbose

# 3.5  SQLite production build (local)
npm run build

# 3.6  PostgreSQL client validation
npm run db:postgres:validate

# 3.7  PostgreSQL production build (staged target)
npm run build:postgres

# 3.8  Dependency vulnerability audit
npm audit --audit-level=high

# 3.9  Local smoke test
# Start the dev server, open http://localhost:3000, sign in with a test
# account, verify the landing dashboard loads without console errors.
```

**Acceptance:**

| Check | Pass/fail |
|-------|-----------|
| `npm ci` completes without errors | ☐ |
| `npx next lint` exits 0 | ☐ |
| `npx tsc --noEmit` exits 0 | ☐ |
| `npx vitest run` — all tests pass | ☐ |
| `npm run build` (SQLite) — completes, lists expected routes | ☐ |
| `npm run db:postgres:validate` exits 0 | ☐ |
| `npm run build:postgres` (PostgreSQL) — completes, lists expected routes | ☐ |
| `npm audit` — no high or critical findings | ☐ |
| Local smoke — dashboard loads, navigation works | ☐ |

---

## 4. Preview Deployment Checks

Before deploying to Staging, deploy a Vercel Preview environment from the
`codex/production-hardening` branch.

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Push `codex/production-hardening` to GitHub. Vercel automatically creates a Preview deployment if configured, or trigger manually from Vercel dashboard. | Preview URL is generated. |
| 4.2 | Confirm the Preview deployment connects to the Staging PostgreSQL database (not SQLite). This matches the approved architecture where preview/UAT flows use the shared Staging environment. | Build log shows `npm run build:postgres` (PostgreSQL provider). `DATABASE_URL` points to Staging transaction pooler. |
| 4.3 | Open the Preview URL in a browser. | Home page loads over HTTPS. |
| 4.4 | Sign in with a non-production test account (e.g. Super Admin demo). | Dashboard loads. Navigation renders all expected links. |
| 4.5 | Visit a protected API route directly in an incognito tab. | `401` returned. |
| 4.6 | Verify the application version or commit SHA is visible in the UI or available via an API health endpoint. | Version matches the merged commit. |
| 4.7 | Test the affected feature area (the specific routes, components, or workflows changed in this release). | Behaviour matches the approved design. |

**Exit criteria:** Preview deployment passes all checks. Any failure blocks
further progression until fixed and re-reviewed.

---

## 5. Staging Backup and Explicit-Owner-Approval Gate

Staging is a shared environment. Before applying any change, confirm the
current state is backed up and the owner has explicitly approved the release.

### 5.1 Pre-Deployment Backup

Create a full database backup before deploying to Staging.

> **Backup is a Codex-and-owner-only action.** The operator must use the
> Supabase Dashboard (Project Settings → Database → Create backup), the
> Supabase CLI (`supabase db dump`), or `pg_dump` with the Staging `DIRECT_URL`.
> Paste the URL from the approved secret store — never from this document,
> issues, or chat. The required commands vary by OS and tooling; Codex provides
> the exact invocation at release time.

Step sequence:

1. Record the pre-deployment backup checksum and store it in an encrypted
   location outside the repository. Never commit the `.sql` file or checksum.
2. The backup file name should include the staging environment name, the date,
   and a sequence indicator (e.g. `staging-pre-<date>.sql`).

If `pg_dump` is not available locally, use the Supabase Dashboard → Database
→ Backup or the Supabase CLI `supabase db dump`.

### 5.2 Owner Approval Gate

The project owner must explicitly approve the release before the Staging
deployment proceeds. Approval is recorded as a GitHub comment or task-board
update with the following template:

```
STAGING RELEASE APPROVAL
Release candidate: codex/production-hardening @ <commit SHA>
Preview verified: Yes / No
Local verification: All checks passed
Backup: staging-pre-<timestamp>.sql — checksum recorded
Approved by: <owner name>
Date: <timestamp>
```

**No deployment proceeds without this approval.**

---

## 6. Migration and Reconciliation Evidence

### 6.1 Migration Application

If the release includes a Prisma migration:

# 6.1.1  Set DIRECT_URL locally for migration/backup operations.
#        Never set DIRECT_URL in Vercel environment variables.
#        DATABASE_URL must use the approved Staging runtime pooler for
#        Preview/Staging only.
#        Codex-approved command required (varies by OS — see note below).

# 6.1.2  Apply the migration
#        Codex-approved command required: npx prisma migrate deploy
#        (runs with DIRECT_URL set to the Staging direct connection)

# 6.1.3  Verify the migration was applied
#        Codex-approved command required: npx prisma migrate status
#        Expected: "Database up to date" — all migrations applied.

# 6.1.4  Regenerate the Postgres client
#        Codex-approved command required: npm run db:postgres:generate

> **Environment variable note:** All code blocks in this runbook use
> pseudocode. The operator must set `DIRECT_URL` using their shell's syntax
> (PowerShell: `$env:DIRECT_URL = "..."`, Bash: `export DIRECT_URL="..."`).
> Never paste a URL value into this document, issues, or chat.

### 6.2 Data Import and Reconciliation

If the release includes a data import, Codex provides the approved import
command at release time. The sequence is:

1. Run the import in dry-run mode (read-only — verifies counts and money
   totals without writing).
2. If dry-run passes, execute the import against an empty Postgres target.
   Never truncate or overwrite an existing target.
3. Run reconciliation: compare row counts, financial totals,
   password-hash/Unicode parity, and foreign keys.

> **Codex-approved command required for each step.** The exact script names
> (`db:migrate:sqlite-to-postgres`, `db:reconcile:sqlite-to-postgres`, etc.)
> must be verified to exist in `package.json` before execution.

### 6.3 Evidence Recording

Record the following in a secure handover log (not in Git):

- Migration names and applied-at timestamps
- Dry-run output (counts only, no personal data)
- Reconciliation pass/fail for each check
- Any excluded records (audit, notifications) and the exclusion reason
- The encrypted backup checksum and storage location

---

## 7. Staging Deployment

### 7.1 Vercel Environment Configuration

Staging runs on a **separate Vercel project or separate environment** from
Pilot Production. Environment variables:

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | Supavisor transaction pooler, port `6543`, `pgbouncer=true`, `connection_limit=1`, SSL required | Supabase Dashboard → Project Settings → Database |
| `DIRECT_URL` | Supabase direct connection, port `5432`, SSL required | Same page (used only for local migration/backup commands, never set in Vercel) |
| `NEXTAUTH_URL` | Staging deployment URL | Set per environment |
| `NEXTAUTH_SECRET` | Unique random value, **different from Pilot Production** | Generate using a random-secret generator of your choice. Codex provides the value at setup time; never paste it into issues, logs, or chat. |

**Rules:**
- Never set `DIRECT_URL` in a Vercel environment variable.
- Never reuse secrets between Staging and Pilot Production.
- Never paste a secret value into issues, logs, or chat.
- If a secret is exposed, rotate it immediately following the incident
  response in section 9.

### 7.2 Deploy

```text
# 7.2.1  Push the merged branch
git push origin codex/production-hardening

# 7.2.2  Trigger a Vercel Production deployment for the Staging project
#        (via Vercel Dashboard or CLI). Do not deploy to Pilot Production.
#        Codex-approved command required (exact CLI or Dashboard path varies).
vercel --prod --scope=<staging-project-name>

# 7.2.3  Confirm the build log shows the PostgreSQL provider
#        Build command: npm run build:postgres
```

### 7.3 Post-Deployment Smoke Tests

| Test | Expected |
|------|----------|
| 7.3.1 | Open Staging URL over HTTPS | Page loads, lock icon present |
| 7.3.2 | Sign in with test account | Login succeeds |
| 7.3.3 | Navigate to the affected feature area | Behaviour matches approved design |
| 7.3.4 | Open a protected API route in incognito | 401 |
| 7.3.5 | Run the focused test suite against Staging (if possible) | All passing |
| 7.3.6 | Check Vercel runtime logs for errors | No unexpected 500 responses |

---

## 8. Separation of Staging vs Pilot Production

| Concern | Staging | Pilot Production |
|---------|---------|-----------------|
| Vercel project | Separate project or environment | Separate project |
| Database | Shared Supabase Staging project | Separate Supabase project |
| `DATABASE_URL` | Points to Staging transaction pooler | Points to Production transaction pooler |
| `NEXTAUTH_SECRET` | Unique | Unique, different from Staging |
| Data | Sanitised test data only | Approved minimum real data |
| Migrations | Applied manually via `DIRECT_URL` | Applied manually after Staging verification |
| Build | `npm run build:postgres` (PostgreSQL client) | Same command |
| Secrets | Never shared with Production | Never shared with Staging |

**Cardinal rule:** A variable, secret, or URL intended for one environment
must never be set in the other. No deployment script or CI pipeline crosses
this boundary.

---

## 9. Rollback and Incident Steps

### 9.1 Application Rollback (no schema change)

If the deployed application has a runtime regression but no database migration
was applied:

1. Promote the last known-good Vercel deployment through the Vercel Dashboard.
2. Verify the home page, sign-in, and a protected route after rollback.
3. Record the incident: deployment URL, timestamp, observed symptom, rollback
   time, and follow-up task reference.
4. Do not modify the database. The old application code must be compatible with
   the current database schema.

### 9.2 Full Rollback (schema migration applied)

Full database restore is a **Codex-and-owner-only incident action**. It is
never a normal rollback step. If a database migration was applied and must be
rolled back:

1. Place the application in maintenance mode (stop writes, show a maintenance
   page, or redirect traffic away from Staging).
2. Restore from the pre-deployment backup using the Supabase Dashboard,
   Supabase CLI, or `pg_dump`/`psql`. Codex provides the exact command at
   incident time.
3. Verify the restoration: run `npx prisma migrate status` and confirm it
   reports the expected migration state. Do not use `prisma db push`.
4. Redeploy the pre-migration application code (promote previous Vercel
   deployment).
5. Verify smoke tests pass.
6. Record the incident and open a follow-up task with the migration name,
   rollback reason, and restoration verification output.

**After Postgres accepts a live write, never roll the application back beyond
the point where the schema changed.** Recovery is always: pause writes, restore
the latest backup, deploy the known-good application, reconcile, forward-fix.

### 9.3 Secret Exposure

1. Rotate the exposed secret in its provider and Vercel immediately.
2. Remove the exposure from active files and current Git tracking.
3. Rotate `NEXTAUTH_SECRET` to invalidate all sessions.
4. Re-deploy and verify authentication.
5. Limit incident notes to references and timestamps.

### 9.4 Data Corruption or Integrity Failure

1. Stop all writes immediately.
2. Identify the scope of corruption from the most recent reconciliation and
   the failing check.
3. If the corruption is limited to a single import, re-run the import from
   the frozen source snapshot into a clean target, then re-reconcile.
4. If the corruption is widespread, restore from the pre-deployment backup and
   re-apply approved migrations individually.

---

## 10. Vercel Hobby Constraints and Secret-Handling Rules

### 10.1 Vercel Hobby Constraints

The current pilot runs on Vercel Hobby. These constraints apply:

| Constraint | Implication |
|------------|-------------|
| No team collaboration | All environment configuration is per-user. Document secrets only in password manager, never in issues. |
| No long log retention | Download build/runtime logs after an incident before they expire. |
| Single preview deployment | Only one Preview at a time; merge and deploy sequentially. |
| No automatic backups | The pre-deployment `pg_dump` backup is the only recovery path. |
| 100 GB bandwidth, 100 GB-hours serverless execution | Monitor usage; upgrade before limits are approached. |
| 12-hour serverless function execution cap per day | Sufficient for pilot traffic; not sufficient for sustained background processing. |
| Custom domain support is limited | Use Vercel-provided URL for Staging. Custom domain setup for Pilot Production requires additional configuration. |

### 10.2 Secret-Handling Rules

| Rule | Detail |
|------|--------|
| No `.env` files in Git | The `.env` file is in `.gitignore`. Never commit it. |
| No secrets in issues, logs, or chat | If a secret appears in a log or error message, rotate it and add a redaction rule. |
| One secret source per environment | Use Vercel Environment Variables for runtime. Use the local password manager or encrypted file for backup/restore URLs. |
| Staging and Production use different secrets | `NEXTAUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, and any API keys must be unique per environment. |
| No agent receives secrets | An agent may reference a secret by name (`DATABASE_URL`) but must never read, print, or store its value. If a task requires a secret value, Codex or the owner executes that step. |
| Rotate on exposure | If a secret is suspected exposed, rotate it before investigating the source. |

---

## 11. Execution Checklist

| Step | Description | Done |
|------|-------------|------|
| 1 | Codex approves the PR on `codex/production-hardening` | ☐ |
| 2 | Pull merged branch locally | ☐ |
| 3 | Run local verification commands (section 3) | ☐ |
| 4 | Deploy Vercel Preview and verify (section 4) | ☐ |
| 5 | Create Staging database backup (section 5.1) | ☐ |
| 6 | Obtain explicit owner approval (section 5.2) | ☐ |
| 7 | Apply migrations against Staging (section 6.1) | ☐ |
| 8 | Run import dry-run and reconcile (section 6.2, if applicable) | ☐ |
| 9 | Deploy to Staging Vercel project (section 7) | ☐ |
| 10 | Run post-deployment smoke tests (section 7.3) | ☐ |
| 11 | Record evidence in handover log (section 6.3) | ☐ |
| 12 | Confirm rollback procedure is understood (section 9) | ☐ |

---

## 12. Handoff

```
Task ID: OPS-001
Branch and base commit: agent/gpt-5.4-mini/OPS-001-staging-release-runbook @ 2a3fcc7
Commit SHA: (pending)
Changed files: docs/product-discovery/OPS-001-STAGING-RELEASE-RUNBOOK.md
What changed:
  - Step-by-step staging release sequence from Codex approval through
    post-deployment smoke tests
  - Branch review and Codex approval gate (section 2)
  - Local verification commands with acceptance checklist (section 3)
  - Preview deployment checks (section 4)
  - Staging backup (pg_dump) and explicit owner-approval gate (section 5)
  - Migration application and reconciliation evidence (section 6)
  - Staging deployment with environment variable rules (section 7)
  - Clear separation of Staging vs Pilot Production (section 8)
  - Rollback for application-only, full-schema, secret exposure, and data
    corruption incidents (section 9)
  - Vercel Hobby constraints and secret-handling rules (section 10)
  - Execution checklist (section 11)
What was intentionally excluded:
  - No code, tests, schemas, migrations, deployment configuration, .env, or
    database changes
  - No Pilot Production deployment sequence (Staging only)
  - No product policy or feature-scope decisions
Commands run and results:
  - git diff --check: pass
Known risks, owner decisions, and follow-up work:
  - The owner-approval gate depends on the owner being reachable and responsive
  - Vercel Hobby constraints may require plan upgrade before certain release
    types (large data imports, high-traffic UAT)
  - The pg_dump backup step requires PostgreSQL client tools or Supabase CLI
  - Secret rotation procedures are documented but untested in this repo
Ready for Codex review.
```
