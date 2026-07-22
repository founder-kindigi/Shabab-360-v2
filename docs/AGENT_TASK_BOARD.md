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
| `COORD-001` | P1 | `READY` | Gemini 3.5 Flash | None | `docs/AGENT_TASK_BOARD.md` only | Codex |
| `SEC-006` | P0 | `IN_PROGRESS` | Gemini 3.1 Pro | None | `docs/product-discovery/SEC-006-STATIC-SECURITY-REVALIDATION.md` only | Codex |
| `TEAM-UI-001` | P1 | `HANDOFF_READY` | Codex | Team API | `codex/team-membership-ui` at `e9a1d6c` | Codex |
| `ACCESS-UI-002` | P1 | `HANDOFF_READY` | Codex | Access matrix | `codex/access-management-matrix` at `6565b32` | Codex |

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
