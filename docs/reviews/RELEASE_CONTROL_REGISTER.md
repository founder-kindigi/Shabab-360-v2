# Release Control Register

**Last reviewed:** 2026-07-26
**Purpose:** Track verified release gates and blockers. This document does not
authorize deployment by itself.

## Current Release Inputs

| Item | Status | Evidence / Required Action |
| --- | --- | --- |
| Repository structure guidance | Ready for review | `codex/project-structure-standard` at `d74c0f1`. It is documentation and ignore hygiene only. |
| Password-hash consistency | Ready for review | `codex/release-control-security` centralizes application bcrypt rounds at 12 and adds import coverage. |
| Global same-origin mutation guard | Verified in code | `src/proxy.ts` protects mutating non-NextAuth `/api/*` requests. Do not add duplicate per-route CSRF code without a concrete exception. |
| Invitation temporary password | Intentional controlled behavior | The authorized invitation route returns it once, forces reset, and does not place it in audit or queued email metadata. Keep this behavior covered by tests. |
| Database-backed login rate limiting | Ready for review; staging gate remains | `src/lib/auth.ts` uses the dual-schema `LoginAttempt` model with an HMAC fingerprinted identifier. It denies the sixth attempt in a 15-minute window before account lookup, clears attempts after a successful login, and fails closed if rate-limit storage is unavailable. Apply `20260725120000_add_login_attempts` in staging and record expiry and multi-instance behavior before pilot release. |
| Browser UAT | **Blocker** | State-changing role, scope-denial, and 375px/390px mobile workflows need fresh staging evidence. |
| Production secrets | **Owner gate** | Confirm current secret rotation and deployment environment values privately. Never commit or print them. |
| Media Operations | Planned separately | Media is an existing collaboration team, not a Content Planner category. Public community and file uploads remain deferred. |

## Required Order Before Pilot Production

1. Isolate all currently dirty root-worktree changes into reviewed branches;
   do not commit local databases, captures, or agent configuration by accident.
2. Apply the login-attempt migration in staging and test rate-limit denial,
   expiry, successful-login reset, database-failure behavior, and concurrent
   requests across the deployed runtime instances.
3. Rebase accepted feature branches onto one clean release candidate rather
   than merging historical package branches wholesale.
4. Run lint, typecheck, full tests, PostgreSQL schema validation/generation,
   and the production-oriented build on that candidate.
5. Perform documented staging browser UAT and owner deployment checks.

## Release Rules

- `main` remains protected: no direct feature work or unreviewed handoffs.
- Capability grants never bypass server-derived city, park, or group scope.
- Shared model changes require aligned SQLite and PostgreSQL schemas with
  forward migrations.
- Browser UAT is a release gate, not a documentation exercise.
