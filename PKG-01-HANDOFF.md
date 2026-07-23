# PKG-01: Content Planner Foundation — HANDOFF

**Branch:** `agent/kiro/pkg-01-content-planner`
**Base:** `99f9460` (codex/production-hardening)
**Final SHA:** `628645c`
**Date:** 2026-07-23

---

## Status

All requested work complete and verified. Ready for owner integration review.

| Gate | Result |
|---|---|
| `npm test --run` | **500 / 500 passing — 0 failures** |
| `npx tsc --noEmit` | **exit 0 — clean** |
| `npx eslint src/lib/content-planner/ src/app/api/admin/content-planner/` | **exit 0 — 0 errors** |
| `npm run lint` (`eslint .`) | **pre-existing hang on this host** — see Lint section below |
| `git diff --check` | **clean** — no whitespace errors |
| `git status` | `prisma/dev.db` untracked (not staged); no other artifacts |

---

## What pre-existed at base 99f9460

- `ContentPlan`, `ContentPlanSession`, `ContentPlanBlock`, `ContentPlanResource`,
  `ActivityPlanItem` Prisma models in both SQLite and PostgreSQL schemas
- PostgreSQL migration `20260720210000_add_content_planner_foundation`
- No application code, routes, tests, or scope helpers for these models

PKG-01 adds only application and test code. No new migrations were created.

---

## Changes delivered (16 files, 5 531 additions)

### Authorization scope helpers — `src/lib/content-planner/scope.ts`

New module (291 lines). All authorization is capability + server-derived resource scope.
No role-list gates.

| Export | Purpose |
|---|---|
| `APPROVED_CONTENT_CATEGORIES` | `["exercises","sports","skills","tadreeb"]` as const |
| `CATEGORY_TO_TEAM_CODE` | Single mapping source: exercises→sports, sports→sports, skills→skills, tadreeb→tadreeb |
| `isApprovedCategory(cat)` | Type-guard helper |
| `isHqUser(user)` | Returns true for `super_admin` / `program_admin` |
| `deriveContentPlannerCityScope(user)` | HQ → all active cities; city_head → assigned city; park staff → city from assigned park/group |
| `deriveContentPlannerParkScope(user, cityId)` | HQ/city_head → `"all"`; park staff → assigned park only |
| `buildContentPlanScopeFilter(user, city?, batch?, park?)` | Prisma `WHERE` clause. Returns `null` on scope violation (caller returns 403). Request params narrow but never broaden. |
| `canReadContentPlan(user, planId)` | Boolean — fetches plan, calls `buildContentPlanScopeFilter` |
| `canWriteContentPlan(user, cityId, batch?, park?)` | Boolean — checks resource scope only. **Capability (`content.manage`) enforced at route level.** |
| `verifyTeamInCity(teamId, cityId)` | Validates team active and in city |
| `CONTENT_PLANNER_READER_ROLES` | Documentation constant — not used for authorization |

### Zod validation schemas — `src/lib/content-planner/validation.ts`

New module (329 lines).

**`calendarDateSchema`** (internal, used by session schemas)
- Regex `^\d{4}-\d{2}-\d{2}$`
- Component round-trip: splits year/month/day, constructs `new Date(y, m-1, d)`, asserts each component matches back
- Rejects impossible dates: `2026-02-30` → `getDate()` returns 2, not 30; `2026-13-01` → `getMonth()` returns 0, not 12
- Accepts valid leap-year dates: `2024-02-29` ✓; rejects `2026-02-29` ✗

**`createContentPlanSchema`** — cityId, batchId?, parkId?, basePlanId?, name (≤200), kind, sourceWorkbook?, sourceSheet?

**`updateContentPlanSchema`** — name?, status?

**`sessionListQuerySchema`** — planId required; startDate?, endDate? (both `calendarDateSchema`); `.refine` enforces startDate ≤ endDate

**`createSessionSchema`** — planId, sessionDate (`calendarDateSchema`), weekLabel?, dayLabel?, focusArea?, isOffDay (default false), sourceRow?; `.refine` rejects focusArea on off-day sessions

**`updateSessionSchema`** — weekLabel?, dayLabel?, sessionDate?, focusArea?, status?

**`createBlockSchema`** — sessionId, teamId, category (enum of four), content (1–10 000 chars), title?, sortOrder (0–100, default 0)

**`updateBlockSchema`** — title?, content?, sortOrder?, status?

**`createResourceSchema`** / **`createActivitySchema`** / **`updateActivitySchema`** / **`archiveContentPlanSchema`**

**Helpers:**
- `validateNotOffDay(isOffDay)` — throws if `true`
- `validateCategoryTeamMapping(category, teamCode)` — uses `CATEGORY_TO_TEAM_CODE` as the sole mapping source; throws on mismatch

### Capability registration — `src/lib/auth/capabilities.ts`

Added `content.view` and `content.manage` to the capability registry.

### API routes — `src/app/api/admin/content-planner/`

All routes: safe JSON parsing (400 before DB on malformed body), capability gate,
server-derived scope check, audit log on every mutation.

#### Plans

| Route | Method | Cap | Notes |
|---|---|---|---|
| `/plans` | GET | content.view | **HQ must supply `cityId` (400 without it); scoped actors derive city from session** |
| `/plans` | POST | content.manage | Validates city active, batch belongs to city, park belongs to city, basePlan is a template in same city |
| `/plans/[id]` | GET | content.view | `canReadContentPlan` scope check |
| `/plans/[id]` | PATCH | content.manage | `canWriteContentPlan` scope check; audits old/new name + status |
| `/plans/[id]` | DELETE | content.manage | Soft-archives (status → archived); audits reason |

#### Sessions

| Route | Method | Cap | Notes |
|---|---|---|---|
| `/sessions` | GET | content.view | planId required; date range with startDate ≤ endDate |
| `/sessions` | POST | content.manage | Duplicate date in plan → 409 |
| `/sessions/[id]` | GET | content.view | Returns session with blocks |
| `/sessions/[id]` | PATCH | content.manage | Date change → duplicate check (409); audits old/new |
| `/sessions/[id]` | DELETE | content.manage | Soft-archives (status → cancelled); audits with reason |

#### Blocks

| Route | Method | Cap | Notes |
|---|---|---|---|
| `/blocks` | GET | content.view | sessionId required |
| `/blocks` | POST | content.manage | Enforces: no off-day blocks, team in city, category-team mapping, no duplicate category+sortOrder (409) |
| `/blocks/[id]` | GET | content.view | Returns block with resources and activities |
| `/blocks/[id]` | PATCH | content.manage | sortOrder change → duplicate check (409); audits old/new |
| `/blocks/[id]` | DELETE | content.manage | Hard delete; audits category/title/reason |

### Tests — 500 total, 0 failures

| Test file | Tests | What is covered |
|---|---|---|
| `scope.test.ts` | 40 | `isHqUser`, `isApprovedCategory`, `CATEGORY_TO_TEAM_CODE`, `deriveCity/Park`, `buildScopeFilter`, `canRead/Write`, `verifyTeamInCity` |
| `validation.test.ts` | 44 | All schemas; **calendarDate: Feb 30 reject, month 13 reject, leap-year accept, non-leap-29 reject**; off-day, category, content limits |
| `plans/route.test.ts` | 16 | **HQ no cityId → 400, program_admin no cityId → 400, HQ with cityId → 200, scoped actor foreign cityId → 403**; auth, validation, city/batch/basePlan checks, create success |
| `blocks/route.test.ts` | 8 | Off-day, foreign team, category mismatch, exercises+sports accept, duplicate, create success |
| `sessions/[id]/route.test.ts` | 16 | GET/PATCH/DELETE success + 404 + 403 + malformed JSON + invalid date + duplicate date + audit |
| `blocks/[id]/route.test.ts` | 16 | GET/PATCH/DELETE success + 404 + 403 + malformed JSON + invalid payload + duplicate sortOrder + delete audit |
| `workbook-adapter.test.ts` etc. | 360 | Pre-existing tests — all still passing |

---

## Authorization model

```
Request
  └─ requireAuth()                     → 401 if unauthenticated
  └─ requireCapability("content.view") → 403 if capability absent
                  or ("content.manage")
  └─ buildContentPlanScopeFilter()     → null = 403 (scope violation)
         ├─ HQ: all active cities (but must supply cityId on list)
         ├─ city_head: assignedCityId only
         └─ park staff: city/park derived from StaffMeta
  └─ business logic (duplicate checks, off-day, category mapping)
  └─ DB write + logAudit()
```

**Dynamic grants:** A user with a dynamically granted `content.manage` capability
can write within their server-derived resource scope regardless of role.
No role-list gates exist in the write path.

---

## HQ city enforcement detail

`GET /plans` without `cityId`:
- HQ (super_admin / program_admin): **400** returned before any DB query — "cityId is required for HQ users"
- Non-HQ actor: city is derived from session scope; if they supply a foreign cityId → **403**

Implementation: uses `isHqRole()` from `@/lib/auth/scope` directly in the route handler
(not the mocked content-planner scope module) so test isolation is maintained.

---

## Calendar date validation detail

**Old approach** (`new Date(val)` + `isNaN`):
- `2026-02-30` → JS clamps silently to 2026-03-02; `isNaN` returns `false` → accepted ❌

**New approach** (component round-trip):
```typescript
const [year, month, day] = val.split("-").map(Number);
const date = new Date(year, month - 1, day); // local, 0-indexed month
return (
  date.getFullYear() === year &&
  date.getMonth()    === month - 1 &&
  date.getDate()     === day
);
```
- `2026-02-30`: `getDate()` → 2 ≠ 30 → rejected ✓
- `2026-13-01`: `getMonth()` → 0 ≠ 12 → rejected ✓
- `2024-02-29`: all components match (leap year) → accepted ✓
- `2026-02-29`: `getDate()` → 1 ≠ 29 → rejected ✓

---

## Lint investigation

**Command:** `npm run lint` → `eslint .`
**Behaviour:** Hangs indefinitely on this Windows host (confirmed at >120 s timeout).
**Pre-existing:** Reproduced identically on the base commit `99f9460` before any PKG-01 changes.
**Scope-limited lint:** `npx eslint src/lib/content-planner/ src/app/api/admin/content-planner/` completes in <10 s with **exit 0, 0 errors**.
**Likely cause:** `eslint .` traverses `node_modules` or `.next` due to a missing or misconfigured `.eslintignore` / flat-config `ignores`; this is a pre-existing project configuration issue unrelated to PKG-01.

---

## Audit log summary

Every mutation logs to `logAudit` with `userId`, `action`, `entityType`, `entityId`.

| Entity | Actions | Redacted fields |
|---|---|---|
| content_plan | create, update, archive | sourceWorkbook, sourceSheet |
| content_plan_session | create, update, archive | sourceRow |
| content_plan_block | create, update, delete | content (body text) |

---

## Unchanged / deferred

| Task | Status | Notes |
|---|---|---|
| Task 7: Import preview dry-run | Deferred | Needs owner decisions on workflow, placeholder handling, scope inference |
| Task 8: City Head planner UI | Deferred | Pending owner approval of foundation |
| Task 9: Park/Murabbi read UI | Deferred | Pending owner approval of foundation |
| SQLite migration | Deferred | Pre-existing models used; new SQLite migration needs owner-approved strategy |

---

## Changed files

```
src/lib/auth/capabilities.ts                              (modified)
src/lib/content-planner/scope.ts                          (new)
src/lib/content-planner/scope.test.ts                     (new)
src/lib/content-planner/validation.ts                     (new)
src/lib/content-planner/validation.test.ts                (new)
src/app/api/admin/content-planner/plans/route.ts          (new)
src/app/api/admin/content-planner/plans/route.test.ts     (new)
src/app/api/admin/content-planner/plans/[id]/route.ts     (new)
src/app/api/admin/content-planner/sessions/route.ts       (new)
src/app/api/admin/content-planner/sessions/[id]/route.ts  (new)
src/app/api/admin/content-planner/sessions/[id]/route.test.ts (new)
src/app/api/admin/content-planner/blocks/route.ts         (new)
src/app/api/admin/content-planner/blocks/route.test.ts    (new)
src/app/api/admin/content-planner/blocks/[id]/route.ts    (new)
src/app/api/admin/content-planner/blocks/[id]/route.test.ts (new)
PKG-01-HANDOFF.md                                         (this file)
```

16 files — 5 531 net additions, 0 deletions from base.

---

## Commit history (base → HEAD)

```
628645c  fix(content-planner): enforce HQ cityId, reject impossible dates, fix stale conflicts
8b1f676  test(content-planner): add comprehensive lifecycle route tests
d140223  fix(content-planner): resolve test failures and remove unused imports
c0a9040  docs(PKG-01): comprehensive revised handoff with all changes
bf4b925  feat(PKG-01): dynamic permissions, complete API lifecycle, safe parsing, date validation
a63d1dd  fix(PKG-01): remove SQLite migration and dev.db, update handoff accuracy
6d87b33  docs(PKG-01): comprehensive package handoff document
feb8ed4  feat(PKG-01): add content capabilities to access control system
95bec34  fix(PKG-01): remove async validation from createBlockSchema and fix imports
3bda88b  feat(PKG-01): add focused API tests for scope-denial and category enforcement
0d49855  feat(PKG-01): create protected content planner API routes with scope enforcement
00cd347  feat(PKG-01): add bounded Zod validation schemas for content planner
fa94ee0  feat(PKG-01): add server-side content planner scope helpers
ecef654  feat(PKG-01): add content planner models to both SQLite and PostgreSQL schemas
```
