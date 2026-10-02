---
name: shabab-clean-code
description: Apply a bounded behavior-preserving clean-code pass to a completed Shabab 360 module and prepare it for Astra review. Use for assigned cleanup or refactoring, not repository-wide redesign.
---

# Module cleanup

Read AGENTS and the active delivery packet. Confirm candidate identity and allowed files; inspect the actual diff plus direct consumers/tests. DeepSeek owns the assigned pass, Astra reviews and performs final refinements. Report missing provider access honestly.

Improve only demonstrated maintenance problems: unclear names, difficult control flow or JSX, weak boundary types, duplicated business rules, hidden side effects and dead code within scope. Reuse existing services/helpers. Prefer no change over an unnecessary abstraction. Do not introduce a new dependency, layer or framework without an actual requirement.

Keep public contracts, status/error behavior, server scope checks, transaction/audit boundaries, decimal handling, retry keys, session ownership, offline semantics and visual reference unchanged. Treat changes to these as functional work requiring the lead's updated packet, not cleanup. Re-read files before editing.

Run focused behavior tests and lint/typecheck appropriate to the patch. Astra runs the module's final verification after integration. Return a small diff, concise reasons, exact commands/results and unresolved concerns. No invented test counts, broad formatting, generated-client edits, or self-approval.
