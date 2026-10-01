# Shabab 360 V2 — Release Baseline & Monitoring Specification

**Document Version:** 2.0.0  
**Status:** Approved Production Baseline Specification  
**Associated Task:** `V2-001`

---

## 1. Production Baseline Identity

| Attribute | Baseline Value |
| --- | --- |
| **Target Branch** | `prototype/shabab360-complete` |
| **Baseline Release Commit** | `3ab3c27` |
| **Runtime Environment** | Node.js `v26.5.0`, npm `12.0.0`, Next.js `16.2.10` |
| **Database Engines** | SQLite (Dev/Local: `prisma/schema.prisma`), PostgreSQL (Staging/Prod: `prisma/postgres/schema.prisma`) |
| **Auth Strategy** | NextAuth v4 (Credentials Provider, Bcrypt, Scoped JWT Sessions) |
| **Verification Gate** | Standard Quality Gate (Lint, Typecheck, 100% Vitest coverage, `npm run build:postgres`) |

---

## 2. Deployment & Rollback Ownership

### Roles & Responsibilities
* **Release Manager / Deployment Owner**: Shabab 360 Core Technical Team / Product Owner.
* **Database Backup & Recovery Owner**: Platform & Infrastructure Lead.
* **Monitoring & Security Incident Lead**: Super Admin / System Administrator.

### Rollback Procedure
1. **Application Deployment Rollback**:
   * If a Vercel deployment exhibits severe runtime errors or authorization regressions, immediately promote the last verified deployment build in Vercel Dashboard.
   * Verify home page, sign-in flow, and role-based protected routes (`/api/admin/*`, `/api/park/*`) post-rollback.
2. **Database State Rollback**:
   * Staging/Production PostgreSQL database backups are encrypted and taken before any forward migration.
   * In case of migration failure, halt deployment, revert schema additions using forward-only compensating migrations or point-in-time snapshot restore on Staging.

---

## 3. Application Error Monitoring & Release Health Checklist

### Error Monitoring Protocol
1. **Audit Integrity Monitoring**:
   * Monitor Vercel runtime logs for `audit_write_failed` events. Treat audit failure as an integrity incident; do not swallow audit log errors.
2. **Authentication & Authorization Guard**:
   * Monitor for repeated `401 Unauthorized` or `403 Forbidden` spikes on protected API endpoints.
3. **Database & Outbox Telemetry**:
   * Track failed database transactions or outbox notification delivery failures (`STATUS: FAILED` in outbox queue).

### Pre-Release Health Checklist
- [ ] Clean `npm run lint` with 0 warnings/errors.
- [ ] Clean `npm run typecheck` with 0 TypeScript compilation errors.
- [ ] 100% passage of Vitest test suite (`npm run test`).
- [ ] Successful PostgreSQL build (`npm run build:postgres`).
- [ ] Verification of SQLite/PostgreSQL schema parity (`npm run db:postgres:validate`).
- [ ] Verification of non-leakage of `.env`, passwords, or raw PII in audit payloads.

---

## 4. Release Notes & Versioning Guidelines

All subsequent release updates follow Semantic Versioning (`v2.X.Y`):
* **`v2.0.0`**: Initial V2 Release Baseline & Core Platform Hardening.
* **`v2.1.0`**: Historical Data Importers (Admissions, Calling, Previous Batches).
* **`v2.2.0`**: Collaboration Workspace (Team Activity Planner, Team Chat, External Allowlist).
* **`v2.3.0`**: Operational Module Expansions (Calling, Events, Mashwara, Attendance).
* **`v2.4.0`**: Quality, Performance, & Mobile UX Hardening.
