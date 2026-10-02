# BASE-01 — Requirements and verified baseline

Owner: Astra. Status: done, baseline accepted (2026-09-11). Depends on: completed planning setup. Outcome/evidence: [baseline handoff](../baseline/README.md). Product fixes, imports and consolidation remain unfinished.

Outcome: a precise module queue grounded in the owner's references and current code, preserving the current candidate and original-main functionality. Follow `shabab-module-delivery`, AGENTS and the blueprint. This is the first execution task; do not start product feature implementation in the same task.

Inputs: `docs/delivery/PLAN.md`, `REFERENCES.md`, `REFERENCE_INVENTORY.json`, existing UI-restoration evidence and main/v2 consolidation plan. Inspect current branch/status and detect changes since the inventories. Preserve dirty UI work and documents; do not bulk-stage.

Allowed changes: this task's requirement matrix, reference map, evidence, delivery state and source-backed documentation corrections. Read application code/tests/schemas and references; no application, migration, live DB, account, merge, push or deployment changes.

Tasks:

1. Record candidate SHA, relevant dirty-file hashes and what current evidence covers. Reuse exact matching results; run focused checks where evidence is absent/stale. Do not claim the deployed system was verified from local reports.
2. Classify all 34 screenshots as product view, interaction state, source-data reference or duplicate; map them to current components and required roles. No screenshot-to-UI parity claim from the restoration gallery alone.
3. Inspect all 57 worksheet structures across six workbooks locally, including Batch 2 profiles and Murabbi training added during planning. Record row grain, headers/date axes, sensitive fields, repeated/summary tabs and target module. Do not export private rows; do not confuse formatted rows with records. Detailed import mappings may be owned by later module tasks but every source tab needs a disposition.
4. Create a requirement matrix covering all 35 catalogue capabilities and additional owner requirements. For each: source, actors/scope, current route/model/UI, existing/defective/missing/gated verdict, acceptance cases, proposed owner and dependency. Include notifications, messaging and community explicitly.
5. Refresh C0/C1 comparison evidence and define the next single consolidation package using the existing plan. Flag main-only modules and behavioral differences. Do not silently skip the canonical-main goal.
6. Group only material unresolved business questions by the next affected module. Preserve prior approvals. Prepare the next narrow task, without starting it.

Acceptance: every screen and worksheet classified; every catalogue capability mapped; exact evidence limits; no sensitive data copied; no unexplained lost main feature; one next task. Astra records the review outcome and updates state/memory. If a condition remains unresolved, state blocked/partial accurately.

Handoff: concise outcome, changed files, reference coverage counts, checks/exit codes, owner decisions needed and one next task. Link the matrix and evidence; do not paste whole sources.
