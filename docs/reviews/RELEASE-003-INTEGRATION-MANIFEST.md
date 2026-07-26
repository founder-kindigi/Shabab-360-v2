# RELEASE-003: Integration Manifest

- **Recorded:** 2026-07-26
- **Integration base:** `159ba859c280b2ee197d4136f797b6385d772f4d` (`codex/production-hardening`)
- **Purpose:** Define a safe, evidence-based order for assembling a release candidate. This is an inventory, not a merge authorization.

## Integration Rules

1. Create the release candidate from the recorded integration base; do not merge broad historical feature branches directly.
2. Integrate one reviewed package at a time, run its focused checks, then run release-candidate checks.
3. Rebase any package whose merge base predates the integration base before code review. Resolve conflicts from current code, not from old branch assumptions.
4. Documentation-only branches may be cherry-picked independently, but they do not prove product code is integrated.
5. A package that changes Prisma schema or migrations requires fresh SQLite verification and renewed PostgreSQL shadow parity when PostgreSQL files change.

## Tier 1: Direct, Small-Scope Candidates

| Package | Branch head | Relationship to base | Changed files | Integration condition |
|---|---|---|---:|---|
| SQLite initial baseline | `agent/claude/MIGRATION-002-sqlite-baseline` at `1bf33f9` | Direct descendant | 1 | Approved; include only with the FK repair below. |
| SQLite Mashwara FK repair | `agent/claude/MIGRATION-004-sqlite-mashwara-fk-repair` at `2e443eb` | Two commits ahead, includes baseline | 2 | Requires Codex code review and fresh disposable SQLite proof. |
| Migration audit correction | `codex/migration-parity-correction` at `b46849f` | Direct descendant | 1 | Documentation-only; optional evidence integration. |
| Database parity evidence | `codex/release-parity-evidence` at `50acd24` | Direct descendant | 1 | Documentation-only; optional evidence integration. |

### Required Order

1. Review `MIGRATION-004`.
2. Create a clean release-candidate branch from `159ba85`.
3. Apply the two SQLite migration commits in their existing order.
4. Verify fresh disposable SQLite migration application, `migrate status`, `foreign_key_check`, and full-chain empty diff.
5. Keep staging and production untouched.

## Tier 2: Rebase and Re-Review Required

These branches are not direct descendants of the integration base. They must not be merged as-is.

| Package area | Current branch | Merge-base position | Why it is held |
|---|---|---|---|
| Content Planner foundation | `agent/kiro/pkg-01-content-planner` | `99f9460`, 18 commits ahead | Older base; scope and authorization changes need current-base revalidation. |
| Student extended profiles | `agent/deepseek/pkg-profile-implementation` | `588a3a8`, 12 commits ahead | Depends on capability governance and contains schema/API/UI changes. |
| Events and Calling foundation | `agent/antigravity/pkg-events-calling-foundation` | `588a3a8`, 12 commits ahead | Large schema and authorization surface; conflicts likely. |
| Team workspace | `agent/antigravity/pkg-team-workspace` | `1a355c6`, 1 commit ahead | Older dependency base; requires current team API/schema review. |
| Mashwara foundation | `agent/deepseek/pkg-mashwara-foundation` | `565735f`, 2 commits ahead | Source of the SQLite FK migration defect; do not merge before the repair is included. |
| Calling UI | `agent/deepseek/pkg-calling-ui` | `0af4dc5`, 1 commit ahead | Depends on Calling foundation not yet integrated. |
| Events UI | `agent/deepseek/pkg-events-ui` | `7fd0edb`, 2 commits ahead | Depends on Events foundation not yet integrated. |

## Tier 3: Do Not Merge Wholesale

| Branch | Reason |
|---|---|
| `codex/release-control-security` | Diverges by 62 commits and changes 112 files. It contains superseded release-control work and must be decomposed into focused, current-base patches. |
| `codex/sec-007-remediation` | Based on `1bfc2fa`, not the integration base. Reapply only its reviewed CSV-hardening patch after current-base review. |
| Older mobile, dashboard, access, and UAT branches | Their changes may be valid, but they are static candidates or test/document packages from older bases. Review and rebase individually. |

## Recommended Release-Candidate Sequence

1. Migration hygiene: `MIGRATION-002` plus reviewed `MIGRATION-004`.
2. Current-base security audits and narrowly scoped hardening fixes.
3. Dynamic capability governance before modules that depend on new capabilities.
4. One foundation module at a time: Teams, Events, Calling, Mashwara, Content Planner, extended profiles.
5. Dependent user interfaces only after their API/schema foundation is integrated.
6. Static mobile fixes, browser UAT, and final release checks.

## Current Gates

- PostgreSQL shadow parity at `159ba85`: passed and recorded in `RELEASE-002`.
- Shared staging deployment: not authorized by this manifest.
- SQLite migration repair: pending `MIGRATION-004` review.
- Browser UAT and clean release-candidate quality gates: pending.

## Explicit Non-Actions

- No branch was merged, rebased, reset, or deployed while preparing this manifest.
- No database, secret, or real Lahore data was accessed.
