# C2-02 contract handoff

2026-09-12. **Outcome: LEAD CONTRACT REVIEW ACCEPTED FOR BOUNDED DATA IMPLEMENTATION — POLICY HOLDS REMAIN.** This accepts the proposed contract map and next task, not application implementation, independent review or release readiness.

## Decisions and artifacts

- [Capabilities](C2_02_CAPABILITIES.md): all 41 distinct identifiers; preserve shared v2 defaults/override precedence and recover six dedicated main Teams/Media identifiers without broad capability aliases. No grants applied.
- [Endpoint register](C2_02_ENDPOINTS.md) and [contract clauses C00–C21](C2_02_CONTRACTS.md): all 107 C1 conflicting route files plus 18 related routes. Scope, bounded inputs, output/consumer adaptation, errors, atomicity and retry/version requirements are recorded. One `[id]` profile route resolves the dynamic-segment collision. Legacy registration/team adapters must enforce the canonical service's denials.
- [Data dependencies](C2_02_DATA_DEPENDENCIES.md): distinct staff histories, main-only models, nullable placement and migration sequencing. [All 27 findings](C2_02_FINDINGS.md) and baseline module gaps remain visible; C2-01's corrected subsets stay limited to its isolated candidate.
- [Next task C2-03](../tasks/C2-03.md): additive preservation models only. It is ready, not started. Shared nullable identity compatibility, full native migration history/combined upgrades and APIs remain later tasks.

P01 consent/medical, P02 cancellation/refunds, P03 dropout reset/pause and P04 general nonmember team oversight remain unresolved. Gate their dependent actions while proceeding with independent preservation. Existing staff-team chat/documents remain supported; general Messaging/Community and external delivery are not thereby approved. Current mobile design is preserved; Gemini frontend work and DeepSeek integrated-module cleanup are not dispatched.

## Identity and exact verification

Main source: `D:/iBuild/Shabab-360-c0-20260911/integration`, pinned `dedb91a640ea244ce9323cd1dcde2a40d74bb718`; fresh local HEAD matches and working tree is clean. V2 source: `D:/iBuild/Shabab-360-c0-20260911/c2-foundation-20260912`, based on `401ff322726c3ceab9b05db776b2b076e63bbaf5`; [C2-01 patch](C2_01_PATCH.json) SHA256 `5e007013503e5fafb5ca19cc146f7e8c23bfefaac37abff95f99fe61aa6938d2` matches. C0 recovery sources were not edited.

| Fresh command/check | Result |
| --- | --- |
| `node scripts/delivery/c2-contract-inventory.mjs` | Exit 0: main 40/v2 35/union 41 capabilities; 219 route-file union; 107 conflicting files; 583 literal API call sites |
| `python scripts/delivery/c2-contract-register.py` | Exit 0: 41 capability / 125 endpoint dispositions; 23 selected routes without a detected literal caller |
| `python scripts/delivery/c2-contract-verify.py` | Exit 0: 16 checks, including 3 negative probes; no missing conflicts/duplicate entries, stale indexed hashes or broken checked links |
| Preservation subset of the same verifier | 1,288 snapshot files checked (four documented coordination exceptions in original); recovery copy/archive match; original HEAD/index/deletions unchanged; 12 C2 patch files match; 1,274 other candidate files unchanged; excluded scratch absent |
| `npm run lint` | Exit 0; 0 errors, 6 existing unused-eslint-disable warnings in unrelated scripts |
| `npm run typecheck` | Exit 0 |

Python commands used `C:/Users/csabu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`. Machine coverage results: [C2_02_CHECK.json](C2_02_CHECK.json). Inventory and register are reproducible read-only comparison harness outputs, not runtime tests. The local main Git check initially hit sandbox-user ownership protection; a command-scoped `safe.directory` for that exact worktree allowed read-only HEAD/status checks. No global Git setting changed.

## Evidence limits and completion boundary

Source clauses were reviewed against current source plus C1 evidence; indexing is only a completeness check. Literal-call matching includes wrappers but cannot resolve every dynamically composed URL/indirect call, and is not a complete runtime graph. The 23 unmatched entries need direct-route acceptance and further caller tracing in their implementation packets. The map specifies future reconciled behavior; inherited schemas/envelopes are referenced, not claimed to be a complete executable OpenAPI specification.

No new API, browser, database, provider, concurrency, benchmark or build execution was needed for this documentation/harness-only task. C2-01's 1,389 tests and provider builds remain historical evidence for its unchanged patch, not verification of these future contracts. Original application/UI/schema files, accounts and grants were unchanged. No import, merge, deployment or canonical documentation rebuild occurred.

The fresh remote-ref refresh was rejected by automatic approval review because the account hit its usage limit. It was not retried or bypassed. Remote freshness therefore remains unverified; this acceptance is pinned to locally hash-verified sources. Refresh refs before subsequent implementation/integration and reassess any changed candidate.
