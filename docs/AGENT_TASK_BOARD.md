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
| `COORD-001` | P1 | `IN_PROGRESS` | Gemini 3.5 Flash | None | `docs/AGENT_TASK_BOARD.md` only | Codex |
| `SEC-006` | P0 | `IN_PROGRESS` | Gemini 3.1 Pro | None | `docs/product-discovery/SEC-006-STATIC-SECURITY-REVALIDATION.md` only | Codex |
| `TEAM-UI-001` | P1 | `DONE` | Codex | Team API | `codex/team-membership-ui` at `e9a1d6c` | Codex |
| `ACCESS-UI-002` | P1 | `DONE` | Codex | Access matrix | `codex/access-management-matrix` at `6565b32` | Codex |
| `HIER-002` | P0 | `DONE` | Claude Opus | None | `agent/claude/HIER-002-hierarchy-migration-design` at `fa7105f` | Codex |
| `TEAM-001` | P1 | `REVIEW` | Claude Opus | None | `agent/claude/COORD-001-task-board-coordination` at `4cd5244` | Codex |
| `ATT-VALIDATION-001` | P0 | `REVIEW` | DeepSeek v4 Flash | None | `agent/deepseek/ATT-VALIDATION-001-attendance-validation` at `f22e83e` | Codex |
| `CALL-304` | P1 | `REVIEW` | DeepSeek v4 Flash | CALL-302, CALL-303 | `agent/deepseek/CALL-304-calling-design` at `1549fac` | Codex |
| `CP-IMPORT-001` | P1 | `REVIEW` | DeepSeek v4 Flash | CP-API-001 | `agent/deepseek/CP-IMPORT-001-content-plan-parser-tests` at `ec0f8eb` | Codex |
| `CP-IMPORT-002` | P1 | `CHANGES_REQUESTED` | DeepSeek v4 Flash | CP-IMPORT-001 | `agent/deepseek/CP-IMPORT-002-workbook-adapter` at `f8de9b0` | Codex |
| `DASH-001` | P1 | `REVIEW` | DeepSeek v4 Flash | None | `agent/deepseek/DASH-001-lahore-data-consistency` at `d013bdd` | Codex |
| `SEC-001` | P0 | `REVIEW` | DeepSeek / Gemini | None | DeepSeek at `6c14e68`, Gemini at `705cef7` | Codex |
| `AUTH-104` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/AUTH-104-city-head-denial-tests` at `eadf38a` | Codex |
| `CALL-305` | P1 | `REVIEW` | Gemini 3.1 Pro | CALL-302 | `agent/gemini/CALL-305-calling-import-contract` at `ff26cf4` | Codex |
| `CALL-306` | P1 | `REVIEW` | Gemini 3.1 Pro | CALL-305 | `agent/gemini/CALL-306-implementation-plan` at `8f96651` | Codex |
| `HIER-003` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/HIER-003-hierarchy-uat-plan` at `6408156` | Codex |
| `HIER-004` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/HIER-004-phase-b-impact-map` at `a46f50f` | Codex |
| `HIER-005` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/HIER-005-test-plan` at `f00148c` | Codex |
| `HIER-006` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/HIER-006-downstream-compatibility-map` at `074b9a4` | Codex |
| `MASHWARA-302` | P1 | `REVIEW` | Gemini 3.1 Pro | MASHWARA-301 | `agent/gemini/MASHWARA-302-implementation-plan` at `ad1de32` | Codex |
| `UAT-003` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/UAT-003-execution-checklist` at `1209a3f` | Codex |
| `UAT-004` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/UAT-004-test-data-isolation-runbook` at `d068236` | Codex |
| `UAT-005` | P0 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/UAT-005-evidence-log-template` at `6a4deb9` | Codex |
| `UX-001` | P1 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/UX-001-lahore-screen-inventory` at `c67be25` | Codex |
| `UX-002` | P1 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/UX-002-mobile-responsive-audit` at `52f7f9c` | Codex |
| `UX-004` | P1 | `REVIEW` | Gemini 3.1 Pro | None | `agent/gemini/UX-004-mobile-evidence-matrix` at `f30872d` | Codex |
| `OPS-001` | P0 | `REVIEW` | GPT-5.4-mini | None | `agent/gpt-5.4-mini/OPS-001-staging-release-runbook` at `05e7c7a` | Codex |
| `UAT-002` | P0 | `REVIEW` | GPT-5.4-mini | None | `agent/gpt-5.4-mini/UAT-002-lahore-current-system-uat-plan` at `673bede` | Codex |
| `MASHWARA-301` | P1 | `REVIEW` | Claude Opus | None | `agent/claude/MASHWARA-301-mashwara-design` at `9ed14ad` | Codex |
| `UAT-ROLE-002` | P0 | `CLAIMED` | GPT-5.4-mini | None | `agent/gpt-5.4-mini/UAT-ROLE-002-api-auth-audit` at `dbb955f` | Codex |
| `AUTH-001` | P0 | `CLAIMED` | DeepSeek v4 Flash | None | `agent/deepseek/AUTH-001-security-test-audit` at `dbb955f` | Codex |

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
