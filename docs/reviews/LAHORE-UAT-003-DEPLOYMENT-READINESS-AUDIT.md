# LAHORE-UAT-003 — Deployment Readiness Audit

**Task ID:** LAHORE-UAT-003-DEPLOYMENT-READINESS-AUDIT
**Objective:** Tracked-code-only deployment readiness audit for Lahore UAT
**Candidate Reference:** `41943f1` on `codex/lahore-uat-candidate`
**Date:** 2026-07-27

> [!IMPORTANT]
> This is a tracked-code configuration audit, not a deployment guide. It is not evidence that anything has been deployed. **No deployment, migration application, database reset, import, or browser UAT was performed during this audit.**
>
> Testing deployments can be disabled or rolled back by the deployer at any time; no destructive data action is authorized by this audit.

---

## 1. Verified Deployment Prerequisites (Tracked Code)

The following deployment prerequisites have been verified in the tracked codebase at the candidate reference:

### Build and CI
- **Production Build:** `package.json` (Line 8) contains a target that safely triggers PostgreSQL Prisma client generation before the Next.js build.
- **Vercel Configuration:** `vercel.json` (Lines 2-3) overrides the default build command to correctly execute the PostgreSQL build target.
- **CI Workflows:** `.github/workflows/ci.yml` exists and defines the continuous integration checks, including Prisma schema validation.

### PostgreSQL Support and Migrations
- **PostgreSQL Build Support:** Tracked configuration fully supports building the application for a PostgreSQL deployment target.
- **Migration Chain:** The committed PostgreSQL migration chain exists under `prisma/postgres/migrations/`, establishing a track record from `20260714200000_init_postgres` through `20260724200000_add_mashwara_module`.
- **Migration Deployment:** The deployer confirms the committed PostgreSQL migrations were applied.

### Security and Headers
- **Same-Origin Protection and Headers:** `next.config.ts` (Lines 22-48) correctly defines `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` (in non-development mode).
- **Startup Secret Validation:** `package.json` (Line 9) runs a `"prestart"` script that verifies `NEXTAUTH_SECRET` is present in the environment before starting the server.

### Environment Variable Prerequisites (Names Only)
The application code references the following environment variables. The deployer must ensure they are securely configured:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
*(Note: No values, URLs, connection strings, credentials, or tokens are checked, listed, or implied here.)*

---

## 2. Audit Findings

| Category | Finding | Severity / Status |
| --- | --- | --- |
| **Tracked Code Blockers** | No tracked-code blockers preventing deployment were found. | No tracked-code finding |
| **Private Configuration** | Because this audit reviews only tracked code, the presence and validity of the private environment secrets (e.g., PostgreSQL credentials) are unknown. | Owner/deployer confirmation required |
| **Target Database State** | The state of the live restricted-staging database (whether migrations have been applied or data imported) is unknown. | Owner/deployer confirmation required |

---

## 3. Deployer Go / No-Go Checklist

The deploying engineer must declare "Go" on the following conditions before executing the deployment and handing over to the testing team:

- [ ] **Restricted testing target:** Target environment is restricted staging/testing (never public pilot/production).
- [ ] **Candidate head:** Deploying the approved current head of `codex/lahore-uat-candidate`.
- [ ] **Private configuration:** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` are set securely in the deployment provider (e.g., Vercel).
- [ ] **PostgreSQL migration parity:** The deployer confirms the committed PostgreSQL migrations were applied.
- [ ] **Data state / Eight accounts:** Expected Lahore Batch 4 data is present, and eight canonical test accounts (Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi, Student, Guardian) are active.
- [ ] **Forced reset:** First-login forced reset behavior is verified for newly provisioned test accounts.
- [ ] **Testing URL:** Staging URL is confirmed and accessible.
- [ ] **Browser UAT:** Initial authentication smoke-test passed on the staging URL.

---
*End of Audit*
