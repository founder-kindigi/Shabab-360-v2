# Shabab 360 current memory

Last verified: 2026-09-10. Treat this as a concise baseline, not release approval.

## Authority and working state

- Follow AGENTS.md, the owner decisions, docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md and both Shabab skills. Current code and fresh evidence outrank historical completion claims.
- The working branch is v2, based on a25260321abe28673db4337bdc2074b55ee0d836. The candidate is a large uncommitted working tree. Preserve audit evidence and unrelated changes; do not reset or bulk-stage it.
- The original independent ASTRA_REVIEW.md in docs/reviews/v2-audit-2026-09-08/ has outcome CHANGES REQUIRED for the earlier Terra candidate. The owner subsequently authorized Astra to implement corrections directly. ASTRA_CORRECTION_HANDOFF.md and IMPLEMENTATION_STATUS.md describe that implementation pass; it is not independent review or release approval.
- No deployment, merge to main, live database migration or real-account change was authorized for this remediation. No such action occurred. Historical deployment claims in the archived memory do not describe this candidate.

## Verified application baseline

- Next.js 16 / React 19, TypeScript, NextAuth credentials, Prisma, TanStack Query and Dexie. SQLite is the local schema; PostgreSQL is staged separately. Both schemas have 74 models; migration directories: SQLite 17, PostgreSQL 31. Do not edit generated clients.
- Authorization is server enforced and capability grants never widen hierarchy scope. Missing assignments deny. Group.parkId is authoritative, with fallback to the batch park only for null legacy group parks; linked city inconsistencies deny.
- Credentials use exact normalized email; durable throttling and current identity/token-version revalidation deny inactive/revoked accounts. PWA session polling, forced reset and authority-change cache clearing are intentional.
- Attendance uses owner-bound durable receipts, server record versions and event reset generations. Offline work remains partitioned by account; legacy/failed/conflicted marks are retained. Shared Web Locks serialize sync across tabs. No invented acknowledgements or unconditional last-write-wins.
- Financial/stock writes use exact money, transaction/audit integrity and retry identities. Fees retain unacknowledged attempts. Transfers lock parks and guard balances. Absolute stock edits require a version. One active batch per city is enforced by provider-specific database constraints.
- Profiles use explicit target identity, versioned changed-field writes and redacted audit. Server permissions are resolved before committing a save response. Returning to profile selection clears the prior target.
- Runtime dataset imports were removed. Local clean bundle scans do not address historical deployed artifacts or installed service-worker caches.

## Evidence and limits

- Latest standard suite: 1,375/1,375 tests in 187 files. Lint: zero errors, six pre-existing script warnings. Typecheck and isolated SQLite/PostgreSQL production builds pass. See the correction manifest for precise source hashes and the single later whitespace-only edit.
- SQLite and native PostgreSQL integrity suites: 21/21 each. Native PostgreSQL 18.6 uses a disposable WSL cluster, not an operational database. Full 31-migration replay, synthetic 24-to-31 upgrade preservation and dump/restore rehearsal pass. Native restore compares 328 test tables and 185 synthetic rows.
- PGlite comparison covers 729 modeled columns, 212 indexes, constraints and 44 enum values. SQLite lacks an initial migration baseline; do not claim full historical-chain replay. Existing operational PostgreSQL tables created outside migrations still need approved read-only reconciliation before rollout.
- Seven real Edge/IndexedDB/export checks pass. Exact compiled-PWA browser results and limitations are in astra-pwa-session-results.json and the correction handoff; do not infer untested role/device coverage.

## Explicitly unfinished

Staff provisioning, safeguarding consent/emergency/leave, Islah/community persistence, point awards, import application, certificate issuance/reissue, procurement receipt/fulfillment, and custom-report scheduling/notification delivery remain gated where business lifecycle approval is missing. Tested gates do not mean those workflows are finished. No external notification-delivery guarantee is established.

Before any rollout: independent candidate review, owner workflow decisions, approved operational schema/data reconciliation, backup and recovery procedure, and separately authorized deployment. Preserve original audit characterizations; passing a defect reproduction is not fix verification.

Earlier verbose memory is preserved in docs/reviews/v2-audit-2026-09-08/PRE_CORRECTION_MEMORY.md. Keep this file concise; put future history in worklog.md or the relevant review document.
