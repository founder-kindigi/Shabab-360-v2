# Shabab 360 Agent Task Board

**Authority:** `CODEX_SHABAB360_MASTER_BLUEPRINT.md` and Codex-approved
contracts. This board coordinates work; it does not replace product decisions.

## Coordinator Rules

- Run the coordinator loop every three minutes.
- Assign only `READY` work with `DONE` dependencies and non-overlapping files.
- One task, one branch, one implementation owner. Codex alone approves and
  integrates work.
- Never assign secrets, deployment, migration execution, or real Lahore data
  work to an agent.

## Status Definitions

| Status | Meaning |
| --- | --- |
| `READY` | Safe to claim; contract and dependencies are complete |
| `CLAIMED` | Agent acknowledged scope and has not edited files yet |
| `IN_PROGRESS` | Agent is changing only its allowed files |
| `HANDOFF_READY` | Pushed branch and evidence await Codex review |
| `CHANGES_REQUESTED` | Same agent must revise the same branch |
| `REVIEW` | Codex is reviewing |
| `APPROVED` | Safe for Codex integration |
| `BLOCKED` | Requires owner decision or prerequisite |
| `DONE` | Integrated and verified |

## Active Queue

| ID | Priority | Status | Owner | Dependencies | Allowed files/domain | Review owner |
| --- | --- | --- | --- | --- | --- | --- |
| `COORD-001` | P1 | `HANDOFF_READY` | deepseek-v4-flash | None | `docs/AGENT_TASK_BOARD.md` only | Codex |
| `CP-IMPORT-002` | P2 | `CHANGES_REQUESTED` | deepseek-v4-flash | CP-IMPORT-001 | `src/lib/content-planner-parser/workbook-adapter.ts`, tests | Codex |
| `SEC-006` | P0 | `IN_PROGRESS` | Gemini 3.1 Pro | None | `docs/product-discovery/SEC-006-STATIC-SECURITY-REVALIDATION.md` only | Codex |
| `TEAM-UI-001` | P1 | `HANDOFF_READY` | Codex | Team API | `codex/team-membership-ui` at `e9a1d6c` | Codex |
| `ACCESS-UI-002` | P1 | `HANDOFF_READY` | Codex | Access matrix | `codex/access-management-matrix` at `6565b32` | Codex |
| `SEC-003` | P2 | `REVIEW` | deepseek-v4-flash | None | `docs/product-discovery/SEC-003-AVATAR-UPLOAD-AUDIT.md` | Codex |
| `SEC-005` | P2 | `REVIEW` | deepseek-v4-flash | SEC-002, SEC-004 | `docs/product-discovery/SEC-005-UPLOAD-DISABLE-CONSUMER-AUDIT.md` | Codex |
| `SEC-002A` | P2 | `REVIEW` | deepseek-v4-flash | None | `docs/product-discovery/SEC-002A-DOCUMENT-UPLOAD-TEST-PLAN.md` | Codex |
| `DASH-001` | P2 | `REVIEW` | deepseek-v4-flash | None | `docs/product-discovery/DASH-001-LAHORE-DATA-CONSISTENCY.md` | Codex |
| `OPS-001` | P2 | `REVIEW` | gpt-5.4-mini | None | `docs/product-discovery/OPS-001-STAGING-RELEASE-RUNBOOK.md` | Codex |

## Claim Template

```text
CLAIM
Task ID:
Model:
Branch:
Base commit:
Allowed files understood:
I will not modify secrets, deployment, migrations, staging/production data,
or files outside this scope.
```

## Handoff Template

```text
HANDOFF
Task ID:
Branch and base commit:
Commit SHA:
Changed files:
What changed:
What was intentionally excluded:
Role/scope and personal-data impact:
Migration/data impact:
Commands run and results:
Known risks / owner decisions:
Ready for Codex review.
```
