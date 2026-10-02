# C1 main/v2 comparison

2026-09-12. **Outcome: DISPOSITION ASSESSMENT COMPLETE — CHANGES REQUIRED BEFORE INTEGRATION ACCEPTANCE.** All pinned comparison subjects have a reconciliation decision. Application integration, fix verification and release approval remain unfinished. No application or UI code was changed.

Published main is `dedb91a640ea244ce9323cd1dcde2a40d74bb718`; v2 HEAD is `401ff322726c3ceab9b05db776b2b076e63bbaf5` plus the immutable C0 working-file overlay. Both remote refs were freshly rechecked on 2026-09-12 and match. Original local main alone is not the comparison baseline. C0 recovery copies, original dirty work/index and the clean main-based integration worktree are preserved.

## Coverage and decision

| Subject | Dispositions recorded | Unassessed in ledger |
| --- | ---: | ---: |
| Main-only paths | 108 / 108 | 0 |
| Changed shared paths | 233 / 233 | 0 |
| Patch-unique main commits | 171 / 171 | 0 |
| MP registers | 14 / 14 | 0 |
| Catalogue requirements | 35 / 35 | 0 |

Keep v2's established mobile design and stronger current identity, hierarchy, offline receipts, version/reset and transactional financial protections. Recover useful main Media Briefs, entity search, account linking, historical attendance/staff/calendar, event-fee/cancellation/check-in and operational context/picker behavior selectively. Both branches have defects; a whole-side conflict resolution would lose useful behavior or restore unsafe behavior.

[C1_WORKFLOW_ASSESSMENT.md](C1_WORKFLOW_ASSESSMENT.md) is the substantive workflow decision record. [Path ledger](C1_PATH_REVIEW.md), [commit ledger](C1_COMMIT_REVIEW.md) and [requirement verdicts](C1_REQUIREMENT_REVIEW.md) account for each pinned subject. [Coverage JSON](C1_COVERAGE.json) and [independent inventory validator output](C1_COVERAGE_CHECK.json) make missing/duplicate dispositions detectable. Actual source/patch identities and line anchors are in C1_SOURCE_INDEX.json and C1_PATCH_INDEX.json.

The ledger's completion means reconciliation dispositions at the documented evidence levels. It does not mean every historical line has received exhaustive manual review, every inherited test was executed, or every behavior is equivalent. No replacement is labelled verified-equivalent; every integrationVerified flag remains false. Commit preservation records retain history and intended behavior for adaptation, not a recommendation to cherry-pick all historical patches. The coverage validator checks bookkeeping, not application correctness.

## Findings and checks

[C1_FINDINGS.md](C1_FINDINGS.md) records **27 open findings: 10 High and 17 Medium**. High findings include foreign event participants, capacity/safety/fee trust, incompatible data history, main Media capability bypass, missing SQLite baseline, Mashwara scope, conversion races, calling template ownership and audit privacy. Existing notification, parks and inventory baseline findings also remain open.

Paired checks total **76 passed, 0 failed**: event/Media 34, attendance 16, workflow/parser/privacy 26. These execute actual selected routes/helpers with synthetic boundaries; most intentionally characterize defects. Native SQLite migration replay gives main 9/9 with all 55 modeled tables/columns; v2 fails at migration 6 (`batch_settings` missing). A collector exit 0 does not turn v2 replay into a pass.

[C1_BROWSER_CHECK.md](C1_BROWSER_CHECK.md) records actual mobile Events component behavior with synthetic session/API: real-array, empty and denied responses show sample events labelled DB Live. Functional preview only; no production auth, stylesheet parity, operational data or provider delivery was tested. Verification commands/exits and source/harness identities are in C1_VERIFICATION.json.

## Data, policy and next task

[C1_DATA_MAPPING.md](C1_DATA_MAPPING.md) and C1_SCHEMA_DIFF.json map both schemas' changed blocks, relations and migration checksums. Preserve all five main-only models and v2-only models, nullable main placement, staff event ownership, registrations/payments/consent provenance, snapshots and batch-local exceptions through an additive mapping. No native populated upgrade, PostgreSQL engine replay or live migration was performed in C1.

Owner-dependent lifecycle decisions stay explicit: consent/medical verification, event refund/cancellation, absence-week reset versus pause, and team oversight. General messaging/community, training, external delivery and optional display modes remain unfinished. These holds do not block the independent foundation correction.

**Next single ready task: [C2-01 — Foundation protection corrections](../tasks/C2-01.md)**, covering audit privacy, secret-response cache headers and deterministic test isolation. It is prepared, not implemented or dispatched. Its bounded verification prerequisite precedes the normal main/v2 merge; both Git histories remain mandatory. Later serial packets cover capabilities/data, attendance, events/finance, operational parity and performance, followed by independent combined-candidate review, separately authorized merge and canonical documentation. Production Git trigger and operational schema/history checks remain pre-merge requirements.

## Event contract comparison

| Operation | Main | v2 working candidate | Required disposition |
| --- | --- | --- | --- |
| Read registrations | GET `/api/admin/events/[id]/registrations`, `events.view`, city access; `{data}` with ledger-derived fee view | GET `/api/events/[id]/registrations`, `organisation.view`, city access; `{event,counts,registrations}`, participant phone and client-stored fee status | One accepted minimal scoped contract and bounded paging; consumers must match. Source/empty-read test, not full fee computation verification |
| Create registration | POST admin path, strict `{participantId}`, `events.manage`, active participant filtered by batch park city, 409 duplicate/full, transaction for fee schedule/registration/audit | POST nonadmin path, `organisation.manage`, accepts payment/safety flags and `action`, active participant ID only, upsert/waitlist | Adapt strict authoritative target scope, ledger/provenance, atomic capacity and durable retry. Fix F01–F03/F07–F09 |
| Find eligible participants | GET admin `eligible-participants?q`, 2–80 chars, max 20; ID/name/group projection | No matching registration picker endpoint | Retain bounded picker using canonical hierarchy. Source reviewed; runtime picker/role checks pending |
| Cancel/consent | PATCH admin registration; `cancel:true` or consentStatus; cancellation timestamp and transactional audit | No equivalent explicit lifecycle route | Preserve history; implement CAS and approved cancellation/safeguarding policy. A boolean is not verified consent |
| Check-in | POST admin registration `check-in`, explicit attendance status; links to existing regular session and registration | `action=check_in` on create; sets registration timestamp/status only | Preserve main projection intent through v2's durable attendance protocol; do not copy its unversioned upsert |
| UI | Main detail has search, registration, fee summary, cancellation and check-in actions (`main:src/app/admin/events/[id]/_client.tsx:118–137,193–210,460–477`) | Default PWA event component mounts, but reads wrong envelope and falls back to sample events (`v2:src/components/modules/admin/mobile-events-page.tsx:53–66`) | Keep existing mobile design; restore working behavior after contract. Source-only UI comparison; no browser parity claim |

Both lists lack proper pagination and use different capabilities; do not mechanically choose either contract. Required IDs need explicit maximum lengths. Native concurrency, real session/capability resolution, transaction rollback and role-bound browser checks remain C2 acceptance requirements.

