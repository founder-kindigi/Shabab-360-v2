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
| Database-backed login rate limiting | **Blocker** | The dual migration `20260725120000_add_login_attempts` exists, but `src/lib/auth.ts` still uses an in-memory map and no runtime `LoginAttempt` model/query was found. Do not represent the migration alone as persistent rate limiting. |
| Browser UAT | **Blocker** | State-changing role, scope-denial, and 375px/390px mobile workflows need fresh staging evidence. |
| Production secrets | **Owner gate** | Confirm current secret rotation and deployment environment values privately. Never commit or print them. |
| Media Operations | Planned separately | Media is an existing collaboration team, not a Content Planner category. Public community and file uploads remain deferred. |

## Required Order Before Pilot Production

1. Isolate all currently dirty root-worktree changes into reviewed branches;
   do not commit local databases, captures, or agent configuration by accident.
2. Complete the persistent login-rate-limit implementation and test its denial,
   expiry, successful-login reset, and database-failure behavior.
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
