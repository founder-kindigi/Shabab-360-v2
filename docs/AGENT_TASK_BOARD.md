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

| ID | Priority | Tier | Status | Author | Dependencies | Allowed files/domain | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| `COORD-001` | P1 | `C0` | `READY` | Unassigned | None | `docs/AGENT_TASK_BOARD.md` only | Codex |
| `SEC-006` | P0 | `C3` | `IN_PROGRESS` | Claimed agent | None | `docs/product-discovery/SEC-006-STATIC-SECURITY-REVALIDATION.md` only | Codex |
| `TEAM-UI-001` | P1 | `C2` | `DONE` | Codex | Team API | Integrated at `8de093c` | Codex |
| `ACCESS-UI-002` | P1 | `C2` | `DONE` | Codex | Access matrix | Integrated at `8de093c` | Codex |

## Claim Template

```text
CLAIM
Task ID:
Agent identity:
Supported complexity tier:
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
Agent identity:
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
