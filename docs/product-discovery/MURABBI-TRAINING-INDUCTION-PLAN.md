# Shabab Murabbi Training induction — integration plan

Date: 2026-09-29. Status: proposed product plan, not an implementation contract or release approval.

## Owner clarification and implemented direction (2026-09-29)

The owner requires a portal builder for **any registration form**, with Murabbi Training induction as its first use case. Eligibility wording/rules, fee wording, form questions and applicant city choices are configurable per form. Lahore is the initial operational owning city, not a fixed applicant-city restriction. The initial Atfal-style field template includes every observed city option; a form editor may change its choices. Applicant city answers never grant staff access.

The reference's Start action was subsequently inspected. Its nine questions are: Full Name, Gender, Age, current role (Student/Professional/Both), WhatsApp Number, Emergency Contact Number, AlBurhan affiliation, City and Address. The city menu has 34 named options plus Other City, which reveals free text. No reference registration was submitted. Earlier statements below that the questions could not be inspected, or that the nine-field list is a transcription, are superseded by this observation. The proposed training-specific fields and endpoints below remain future induction-workflow ideas, not the generic builder contract.

The implemented generic foundation is `RegistrationForm` draft configuration, immutable published revisions and versioned submissions. It includes scoped create/edit/publish/close and private submission review APIs, plus public form-read and submit APIs. A public form is not yet publishable **through the portal UI** because that UI has not been implemented. Privacy and contact-consent copy must be supplied before publishing. No live form has been published, database migrated or deployed.

Owner request: adapt the linked Atfal registration experience for Shabab Murrabi Training induction. This document uses the app's established spelling, **Murabbi**; final public wording can follow the owner's preference.

## 1. Recommended outcome

Add **Murabbi Training → Induction** to Shabab, with a shareable public registration link for each training cohort and a scoped applicant-management workspace inside the app.

Journey: **Open cohort link → read programme details → answer a short guided form → review and submit → receive an application reference → staff review → enrol in training.** Successful training and appointment as a working Murabbi are subsequent, separately authorized outcomes.

Deliver registration and induction operations first. Extend to curriculum, training attendance and completion afterward. Do not create student participants, guardians, staff credentials or group assignments merely because someone submits or is accepted for training.

## 2. Reference evidence and adaptation

Reference: [Atfal training registration](https://atfal-alburhan.vercel.app/register/hf2c2bbchdxnc0epjxglifodvp3g00wq), inspected in the browser on 2026-09-29.

Observed: branded welcome card; a training/cohort heading; programme summary; six team labels including Murabbi; eligibility and registration-fee summary; a start button; a promise of nine questions, about two minutes, with no account required. Visually it uses a narrow cream card, gold accents, dark text, rounded team tiles and a prominent start action.

Inspection limit: the start action did not advance during this inspection. The actual nine questions, validation, later steps, payment handling and submission result were not verified. The form below is a Shabab proposal, not a transcription. No registration was submitted.

| Reference pattern | Proposed Shabab adaptation |
| --- | --- |
| Programme-specific share link | `/register/murabbi-training/[cohortSlug]`; one published intake per link |
| Programme welcome card | Shabab identity, cohort/city, dates, venue, commitment, eligibility, deadline and approved fee policy |
| Nine-question promise | Short, one-question-at-a-time form with progress, Back/Next and a review screen; finalize the count after field approval |
| Team tiles | Murabbi Training as the initial track; other departments are outside this request |
| No account needed | Public application; no password or staff access created during registration |
| Reference branding | Borrow the interaction pattern and clarity; use Shabab's established mobile typography, colours, spacing and components |

Do not inherit the reference's male/16+ eligibility or Rs. 1,000 fee as Shabab policy. These were visible on the external site only. Until Shabab eligibility is approved, publication remains unavailable. The initial implementation can omit payments, but must not publish a claim that training is free without that decision.

## 3. Current application fit

Reviewed source: `prisma/schema.prisma`, `src/app/api/admin/admissions/route.ts`, `src/lib/admissions/access.ts`, `src/lib/admissions/validation.ts`, `src/proxy.ts`, and `src/components/prototype/screens/murabbi/proto-murabbi-training.tsx`.

- `AdmissionApplication` requires guardian information and converts to a student participant. Its current POST is authenticated and restricted to central roles. Preserve that workflow; create dedicated training application models/routes and reuse shared validation/auth/audit primitives where suitable.
- No dedicated training cohort, training application or training completion model was found in the inspected schema. The Murabbi training prototype displays static resources; it is not a functioning induction workflow.
- Existing `StaffAttendanceEvent` is park-bound and unique per park/date; records require `StaffMeta`. External trainees and multiple training sessions per day do not fit it directly. Phase 2 needs a cohort/session/enrolment attendance contract before implementation.
- The blueprint's sections 8.2 and 8.5 support audited induction and a separate training-content area. Training admission needs its own lifecycle without silently inheriting all student admission rules.
- Existing same-origin mutation checks in `src/proxy.ts` must also protect the new public form endpoints; public submission is not a reason to exempt the API from origin validation.
- `docs/delivery/baseline/WORKSHEET_MAP.md` records `Murabbi Training Lahore.xlsx`: A2 historical period, C2:R2 Day 1–16, A3:B16 session/time descriptions and C3:R16 curriculum. This is existing structural evidence, not a fresh workbook audit or approved import. Recheck file identity and field mapping before any import; curriculum cells are not proof of attendance, completion or clearance.

On 2026-09-29 the owner asked to start building. `docs/delivery/state.json` now names MTI-01 as active; ATT01 is explicitly blocked on its documented production bootstrap prerequisites. A02 remains queued. Gemini and DeepSeek have not been dispatched.

## 4. Applicant experience and proposed fields

The public landing page must explain who the training is for, what applicants commit to, how selection works, and what happens after submission. Display dates in the cohort's configured timezone, initially Asia/Karachi. Closed, expired and invalid links have clear non-submitting states.

Proposed nine short question groups, followed by review and consent:

| Step | Proposed fields | Requirement and bounds |
| --- | --- | --- |
| 1. Your name | Full name | Required; trimmed Unicode, 2–120 characters; support Urdu names |
| 2. Contact | WhatsApp/mobile number | Required; normalized phone string, maximum 20 characters; explain its induction-contact purpose |
| 3. Email | Email address | Optional, maximum 254 characters; not a requirement to have an account |
| 4. Age eligibility | Date of birth, if needed for approved age policy | Valid calendar date, never future; evaluate against published cohort cutoff; defer collection if an age declaration is sufficient |
| 5. Location | City and locality | Required; configured city choice and locality maximum 120 characters; residency does not grant staff scope |
| 6. Background | Education/occupation | Required category with optional detail, maximum 200 characters |
| 7. Shabab connection | New applicant/existing team member; optional park preference | Park must belong to an allowed cohort city; submitted affiliation never proves identity or authorizes account linking |
| 8. Motivation | Why join? Relevant experience? | Motivation required, maximum 1,000 characters; experience optional, maximum 1,000 |
| 9. Availability | Published schedule commitment; optional constraints | Required response; constraints maximum 500 characters; unavailable applicants are reviewed according to approved policy |

Review screen: editable summary, versioned privacy notice acknowledgment and application declaration. Any guardian permission for under-18 applicants requires a separate approved verification process; a checkbox alone is not verified safeguarding consent. Do not collect CNIC, document uploads, health or sensitive personal-history answers in the initial form.

Back/Next preserves answers in memory. Display field errors and move focus accessibly; support keyboard use and reduced motion. Do not put applicant data in URLs, analytics events, localStorage or the service-worker cache. A failed submission keeps the form available for retry within the current tab. No offline success claim or background submission queue in the first release.

After the server confirms a durable write, show a random application reference and the approved next-step/contact text. A reference alone must not reveal an application publicly. Status lookup, OTP, resume links and self-service editing are later features with their own identity checks.

## 5. Staff workflow

Under **Murabbi Training**, provide:

1. **Cohorts:** create a draft, configure city scope, dates/venue, eligibility, intake window, capacity policy and public copy; preview, publish and close registration. Changes to published policy create a new version retained with applications.
2. **Applications:** paginated list with search, cohort/city/status filters, application detail and a review timeline. Contact details appear only in the authorized induction workflow. General staff directories retain their existing privacy limits.
3. **Review:** record a reasoned decision, optional interview/orientation appointment and contact outcome. Use a proposed flow `submitted → under_review → accepted → enrolled`, with `waitlisted`, `rejected` and `withdrawn` alternatives. Interview scheduling is a separate appointment state. Freeze an explicit transition table before coding; corrections require authority, reason and audit.
4. **Cohort roster:** enrol accepted applicants atomically, retain the originating application and prevent duplicate enrolments. Capacity applies to enrolment unless the owner chooses another policy; reaching capacity must not silently discard applications.
5. **Summary:** submitted, under review, accepted, waitlisted and enrolled totals, calculated from scoped real records. Defer exports and bulk messaging until their access and privacy policies are approved.

Suggested first-release access: Super Admin/Program Admin can manage approved cohorts; City Head can manage only cohorts and applicants in the assigned city. Dedicated capabilities such as `training.manage` and `training.applications.review` are proposals, not current grants. Publication authority should be explicit. Park staff, Murabbis and Muawins receive no applicant access by default. Later reviewer assignments must be bounded to cohorts and cannot widen hierarchy scope. Missing city/park/group context denies any operation requiring it.

Existing callers are tied to student admissions. Reuse contact UI primitives only where valid; do not insert training applicants into student calling queues or send messages automatically. A controlled call/WhatsApp handoff can be a later approved integration.

## 6. Proposed data and API boundaries

New conceptual records, finalized by Astra in the implementation contract:

- `TrainingCohort`: public slug, programme/track, authoritative city scope, registration window, dates/venue, capacity, publication state and versioned form/eligibility/notice configuration.
- `TrainingApplication`: cohort, form/policy version, bounded applicant fields, normalized contact, declaration timestamps, status, random reference, concurrency version and timestamps. Private detail and public receipt use separate projections.
- `TrainingApplicationAction`: append-only actor/action/time, status changes, reason and authorized contact/appointment outcomes. Keep sensitive narrative out of general audit logs.
- `TrainingEnrollment`: unique application/cohort association with independent training status. Any existing staff/person linkage is nullable and separately verified; do not merge by name or phone alone.
- Durable submission receipt: request key, payload fingerprint and result reference; choose expiry and abuse limits in the contract. Same key/same payload returns the prior result; same key/different payload conflicts.

| Proposed endpoint | Behaviour and access |
| --- | --- |
| `GET /api/public/murabbi-training/[slug]` | Published public cohort configuration only; no applicants or internal contact lists |
| `POST /api/public/murabbi-training/[slug]/applications` | Bounded schema, origin check, durable rate limits, idempotent create; derive cohort/city from server configuration |
| `GET/POST /api/admin/murabbi-training/cohorts` | Scoped list/create with explicit capability and server-side role policy |
| `PATCH /api/admin/murabbi-training/cohorts/[id]` | Version-checked configuration/publication; block invalid policy or dates |
| `GET /api/admin/murabbi-training/applications` | Scope enforced before search/filter/count; page size capped at 100 |
| `GET /api/admin/murabbi-training/applications/[id]` | Authorized private detail; no-store response |
| `POST /api/admin/murabbi-training/applications/[id]/actions` | Version-checked, authorized transition/contact/appointment with audit |
| `POST /api/admin/murabbi-training/applications/[id]/enrol` | Transactional capacity check and unique enrolment; safe repeated request |

These are proposed names, not existing endpoints. Contract must specify request/response types and `400` validation, `401/403` authorization, `404` inaccessible target, `409` stale version/capacity/state, `429` throttling and `503` retryable failure behaviour. Return minimal public receipts; never expose contact-match results. Phone reuse is a review signal, not proof that two applicants are the same person; idempotency handles network retries independently.

Use an initial 16 KB request-body ceiling, strict field allowlists and bounded strings. Reject submitted role, permission, reviewer, fee-paid or staff-link fields. Enforce intake closure and publication state again within the submission transaction. Configure logging/redaction and retention before launch; avoid storing raw request bodies. Anti-abuse controls must work across deployed instances, with an accessible challenge fallback only if needed.

Implement additive migrations in SQLite and staged PostgreSQL together. Verify existing admissions, staff, groups and attendance remain intact. Enable the new module behind a feature flag. Operational rollback closes public intake/disables new routes while retaining submitted applications; it must not drop tables containing new data. Deployment requires reviewed backup/restore and migration evidence. This plan makes no database or production changes.

## 7. Delivery sequence and acceptance

| Stage | Owner and deliverable | Acceptance gate |
| --- | --- | --- |
| MTI-01: contract | Astra resolves product decisions, inspects remaining reference steps where available, pins implementation base, freezes field/transition/access contract | Every question maps to persistence and scope; exact new-screen references identified; no invented reference parity |
| MTI-02: backend | Astra owns schema/security; optionally bounded DeepSeek work on approved services | Synthetic public submission, retries, closures, review and enrolment pass on both database providers |
| MTI-03: frontend | Gemini implements public wizard and staff cohort/review screens from exact approved references/contracts | Owner can complete a synthetic application and review/enrol it in mobile browser; accessible loading/error/denied/closed/offline states |
| MTI-04: integration | Astra integrates; DeepSeek performs bounded clean-code pass; Astra reviews actual diff | Relevant tests, lint, typecheck, appropriate provider builds, browser checks and required broader suite pass; precise limitations recorded |
| MTI-05: pilot | Owner accepts one cohort's copy/policy; Astra prepares release/rollback evidence | Controlled synthetic run and operator handoff before a separately authorized live publication |
| Later: training delivery | Curriculum → sessions → trainee attendance → reviewed completion → separately approved staff onboarding | Completion criteria, safeguarding/clearance, attendance rules and staff activation policy approved first |

Run these sequentially within the one-active-task workflow. Gemini/DeepSeek execution depends on their actual availability; prepared packets are not dispatched work. Existing `docs/pwa screens/` references and Shabab components control covered styling. The new public wizard has no verified matching repository screenshot yet: capture and approve exact screen references before its frontend assignment.

Required evidence includes successful round-trip of every submitted field; Unicode/phone/date validation; unknown-field rejection; cross-city and missing-scope denial; public inability to read applicants; invalid/closed intake; rate limits; double-click and lost-response retry; concurrent last-seat enrolment; stale reviewer conflict; transaction rollback; no accidental account/student creation; preserved existing admissions/attendance; and no PII in caches/logs. UI checks cover small-screen overflow, Back/Next, review/edit, focus, loading, empty, server error, lost connection and honest receipt confirmation.

## 8. Owner decisions before dependent implementation

1. Is induction open to new external applicants, existing Shabab staff, or both? Proposed: both, with separate reviewed identity linking.
2. What are the first cohort's city, dates/venue, capacity and eligibility? Specifically settle age/minor handling; do not copy Atfal's rules automatically.
3. Is there a fee? Proposed initial scope: no payment collection feature; publish only the confirmed fee policy. If payment is required for enrolment, add a separate finance contract before launch.
4. Is acceptance automatic or staff-reviewed, and is an interview/orientation required? Proposed: staff review with optional scheduled interview/orientation.
5. What wording/language, contact purpose, privacy notice and retention period should be published? Proposed: concise English initially with Urdu-capable inputs; bilingual labels if needed by the intake audience.
6. Where should this sit relative to ATT01 and A02? This planning request has not reprioritized either task.

Training completion criteria, certificates and Murabbi activation can be settled before the later training-delivery phase. They need not delay an approved registration-only pilot.

## Planning evidence

This plan is grounded in the inspected reference landing screen, current source files above, blueprint sections 8.2/8.5 and the existing worksheet disposition register. MTI-01 backend implementation and verification evidence are recorded in `docs/delivery/reports/MTI-01-FOUNDATION-HANDOFF.md`. No real form was submitted, data imported, database migrated, provider contacted or app deployed.
