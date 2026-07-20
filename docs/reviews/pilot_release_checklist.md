# Vercel Hobby, Supabase Free & Resend Free Quality & Release Audit

Based on the `docs/IMPROVEMENT_PLAN.md` and current project state, here is the defined release audit and deployment checklist for a free-tier pilot using Vercel, Supabase, and Resend.

## Exact Release & Quality Gates

**1. Code Quality & Build Gates (CI)**
*   **Linting:** `eslint` must run with strict rules, catching all runtime errors without warnings being ignored. The build must fail on lint errors.
*   **Typechecking:** `tsc --noEmit` must run. Remove any `ignoreBuildErrors` from `next.config.js`. The build must fail on type errors.
*   **Build:** `next build` must successfully complete with all static optimization constraints met.

**2. Testing Gates**
*   **Unit Tests:** Must test authorization logic (role matrix), attendance business rules, fee/payment calculations (precision and validation), and notification state transitions.
*   **E2E Tests:** Must cover critical paths (login, participant creation, marking attendance offline/online, fee assignment, and basic dashboard rendering) for each core role.

**3. Staging UAT Gate**
*   A deployment to a Vercel Preview environment connected to a *sanitized Staging Supabase project* must be fully verified.
*   The role matrix (guardian, student, murabbi, park user, city head, admin) must be verified manually or through automation against the staging DB to ensure proper allow/deny access.
*   Verify Socket.IO realtime features are either disabled or successfully migrated to polling/authorized channels as per the plan.

**4. Data & Backup Gates**
*   **Schema Migration:** `prisma migrate deploy` must run strictly via a controlled, single-threaded CI pipeline (not automatically on every Vercel build).
*   **Manual Backup:** A manual `pg_dump` of the production Supabase database must be taken and encrypted before any data import or schema upgrade.
*   **Restore Drill:** Operator must successfully restore a staging backup to verify the recovery path.

**5. Free-Tier Quota Review & Monitoring Gates**
*   **Database:** Supabase project must be under the 500 MB limit.
*   **Storage:** File storage must be under the 1 GB limit, utilizing signed URLs and server-side authorization.
*   **Emails:** Resend volume must be strictly monitored to stay under the 100 emails/day limit. Implement an outbox queue to handle overflow.
*   **Runtime:** Vercel Hobby limits (10-second serverless execution limits, bandwidth, analytics limits) must be acknowledged.

**6. Rollback Gate**
*   A documented rollback procedure must be established. This includes reverting Vercel to a previous deployment ID and having the encrypted pre-migration database snapshot ready to restore.

---

## Minimum Pilot Release Checklist

*   [ ] **Secrets & Security:** `NEXTAUTH_SECRET` rotated, `.env` and `custom.db` removed from Git, default auth fallback removed.
*   [ ] **Authorization:** Server-side policy layer implemented; all protected routes deny unknown roles and out-of-scope records. Immediate session revocation implemented for role/access changes.
*   [ ] **Runtime Blockers:** `useRealtimeNotifications` imported properly; Socket.IO disabled or hardened; guardian invite schema mismatch fixed.
*   [ ] **Database Migration:** Prisma provider switched from SQLite to Postgres; connected to Supabase Free. Monetary values use exact data types (`Decimal`).
*   [ ] **CI Enforcement:** CI pipeline established requiring Lint and Typecheck to pass before merging.
*   [ ] **Testing:** Core unit and E2E role-matrix tests implemented and passing.
*   [ ] **Pilot Infrastructure Setup:** Custom domain configured, secure headers applied, `noindex` applied to private routes, and environments properly separated (Staging vs. Pilot Prod).
*   [ ] **Pre-Launch Backup:** Final manual, encrypted database export completed and validated.

---

## Free-Tier Upgrade Triggers

The system must upgrade to paid tiers (Vercel Pro, Supabase Pro, etc.) if any of the following occur:
*   **Scale:** Email notifications exceed 100 per day consistently.
*   **Storage:** Database size approaches 500 MB or File Storage approaches 1 GB.
*   **Operations:** More than one daily cron job is required, durable background jobs are needed, or functions require longer than hobby execution timeouts.
*   **Availability:** Automatic database backups/PITR become a strict requirement, or inactivity pauses on Supabase are unacceptable.
*   **Team:** The project requires Vercel team collaboration, multiple isolated preview databases, or commercial-use licensing.

Ready for Codex review.
