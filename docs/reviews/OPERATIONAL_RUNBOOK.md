# OPERATIONAL RUNBOOK — PILOT-PROD-001

**Task ID:** PILOT-PROD-001
**Date:** 2026-07-24
**Base Commit:** `fe26fbb` (`origin/codex/production-hardening`)
**Target:** Pilot production rollout on Vercel Hobby + Supabase Free + Resend Free

---

## 1. Architecture Overview

```
[User] → DNS (Caddy / Cloudflare) → Vercel Edge → Next.js SSR → Prisma → Supabase PostgreSQL
                                                      ↓
                                                 Resend API (email)
                                                      ↓
                                                 Local notification service (hardcoded :3004)
```

| Layer | Technology | Configuration |
|-------|-----------|---------------|
| DNS / CDN | Caddy (dev) / Cloudflare (prod) | `shabab360.pk` → reverse proxy to `localhost:3000` |
| Hosting | Vercel Hobby | Build: `npm run build:postgres`, single deploy branch |
| Framework | Next.js 16 (App Router) | 79 SSR routes, SPA shell for admin UI |
| Database | Supabase Free (PostgreSQL 15) | 11 additive migrations, pooled + direct connections |
| ORM | Prisma 6 | Dual schema (SQLite dev / PostgreSQL prod) |
| Auth | NextAuth.js (JWT, Credentials) | 24h session, rate-limited, token version invalidation |
| Email | Resend Free (250 emails/day) | Password reset, fee reminders, admission alerts |
| Audit | Custom `logAudit()` | PII-redacted, fire-and-forget, structured stderr |

---

## 2. Deployment Procedure

### Pre-Deployment Checklist

```bash
# 1. Verify git branch is clean
git status --short
git diff --check

# 2. Run quality gates
npm run typecheck      # 0 errors
npm run lint           # 0 errors
npx vitest run         # all pass

# 3. Generate PostgreSQL Prisma client
npm run db:postgres:generate

# 4. Deploy database migrations
npm run db:postgres:deploy

# 5. Build production bundle
npm run build:postgres # 0 errors, 79 routes

# 6. Configure environment variables on Vercel
#    DATABASE_URL     → Supabase pooled connection string
#    DIRECT_URL       → Supabase direct connection string
#    NEXTAUTH_URL     → https://shabab360.pk
#    NEXTAUTH_SECRET  → openssl rand -base64 32
#    RESEND_API_KEY   → From Resend dashboard

# 7. Bootstrap initial super admin (first deploy only)
npm run bootstrap:super-admin -- --execute --reveal-temporary-password

# 8. Deploy to Vercel
vercel --prod
```

### Rollback Procedure

```bash
# Option A: Vercel rollback (quickest)
vercel rollback <target-deployment-id>

# Option B: Database migration rollback
# 1. Identify last good migration
prisma migrate status --schema prisma/postgres/schema.prisma

# 2. Roll back to it
prisma migrate resolve --rolled-back "<problematic-migration>" --schema prisma/postgres/schema.prisma

# 3. Re-deploy previous build
vercel deploy --prod

# Option C: Full rebuild from clean state
git checkout <last-known-good-commit>
npm run build:postgres
npm run db:postgres:deploy
vercel --prod
```

### Zero-Downtime Deployment

Next.js SSR + Vercel provide zero-downtime deploys automatically via:
1. Vercel provisions new Lambda instances for the new build
2. Traffic gradually shifts from old → new instances
3. Old instances are drained once new instances are healthy

**Caveats:**
- Migration changes must be backward-compatible (additive only — no column drops, no NOT NULL additions)
- Run `npm run db:postgres:deploy` **before** deploying new code that depends on new columns
- Long-running queries during migration may cause brief latency spikes

---

## 3. Database Backup & Recovery

### Automated Backup Schedule

| Frequency | Type | Retention | Tool |
|-----------|------|-----------|------|
| Daily | Full database dump | 7 days | Supabase automatic backups (Free tier) |
| Pre-deploy | Manual snapshot | Until next deploy | `pg_dump` via script |
| Weekly | Encrypted export | 30 days | `scripts/export-production-db.sh` (manual) |

### Manual Backup Command

```bash
# Full database backup
pg_dump \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=backup-$(date +%Y-%m-%d).dump \
  "$DIRECT_URL"

# Verify backup integrity
pg_restore --list backup-$(date +%Y-%m-%d).dump | head -20
```

### Recovery Procedure

```bash
# 1. Stop the application (or redirect to maintenance page)
vercel alias <maintenance-page> shabab360.pk

# 2. Restore database
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname="$DATABASE_URL" \
  backup-$(date +%Y-%m-%d).dump

# 3. Re-deploy stable build
vercel deploy --prod

# 4. Verify key metrics
#    - Login flow works
#    - Dashboard loads
#    - Recent data visible
```

### Data Export for Audit/Compliance

```bash
# Export audit log (last 90 days)
psql "$DIRECT_URL" -c "\copy (
  SELECT * FROM audit_log WHERE created_at >= now() - interval '90 days'
) TO 'audit-export-$(date +%Y-%m-%d).csv' CSV HEADER;"
```

---

## 4. Monitoring Setup

### Health Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| Vercel 5xx rate | >1% over 5 min | Check server logs, rollback if needed |
| Supabase connection pool | >80% utilized | Reduce connection count, scale up |
| Database query duration | p95 >500ms | Identify slow queries via Supabase Query Performance |
| Auth failure rate | >10% over 15 min | Check for brute force attacks, verify NEXTAUTH_SECRET |
| Audit log write errors | Any | Check stderr logs, verify DB connectivity |
| Email delivery failure | >5% | Check Resend dashboard, verify RESEND_API_KEY |

### Logging Strategy

| Log Source | Tool | Retention |
|------------|------|-----------|
| Vercel function logs | Vercel Logs Dashboard | 7 days (Hobby) |
| PostgreSQL logs | Supabase Logs | 1 day (Free) |
| Application audit trail | `audit_log` table | Indefinite |
| Structured errors | `console.error(JSON.stringify(...))` | Vercel Logs |

### Monitoring Gaps (Free Tier Limitations)

| Gap | Impact | Mitigation |
|-----|--------|------------|
| No uptime monitoring | Unknown outages | Add free UptimeRobot / Better Uptime check |
| No alerting | Delayed incident response | Manual dashboard checks, scheduled smoke tests |
| 7-day log retention | Limited forensic analysis | Export audit_log weekly |
| In-memory rate limiter | Resets on serverless cold start | Acceptable for pilot; upgrade to Redis for production |

---

## 5. Incident Response

### Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|-----------|---------------|------------|
| P0 | Complete outage (no login, blank pages) | Immediate | Technical lead |
| P1 | Major feature broken (attendance, fees) | 1 hour | Technical lead |
| P2 | Minor feature broken (reports, export) | 4 hours | Team member |
| P3 | Cosmetic / non-functional issue | Next business day | Filed as issue |

### Incident Response Flow

```
1. DETECT
   - User reports issue via support channel
   - Automated smoke test failure
   - Monitoring dashboard alert

2. TRIAGE
   - Determine severity (P0-P3)
   - Check Vercel deployment status
   - Check Supabase DB status
   - Review recent audit_log entries

3. CONTAIN
   - P0/P1: Rollback deployment immediately
   - P2: Apply hotfix or disable feature flag
   - P3: File issue, continue normal ops

4. RESOLVE
   - Apply fix in development branch
   - Run full quality gate suite
   - Deploy via standard procedure
   - Verify fix in production

5. POST-MORTEM
   - Document root cause
   - Update runbook with preventive measures
   - Add monitoring for similar issues
```

### Common Incident Playbooks

#### Incident: Database connection pool exhausted

```bash
# 1. Check current pool usage
#    Supabase Dashboard → Database → Connection pooling

# 2. Immediate mitigation: Reduce connection count
#    Set PGBOUNCER_POOL_SIZE=5 in Vercel env vars

# 3. Root cause investigation
#    Check for unclosed Prisma connections
#    Check for long-running queries in Supabase Query Performance

# 4. Long-term fix
#    Add connection pooling limits in Prisma datasource
#    Prisma: connection_limit = 5
```

#### Incident: Authentication failures

```bash
# 1. Verify NEXTAUTH_SECRET is set and consistent
echo $NEXTAUTH_SECRET | wc -c  # Should be >= 44 characters

# 2. Check rate limiter status
#    In-memory map resets on cold start — acceptable for pilot

# 3. Verify token version matches database
psql "$DIRECT_URL" -c "SELECT id, email, token_version FROM users WHERE is_active = true LIMIT 5;"

# 4. Reset user passwords if needed (via bootstrap script)
npm run bootstrap:super-admin -- --execute --replace-existing-super-admin
```

#### Incident: Missing / broken data after migration

```bash
# 1. Compare row counts between expected and actual
node scripts/reconcile-sqlite-to-postgres.cjs

# 2. If mismatch found, check specific model
psql "$DIRECT_URL" -c "SELECT count(*) FROM mashwara_meetings;"

# 3. Roll back migration if needed
prisma migrate resolve --rolled-back "20260724200000_add_mashwara_module" --schema prisma/postgres/schema.prisma
```

#### Incident: Email delivery failure

```bash
# 1. Check Resend dashboard for delivery status
#    https://resend.com/domains

# 2. Verify RESEND_API_KEY is set in Vercel environment
vercel env ls | grep RESEND

# 3. Check notification queue in database
psql "$DIRECT_URL" -c "SELECT status, count(*) FROM notifications GROUP BY status;"
```

---

## 6. Environment Variable Reference

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `DATABASE_URL` | ✅ Yes | Supabase → Database → Connection pooling (PSQL) | Session pooler URL with `?pgbouncer=true` |
| `DIRECT_URL` | ✅ Yes | Supabase → Database → Direct connection | No pooler, used for migrations and bootstrapping |
| `NEXTAUTH_URL` | ✅ Yes | Your production domain | Must match `https://shabab360.pk` exactly |
| `NEXTAUTH_SECRET` | ✅ Yes | `openssl rand -base64 32` | Must be unique per environment, never reused |
| `RESEND_API_KEY` | ⚠️ Required | Resend Dashboard → API Keys | Required for transactional emails |
| `NOTIFICATION_SERVICE_URL` | ⚠️ Required | Custom notification endpoint | Currently hardcoded to `http://localhost:3004/notify` |

### Sensitive Values (Never Commit)

Never commit:
- Real `DATABASE_URL` or `DIRECT_URL` (contain passwords)
- Real `NEXTAUTH_SECRET`
- Real `RESEND_API_KEY`
- `.env` or `.env.local` files
- `*.pem` certificate files
- `db/*.db` SQLite database files

---

## 7. Production Secrets Rotation Policy

| Secret | Rotation Frequency | Method |
|--------|-------------------|--------|
| `NEXTAUTH_SECRET` | Quarterly or on compromise | Generate new, update Vercel env, restart deployment |
| `RESEND_API_KEY` | Annually or on compromise | Generate new key in Resend, update Vercel env |
| Database passwords | Annually | Rotate in Supabase dashboard, update Vercel env |

---

## 8. Free Tier Capacity Limits

| Resource | Limit | Mitigation Strategy |
|----------|-------|---------------------|
| Vercel Hobby: Serverless functions | 100 GB-hours / month | Optimize bundle size, cache aggressively |
| Vercel Hobby: Bandwidth | 100 GB / month | Compress responses, optimize images |
| Supabase Free: Database | 500 MB | Monitor via Supabase Dashboard |
| Supabase Free: Row count | Soft limit ~50k rows | Archive old audit_log and attendance records |
| Supabase Free: Connections | 15 pooled / 5 direct | Set Prisma `connection_limit = 3` |
| Resend Free: Emails | 250 / day | Batch notifications, prioritize critical alerts |
| Resend Free: Sending rate | 10 emails / second | Spread large notification batches over time |

---

## 9. Key Contacts & Escalation

| Role | Responsibility | Contact Method |
|------|---------------|----------------|
| Technical Lead | Architecture decisions, P0/P1 incidents | GitHub issues / Slack |
| Database Admin | Migration management, backup verification | Supabase Dashboard |
| DevOps | Deployment, monitoring, CI/CD | Vercel Dashboard |
| Product Owner | Feature prioritization, UAT sign-off | Project management tool |

---

## 10. Maintenance Windows

| Activity | Frequency | Expected Downtime | Window |
|----------|-----------|-------------------|--------|
| Database backup | Daily | None (online backup) | Off-peak (02:00 PKT) |
| Migration deployment | Per release | None (additive only) | Sunday 00:00-02:00 PKT |
| Secrets rotation | Quarterly | None (env var update) | Sunday 00:00-01:00 PKT |
| Full smoke test | Per deployment | None | Any time |

---

## 11. Compliance & Data Protection

- Audit logs are immutable — never DELETE or UPDATE `audit_log` rows
- PII in audit logs is automatically redacted (`[REDACTED]`)
- Password resets invalidate all existing sessions via `tokenVersion`
- `.env` files never committed — all secrets managed via Vercel Environment Variables
- Database backups must be encrypted if stored off-platform
- User deletion must cascade through all related tables (Prisma handles via `onDelete: Cascade`)
