# Version Control Protocol — Shabab 360

**Effective:** 2026-10-01  
**Owner approval:** Confirmed by project owner  
**Scope:** All code changes to the Shabab 360 repository

---

## Branch Strategy

```
main (protected)          ← Production-ready code; deploys to production
  └── v2 (protected)      ← Active development branch; deploys to preview
       ├── feature/*       ← Feature branches (from v2, merge back to v2)
       ├── fix/*           ← Bug fix branches
       └── codex/*         ← Agent-prepared candidates (review before merge)
```

### Branch Roles

| Branch | Purpose | Deploy Target | Protection |
|--------|---------|---------------|------------|
| `main` | Production-ready, canonical baseline | Production (Vercel) | Requires PR + 1 review + CI pass |
| `v2` | Active development and integration | Preview (Vercel) | Requires CI pass on push |
| `feature/*` | New features, scoped changes | None (PR preview) | None — short-lived |
| `fix/*` | Bug fixes and corrections | None (PR preview) | None — short-lived |
| `codex/*` | Agent-prepared isolated candidates | None | Review before merge |

### Branch Rules (GitHub Settings)

#### `main` branch protection:

- [x] Require pull request before merging
- [x] Require 1 approving review
- [x] Dismiss stale reviews when new commits are pushed
- [x] Require status checks to pass: `Validate Application`
- [x] Require branch to be up to date before merging
- [x] Do not allow force pushes
- [x] Do not allow deletions
- [ ] Restrict who can push (only repository admin)

#### `v2` branch protection:

- [x] Require status checks to pass: `Validate Application`
- [x] Do not allow force pushes
- [ ] Allow direct pushes for rapid iteration (during active development phase)

---

## Commit Standards

### Commit Message Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|------------|---------|
| `feat` | New feature or capability | `feat(attendance): add offline sync retry` |
| `fix` | Bug fix | `fix(auth): prevent session leak on role change` |
| `security` | Security improvement | `security(middleware): add global auth gate` |
| `refactor` | Code restructuring without behavior change | `refactor(api): extract shared validation` |
| `test` | Adding or updating tests | `test(auth): add middleware JWT tests` |
| `docs` | Documentation only | `docs: add version control protocol` |
| `chore` | Build, deps, CI, tooling | `chore(deps): move prisma to devDependencies` |
| `perf` | Performance improvement | `perf(images): migrate to next/image` |
| `schema` | Prisma schema or migration change | `schema: add registration forms model` |

### Scopes (Optional)

Use the module or area: `auth`, `attendance`, `fees`, `admissions`, `middleware`, `api`, `ui`, `db`, `ci`, `deps`, `pwa`

---

## Change Workflow

### For feature/fix work:

```
1. Create branch from v2:
   git checkout v2 && git pull
   git checkout -b feature/describe-change

2. Implement with focused commits

3. Run local quality gates:
   npm run typecheck
   npm run lint
   npm run test

4. Push and create PR to v2:
   git push -u origin feature/describe-change

5. CI runs automatically (typecheck + lint + test + build)

6. Review → Approve → Squash merge to v2

7. Delete feature branch
```

### For production release (v2 → main):

```
1. Ensure v2 is stable:
   - All CI checks pass
   - No blocked modules that affect production
   - Owner approval obtained

2. Create PR: v2 → main
   - Title: "Release: <summary>"
   - Description: list changes since last release

3. CI runs full validation + production build

4. Owner reviews and approves

5. Merge (no squash — preserve history)

6. Vercel auto-deploys main to production

7. Verify production deployment:
   - HTTP 200 on shabab360.vercel.app
   - Login flow works
   - Critical paths accessible
```

---

## Quality Gates

Every change must pass these before merge:

| Gate | Command | Required For |
|------|---------|-------------|
| TypeScript | `npm run typecheck` | All PRs |
| ESLint | `npm run lint` | All PRs |
| Unit Tests | `npm run test` | All PRs |
| Production Build | `npm run build` | PRs to main |
| Dependency Audit | `npm audit --omit=dev --audit-level=high` | PRs to main |
| Sensitive File Guard | CI checks `.env*` and `*.db` not tracked | All PRs |

### High-Risk Changes (extra gates)

Per AGENTS.md, these require stated data impact, security review, and rollback plan:

- Auth, authorization, or middleware changes
- Payment or financial operations
- Safeguarding or privacy changes
- Prisma schema migrations
- Deployment configuration
- Environment variables or secrets

---

## Agent Work Protocol

Per AGENTS.md and the delivery model:

1. **One active task across all agents** — complete or block before starting another
2. **Astra** leads requirements, API, DB, security, performance, final review
3. **Gemini** implements frontend from `docs/pwa screens/` references
4. **DeepSeek** receives bounded backend tasks and clean-code passes
5. Agent candidates go to `codex/*` branches — never merge without review
6. Update `docs/delivery/state.json` when task status changes
7. Update `.agents/memory/current.md` only for verified durable state

---

## Deployment Protocol

### Current Setup

| Environment | Branch | URL | Auto-deploy |
|-------------|--------|-----|-------------|
| Production | `main` | `shabab360.vercel.app` | On merge to main |
| Preview | `v2` | PR preview URLs | On push to v2 |

### Pre-deployment Checklist

- [ ] All CI quality gates pass
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] All tests pass
- [ ] Production build succeeds
- [ ] Database migration reviewed (if schema change)
- [ ] Owner approval for production release
- [ ] Rollback plan documented (if high-risk)

### Rollback

Vercel supports instant rollback to any previous deployment:
1. Go to Vercel Dashboard → Deployments
2. Find the last known good deployment
3. Click "Promote to Production"
4. Investigate and fix the issue on v2

---

## Version Numbering

Use semantic versioning in `package.json`:

```
MAJOR.MINOR.PATCH
  │      │     └── Bug fixes, security patches
  │      └──────── New features, non-breaking changes
  └─────────────── Breaking changes, major releases
```

Current: `0.2.0` (pre-production)

Bump when merging v2 → main:
- `0.2.x` → `0.3.0` for feature releases
- `0.x.0` → `1.0.0` for production launch
