# C1 catalogue requirement verdicts

All R01–R35 are assessed for consolidation. Existing BASE-01 source/worksheet/screen evidence is tied to the unchanged working candidate; its tests are historical baseline evidence, not a new C1 run. This is not a module-completion list. Original acceptance and dependencies remain mandatory. General messaging, community, safeguarding and training remain unfinished; their gates do not block unrelated local corrections.

## R01 Public Website

**preserve** | MP14

Authority/actor: B; public

Verified baseline source and incompleteness: `src/app/page.tsx`, PWA entry; programme/public-content presentation exists. **Partial:** approved public programme content and public admission boundaries need reconciliation.

Consolidation verdict, not product completion. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5.

Required acceptance/dependencies: Verify real public entry, contact/admission destinations and no private projections. Depends R07 for admissions entry.

## R02 Authentication

**adapt into v2** | MP13

Authority/actor: B; all authorized identities

Verified baseline source and incompleteness: `src/lib/auth.ts`, API `auth/reset-password`, `src/components/pwa/pwa-app.tsx`; User/LoginAttemptWindow. **Existing foundation:** reset/revocation/rate limits; prior mounted PWA evidence reusable only within its cases.

Consolidation verdict, not product completion. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.

Required acceptance/dependencies: Wrong credentials, forced reset, inactive account, token/role change, logout/account cache separation. No extra dependency.

## R03 Access Provisioning

**adapt into v2** | MP07, MP13

Authority/actor: B, W2/W5, MP07; HQ/city within assignment

Verified baseline source and incompleteness: API `admin/invite`, `admin/users/[id]`, `park/structure`; User/StaffMeta/Guardian. **Partial/gated:** park staff creation is explicitly unavailable; main account routes need equivalence review.

Consolidation verdict, not product completion. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.

Required acceptance/dependencies: Create/link/reset/deactivate intended identity; duplicate/retry, cross-city denial, no persisted invite secrets. Depends R02,R04,R06.

## R04 Organisation Setup

**adapt into v2** | MP13, MP14

Authority/actor: B, S211600–211724,W2/W6; HQ/city/park

Verified baseline source and incompleteness: API `admin/cities`, `admin/parks`, `admin/batches`, `admin/groups`; City/Park/Batch/Group; `park/mobile-parks-page.tsx`. **Defective UI integration:** reference-data fallback and failed-save closure; existing authoritative routes differ from UI POST `/api/park`.

Consolidation verdict, not product completion. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5. Existing Gemini/Astra parks and inventory sample/failed-save findings remain open; preserve layout while binding truthful persistence.

Required acceptance/dependencies: Real zero/error states; correct create route and retained failed input; same-city placement and one-active-batch invariant. Depends R02.

## R05 Teams, Roles and Assignments

**adapt into v2** | MP10

Authority/actor: B,S212205–212350,MP10; scoped staff

Verified baseline source and incompleteness: API `admin/teams`, `admin/collaboration-teams`, team chat/documents; CollaborationTeam/StaffTeamMembership/StaffMeta. **Partial:** current persisted teams do not settle all assignment history or replacement routes.

Consolidation verdict, not product completion. Unify overlapping team contracts without widening grants; preserve dedicated capability/ended-membership intent, v2 conditional writes and valid active same-team assignments/content links.

Required acceptance/dependencies: Membership lifecycle, lead/assistant rights, revoked access and history; team membership never expands hierarchy. Depends R03,R04,R06.

## R06 Members and Profiles

**adapt into v2** | MP06, MP07

Authority/actor: B,W2/W5,S212205,MP06/07; scoped staff, self/linked family

Verified baseline source and incompleteness: API `admin/people`, `admin/students/[id]/profile`, `me/profile`, `guardian/children/[participantId]/profile`; Participant/StudentExtendedProfile/GuardianChild. **Existing foundation/partial:** CAS/projections exist; main server search absent.

Consolidation verdict, not product completion. Restore bounded entity search with canonical hierarchy and minimal projections; navigation filtering is not equivalent to server people search. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection.

Required acceptance/dependencies: Selected-person identity, stale writes, private-field projection, guardian link and invalidated scope; reconcile search/account parity. Depends R02,R04.

## R07 Admissions and Onboarding

**adapt into v2** | MP07

Authority/actor: B,W3/W5; admissions-capable HQ/city

Verified baseline source and incompleteness: API `admin/admissions`, `[id]/interviews`, `[id]/convert`; AdmissionApplication/AdmissionInterview; admin admissions UI. **Partial:** persisted flow exists; source import and lifecycle criteria need mapping. July data-loss claim is historical, not current verdict.

Consolidation verdict, not product completion. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection.

Required acceptance/dependencies: Interview preservation, conversion retry/rollback, scoped placement and source reconciliation. Depends R03,R04,R06,R09.

## R08 Safeguarding and Consent

**intentionally gated** | MP02, MP07

Authority/actor: B,W5; restricted staff/linked guardian

Verified baseline source and incompleteness: API `guardian/consents`, `guardian/emergency-info`, `guardian/leave-requests` are explicit unavailable gates. **Gated/missing lifecycle.** Event boolean flags are not verified consent.

Consolidation verdict, not product completion. Recover main registration/fee/cancellation/check-in intent through canonical scope, authoritative ledger/consent provenance and v2 durable attendance; repair capacity, retry and lifecycle defects. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection. Owner must approve lifecycle/actors/privacy criteria before enablement; missing behavior remains explicitly unfinished.

Required acceptance/dependencies: Approved consent version, actor, expiry/revocation, emergency/medical minimization and audit before enablement. Depends R02,R06; product policy needed.

## R09 Grouping and Placement

**adapt into v2** | MP04, MP07

Authority/actor: B,W2/W5/W6; scoped city/park staff

Verified baseline source and incompleteness: API `admin/groups`, admission convert, `park/structure`; Group/Participant. **Partial:** manual linked assignment exists; automatic suggestions and history parity unverified.

Consolidation verdict, not product completion. Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection.

Required acceptance/dependencies: Capacity/age/class rules, override reason, same-city batch/group, transfer history and old attendance preservation. Depends R04,R06.

## R10 Attendance

**adapt into v2** | MP03, MP04, MP05

Authority/actor: B,W6,S211804/212033/212138,MP03–05; scoped park/group staff

Verified baseline source and incompleteness: API `park/attendance/prepare`, `[eventId]`, `sync`, `park/staff-attendance`; AttendanceEvent/Record and StaffAttendanceEvent/Record; mobile attendance. **Existing foundation/partial:** robust v2 writes; main historical/staff event semantics differ.

Consolidation verdict, not product completion. Preserve batch-local exclusions and v2 city closures/extra classes as distinct scopes; reconcile one PKT date policy and retain stored decisions. Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy. Preserve both staff-record/event identities; adapt normal-session history into an explicit mapping with park staff events and closed/correction protection.

Required acceptance/dependencies: Class/staff calendars, historical denominator, reset/close/correction, concurrent versioned writes and wrong-group denial. Depends R04,R06,R09,R14.

## R11 Offline Attendance Sync

**adapt into v2** | MP04, MP13

Authority/actor: B,S attendance,MP03–05; same actor/record authority as R10

Verified baseline source and incompleteness: API `park/attendance/sync`, `sync/process`; OperationReceipt, Dexie client queue, `park/offline-queue-panel.tsx`. **Existing foundation:** durable receipts and conflict UI; actual integration parity still required.

Consolidation verdict, not product completion. Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.

Required acceptance/dependencies: Lost ack/reload, two tabs, account switch, stale versions, no erased failed records; retain 200+ mark evidence scope. Depends R02,R10.

## R12 Content Planner

**adapt into v2** | MP11

Authority/actor: B,W1,S212418–212643,MP11; content-capable HQ/city/park

Verified baseline source and incompleteness: API `admin/content-planner/plans`, sessions/blocks; ContentPlan/Session/Block/Resource; mobile planner and ParkLesson UI. **Partial:** persisted planner exists, unlike old catalogue “missing”; parallel park lesson semantics need reconciliation.

Consolidation verdict, not product completion. Retain v2 planner presentation and scope/version controls; recover permissions, source label/rich-text/link fidelity and consistent off-day/scoped-create behavior.

Required acceptance/dependencies: Category mapping, version/publish/audience controls, dated session import and safe resources; no duplicate overlapping plans. Depends R04,R14.

## R13 Murabbi Training

**intentionally gated** | MP05, MP11

Authority/actor: B,W4; programme/city trainers and assigned staff

Verified baseline source and incompleteness: ContentPlan and staff attendance are possible foundations; no dedicated Training/Completion schema model found. **Missing as complete lifecycle.**

Consolidation verdict, not product completion. Preserve both staff-record/event identities; adapt normal-session history into an explicit mapping with park staff events and closed/correction protection. Retain v2 planner presentation and scope/version controls; recover permissions, source label/rich-text/link fidelity and consistent off-day/scoped-create behavior. Owner must approve lifecycle/actors/privacy criteria before enablement; missing behavior remains explicitly unfinished.

Required acceptance/dependencies: Distinguish planned 16-day curriculum from enrolment, attendance, completion and safeguarding clearance; approved actors/criteria. Depends R05,R12,R14.

## R14 Calendar and Batch Planner

**adapt into v2** | MP03

Authority/actor: B,W1/W4/W6,S212752/212800,MP03; scoped staff/readers

Verified baseline source and incompleteness: API `admin/operational-calendar`, `admin/batches/[id]/attendance-schedule`, `park/planner`; BatchClassDate/OperationalOffDate/ParkRoutineSlot/EventPlannerItem. **Partial:** several real schedule paths, equivalence unverified.

Consolidation verdict, not product completion. Preserve batch-local exclusions and v2 city closures/extra classes as distinct scopes; reconcile one PKT date policy and retain stored decisions.

Required acceptance/dependencies: One PKT date policy for weekdays, off-days, extras, recurring slots and planner/attendance consumers. Depends R04.

## R15 Events and Activities

**adapt into v2** | MP02

Authority/actor: B,W5,MP02; event-capable staff/eligible participants

Verified baseline source and incompleteness: API `admin/events`, `events/[id]/registrations`; Event/EventRegistration; admin/mobile event UI. **Defective/high-risk:** participant scope, fee/consent trust and concurrency concerns; incompatible main registrations.

Consolidation verdict, not product completion. Recover main registration/fee/cancellation/check-in intent through canonical scope, authoritative ledger/consent provenance and v2 durable attendance; repair capacity, retry and lifecycle defects.

Required acceptance/dependencies: Cross-city target denial, atomic capacity/waitlist, idempotent check-in, ledger-derived payment and approved consent. Depends R06,R08,R14,R18.

## R16 Responsibility Planner

**adapt into v2** | MP02, MP09, MP10

Authority/actor: B,MP09/10; scoped team/event staff

Verified baseline source and incompleteness: API `admin/events/[id]/responsibilities`, planner-items, `admin/mashwara`; EventResponsibility/EventPlannerItem/MashwaraActionItem. **Partial:** main Mashwara action-update and notification paths need adaptation.

Consolidation verdict, not product completion. Recover main registration/fee/cancellation/check-in intent through canonical scope, authoritative ledger/consent provenance and v2 durable attendance; repair capacity, retry and lifecycle defects. Recover scoped collection, action/update/share/context/notification behavior; retain canonical hierarchy, validate recipients/teams and commit required audit/outbox atomically. Unify overlapping team contracts without widening grants; preserve dedicated capability/ended-membership intent, v2 conditional writes and valid active same-team assignments/content links.

Required acceptance/dependencies: Assignee eligibility, deadlines/status/revoke, transactional audit and truthful queued notification. Depends R05,R14,R22.

## R17 Venue Management

**preserve** | MP14

Authority/actor: B; HQ/city/park

Verified baseline source and incompleteness: Park model, API `admin/parks`; parks UI. **Partial:** basic venue information, no independent complete venue availability/permission/hazard lifecycle.

Consolidation verdict, not product completion. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5.

Required acceptance/dependencies: Primary/backup availability and responsible contact with restricted hazard/emergency details; no invented venue approval. Depends R04,R08.

## R18 Finance

**adapt into v2** | MP02, MP13

Authority/actor: B,W5,MP02; authorized collectors/HQ/city

Verified baseline source and incompleteness: API `admin/fees`, payments, `admin/finance/*`; FeeEvent/Payment/ReceiptSequence/FinancialAdjustment/FeeDonation. **Existing foundation/partial:** exact money/retries; event-fee bridge and source reconciliation open.

Consolidation verdict, not product completion. Recover main registration/fee/cancellation/check-in intent through canonical scope, authoritative ledger/consent provenance and v2 durable attendance; repair capacity, retry and lifecycle defects. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.

Required acceptance/dependencies: Payment/refund/waiver policy, exact totals, duplicate receipts, concurrent retry and audit rollback; source payment fields stay unposted until reconciled. Depends R02,R04,R06.

## R19 Procurement

**preserve** | MP13

Authority/actor: B; organization-capable scoped staff

Verified baseline source and incompleteness: API `admin/procurement/requests`, orders; StockRequest/PurchaseOrder; admin/mobile procurement. **Partial:** orders/requests exist; receipt/fulfilment lifecycle unfinished.

Consolidation verdict, not product completion. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.

Required acceptance/dependencies: State transitions, stale version denial, approval scope; receiving never claims stock posted without transaction evidence. Depends R04,R18,R20.

## R20 Inventory

**adapt into v2** | MP13, MP14

Authority/actor: B,S211823–211928; authorized HQ/city/park

Verified baseline source and incompleteness: API `inventory/central`, `admin/procurement/stock`, transfers/items; ProcurementItem/ParkStock/StockTransfer/StockAuditLog. **Defective mobile surface:** central ignores API data; local samples/additions/export not durable.

Consolidation verdict, not product completion. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5. Existing Gemini/Astra parks and inventory sample/failed-save findings remain open; preserve layout while binding truthful persistence.

Required acceptance/dependencies: Bind approved API response, real empty/error, persisted add/transfer/count/export, CAS and no negative/duplicate stock. Depends R04; preserve API integrity while fixing UI.

## R21 Announcements

**adapt into v2** | MP09, MP13

Authority/actor: B,MP communication; scoped publishers/readers

Verified baseline source and incompleteness: API `announcements`, root/feed notifications; Announcement; mobile broadcast/bell. **Defective:** role serialization/enum and scope gaps.

Consolidation verdict, not product completion. Recover scoped collection, action/update/share/context/notification behavior; retain canonical hierarchy, validate recipients/teams and commit required audit/outbox atomically. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately. Existing notification audience/read/cache/outbox defects remain open in ASTRA_DEEPSEEK_REVIEW.md; no provider delivery verified.

Required acceptance/dependencies: Precise valid audiences, deny malformed/missing scope, expiry and pagination-before-limit; explicit global-publishing authority. Depends R02,R04.

## R22 Notifications

**adapt into v2** | MP09, MP13

Authority/actor: B; recipients and authorized operators

Verified baseline source and incompleteness: API `notifications/*`, `admin/notifications/queue`; Announcement/Notification/AuditLog identities; bell/mobile/history. **Defective in-app; external delivery unfinished.** See Astra/DeepSeek review.

Consolidation verdict, not product completion. Recover scoped collection, action/update/share/context/notification behavior; retain canonical hierarchy, validate recipients/teams and commit required audit/outbox atomically. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately. Existing notification audience/read/cache/outbox defects remain open in ASTRA_DEEPSEEK_REVIEW.md; no provider delivery verified.

Required acceptance/dependencies: Durable per-user receipts, correct query cache/methods, mark-all future item, idempotent outbox, accurate queued/sent/read distinction. Depends R02,R04,R21; provider policy only blocks external delivery.

## R23 Messaging

**intentionally gated** | MP10

Authority/actor: B; approved scoped role pairs

Verified baseline source and incompleteness: TeamChatMessage and API `admin/teams/[id]/chat` exist. No generic Conversation/Message membership family found in schema/route inventory. **Missing general messenger; team chat is not equivalent.**

Consolidation verdict, not product completion. Unify overlapping team contracts without widening grants; preserve dedicated capability/ended-membership intent, v2 conditional writes and valid active same-team assignments/content links. Owner must approve lifecycle/actors/privacy criteria before enablement; missing behavior remains explicitly unfinished.

Required acceptance/dependencies: Approve role pairs, member scope, reporting/moderation, attachments and retention before enablement. Depends R05,R08,R22.

## R24 Community

**intentionally gated** | MP14

Authority/actor: B; approved community roles

Verified baseline source and incompleteness: API `community/posts`, polls are unavailable gates; admin/mobile community shells. **Gated:** no persisted general post/comment lifecycle found.

Consolidation verdict, not product completion. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5. Owner must approve lifecycle/actors/privacy criteria before enablement; missing behavior remains explicitly unfinished.

Required acceptance/dependencies: Moderation, visibility, report/block, media consent and truthful save behavior. Depends R05,R08,R22.

## R25 Online Resources

**preserve** | MP11, MP14

Authority/actor: B; public versus approved role audiences

Verified baseline source and incompleteness: API `resources`, `knowledge`, `admin/resources`, `admin/knowledge`; DigitalResource/KnowledgeArticle. **Partial:** content records/read paths exist; full course/progress/publication lifecycle unverified.

Consolidation verdict, not product completion. Retain v2 planner presentation and scope/version controls; recover permissions, source label/rich-text/link fidelity and consistent off-day/scoped-create behavior. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5.

Required acceptance/dependencies: Publication/audience/version controls, private-link policy, search and real role-specific visibility. Depends R02,R12.

## R26 Program Head Portal

**adapt into v2** | MP12, MP14

Authority/actor: B,S211139/212942/212949; HQ

Verified baseline source and incompleteness: API `admin/dashboard`, `admin/home-analytics`; admin dashboard/mobile home/PWA navigation. **Partial:** existing metrics/tools, not evidence every linked module works.

Consolidation verdict, not product completion. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5.

Required acceptance/dependencies: KPI definitions, empty/error data, capability changes/direct entry, no sample counts; links use accepted modules. Depends R02,R04,R32.

## R27 City Operations Portal

**adapt into v2** | MP12

Authority/actor: B; assigned city

Verified baseline source and incompleteness: API `city-head/dashboard`; city-head desktop/mobile dashboards. **Partial:** core foundation, child workflow gaps.

Consolidation verdict, not product completion. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.

Required acceptance/dependencies: No cross-city aggregates/links, unassigned denial, lifecycle workflows from accepted modules. Depends R04,R32.

## R28 Park Operations Portal

**adapt into v2** | MP04, MP12

Authority/actor: B,S park-detail; assigned park

Verified baseline source and incompleteness: API `park/dashboard`, roster; park dashboard/detail tabs/mobile attendance. **Partial/defective:** inherited parks/inventory issues, child states need verification.

Consolidation verdict, not product completion. Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.

Required acceptance/dependencies: Correct park/group scope on each tab; offline/failed states not hidden by samples. Depends R04,R10,R11,R20.

## R29 Murabbi Portal

**adapt into v2** | MP04, MP05, MP11

Authority/actor: B,W4/W6; assigned group/park

Verified baseline source and incompleteness: API `murabbi/dashboard`, groups; murabbi mobile/desktop dashboards. **Partial:** assigned group foundation; training/content/follow-up incomplete.

Consolidation verdict, not product completion. Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy. Preserve both staff-record/event identities; adapt normal-session history into an explicit mapping with park staff events and closed/correction protection. Retain v2 planner presentation and scope/version controls; recover permissions, source label/rich-text/link fidelity and consistent off-day/scoped-create behavior.

Required acceptance/dependencies: Missing-group denial, current assignments, historic records and intended attendance actions. Depends R05,R10,R12,R13.

## R30 Guardian Portal

**adapt into v2** | MP07, MP12

Authority/actor: B,W2/W5; linked children

Verified baseline source and incompleteness: API `guardian/dashboard`, fees, schedule, attendance-history; GuardianChild; guardian dashboards. **Partial:** linked tracking exists; consent/emergency/leave gates remain.

Consolidation verdict, not product completion. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.

Required acceptance/dependencies: Foreign-child denial, link removal, minimum projections, truthful gated consent and approved financial actions. Depends R02,R06,R08,R18.

## R31 Shabab Portal

**adapt into v2** | MP07, MP12

Authority/actor: B; self participant

Verified baseline source and incompleteness: API `student/dashboard`, schedule, fees, attendance-history; student dashboards/profile. **Partial:** own tracking, deferred community/messaging.

Consolidation verdict, not product completion. Retain v2 scoped versioned profiles/admissions and current identity; recover link-existing/reset capability and null-safe data while fixing conversion CAS and secret response protection. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.

Required acceptance/dependencies: Identity selection, inaccessible foreign profile, own data only and clear unavailable modules. Depends R02,R06,R10.

## R32 Dashboards and Exception Boards

**adapt into v2** | MP12

Authority/actor: B,S211139/212811/212949,MP12; role-scoped staff

Verified baseline source and incompleteness: API `admin/home-analytics`, role dashboards; operational models/analytics helpers. **Partial:** aggregation exists; KPI completeness, placeholders and historical denominators open.

Consolidation verdict, not product completion. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.

Required acceptance/dependencies: Source-derived numerator/denominator, unassigned/cross-scope exclusion, bounded queries and actionable actual exceptions. Depends R04,R07,R10,R18,R22.

## R33 Reports and Exports

**adapt into v2** | MP04, MP12

Authority/actor: B,W3/W6,MP04/12; report-capable scoped staff

Verified baseline source and incompleteness: API `admin/reports/*`, `calling/export`; ReportPreset plus operational data; report UI. **Partial/defective scale:** main bounded report pagination absent; scheduled reports unfinished.

Consolidation verdict, not product completion. Preserve v2 receipt/version/reset/account isolation and main historical roster/summary intent; reconcile mutable snapshots, transfers, nullable placement and explicitly unresolved dropout policy. Recover bounded projections, grouped counts and partial-print disclosure with v2 scope/discount rules; require measured large-fixture performance and historical/null-safe correctness.

Required acceptance/dependencies: Stable pagination, complete/partial export disclosure, Unicode, correct sums/history, role scope and measured large-fixture query cost. Depends R07,R10,R18,R20.

## R34 Audit Log

**adapt into v2** | MP13

Authority/actor: B; audit-capable HQ with scoped mutations

Verified baseline source and incompleteness: API `admin/audit-log`, `src/lib/audit.ts`; AuditLog. **Existing foundation/partial:** redaction and many transactional mutations; event/outbox atomicity gaps remain.

Consolidation verdict, not product completion. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately.

Required acceptance/dependencies: No secret/private duplicate values; atomic mutation/audit rollback; allowed viewer projection and retention policy. Depends R02.

## R35 System Settings

**preserve** | MP13, MP14

Authority/actor: B and latest mobile-default decision; capability-controlled operators

Verified baseline source and incompleteness: API `admin/settings/external-links`, `admin/access/*`, `admin/security/domain-allowlist`; override/link policy models, settings UI. **Partial:** persisted subsets; optional desktop/tablet settings are deferred, not implemented.

Consolidation verdict, not product completion. Keep v2 identity/offline/financial foundations; restore main redaction/cache/test isolation and useful provider checks; reconcile capabilities, additive schemas and supported lock/runtime deliberately. Preserve current owner-approved UI/provider/repository workflow and both histories; retain historical docs/tests as evidence, recover safe failure/direct-entry behavior, rebuild current docs only at C5.

Required acceptance/dependencies: Bounded options, audit/capability changes, settings never widen hierarchy; future display choice defaults mobile and preserves data. Depends R02,R04.
