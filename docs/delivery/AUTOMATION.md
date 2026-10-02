# Delivery automation

Implemented 2026-09-11. These helpers coordinate work; they do not approve code or alter the application/database.

| Helper | Behavior |
| --- | --- |
| SessionStart hook | Existing startup/resume/clear/compact hook now adds the active/next task to concise memory |
| Stop hook | Advisory checkpoint warning only for an active task or invalid state; silent when no task is active; never forces another model turn |
| `node scripts/delivery/check-workflow.mjs` | Checks one active task, task owner/status, dependency completion, packet existence, and evidence/review metadata before marking done |
| `python scripts/delivery/inventory-references.py --write` | Read-only source inspection; regenerates the sanitized metadata inventory, never edits/imports source workbooks |

Hooks follow the current [official Codex hook contract](https://learn.chatgpt.com/docs/hooks). The repository configuration retains root-relative Windows and non-Windows commands. Local smoke tests verify JSON output and scripts; automatic lifecycle invocation depends on this client's hook loading/trust settings and is not established by manually running the scripts. No global hook settings or git hooks were changed.

Run workflow checks before assignment and before closure. State metadata can be wrong even when structurally valid: Astra must inspect real evidence. The checker verifies file existence, not test truth, source hashes or product approval. No hook runs a full test suite after each edit, uploads files, dispatches models, mutates memory automatically, or changes accounts.

Tests: `node --test scripts/delivery/check-workflow.test.mjs`. Check new skills with the bundled skill-creator `quick_validate.py`. At substantive module completion, follow the existing Shabab verification skill; do not replace runtime/API/database checks with these workflow tests.

## Setup verification — 2026-09-11

`node scripts/delivery/verify-setup.mjs` passed nine setup checks, including seven workflow behavior tests, local documentation links, reference counts, three skill frontmatter checks, and both configured Windows hook commands from a repository subdirectory. See [SETUP_VERIFICATION.json](SETUP_VERIFICATION.json).

`npm run lint` passed with zero errors and six existing script warnings; `npm run typecheck` passed. The bundled `quick_validate.py` could not start because PyYAML is missing; the local verifier checked the restricted plain-scalar frontmatter and unfinished placeholders used by these skills without installing dependencies. Automatic hook invocation by the client remains unverified. Application source and the prior UI-restoration work were preserved; no new full application suite/build or live database check was needed for this documentation/tooling-only task.
