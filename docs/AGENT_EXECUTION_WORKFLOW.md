# Shabab 360 Complexity-Based Execution Workflow

## 1. Authority And Safety

`CODEX_SHABAB360_MASTER_BLUEPRINT.md` is the planning authority and
`docs/AGENT_TASK_BOARD.md` is the live queue. Current code and fresh evidence
outrank historical documents.

Every worker uses an isolated branch from the current approved integration
commit. No worker may push to `main`, merge another branch, deploy, execute a
migration/import, handle secrets, or alter real Lahore data. Codex alone
approves and integrates work.

## 2. Complexity Tiers

Workers claim work by the highest tier they can reliably complete, not by a
fixed role or model name. The claiming worker states its identity and supported
tier in every claim.

| Tier | Work type | Required capability |
| --- | --- | --- |
| `C0` | Documentation, inventory, formatting, narrow static checks | Accurate reading, concise writing, repository hygiene |
| `C1` | Isolated UI components, focused unit tests, parsers, mechanical fixes | Reliable implementation inside explicit file boundaries |
| `C2` | API routes, bounded validation, responsive workflows, integration tests | Server/client reasoning plus allow, deny, and failure tests |
| `C3` | Authorization, data model changes, migration design, concurrency, cross-module refactors | Strong security, scope, schema, and rollback reasoning |
| `C4` | Architecture, security approval, migration/release decisions, integration | Highest-risk review capability; Codex approval is still mandatory |

Workers may claim only tasks at or below their declared tier. A task above the
available tier is marked `BLOCKED` for review; no worker may simplify safety
requirements merely to make it claimable.

## 3. Continuous Worker Flow

1. Read `AGENTS.md`, `.agents/memory/current.md`, this document, and the task
   board before every claim.
2. Claim one `READY` task with satisfied dependencies and non-overlapping
   allowed files.
3. Create `agent/<identity>/<task-id>-<short-name>` from the board's base
   commit, make only approved changes, verify, commit, and push.
4. Mark the task `HANDOFF_READY` and publish the required handoff.
5. Immediately claim the next safe `READY` task. The completed branch stays
   available for review and is never reused for unrelated work.
6. If review returns `CHANGES_REQUESTED`, the original author owns the revision
   on the original branch. It takes priority after the author's current task
   reaches a clean stopping point; no revision is silently reassigned.
7. A worker may have one `IN_PROGRESS` task and any number of its own
   `HANDOFF_READY` branches. It must not edit two tasks at once.

## 4. Continuous Review Flow

The review lane runs independently from delivery workers.

1. Review each `HANDOFF_READY` task by priority, then handoff time.
2. Verify changed-file scope, authorization/scope impact, personal-data impact,
   migrations/data impact, and required evidence.
3. Return exactly one decision:
   - `APPROVED`: ready for Codex integration.
   - `CHANGES_REQUESTED`: precise findings with file/line references and
     acceptance checks; return it to the original author.
   - `BLOCKED`: owner decision or missing contract required.
4. Never approve the reviewer's own branch.
5. Codex performs the final C4 review and integration after approval.

## 5. Dispatcher Loop

The dispatcher checks `docs/AGENT_TASK_BOARD.md` every three minutes.

1. Detect new claims, pushed handoffs, requested changes, and blocked work.
2. Route `HANDOFF_READY` work to the review lane without waiting for the author.
3. Assign the highest-priority dependency-safe `READY` task to an available
   worker whose declared tier is sufficient.
4. Prevent simultaneous overlap on a file, route, schema model, migration, or
   authorization domain.
5. If the platform cannot directly message or start another session, update the
   board with the exact assignment prompt. The relevant worker polls the board
   and claims it on its next three-minute check.
6. The dispatcher never writes application code, approves work, merges,
   deploys, runs migrations/imports, or accesses secrets.

## 6. Task Requirements

Every task card must define:

- task ID, priority, complexity tier, status, dependencies, and base commit;
- explicit allowed files or domain boundary;
- product/API contract and server-side authorization rules where relevant;
- required focused tests and standard verification commands;
- data, migration, rollback, personal-data, and deployment impact;
- reviewer and acceptance criteria.

Schema, authorization, payment, safeguarding, import, deployment, and real-data
tasks are `C3` or `C4`. They require deny-path tests, a rollback/recovery note,
and Codex approval before execution.

## 7. Required Claim

```text
CLAIM
Task ID:
Agent identity:
Supported complexity tier: C0 / C1 / C2 / C3 / C4
Branch:
Base commit:
Allowed files understood:
I will not modify secrets, deployment, migrations, staging/production data,
or files outside this scope.
```

## 8. Required Handoff

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
Migration/data impact and rollback:
Commands run and results:
Known risks / owner decisions:
Ready for review.
```

## 9. Review Checklist

- The task stayed inside its allowed files/domain.
- Server authorization fails closed and resource scope cannot be widened by
  request input.
- Untrusted input has bounded validation.
- Allow, denial, and relevant failure tests exist for behavior changes.
- SQLite and PostgreSQL remain aligned for schema work.
- Real Lahore data, credentials, and deployment configuration were untouched.
- Required lint, typecheck, tests, and applicable build evidence is present.
