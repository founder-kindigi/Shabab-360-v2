# Delivery documentation

This index connects the delivery workflow to the existing project documentation.

- [Delivery plan and responsibilities](PLAN.md)
- [Current task state](state.json)
- [Completed BASE-01 findings and verification](baseline/README.md)
- [Completed C0 preservation and isolated workspace](consolidation/C0_EVIDENCE.md)
- [Completed C1 reconciliation assessment and open findings](consolidation/C1_PARITY.md)
- [Completed C1 task and evidence limits](tasks/C1-01.md)
- [Completed C2-01 isolated foundation candidate](consolidation/C2_01_HANDOFF.md)
- [Completed C2-02 capability/API contracts](consolidation/C2_02_HANDOFF.md)
- [Ready next task — C2-03 additive preservation models](tasks/C2-03.md)
- [Reference inventory and limits](REFERENCES.md)
- [First execution task](tasks/BASE-01.md)
- [Agent assignment template](tasks/TEMPLATE.md)
- [Copy-ready DeepSeek prompt](tasks/DEEPSEEK_PROMPT.md)
- [Copy-ready Gemini prompt](tasks/GEMINI_PROMPT.md)
- [DeepSeek clean-code assignment](tasks/DEEPSEEK-CLEAN-CODE.md)
- [Automation and verification](AUTOMATION.md)
- [Planning authority](../CODEX_SHABAB360_MASTER_BLUEPRINT.md)
- [Existing module catalogue — historical statuses](../MODULE_CATALOG.md)
- [Existing roles and scope matrix](../ROLE_BASED_ACCESS_MATRIX.md)
- [Existing operations runbook](../OPERATIONS_RUNBOOK.md)
- [Main/v2 consolidation plan](../reviews/main-v2-consolidation-2026-09-10/CONSOLIDATION_PLAN.md)

## Current-system publication checklist

Update existing pages where they already own the topic. BASE-01 identifies duplicate/stale pages before publishing replacements.

| Document set | Required content | Update point |
| --- | --- | --- |
| Project README/setup/build | Supported runtime/lockfile, install, configuration names, development, tests, provider build commands | Canonical baseline and build changes |
| Architecture | Actual PWA/desktop, API, service, identity, database and offline boundaries | Canonical baseline and architecture changes |
| Module guide | Requirement IDs, screen references, roles, operator steps, verified behavior and open gates | Every module |
| API contract | Method/path, scoped authorization, schemas, errors, pagination, retry semantics and synthetic examples | Before Gemini work; validate after integration |
| Data dictionary/imports | Models, relationships, field provenance, privacy, retention, forward migrations and reconciliation | Every schema/import change |
| Security/operations | Role matrix, audit, backup/restore, monitoring, notification failures, incidents, rollback | Affected modules and release |
| Evidence/release notes | Candidate identity, exact checks, meaningful limitations and changes | Module completion and release |

These are publication requirements, not claims that all documents or product modules have been completed.
