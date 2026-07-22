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
| --- | --- | --- | --- | --- | --- | --- | --- |
| `COORD-001` | P1 | `C0` | `IN_PROGRESS` | Antigravity | None | `docs/AGENT_TASK_BOARD.md` only | Codex |
| `SEC-006` | P0 | `C3` | `IN_PROGRESS` | Claimed agent | None | `docs/product-discovery/SEC-006-STATIC-SECURITY-REVALIDATION.md` only | Codex |
| `TEAM-UI-001` | P1 | `C2` | `DONE` | Codex | Team API | Integrated at `8de093c` | Codex |
| `ACCESS-UI-002` | P1 | `C2` | `DONE` | Codex | Access matrix | Integrated at `8de093c` | Codex |
| `UAT-ROLE-001` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UAT-ROLE-001-ROLE-BROWSER-CHECKLIST.md` at `afaf2ec` | Codex |
| `MASHWARA-301` | P1 | `C0` | `HANDOFF_READY` | Claude Opus | None | `docs/product-discovery/MASHWARA_DESIGN.md` at `9ed14ad` | Codex |
| `SEC-001` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/SEC-001-STATIC-SECURITY-SCAN.md` at `705cef7` | Codex |
| `OPS-001` | P1 | `C0` | `HANDOFF_READY` | GPT-5.4-mini | None | `docs/product-discovery/OPS-001-STAGING-RELEASE-RUNBOOK.md` at `d4713c4` | Codex |
| `SEC-002` | P0 | `C2` | `HANDOFF_READY` | DeepSeek v4 Flash | None | `src/app/api/upload/document/` at `8e6bb5b` | Codex |
| `SEC-004` | P0 | `C2` | `HANDOFF_READY` | DeepSeek v4 Flash | None | `src/app/api/upload/avatar/` at `b9114a2` | Codex |
| `SEC-002A` | P1 | `C0` | `HANDOFF_READY` | DeepSeek v4 Flash | None | `docs/product-discovery/SEC-002A-DOCUMENT-UPLOAD-TEST-PLAN.md` at `bf72b95` | Codex |
| `SEC-003` | P1 | `C0` | `HANDOFF_READY` | DeepSeek v4 Flash | None | `docs/product-discovery/SEC-003-AVATAR-UPLOAD-AUDIT.md` at `98ab361` | Codex |
| `SEC-005` | P1 | `C0` | `HANDOFF_READY` | DeepSeek v4 Flash | None | `docs/product-discovery/SEC-005-UPLOAD-DISABLE-CONSUMER-AUDIT.md` at `21b3f25` | Codex |
| `DASH-001` | P1 | `C0` | `HANDOFF_READY` | DeepSeek v4 Flash | None | `docs/product-discovery/DASH-001-LAHORE-DATA-CONSISTENCY.md` at `fcba780` | Codex |
| `TEAM-001` | P1 | `C2` | `HANDOFF_READY` | Claude Opus | None | `src/components/modules/admin/team-membership-page.tsx` at `4cd5244` | Codex |
| `UX-001` | P1 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UX-001-LAHORE-SCREEN-INVENTORY.md` at `c67be25` | Codex |
| `UAT-002` | P0 | `C0` | `HANDOFF_READY` | GPT-5.4-mini | None | `docs/product-discovery/UAT-002-lahore-current-system-role-workflow-uat-plan.md` at `673bede` | Codex |
| `UAT-003` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UAT-003-EXECUTION-CHECKLIST.md` at `1209a3f` | Codex |
| `UAT-004` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UAT-004-TEST-DATA-ISOLATION-RUNBOOK.md` at `d068236` | Codex |
| `UAT-005` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UAT-005-EXECUTION-EVIDENCE-LOG.md` at `6a4deb9` | Codex |
| `UX-002` | P1 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UX-002-LAHORE-MOBILE-RESPONSIVE-AUDIT.md` at `52f7f9c` | Codex |
| `UX-004` | P1 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/UX-004-MOBILE-EVIDENCE-MATRIX.md` at `f30872d` | Codex |
| `HIER-003` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/HIER-003-CITY-BATCH-PARK-GROUP-UAT-PLAN.md` at `6408156` | Codex |
| `HIER-004` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/HIER-004-PHASE-B-IMPACT-MAP.md` at `a46f50f` | Codex |
| `HIER-005` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/HIER-005-PHASE-B-VERIFICATION-PLAN.md` at `f00148c` | Codex |
| `HIER-006` | P0 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/HIER-006-DOWNSTREAM-COMPATIBILITY-MAP.md` at `074b9a4` | Codex |
| `MASHWARA-302` | P1 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/MASHWARA-302-IMPLEMENTATION-PLAN.md` at `ad1de32` | Codex |
| `CALL-305` | P1 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/CALL-305-CALLING-IMPORT-CONTRACT.md` at `ff26cf4` | Codex |
| `CALL-306` | P1 | `C0` | `HANDOFF_READY` | Gemini 3.1 Pro | None | `docs/product-discovery/CALL-306-IMPLEMENTATION-PLAN.md` at `8f96651` | Codex |
| `UAT-ROLE-002` | P0 | `C0` | `CLAIMED` | Claude Opus | None | `agent/claude/UAT-ROLE-002-api-auth-audit` at `1bfc2fa` | Codex |
| `AUTH-001` | P0 | `C0` | `CLAIMED` | GPT-5.4-mini | None | `agent/gpt-5.4-mini/AUTH-001-security-test-audit` at `1bfc2fa` | Codex |

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
