# C1 main/v2 comparison — active assessment

2026-09-11. **Outcome: IN PROGRESS — NOT READY FOR C2 OR MERGE.** The first event/data/Media Briefs tranche is recorded below. C1 remains the sole active task; application code, original dirty work and isolated main worktree are preserved.

The two published refs were rechecked with `git ls-remote origin refs/heads/main refs/heads/v2`; both still match C0. Main worktree AGENTS was read and has the same preservation/security/verification requirements. Current owner decisions in the original checkout govern serial delivery, mobile design preservation and delegation; historical instructions do not override them.

## Coverage and meaning

[C1_COVERAGE.json](C1_COVERAGE.json) contains every pinned subject with source hashes or commit touched paths. [C1_COVERAGE_CHECK.json](C1_COVERAGE_CHECK.json) independently derives Git tree/patch-unique sets and checks coverage. Inventory is complete; semantic assessment is not.

| Subject | Inventoried | Assessed with disposition | Remaining |
| --- | ---: | ---: | ---: |
| Main-only paths | 108 | 10 | 98 |
| Changed shared paths | 233 | 3 | 230 |
| Patch-unique main commits | 171 | 7 | 164 |
| MP registers | 14 | 0 fully assessed | 14 |
| Catalogue requirements | 35 | 0 fully assessed in C1 | 35 |

The 10 assessed main-only paths are registration collection/lifecycle/check-in/eligible search, projection helper/test and media collection/detail/auth/schema. The three shared paths are both schemas and event-city scope helper. The seven commits were reviewed by actual full source patches, not their messages. None is labelled equivalent or implemented: the dispositions identify what C2 must adapt. A complete source/schema inventory must not erase the remaining route, UI, model or test assessment work.

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

## Current register progress

- **MP02 events:** initial handlers, contracts, lifecycle, UI action trace and seven patches assessed; remaining event team/responsibility/planner tests and role-bound runtime cases still open.
- **MP01 Media Briefs:** persisted versioned lifecycle confirmed; actual handler tests reproduce a capability bypass and discarded content link. Remaining assignee/context/UI/tests and full member scope assessment stay open.
- **MP03–MP05 attendance/calendar/staff:** both-provider data shapes compared; main summaries/off-day helpers read. Mutable snapshots, denominator semantics, automatic dropout defaults, date policy and staff-event mapping require the next paired comparisons.
- **MP06 search:** bounded server search source partly inspected; replacement is unverified. Complete entity projections and scope tests next in its turn.
- **MP07–MP14:** inventory and BASE-01 dispositions only, except initial schema/history work under MP13. No completion inferred from prior audit claims.

## Evidence and next work

[C1_FINDINGS.md](C1_FINDINGS.md) records 12 severity-ranked corrections/risks. [C1_DATA_MAPPING.md](C1_DATA_MAPPING.md) proposes preservation requirements for all changed model families; [C1_SCHEMA_DIFF.json](C1_SCHEMA_DIFF.json) stores exact field/constraint differences. [C1_SQLITE_HISTORY.json](C1_SQLITE_HISTORY.json) records native in-memory migration outcomes. [C1_VERIFICATION.json](C1_VERIFICATION.json) records commands, counts, candidate/harness identity and limits.

Continue this same task with historical attendance/off-days/staff, then finish Media Briefs/search/accounts/calling/Mashwara/teams/content/reports/foundation and all remaining path/commit/catalogue dispositions. Read only the relevant source/diffs; reuse the verified inventories and do not rebuild the recovery copies. Create one ready C2 foundation packet only when C1 acceptance is met. Production deployment-trigger and operational schema questions from C0 remain pre-merge requirements.
