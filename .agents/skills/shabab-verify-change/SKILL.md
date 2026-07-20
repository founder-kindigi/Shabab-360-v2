---
name: shabab-verify-change
description: Verify Shabab 360 code and configuration changes with proportionate checks. Use when asked to test, validate, review readiness, confirm a fix, run quality gates, or prepare a completion handoff in this repository. Supports focused, standard, and build-level verification. Do not use as a substitute for implementing a requested feature.
---

# Verify a Shabab 360 change

## Choose the level

- **Focused:** Run the closest affected tests while iterating.
- **Standard:** Run lint, typecheck, and the full test suite before completing substantive source changes.
- **Build:** Add the relevant SQLite or PostgreSQL build for routing, schema, dependency, configuration, or deployment changes.

Use `node .agents/skills/shabab-verify-change/scripts/verify.mjs --list` to preview deterministic standard checks. Use `--run` to execute them and `--build` to add `npm run build:postgres`.

## Verify risk, not only compilation

1. Inspect the diff and map it to user-visible behavior and failure modes.
2. For APIs, test unauthenticated, wrong-role, wrong-scope, malformed-input, and relevant not-found or conflict paths.
3. For financial or multi-write behavior, verify transactionality, exact values, retries/conflicts, and duplicate prevention.
4. For schema changes, validate both schemas when applicable, migration direction, data impact, regeneration, and rollback/recovery.
5. For UI work, verify loading, empty, error, permission, desktop, and required mobile/offline states.
6. Treat generated-state failures separately from source defects. Do not delete caches or overwrite unrelated work without explicit need and approval.

## Report evidence

State exactly what passed, what failed, and what was not run. Include commands or equivalent evidence, affected test counts when available, security/data impact, and remaining risk. Never convert an unrun check into a completion claim.
