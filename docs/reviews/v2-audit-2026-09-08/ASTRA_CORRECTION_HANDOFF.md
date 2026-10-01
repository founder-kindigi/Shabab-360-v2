# v2 correction candidate — implementation evidence

Date: 2026-09-10. Branch: `v2`; base: `a25260321abe28673db4337bdc2074b55ee0d836`.

**Outcome: correction candidate awaiting independent review. This is not independent review or release approval.** The owner authorized Astra to implement the remaining corrections directly. The initial `ASTRA_REVIEW.md` remains unchanged and describes the earlier Terra candidate. `IMPLEMENTATION_STATUS.md` tracks every A00–A30 and retains the original Terra ledger below the current evidence.

## Corrections

- Server authorization now resolves city, park and group assignments without widening a capability grant. A present `Group.parkId` is authoritative; only a null legacy group park permits the documented batch-anchor fallback. Related resource IDs and contradictory hierarchy are checked.
- Park, admissions, calling, finance, procurement, profile, audience and export routes gained bounded validation, explicit denial/failure responses and relevant transactional audit. Calling assignment replacement locks its campaign. Mobile calling selects actual campaigns and paginates persisted leads; hard-coded approved scripts and false empty-on-error responses were removed.
- Authentication uses exact normalized credentials, durable atomic throttling, active durable identity and token-version revalidation. The PWA refreshes sessions while online, forces password reset, removes unavailable capabilities and clears private query/navigation state when account authority changes.
- Attendance uses real events/participants, owner-bound mutation identities, server versions, reset generations, durable retry receipts and required audit. Correction/reset paths enforce preconditions. IndexedDB preserves conflicts and legacy marks, drains in chronological bounded batches and coordinates tabs with Web Locks.
- Fees use persisted balances/receipts and recover lost acknowledgements using the original saved key and details. Cross-tab payment attempts are locked. Transfers cannot overspend stock, order issuance does not receive stock, request decisions cannot be applied twice, and absolute stock edits require a version.
- Profile saves submit only changed fields against their original edit version with redacted transactional audit. Directory pagination and selected participant context are real. Returning to profile selection clears the prior target. Analytics uses eligible participant-session opportunities, including unmarked sessions. Minutes HTML escapes stored text.
- Paired schemas contain 74 models. PostgreSQL forward migrations restore missing modeled tables/keys/indexes, and both providers enforce active-city-batch integrity. The PostgreSQL chain now has 31 migrations; SQLite has 17 migration directories.

## Verification evidence

Final candidate: 173 changed application/schema/config/test files; manifest SHA-256 `0ca436290e09a6bfe7e84edbf1ce78bd08e9b0f04a02c3960dcc74b7909bbc3f` in `astra-correction-candidate-manifest.json`. Both build snapshots differ from the current tree only by a later blank-line whitespace cleanup in `src/app/api/park/planner/route.ts`. Do not substitute the original defect-characterization suite for any verification below.

| Check | Recorded evidence |
| --- | --- |
| Standard regression suite | `astra-corrections-acceptance-suite.json`; final completed run **1,375/1,375**, 187 files, exit 0. |
| Lint/typecheck | Full lint passed with 0 errors and six pre-existing unused-disable warnings in scripts; typecheck passed. Latest edited PWA/provider/calling/mounted-test files also passed focused lint. |
| SQLite and PostgreSQL production builds | `astra-build-sqlite-results.json`, `astra-build-postgres-results.json`. Each uses a copied source tree, its own generated Prisma client and synthetic datasource settings; no `.env` is copied. Both final builds pass, exit 0: SQLite `.next/astra-build-sqlite-jZXjxE`, PostgreSQL `.next/astra-build-postgres-1YRZeR`. |
| Client privacy scans | Provider `astra-client-bundle-*-results.json`. Each final build: 689 distinct dataset identifiers checked across 388 public JS assets, zero matches, zero emitted source maps. |
| Real SQLite integrity | `astra-sqlite-db-acceptance.json`: **21/21**. Fresh schema-created synthetic database plus active-batch migration; not a full historical SQLite migration replay. |
| Native PostgreSQL integrity | `astra-native-postgres-db-acceptance.json`: **21/21**. PostgreSQL 18.6 in disposable WSL cluster; all 31 migrations, separate schema and connection pool allowing 16 connections. Actual application handlers/services, real audit and receipt rows; synthetic session identity. |
| PostgreSQL schema comparison | `astra-postgres-migration-results.json`: all 31 migrations; 729 modeled columns, 212 modeled indexes, modeled constraints and 44 enum values match in PGlite. Native replay is additionally exercised above. |
| Native upgrade preservation | `astra-native-upgrade-results.json`: original 24 migrations upgraded to all 31, preserving synthetic participant, attendance, exact-money payment and batch values; legacy city backfill and reset generation verified. |
| Native backup/restore | `astra-native-restore-results.json`: `pg_dump`/`pg_restore` into another empty disposable database; 328 tables, 185 synthetic rows and column catalogs match. Counts include test schemas and migration history. |
| Edge/IndexedDB/export checks | `astra-browser-corrections-results.json`: **7/7**, including 225 marks in 50/50/50/50/25 order, two tabs, account switch, malformed acknowledgement, retained conflict, legacy upgrade and hostile minutes text. Sync HTTP responses are synthetic fixtures for this layer. |
| Compiled PWA + actual HTTP + SQLite | `astra-pwa-session-results.json`: **11/11**, exit 0. Actual login/forced reset/reauthentication/sign-out; revoked/inactive/deleted/missing-scope sessions disappear without reload; revoked menu capability disappears and API denies; lost payment acknowledgement recovers its original receipt after reload; page-two profile edit preserves another profile and returns to selection; attendance HTTP write survives reload/replay without duplicate rows. |
| Targeted route/UI checks | 21 park boundary tests; 42 calling tests including 24 handler/helper boundaries; six mounted editor/payment/calling tests; full-suite profile, admissions, finance, audience, certificate and unavailable-workflow coverage. |

The first native audit-rollback test run failed because its test trigger used incorrect PostgreSQL dollar quoting. The fixture was corrected; all 21 native acceptance tests then passed. Early PWA reset requests from `127.0.0.1` were rejected by exact-origin protection because Next normalizes loopback request URLs to `localhost`; the fixture now uses `localhost`. No CSRF relaxation was made. Later browser fixture failures came from assuming profile sort order, short attendance IDs rejected by the transport schema, and a redundant seed violating the existing group/date event uniqueness constraint. The fixture now selects the actual page-two response and uses a unique event with valid UUIDs. No application validation was relaxed. Intermediate results and disposable directories remain available.

`git diff --check` passes, exit 0; only line-ending warnings remain. The complete per-item package/path/test index is in `IMPLEMENTATION_STATUS.md`. Source changes were complete before the final standard suite; subsequent work corrected synthetic browser fixtures and documentation only.

## Explicitly unfinished workflows

Staff provisioning; guardian consent/emergency/leave workflows; Islah and community persistence; point awards/corrections; import application; certificate issuance/reissue; procurement receipt/fulfillment; and custom report scheduling/notification delivery remain unavailable where their required business rules or lifecycle approvals are missing. Their gates are implemented and tested. Their product workflows are **not complete**.

Historical deployed dataset artifacts, CDN caches and installed service-worker caches were not changed or inspected. Local clean bundle evidence does not remediate a previous deployment. This task did not authorize deployment or live-account operations.

## Evidence limits and recovery

- No production/staging database, account, deployment or merge was touched. Synthetic login fixtures bypass account provisioning; they do not approve that lifecycle.
- Browser evidence covers selected real flows and targeted failure modes, not every role/device/screen combination. Some route tests mock database responses; use the provider integrity suites for transaction/concurrency claims.
- SQLite does not have an initial migration baseline in this checkout. Do not claim a fresh full-chain replay. PostgreSQL native acceptance uses a clean migration-managed database. An existing database with separately created tables needs an approved read-only schema/data reconciliation before rollout; do not blindly mark migrations applied.
- Invalid/duplicate existing hierarchy must fail preflight. Do not silently reassign participants, deactivate batches or rewrite financial history. Preserve durable operation receipts and reset/version data during rollback planning.
- Native restore rehearsal demonstrates recovery of these synthetic fixtures only. Operational rollout still needs an approved backup, reconciliation, migration and recovery procedure, plus independent candidate review.
- Notification delivery remains a queued service; these checks do not establish exactly-once external delivery.

## Reproduction

Use `npm run lint`, `npm run typecheck` and `npx vitest run --maxWorkers=1 --no-file-parallelism --reporter=json --outputFile=docs/reviews/v2-audit-2026-09-08/astra-corrections-acceptance-suite.json`. `build-candidate.mjs sqlite` and `build-candidate.mjs postgres` generate isolated provider candidates. `scan-client-bundles.mjs <provider>` checks their emitted public assets without printing private dataset values.

`verify-browser-corrections.mjs` uses isolated headless Edge and actual IndexedDB/Web Locks with synthetic sync acknowledgements. `verify-pwa-session.mjs` uses the last successful SQLite build and a newly created synthetic database.

For standalone database integrity use `npx vitest run --config docs/reviews/v2-audit-2026-09-08/astra-corrections.vitest.config.mts --reporter=json --outputFile=<new-result-path>`. The normal correction DB config selects SQLite. Setting `ASTRA_DISPOSABLE_POSTGRES=1` selects only the hard-coded disposable loopback PostgreSQL endpoint and a fresh schema. `start-disposable-postgres.sh`, `verify-native-upgrade.mjs`, `rehearse-native-restore.sh` and `verify-native-restore.mjs` describe the native fixture procedure. Downloaded Ubuntu runtime packages were extracted under `.next/astra-native-postgres`; no system package or service was installed. `stop-disposable-postgres.sh` stopped only that verified disposable cluster after testing (`astra-native-stop-results.json`); its data and evidence are retained.
