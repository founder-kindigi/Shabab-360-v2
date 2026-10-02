# <TASK-ID> — <one outcome>

Assigned to: Astra | Gemini | DeepSeek. Module: <id>. Status: ready | active | review | blocked | done.
Base: <SHA and dirty-file manifest>. Depends on: <accepted prior task>.

## Outcome and boundary

<Requirement IDs, user-visible acceptance cases, actors/scope. Exact allowed files. Explicit exclusions and unresolved decisions.>

## Minimal inputs

<Relevant module requirement file; exact screenshot filenames; workbook sheet-index/range metadata only; current code/tests; approved API/data contract. No full history or private workbook rows.>

## Contract

<Method/path, bounded schema, response/error types, capability/scope, pagination, retry/concurrency, persistence, privacy and rollback impact. Gemini consumes this contract; request clarification instead of inventing an endpoint.>

## Work and verification

<Small ordered changes and tests that establish observable behavior. Gemini: screenshot comparison plus loading/empty/error/denied/mobile/desktop/offline where supported. DeepSeek: follow clean-code skill, preserve behavior, add only meaningful tests.>

## Return to Astra

Patch/commit; exact changed files; commands and exit codes; evidence paths; unresolved risks; any contract deviation. No self-approval, deployment or unrelated refactor. Astra reviews actual source and verifies before closing.
