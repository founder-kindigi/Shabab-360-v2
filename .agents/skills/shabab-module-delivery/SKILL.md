---
name: shabab-module-delivery
description: Plan and lead one Shabab 360 module through requirements, backend, Gemini frontend, DeepSeek cleanup, verification and documentation. Use for module delivery or agent handoffs, not isolated explanations.
---

# Deliver one module

Read AGENTS, concise memory and `docs/delivery/state.json`. Load the active task packet and only its relevant reference ranges. `docs/delivery/PLAN.md` defines team responsibilities and the serial delivery cycle; consult the needed section, not all historical plans.

Keep one active task across Astra, Gemini and DeepSeek. Set its state before implementation. Resolve or explicitly block it before starting another task. Blocking does not mean complete. `node scripts/delivery/check-workflow.mjs` checks coordination metadata; it is not proof of application correctness.

Astra owns requirements, APIs, DB/migrations, security, performance, integration and final review/refactor. Define the contract before Gemini work. Delegate only a bounded backend task to DeepSeek; always assign the module clean-code pass to DeepSeek after integration. If the named provider is not connected, prepare the packet and report it as not dispatched. Do not impersonate it or start parallel work to compensate.

Map each requirement to owner intent, an exact screenshot or workbook sheet/range, current behavior, data/API/UI changes and acceptance evidence. `docs/pwa screens/` controls covered visuals; `docs/sheets/` controls source data meaning. Inspect rather than infer missing mappings. Keep private rows local and send synthetic fixtures to agents. A spreadsheet field or screenshot button does not define server authorization.

Use `shabab-build-feature` for implementation and `shabab-verify-change` for verification. Preserve established UI and backend invariants. Prefer current source and evidence over old module status claims. Reuse a passing check only when candidate identity, affected dependencies and test scope still match.

Use `docs/delivery/tasks/TEMPLATE.md` for assignments and `DEEPSEEK-CLEAN-CODE.md` for cleanup. Return short outcomes with exact files, evidence, risks and one next task. Keep requirements/contracts/operator docs current with each module; update memory only with durable decisions or verified state. Do not claim the module done while required behavior, tests or owner decisions remain open.
