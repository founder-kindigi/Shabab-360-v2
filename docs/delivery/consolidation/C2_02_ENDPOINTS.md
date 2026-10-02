# Endpoint reconciliation register

Each route-file entry below records every exported HTTP function in the selected sources, canonical path/adapter disposition and a reviewed C00–C21 contract. Pair it with C2_02_CONTRACTS.md for schema/authority/output/error/transaction rules. Source references point to actual method declarations; the inventory retains per-method guard, parse, persistence and response call anchors. The 107 C1 conflicts are all included, with additional direct counterparts needed to reconcile the same services. This is a future contract register, not implemented-route or exhaustive consumer verification.

Literal consumer matches include fetch wrappers. Indirect/dynamically assembled calls may not be found. A missing match means no literal caller detected, not proof of no usage; direct APIs remain accounted for and need future direct-route acceptance. The complete 583-site source call index permits further tracing before frontend implementation.

## /api/admin/access/role-overrides

**C21 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/access/role-overrides`.

Source methods: main: GET, PUT, DELETE; v2: GET, PUT, DELETE.

Evidence: `main:src/app/api/admin/access/role-overrides/route.ts:28 GET`; `main:src/app/api/admin/access/role-overrides/route.ts:35 PUT`; `main:src/app/api/admin/access/role-overrides/route.ts:57 DELETE`; `v2:src/app/api/admin/access/role-overrides/route.ts:28 GET`; `v2:src/app/api/admin/access/role-overrides/route.ts:35 PUT`; `v2:src/app/api/admin/access/role-overrides/route.ts:57 DELETE`.

Literal consumers: `main:src/components/modules/admin/access-management-page.tsx:104 (request)`; `main:src/components/modules/admin/access-management-page.tsx:118 (request)`; `main:src/components/modules/admin/access-management-page.tsx:132 (request)`; `v2:src/components/modules/admin/access-management-page.tsx:104 (request)`; `v2:src/components/modules/admin/access-management-page.tsx:118 (request)`; `v2:src/components/modules/admin/access-management-page.tsx:132 (request)`; `v2:src/components/modules/admin/mobile-security-access-page.tsx:47 (fetch)`; `v2:src/components/modules/admin/mobile-security-access-page.tsx:62 (fetch)`.

## /api/admin/access/users/[id]/overrides

**C21 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/access/users/[id]/overrides`.

Source methods: main: GET, PUT, DELETE; v2: GET, PUT, DELETE.

Evidence: `main:src/app/api/admin/access/users/[id]/overrides/route.ts:42 GET`; `main:src/app/api/admin/access/users/[id]/overrides/route.ts:82 PUT`; `main:src/app/api/admin/access/users/[id]/overrides/route.ts:135 DELETE`; `v2:src/app/api/admin/access/users/[id]/overrides/route.ts:42 GET`; `v2:src/app/api/admin/access/users/[id]/overrides/route.ts:82 PUT`; `v2:src/app/api/admin/access/users/[id]/overrides/route.ts:135 DELETE`.

Literal consumers: `main:src/components/modules/admin/access-management-page.tsx:112 (request)`; `main:src/components/modules/admin/access-management-page.tsx:144 (request)`; `main:src/components/modules/admin/access-management-page.tsx:163 (request)`; `v2:src/components/modules/admin/access-management-page.tsx:112 (request)`; `v2:src/components/modules/admin/access-management-page.tsx:144 (request)`; `v2:src/components/modules/admin/access-management-page.tsx:163 (request)`.

## /api/admin/admissions/[id]/convert

**C05 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/admissions/[id]/convert`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/admissions/[id]/convert/route.ts:14 POST`; `v2:src/app/api/admin/admissions/[id]/convert/route.ts:14 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/admissions/[id]

**C05 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/admissions/[id]`.

Source methods: main: GET, PATCH; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/admissions/[id]/route.ts:42 GET`; `main:src/app/api/admin/admissions/[id]/route.ts:86 PATCH`; `v2:src/app/api/admin/admissions/[id]/route.ts:23 GET`; `v2:src/app/api/admin/admissions/[id]/route.ts:78 PATCH`; `v2:src/app/api/admin/admissions/[id]/route.ts:136 DELETE`.

Literal consumers: `main:src/components/modules/admin/admissions-page.tsx:517 (fetch)`; `main:src/components/modules/admin/admissions-page.tsx:588 (fetch)`; `main:src/components/modules/admin/admissions-page.tsx:610 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:543 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:614 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:636 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:648 (fetch)`; `v2:src/components/modules/admin/mobile-admissions-page.tsx:133 (fetch)`.

## /api/admin/admissions

**C05 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/admissions`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/admissions/route.ts:36 GET`; `main:src/app/api/admin/admissions/route.ts:100 POST`; `v2:src/app/api/admin/admissions/route.ts:38 GET`; `v2:src/app/api/admin/admissions/route.ts:113 POST`.

Literal consumers: `main:src/components/modules/admin/admissions-page.tsx:525 (fetch)`; `main:src/components/modules/admin/admissions-page.tsx:530 (fetch)`; `main:src/components/modules/admin/admissions-page.tsx:535 (fetch)`; `main:src/components/modules/admin/admissions-page.tsx:567 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:551 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:556 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:561 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:593 (fetch)`; `v2:src/components/modules/admin/mobile-admissions-page.tsx:109 (fetch)`; `v2:src/components/modules/admin/mobile-admissions-page.tsx:196 (fetch)`.

## /api/admin/batches/[id]

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/batches/[id]`.

Source methods: main: GET, PATCH, DELETE; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/batches/[id]/route.ts:18 GET`; `main:src/app/api/admin/batches/[id]/route.ts:57 PATCH`; `main:src/app/api/admin/batches/[id]/route.ts:125 DELETE`; `v2:src/app/api/admin/batches/[id]/route.ts:18 GET`; `v2:src/app/api/admin/batches/[id]/route.ts:57 PATCH`; `v2:src/app/api/admin/batches/[id]/route.ts:159 DELETE`.

Literal consumers: `main:src/components/modules/admin/batches-page.tsx:175 (fetch)`; `main:src/components/modules/admin/batches-page.tsx:205 (fetch)`; `v2:src/components/modules/admin/batches-page.tsx:175 (fetch)`; `v2:src/components/modules/admin/batches-page.tsx:205 (fetch)`.

## /api/admin/batches

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/batches`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/batches/route.ts:30 GET`; `main:src/app/api/admin/batches/route.ts:107 POST`; `v2:src/app/api/admin/batches/route.ts:30 GET`; `v2:src/app/api/admin/batches/route.ts:116 POST`.

Literal consumers: `main:src/components/layout/page-header.tsx:75 (fetchJsonArray)`; `main:src/components/modules/admin/batches-page.tsx:127 (fetch)`; `main:src/components/modules/admin/batches-page.tsx:139 (fetch)`; `main:src/components/modules/admin/groups-page.tsx:113 (fetchJsonArray)`; `main:src/components/shared/scope-selector.tsx:270 (fetchJsonArray)`; `v2:src/components/layout/page-header.tsx:70 (fetchJsonArray)`; `v2:src/components/modules/admin/batches-page.tsx:127 (fetch)`; `v2:src/components/modules/admin/batches-page.tsx:139 (fetch)`; `v2:src/components/modules/admin/groups-page.tsx:113 (fetchJsonArray)`; `v2:src/components/shared/scope-selector.tsx:270 (fetchJsonArray)`.

## /api/admin/certificates/[participantId]

**C20 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/certificates/[participantId]`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/certificates/[participantId]/route.ts:14 GET`; `v2:src/app/api/admin/certificates/[participantId]/route.ts:16 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/certificates/batch

**C20 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/certificates/batch`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/certificates/batch/route.ts:24 GET`; `v2:src/app/api/admin/certificates/batch/route.ts:26 GET`.

Literal consumers: `main:src/components/modules/admin/batches-page.tsx:228 (fetch)`; `v2:src/components/modules/admin/batches-page.tsx:228 (fetch)`.

## /api/admin/cities

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/cities`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/cities/route.ts:18 GET`; `main:src/app/api/admin/cities/route.ts:42 POST`; `v2:src/app/api/admin/cities/route.ts:18 GET`; `v2:src/app/api/admin/cities/route.ts:47 POST`.

Literal consumers: `main:src/app/admin/calling/_client.tsx:110 (fetch)`; `main:src/app/admin/events/_client.tsx:294 (fetch)`; `main:src/app/admin/mashwara/_client.tsx:120 (fetch)`; `main:src/app/admin/mashwara/_client.tsx:335 (fetch)`; `main:src/components/layout/page-header.tsx:61 (fetchJsonArray)`; `main:src/components/modules/admin/access-provisioning-page.tsx:285 (fetch)`; `main:src/components/modules/admin/admin-attendance-events.tsx:181 (fetchJsonArray)`; `main:src/components/modules/admin/admissions-page.tsx:499 (fetch)`; `main:src/components/modules/admin/cities-page.tsx:84 (fetch)`; `main:src/components/modules/admin/cities-page.tsx:91 (fetch)`; `main:src/components/modules/admin/collaboration-teams-page.tsx:98 (request)`; `main:src/components/modules/admin/fees-page.tsx:304 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:336 (fetchArrayResponse)`; `main:src/components/modules/admin/parks-page.tsx:93 (fetchJsonArray)`; `main:src/components/modules/admin/people-page.tsx:267 (fetch)`; `main:src/components/modules/admin/reports-page.tsx:1059 (fetch)`; `main:src/components/modules/admin/reports-page.tsx:661 (fetch)`; `main:src/components/modules/admin/students-page.tsx:270 (fetchArrayResponse)`; `main:src/components/modules/admin/users-page.tsx:195 (fetch)`; `main:src/components/modules/content-planner/content-planner-page.tsx:167 (request)`; `main:src/components/shared/scope-selector.tsx:238 (fetchJsonArray)`; `v2:src/app/admin/calling/_client.tsx:84 (fetch)`; `v2:src/app/admin/events/_client.tsx:259 (fetch)`; `v2:src/app/admin/mashwara/_client.tsx:198 (fetch)`; `v2:src/app/admin/mashwara/_client.tsx:380 (fetch)`; `v2:src/components/layout/page-header.tsx:56 (fetchJsonArray)`; `v2:src/components/modules/admin/access-provisioning-page.tsx:285 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:504 (fetch)`; `v2:src/components/modules/admin/cities-page.tsx:80 (fetch)`; `v2:src/components/modules/admin/cities-page.tsx:87 (fetch)`; `v2:src/components/modules/admin/collaboration-teams-page.tsx:87 (request)`; `v2:src/components/modules/admin/guardians-page.tsx:336 (fetchArrayResponse)`; `v2:src/components/modules/admin/mobile-calling-page.tsx:38 (read)`; `v2:src/components/modules/admin/parks-page.tsx:93 (fetchJsonArray)`; `v2:src/components/modules/admin/people-page.tsx:267 (fetch)`; `v2:src/components/modules/admin/reports-page.tsx:1059 (fetch)`; `v2:src/components/modules/admin/reports-page.tsx:661 (fetch)`; `v2:src/components/modules/admin/students-page.tsx:271 (fetchArrayResponse)`; `v2:src/components/modules/admin/users-page.tsx:195 (fetch)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:197 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:165 (request)`; `v2:src/components/shared/scope-selector.tsx:238 (fetchJsonArray)`.

## /api/admin/collaboration-teams/[teamId]/members/[memberId]

**C15 / C00** — legacy adapter; same Teams capability, scope and lifecycle service. Canonical: `/api/admin/teams/[id]/members/[memberId]`.

Source methods: main: PATCH, DELETE; v2: PATCH, DELETE.

Evidence: `main:src/app/api/admin/collaboration-teams/[teamId]/members/[memberId]/route.ts:35 PATCH`; `main:src/app/api/admin/collaboration-teams/[teamId]/members/[memberId]/route.ts:104 DELETE`; `v2:src/app/api/admin/collaboration-teams/[teamId]/members/[memberId]/route.ts:35 PATCH`; `v2:src/app/api/admin/collaboration-teams/[teamId]/members/[memberId]/route.ts:107 DELETE`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/collaboration-teams/[teamId]/members

**C15 / C00** — legacy adapter; same Teams capability, scope and lifecycle service. Canonical: `/api/admin/teams/[id]/members`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/collaboration-teams/[teamId]/members/route.ts:49 GET`; `main:src/app/api/admin/collaboration-teams/[teamId]/members/route.ts:113 POST`; `v2:src/app/api/admin/collaboration-teams/[teamId]/members/route.ts:48 GET`; `v2:src/app/api/admin/collaboration-teams/[teamId]/members/route.ts:112 POST`.

Literal consumers: `v2:src/components/modules/admin/mobile-collaboration-teams-page.tsx:134 (fetch)`.

## /api/admin/collaboration-teams/[teamId]

**C15 / C00** — legacy adapter; same Teams capability, scope and lifecycle service. Canonical: `/api/admin/teams/[id]`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/collaboration-teams/[teamId]/route.ts:15 GET`; `v2:src/app/api/admin/collaboration-teams/[teamId]/route.ts:14 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/collaboration-teams

**C15 / C00** — legacy adapter; same Teams capability, scope and lifecycle service. Canonical: `/api/admin/teams`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/collaboration-teams/route.ts:27 GET`; `v2:src/app/api/admin/collaboration-teams/route.ts:27 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/content-planner/blocks/[id]

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/blocks/[id]`.

Source methods: main: GET, PATCH, DELETE; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/content-planner/blocks/[id]/route.ts:19 GET`; `main:src/app/api/admin/content-planner/blocks/[id]/route.ts:85 PATCH`; `main:src/app/api/admin/content-planner/blocks/[id]/route.ts:221 DELETE`; `v2:src/app/api/admin/content-planner/blocks/[id]/route.ts:19 GET`; `v2:src/app/api/admin/content-planner/blocks/[id]/route.ts:85 PATCH`; `v2:src/app/api/admin/content-planner/blocks/[id]/route.ts:221 DELETE`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:337 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:393 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:419 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:330 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:346 (request)`.

## /api/admin/content-planner/blocks

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/blocks`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/content-planner/blocks/route.ts:22 GET`; `main:src/app/api/admin/content-planner/blocks/route.ts:111 POST`; `v2:src/app/api/admin/content-planner/blocks/route.ts:22 GET`; `v2:src/app/api/admin/content-planner/blocks/route.ts:111 POST`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:204 (request)`; `main:src/components/modules/content-planner/content-planner-page.tsx:308 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:232 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:364 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:210 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:314 (request)`.

## /api/admin/content-planner/permissions

**C16 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/content-planner/permissions`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/content-planner/permissions/route.ts:18 GET`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:159 (request)`.

## /api/admin/content-planner/plans/[id]

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/plans/[id]`.

Source methods: main: GET, PATCH, DELETE; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/content-planner/plans/[id]/route.ts:23 GET`; `main:src/app/api/admin/content-planner/plans/[id]/route.ts:84 PATCH`; `main:src/app/api/admin/content-planner/plans/[id]/route.ts:173 DELETE`; `v2:src/app/api/admin/content-planner/plans/[id]/route.ts:23 GET`; `v2:src/app/api/admin/content-planner/plans/[id]/route.ts:85 PATCH`; `v2:src/app/api/admin/content-planner/plans/[id]/route.ts:174 DELETE`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:192 (request)`; `main:src/components/modules/content-planner/content-planner-page.tsx:250 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:220 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:278 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:192 (request)`.

## /api/admin/content-planner/plans

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/plans`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/content-planner/plans/route.ts:23 GET`; `main:src/app/api/admin/content-planner/plans/route.ts:111 POST`; `v2:src/app/api/admin/content-planner/plans/route.ts:21 GET`; `v2:src/app/api/admin/content-planner/plans/route.ts:107 POST`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:183 (request)`; `main:src/components/modules/content-planner/content-planner-page.tsx:231 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:259 (request)`.

## /api/admin/content-planner/sessions/[id]

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/sessions/[id]`.

Source methods: main: GET, PATCH, DELETE; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/content-planner/sessions/[id]/route.ts:19 GET`; `main:src/app/api/admin/content-planner/sessions/[id]/route.ts:77 PATCH`; `main:src/app/api/admin/content-planner/sessions/[id]/route.ts:208 DELETE`; `v2:src/app/api/admin/content-planner/sessions/[id]/route.ts:19 GET`; `v2:src/app/api/admin/content-planner/sessions/[id]/route.ts:77 PATCH`; `v2:src/app/api/admin/content-planner/sessions/[id]/route.ts:208 DELETE`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:287 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:315 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:344 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:276 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:292 (request)`.

## /api/admin/content-planner/sessions

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/sessions`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/content-planner/sessions/route.ts:21 GET`; `main:src/app/api/admin/content-planner/sessions/route.ts:101 POST`; `v2:src/app/api/admin/content-planner/sessions/route.ts:20 GET`; `v2:src/app/api/admin/content-planner/sessions/route.ts:100 POST`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:269 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:297 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:252 (request)`.

## /api/admin/content-planner/ui-context

**C16 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/content-planner/ui-context`.

Source methods: v2: GET.

Evidence: `v2:src/app/api/admin/content-planner/ui-context/route.ts:7 GET`.

Literal consumers: `v2:src/components/modules/content-planner/content-planner-page.tsx:183 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:155 (request)`.

## /api/admin/dashboard

**C11 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/dashboard`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/dashboard/route.ts:94 GET`; `v2:src/app/api/admin/dashboard/route.ts:89 GET`.

Literal consumers: `main:src/components/modules/admin/settings-page.tsx:391 (fetch)`; `v2:src/components/modules/admin/mobile-admin-dashboard.tsx:35 (fetch)`; `v2:src/components/modules/admin/settings-page.tsx:391 (fetch)`.

## /api/admin/events/[id]/assignees

**C08 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/events/[id]/assignees`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/events/[id]/assignees/route.ts:12 GET`.

Literal consumers: `main:src/components/events/EventResponsibilityCard.tsx:68 (fetch)`; `main:src/components/events/EventTeamRoster.tsx:59 (fetch)`.

## /api/admin/events/[id]/eligible-participants

**C07 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/events/[id]/eligible-participants`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/events/[id]/eligible-participants/route.ts:6 GET`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:122 (fetch)`.

## /api/admin/events/[id]/planner-items

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/[id]/planner-items`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/events/[id]/planner-items/route.ts:12 GET`; `main:src/app/api/admin/events/[id]/planner-items/route.ts:37 POST`; `v2:src/app/api/admin/events/[id]/planner-items/route.ts:12 GET`; `v2:src/app/api/admin/events/[id]/planner-items/route.ts:37 POST`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:224 (fetch)`.

## /api/admin/events/[id]/registrations/[registrationId]/check-in

**C07 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/events/[id]/registrations/[registrationId]/check-in`.

Source methods: main: POST.

Evidence: `main:src/app/api/admin/events/[id]/registrations/[registrationId]/check-in/route.ts:18 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/events/[id]/registrations/[registrationId]

**C07 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/events/[id]/registrations/[registrationId]`.

Source methods: main: PATCH.

Evidence: `main:src/app/api/admin/events/[id]/registrations/[registrationId]/route.ts:13 PATCH`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/events/[id]/registrations

**C07 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/events/[id]/registrations`.

Source methods: main: GET, POST.

Evidence: `main:src/app/api/admin/events/[id]/registrations/route.ts:20 GET`; `main:src/app/api/admin/events/[id]/registrations/route.ts:50 POST`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:132 (fetch)`; `main:src/app/admin/events/[id]/_client.tsx:195 (fetch)`.

## /api/admin/events/[id]/responsibilities

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/[id]/responsibilities`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/events/[id]/responsibilities/route.ts:13 GET`; `main:src/app/api/admin/events/[id]/responsibilities/route.ts:42 POST`; `v2:src/app/api/admin/events/[id]/responsibilities/route.ts:13 GET`; `v2:src/app/api/admin/events/[id]/responsibilities/route.ts:42 POST`.

Literal consumers: `main:src/components/events/EventResponsibilityCard.tsx:61 (fetch)`; `main:src/components/events/EventResponsibilityCard.tsx:79 (fetch)`; `v2:src/components/events/EventResponsibilityCard.tsx:54 (fetch)`; `v2:src/components/events/EventResponsibilityCard.tsx:59 (fetch)`.

## /api/admin/events/[id]

**C06 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/[id]`.

Source methods: main: GET, PATCH, DELETE; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/events/[id]/route.ts:13 GET`; `main:src/app/api/admin/events/[id]/route.ts:57 PATCH`; `main:src/app/api/admin/events/[id]/route.ts:131 DELETE`; `v2:src/app/api/admin/events/[id]/route.ts:13 GET`; `v2:src/app/api/admin/events/[id]/route.ts:57 PATCH`; `v2:src/app/api/admin/events/[id]/route.ts:127 DELETE`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:143 (fetch)`; `main:src/app/admin/events/[id]/_client.tsx:154 (fetch)`; `main:src/app/admin/events/[id]/_client.tsx:174 (fetch)`; `v2:src/app/admin/events/[id]/_client.tsx:107 (fetch)`.

## /api/admin/events/[id]/teams

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/[id]/teams`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/events/[id]/teams/route.ts:12 GET`; `main:src/app/api/admin/events/[id]/teams/route.ts:39 POST`; `v2:src/app/api/admin/events/[id]/teams/route.ts:12 GET`; `v2:src/app/api/admin/events/[id]/teams/route.ts:39 POST`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:261 (fetch)`; `main:src/components/events/EventTeamRoster.tsx:47 (fetch)`; `v2:src/components/events/EventTeamRoster.tsx:43 (fetch)`.

## /api/admin/events/planner-items/[id]

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/planner-items/[id]`.

Source methods: main: PATCH; v2: PATCH.

Evidence: `main:src/app/api/admin/events/planner-items/[id]/route.ts:13 PATCH`; `v2:src/app/api/admin/events/planner-items/[id]/route.ts:13 PATCH`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:246 (fetch)`.

## /api/admin/events/responsibilities/[id]/revoke

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/responsibilities/[id]/revoke`.

Source methods: main: POST, PATCH; v2: POST, PATCH.

Evidence: `main:src/app/api/admin/events/responsibilities/[id]/revoke/route.ts:13 POST`; `main:src/app/api/admin/events/responsibilities/[id]/revoke/route.ts:17 PATCH`; `v2:src/app/api/admin/events/responsibilities/[id]/revoke/route.ts:13 POST`; `v2:src/app/api/admin/events/responsibilities/[id]/revoke/route.ts:17 PATCH`.

Literal consumers: `main:src/components/events/EventResponsibilityCard.tsx:107 (fetch)`; `v2:src/components/events/EventResponsibilityCard.tsx:79 (fetch)`.

## /api/admin/events

**C06 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/events/route.ts:9 GET`; `main:src/app/api/admin/events/route.ts:74 POST`; `v2:src/app/api/admin/events/route.ts:9 GET`; `v2:src/app/api/admin/events/route.ts:61 POST`.

Literal consumers: `main:src/app/admin/events/_client.tsx:128 (fetch)`; `main:src/app/admin/events/_client.tsx:282 (fetch)`; `v2:src/app/admin/events/_client.tsx:250 (fetch)`; `v2:src/components/modules/admin/mobile-events-page.tsx:56 (fetch)`.

## /api/admin/events/teams/[teamId]/memberships

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/teams/[teamId]/memberships`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/events/teams/[teamId]/memberships/route.ts:12 POST`; `v2:src/app/api/admin/events/teams/[teamId]/memberships/route.ts:12 POST`.

Literal consumers: `main:src/components/events/EventTeamRoster.tsx:68 (fetch)`.

## /api/admin/events/teams/memberships/[id]

**C08 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/events/teams/memberships/[id]`.

Source methods: main: DELETE; v2: DELETE.

Evidence: `main:src/app/api/admin/events/teams/memberships/[id]/route.ts:11 DELETE`; `v2:src/app/api/admin/events/teams/memberships/[id]/route.ts:11 DELETE`.

Literal consumers: `main:src/components/events/EventTeamRoster.tsx:89 (fetch)`.

## /api/admin/events/ui-context

**C06 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/events/ui-context`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/events/ui-context/route.ts:12 GET`.

Literal consumers: `main:src/app/admin/events/[id]/_client.tsx:109 (fetch)`; `main:src/app/admin/events/[id]/_client.tsx:143 (fetch)`; `main:src/app/admin/events/[id]/_client.tsx:154 (fetch)`; `main:src/app/admin/events/[id]/_client.tsx:174 (fetch)`; `main:src/app/admin/events/_client.tsx:257 (fetch)`; `v2:src/app/admin/events/[id]/_client.tsx:107 (fetch)`.

## /api/admin/fees/[id]/payments

**C18 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/fees/[id]/payments`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/fees/[id]/payments/route.ts:48 GET`; `main:src/app/api/admin/fees/[id]/payments/route.ts:160 POST`; `v2:src/app/api/admin/fees/[id]/payments/route.ts:50 GET`; `v2:src/app/api/admin/fees/[id]/payments/route.ts:165 POST`.

Literal consumers: `main:src/components/modules/admin/fees-page.tsx:535 (fetch)`.

## /api/admin/fees

**C18 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/fees`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/fees/route.ts:50 GET`; `main:src/app/api/admin/fees/route.ts:232 POST`; `v2:src/app/api/admin/fees/route.ts:51 GET`; `v2:src/app/api/admin/fees/route.ts:236 POST`.

Literal consumers: `main:src/components/modules/admin/fees-page.tsx:417 (fetch)`; `main:src/components/modules/admin/fees-page.tsx:439 (fetch)`.

## /api/admin/groups

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/groups`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/groups/route.ts:32 GET`; `main:src/app/api/admin/groups/route.ts:119 POST`; `v2:src/app/api/admin/groups/route.ts:32 GET`; `v2:src/app/api/admin/groups/route.ts:128 POST`.

Literal consumers: `main:src/components/layout/page-header.tsx:82 (fetchJsonArray)`; `main:src/components/modules/admin/access-provisioning-page.tsx:309 (fetch)`; `main:src/components/modules/admin/admissions-page.tsx:511 (fetch)`; `main:src/components/modules/admin/groups-page.tsx:126 (fetchJsonArray)`; `main:src/components/modules/admin/groups-page.tsx:133 (fetch)`; `main:src/components/modules/admin/people-page.tsx:1155 (fetch)`; `main:src/components/modules/admin/students-page.tsx:284 (fetchArrayResponse)`; `main:src/components/modules/admin/users-page.tsx:219 (fetch)`; `main:src/components/shared/scope-selector.tsx:282 (fetchJsonArray)`; `main:src/components/shared/scope-selector.tsx:294 (fetchJsonArray)`; `v2:src/components/layout/page-header.tsx:77 (fetchJsonArray)`; `v2:src/components/modules/admin/access-provisioning-page.tsx:309 (fetch)`; `v2:src/components/modules/admin/admissions-page.tsx:516 (fetch)`; `v2:src/components/modules/admin/groups-page.tsx:126 (fetchJsonArray)`; `v2:src/components/modules/admin/groups-page.tsx:133 (fetch)`; `v2:src/components/modules/admin/people-page.tsx:1155 (fetch)`; `v2:src/components/modules/admin/students-page.tsx:285 (fetchArrayResponse)`; `v2:src/components/modules/admin/users-page.tsx:219 (fetch)`; `v2:src/components/shared/scope-selector.tsx:282 (fetchJsonArray)`; `v2:src/components/shared/scope-selector.tsx:294 (fetchJsonArray)`.

## /api/admin/guardians/[id]/account

**C03 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/guardians/[id]/account`.

Source methods: main: POST.

Evidence: `main:src/app/api/admin/guardians/[id]/account/route.ts:19 POST`.

Literal consumers: `main:src/components/modules/admin/guardians-page.tsx:471 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:471 (fetch)`.

## /api/admin/guardians/[id]/detail

**C04 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/guardians/[id]/detail`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/guardians/[id]/detail/route.ts:6 GET`; `v2:src/app/api/admin/guardians/[id]/detail/route.ts:6 GET`.

Literal consumers: `main:src/components/modules/admin/guardian-detail-sheet.tsx:177 (fetch)`; `v2:src/components/modules/admin/guardian-detail-sheet.tsx:177 (fetch)`.

## /api/admin/guardians/[id]

**C04 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/guardians/[id]`.

Source methods: main: PATCH, DELETE; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/admin/guardians/[id]/route.ts:16 PATCH`; `main:src/app/api/admin/guardians/[id]/route.ts:104 DELETE`; `v2:src/app/api/admin/guardians/[id]/route.ts:16 GET`; `v2:src/app/api/admin/guardians/[id]/route.ts:51 PATCH`; `v2:src/app/api/admin/guardians/[id]/route.ts:139 DELETE`.

Literal consumers: `main:src/components/modules/admin/guardians-page.tsx:429 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:454 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:489 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:429 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:454 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:489 (fetch)`.

## /api/admin/guardians/invite

**C03 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/guardians/invite`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/guardians/invite/route.ts:24 POST`; `v2:src/app/api/admin/guardians/invite/route.ts:24 POST`.

Literal consumers: `main:src/components/modules/admin/guardians-page.tsx:276 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:429 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:454 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:489 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:276 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:429 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:454 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:489 (fetch)`.

## /api/admin/guardians

**C04 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/guardians`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/guardians/route.ts:31 GET`; `main:src/app/api/admin/guardians/route.ts:187 POST`; `v2:src/app/api/admin/guardians/route.ts:31 GET`; `v2:src/app/api/admin/guardians/route.ts:185 POST`.

Literal consumers: `main:src/components/modules/admin/guardians-page.tsx:349 (fetch)`; `main:src/components/modules/admin/guardians-page.tsx:404 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:349 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:404 (fetch)`.

## /api/admin/import/participants

**C03 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/import/participants`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/import/participants/route.ts:12 POST`; `v2:src/app/api/admin/import/participants/route.ts:12 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/import/users

**C03 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/import/users`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/import/users/route.ts:31 POST`; `v2:src/app/api/admin/import/users/route.ts:31 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/invite

**C03 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/invite`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/invite/route.ts:40 POST`; `v2:src/app/api/admin/invite/route.ts:40 POST`.

Literal consumers: `main:src/components/modules/admin/access-provisioning-page.tsx:351 (fetch)`; `main:src/components/modules/admin/people-page.tsx:312 (fetch)`; `main:src/components/modules/admin/users-page.tsx:240 (fetch)`; `v2:src/components/modules/admin/access-provisioning-page.tsx:351 (fetch)`; `v2:src/components/modules/admin/mobile-staff-directory-page.tsx:101 (fetch)`; `v2:src/components/modules/admin/people-page.tsx:312 (fetch)`; `v2:src/components/modules/admin/users-page.tsx:240 (fetch)`.

## /api/admin/mashwara/[id]/action-items/[itemId]

**C14 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/mashwara/[id]/action-items/[itemId]`.

Source methods: main: PATCH.

Evidence: `main:src/app/api/admin/mashwara/[id]/action-items/[itemId]/route.ts:16 PATCH`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/mashwara/[id]/decisions

**C14 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/mashwara/[id]/decisions`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/mashwara/[id]/decisions/route.ts:28 POST`; `v2:src/app/api/admin/mashwara/[id]/decisions/route.ts:23 POST`.

Literal consumers: `main:src/components/mashwara/MashwaraDecisionModal.tsx:115 (fetch)`; `v2:src/components/mashwara/MashwaraDecisionModal.tsx:126 (fetch)`.

## /api/admin/mashwara/[id]/minutes

**C14 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/mashwara/[id]/minutes`.

Source methods: v2: GET.

Evidence: `v2:src/app/api/admin/mashwara/[id]/minutes/route.ts:10 GET`.

Literal consumers: `v2:src/app/admin/mashwara/[id]/_client.tsx:265 (fetch)`.

## /api/admin/mashwara/[id]

**C14 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/mashwara/[id]`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/mashwara/[id]/route.ts:6 GET`; `v2:src/app/api/admin/mashwara/[id]/route.ts:6 GET`.

Literal consumers: `main:src/app/admin/mashwara/[id]/_client.tsx:124 (fetch)`; `v2:src/app/admin/mashwara/[id]/_client.tsx:219 (fetch)`; `v2:src/app/admin/mashwara/[id]/_client.tsx:248 (fetch)`.

## /api/admin/mashwara/[id]/shares/[shareId]

**C14 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/mashwara/[id]/shares/[shareId]`.

Source methods: main: DELETE; v2: DELETE.

Evidence: `main:src/app/api/admin/mashwara/[id]/shares/[shareId]/route.ts:7 DELETE`; `v2:src/app/api/admin/mashwara/[id]/shares/[shareId]/route.ts:6 DELETE`.

Literal consumers: `main:src/app/admin/mashwara/[id]/_client.tsx:133 (fetch)`; `v2:src/app/admin/mashwara/[id]/_client.tsx:230 (fetch)`.

## /api/admin/mashwara/[id]/shares

**C14 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/mashwara/[id]/shares`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/mashwara/[id]/shares/route.ts:14 POST`; `v2:src/app/api/admin/mashwara/[id]/shares/route.ts:11 POST`.

Literal consumers: `main:src/components/mashwara/MashwaraShareModal.tsx:67 (fetch)`; `v2:src/components/mashwara/MashwaraShareModal.tsx:67 (fetch)`.

## /api/admin/mashwara

**C14 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/mashwara`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/mashwara/route.ts:27 GET`; `main:src/app/api/admin/mashwara/route.ts:83 POST`; `v2:src/app/api/admin/mashwara/route.ts:26 GET`; `v2:src/app/api/admin/mashwara/route.ts:82 POST`.

Literal consumers: `main:src/app/admin/mashwara/_client.tsx:130 (fetch)`; `main:src/app/admin/mashwara/_client.tsx:353 (fetch)`; `v2:src/app/admin/mashwara/_client.tsx:208 (fetch)`; `v2:src/app/admin/mashwara/_client.tsx:398 (fetch)`; `v2:src/components/modules/admin/mobile-mashwara-page.tsx:145 (fetch)`.

## /api/admin/mashwara/ui-context

**C14 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/mashwara/ui-context`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/mashwara/ui-context/route.ts:19 GET`.

Literal consumers: `main:src/app/admin/mashwara/[id]/_client.tsx:102 (fetch)`; `main:src/app/admin/mashwara/[id]/_client.tsx:124 (fetch)`; `main:src/app/admin/mashwara/_client.tsx:310 (fetch)`; `v2:src/app/admin/mashwara/[id]/_client.tsx:219 (fetch)`; `v2:src/app/admin/mashwara/[id]/_client.tsx:248 (fetch)`.

## /api/admin/media/assignees

**C01 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/media/assignees`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/media/assignees/route.ts:6 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/media/briefs/[id]

**C01 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/media/briefs/[id]`.

Source methods: main: GET, PATCH.

Evidence: `main:src/app/api/admin/media/briefs/[id]/route.ts:10 GET`; `main:src/app/api/admin/media/briefs/[id]/route.ts:24 PATCH`.

Literal consumers: `main:src/components/modules/media/media-briefs-page.tsx:106 (api)`; `main:src/components/modules/media/media-briefs-page.tsx:80 (api)`.

## /api/admin/media/briefs

**C01 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/media/briefs`.

Source methods: main: GET, POST.

Evidence: `main:src/app/api/admin/media/briefs/route.ts:11 GET`; `main:src/app/api/admin/media/briefs/route.ts:51 POST`.

Literal consumers: `main:src/components/modules/media/media-briefs-page.tsx:73 (api)`; `main:src/components/modules/media/media-briefs-page.tsx:91 (api)`.

## /api/admin/media/ui-context

**C01 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/media/ui-context`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/media/ui-context/route.ts:8 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/parks

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/parks`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/parks/route.ts:15 GET`; `v2:src/app/api/admin/parks/route.ts:15 GET`.

Literal consumers: `main:src/components/layout/page-header.tsx:68 (fetchJsonArray)`; `main:src/components/modules/admin/admissions-page.tsx:505 (fetch)`; `main:src/components/modules/admin/batches-page.tsx:120 (fetch)`; `main:src/components/modules/admin/groups-page.tsx:119 (fetchJsonArray)`; `main:src/components/modules/admin/parks-page.tsx:115 (fetch)`; `main:src/components/modules/admin/people-page.tsx:277 (fetch)`; `main:src/components/shared/scope-selector.tsx:250 (fetchJsonArray)`; `v2:src/components/layout/page-header.tsx:63 (fetchJsonArray)`; `v2:src/components/modules/admin/admissions-page.tsx:510 (fetch)`; `v2:src/components/modules/admin/batches-page.tsx:120 (fetch)`; `v2:src/components/modules/admin/groups-page.tsx:119 (fetchJsonArray)`; `v2:src/components/modules/admin/parks-page.tsx:115 (fetch)`; `v2:src/components/modules/admin/people-page.tsx:277 (fetch)`; `v2:src/components/shared/scope-selector.tsx:250 (fetchJsonArray)`.

## /api/admin/reports/attendance-report

**C11 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/reports/attendance-report`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/reports/attendance-report/route.ts:49 GET`; `v2:src/app/api/admin/reports/attendance-report/route.ts:47 GET`.

Literal consumers: `main:src/components/modules/admin/admin-attendance-events.tsx:289 (fetch)`; `main:src/components/modules/admin/reports-page.tsx:1078 (fetch)`; `v2:src/components/modules/admin/reports-page.tsx:1078 (fetch)`.

## /api/admin/reports/export

**C11 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/reports/export`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/admin/reports/export/route.ts:22 POST`; `v2:src/app/api/admin/reports/export/route.ts:22 POST`.

Literal consumers: `main:src/app/admin/reports/_client.tsx:106 (fetch)`; `v2:src/app/admin/reports/_client.tsx:106 (fetch)`.

## /api/admin/reports/fee-report

**C11 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/reports/fee-report`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/reports/fee-report/route.ts:31 GET`; `v2:src/app/api/admin/reports/fee-report/route.ts:31 GET`.

Literal consumers: `main:src/components/modules/admin/reports-page.tsx:1224 (fetch)`; `main:src/components/modules/admin/reports-page.tsx:1229 (fetch)`; `main:src/components/modules/admin/reports-page.tsx:1234 (fetch)`; `v2:src/components/modules/admin/reports-page.tsx:1224 (fetch)`; `v2:src/components/modules/admin/reports-page.tsx:1229 (fetch)`; `v2:src/components/modules/admin/reports-page.tsx:1234 (fetch)`.

## /api/admin/students/[id]/account

**C03 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/students/[id]/account`.

Source methods: main: POST.

Evidence: `main:src/app/api/admin/students/[id]/account/route.ts:19 POST`.

Literal consumers: `main:src/components/modules/admin/students-page.tsx:448 (fetch)`; `v2:src/components/modules/admin/students-page.tsx:449 (fetch)`.

## /api/admin/students/[id]/detail

**C04 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/students/[id]/detail`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/students/[id]/detail/route.ts:6 GET`; `v2:src/app/api/admin/students/[id]/detail/route.ts:7 GET`.

Literal consumers: `main:src/components/modules/admin/participant-detail-sheet.tsx:422 (fetch)`; `v2:src/components/modules/admin/participant-detail-sheet.tsx:422 (fetch)`.

## /api/admin/students/[id]/dropout

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/students/[id]/dropout`.

Source methods: main: POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/students/[id]/dropout/route.ts:11 POST`; `v2:src/app/api/admin/students/[id]/dropout/route.ts:30 GET`; `v2:src/app/api/admin/students/[id]/dropout/route.ts:47 POST`.

Literal consumers: `v2:src/components/modules/student-profile/profile-page.tsx:118 (fetch)`; `v2:src/components/modules/student-profile/profile-page.tsx:184 (fetch)`.

## /api/admin/students/[id]/profile

**C04 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/students/[id]/profile`.

Source methods: v2: GET, PUT.

Evidence: `v2:src/app/api/admin/students/[id]/profile/route.ts:20 GET`; `v2:src/app/api/admin/students/[id]/profile/route.ts:71 PUT`.

Literal consumers: `main:src/components/modules/student-profile/profile-page.tsx:116 (fetch)`; `main:src/components/modules/student-profile/profile-page.tsx:144 (fetch)`; `v2:src/components/modules/student-profile/profile-page.tsx:133 (fetch)`; `v2:src/components/modules/student-profile/profile-page.tsx:161 (fetch)`.

## /api/admin/students/[participantId]/profile

**C04 / C00** — one [id] filesystem route; same public URL, no duplicate dynamic segment. Canonical: `/api/admin/students/[id]/profile`.

Source methods: main: GET, PUT.

Evidence: `main:src/app/api/admin/students/[participantId]/profile/route.ts:20 GET`; `main:src/app/api/admin/students/[participantId]/profile/route.ts:71 PUT`.

Literal consumers: `main:src/components/modules/student-profile/profile-page.tsx:116 (fetch)`; `main:src/components/modules/student-profile/profile-page.tsx:144 (fetch)`; `v2:src/components/modules/student-profile/profile-page.tsx:133 (fetch)`; `v2:src/components/modules/student-profile/profile-page.tsx:161 (fetch)`.

## /api/admin/students

**C04 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/students`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/students/route.ts:35 GET`; `main:src/app/api/admin/students/route.ts:209 POST`; `v2:src/app/api/admin/students/route.ts:36 GET`; `v2:src/app/api/admin/students/route.ts:168 POST`.

Literal consumers: `main:src/components/modules/admin/guardians-page.tsx:365 (fetch)`; `main:src/components/modules/admin/students-page.tsx:314 (fetch)`; `main:src/components/modules/admin/students-page.tsx:381 (fetch)`; `v2:src/components/modules/admin/guardians-page.tsx:365 (fetch)`; `v2:src/components/modules/admin/students-page.tsx:315 (fetch)`; `v2:src/components/modules/admin/students-page.tsx:382 (fetch)`.

## /api/admin/teams/[id]/activities/[activityId]

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/[id]/activities/[activityId]`.

Source methods: main: PATCH; v2: PATCH, DELETE.

Evidence: `main:src/app/api/admin/teams/[id]/activities/[activityId]/route.ts:11 PATCH`; `v2:src/app/api/admin/teams/[id]/activities/[activityId]/route.ts:9 PATCH`; `v2:src/app/api/admin/teams/[id]/activities/[activityId]/route.ts:162 DELETE`.

Literal consumers: `main:src/components/modules/admin/team-activity-planner.tsx:109 (activityRequest)`; `v2:src/components/modules/admin/team-activity-planner.tsx:109 (activityRequest)`.

## /api/admin/teams/[id]/activities

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/[id]/activities`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/teams/[id]/activities/route.ts:12 GET`; `main:src/app/api/admin/teams/[id]/activities/route.ts:50 POST`; `v2:src/app/api/admin/teams/[id]/activities/route.ts:9 GET`; `v2:src/app/api/admin/teams/[id]/activities/route.ts:105 POST`.

Literal consumers: `main:src/components/modules/admin/team-activity-planner.tsx:79 (activityRequest)`; `main:src/components/modules/admin/team-activity-planner.tsx:85 (activityRequest)`; `v2:src/components/modules/admin/team-activity-planner.tsx:79 (activityRequest)`; `v2:src/components/modules/admin/team-activity-planner.tsx:85 (activityRequest)`.

## /api/admin/teams/[id]/chat

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/[id]/chat`.

Source methods: v2: GET, POST.

Evidence: `v2:src/app/api/admin/teams/[id]/chat/route.ts:31 GET`; `v2:src/app/api/admin/teams/[id]/chat/route.ts:114 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/teams/[id]/documents

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/[id]/documents`.

Source methods: v2: GET, POST.

Evidence: `v2:src/app/api/admin/teams/[id]/documents/route.ts:22 GET`; `v2:src/app/api/admin/teams/[id]/documents/route.ts:38 POST`.

Literal consumers: `v2:src/components/modules/admin/collaboration-teams-page.tsx:126 (request)`; `v2:src/components/modules/admin/collaboration-teams-page.tsx:160 (request)`.

## /api/admin/teams/[id]/members/[memberId]

**C15 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/teams/[id]/members/[memberId]`.

Source methods: main: PATCH, DELETE.

Evidence: `main:src/app/api/admin/teams/[id]/members/[memberId]/route.ts:35 PATCH`; `main:src/app/api/admin/teams/[id]/members/[memberId]/route.ts:102 DELETE`.

Literal consumers: `main:src/components/modules/admin/collaboration-teams-page.tsx:156 (request)`; `v2:src/components/modules/admin/collaboration-teams-page.tsx:147 (request)`.

## /api/admin/teams/[id]/members

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/[id]/members`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/admin/teams/[id]/members/route.ts:48 GET`; `main:src/app/api/admin/teams/[id]/members/route.ts:112 POST`; `v2:src/app/api/admin/teams/[id]/members/route.ts:12 GET`; `v2:src/app/api/admin/teams/[id]/members/route.ts:49 POST`.

Literal consumers: `main:src/components/modules/admin/collaboration-teams-page.tsx:135 (request)`; `main:src/components/modules/admin/collaboration-teams-page.tsx:141 (request)`; `v2:src/components/modules/admin/collaboration-teams-page.tsx:120 (request)`; `v2:src/components/modules/admin/collaboration-teams-page.tsx:132 (request)`.

## /api/admin/teams/[id]

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/[id]`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/teams/[id]/route.ts:14 GET`; `v2:src/app/api/admin/teams/[id]/route.ts:10 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/teams/can-manage

**C15 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/admin/teams/can-manage`.

Source methods: main: GET.

Evidence: `main:src/app/api/admin/teams/can-manage/route.ts:14 GET`.

Literal consumers: `main:src/components/modules/admin/collaboration-teams-page.tsx:90 (request)`.

## /api/admin/teams/members/[membershipId]

**C15 / C00** — resolve legacy membership ID to scoped team/member; same conditional end service. Canonical: `/api/admin/teams/[id]/members/[memberId]`.

Source methods: main: DELETE; v2: DELETE.

Evidence: `main:src/app/api/admin/teams/members/[membershipId]/route.ts:11 DELETE`; `v2:src/app/api/admin/teams/members/[membershipId]/route.ts:11 DELETE`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/admin/teams

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/admin/teams/route.ts:26 GET`; `v2:src/app/api/admin/teams/route.ts:7 GET`.

Literal consumers: `main:src/components/modules/content-planner/content-planner-page.tsx:218 (request)`; `v2:src/components/modules/content-planner/content-planner-page.tsx:246 (request)`; `v2:src/components/modules/content-planner/mobile-content-planner-page.tsx:221 (fetch)`.

## /api/admin/teams/ui-context

**C15 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/teams/ui-context`.

Source methods: v2: GET.

Evidence: `v2:src/app/api/admin/teams/ui-context/route.ts:10 GET`.

Literal consumers: `v2:src/components/modules/admin/collaboration-teams-page.tsx:77 (request)`.

## /api/admin/users/[id]

**C03 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/admin/users/[id]`.

Source methods: main: PATCH, DELETE; v2: PATCH, DELETE.

Evidence: `main:src/app/api/admin/users/[id]/route.ts:40 PATCH`; `main:src/app/api/admin/users/[id]/route.ts:313 DELETE`; `v2:src/app/api/admin/users/[id]/route.ts:36 PATCH`; `v2:src/app/api/admin/users/[id]/route.ts:287 DELETE`.

Literal consumers: `main:src/components/modules/admin/access-provisioning-page.tsx:388 (fetch)`; `main:src/components/modules/admin/access-provisioning-page.tsx:413 (fetch)`; `main:src/components/modules/admin/people-page.tsx:1181 (fetch)`; `main:src/components/modules/admin/people-page.tsx:334 (fetch)`; `main:src/components/modules/admin/users-page.tsx:276 (fetch)`; `main:src/components/modules/admin/users-page.tsx:305 (fetch)`; `main:src/components/modules/admin/users-page.tsx:328 (fetch)`; `v2:src/components/modules/admin/access-provisioning-page.tsx:388 (fetch)`; `v2:src/components/modules/admin/access-provisioning-page.tsx:413 (fetch)`; `v2:src/components/modules/admin/people-page.tsx:1181 (fetch)`; `v2:src/components/modules/admin/people-page.tsx:334 (fetch)`; `v2:src/components/modules/admin/users-page.tsx:276 (fetch)`; `v2:src/components/modules/admin/users-page.tsx:305 (fetch)`; `v2:src/components/modules/admin/users-page.tsx:328 (fetch)`.

## /api/announcements

**C20 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/announcements`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/announcements/route.ts:40 GET`; `main:src/app/api/announcements/route.ts:127 POST`; `v2:src/app/api/announcements/route.ts:40 GET`; `v2:src/app/api/announcements/route.ts:132 POST`.

Literal consumers: `main:src/components/modules/admin/announcements-page.tsx:210 (fetch)`; `main:src/components/modules/guardian/guardian-announcements-page.tsx:163 (fetch)`; `main:src/components/modules/student/student-announcements-page.tsx:136 (fetch)`; `v2:src/components/modules/admin/announcements-page.tsx:210 (fetch)`; `v2:src/components/modules/admin/mobile-notifications-page.tsx:117 (fetch)`; `v2:src/components/modules/guardian/guardian-announcements-page.tsx:163 (fetch)`; `v2:src/components/modules/student/student-announcements-page.tsx:136 (fetch)`.

## /api/calling/assignments

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/assignments`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/calling/assignments/route.ts:17 POST`; `v2:src/app/api/calling/assignments/route.ts:8 POST`.

Literal consumers: `main:src/app/admin/calling/campaigns/[id]/page.tsx:148 (fetch)`; `v2:src/app/admin/calling/campaigns/[id]/page.tsx:225 (fetch)`; `v2:src/app/admin/calling/campaigns/[id]/page.tsx:264 (fetch)`.

## /api/calling/campaigns/[id]/assignment-options

**C13 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/calling/campaigns/[id]/assignment-options`.

Source methods: main: GET.

Evidence: `main:src/app/api/calling/campaigns/[id]/assignment-options/route.ts:14 GET`.

Literal consumers: `main:src/app/admin/calling/campaigns/[id]/page.tsx:139 (fetch)`.

## /api/calling/campaigns/[id]/leads

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/campaigns/[id]/leads`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/calling/campaigns/[id]/leads/route.ts:38 GET`; `v2:src/app/api/calling/campaigns/[id]/leads/route.ts:11 GET`.

Literal consumers: `v2:src/app/admin/calling/campaigns/[id]/page.tsx:160 (fetch)`; `v2:src/components/modules/admin/mobile-calling-page.tsx:41 (read)`.

## /api/calling/campaigns/[id]

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/campaigns/[id]`.

Source methods: main: GET, PATCH; v2: GET, PATCH, DELETE.

Evidence: `main:src/app/api/calling/campaigns/[id]/route.ts:12 GET`; `main:src/app/api/calling/campaigns/[id]/route.ts:48 PATCH`; `v2:src/app/api/calling/campaigns/[id]/route.ts:12 GET`; `v2:src/app/api/calling/campaigns/[id]/route.ts:57 PATCH`; `v2:src/app/api/calling/campaigns/[id]/route.ts:79 DELETE`.

Literal consumers: `main:src/app/admin/calling/campaigns/[id]/page.tsx:119 (fetch)`; `v2:src/app/admin/calling/_client.tsx:119 (fetch)`; `v2:src/app/admin/calling/_client.tsx:145 (fetch)`; `v2:src/app/admin/calling/campaigns/[id]/page.tsx:152 (fetch)`.

## /api/calling/campaigns

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/campaigns`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/calling/campaigns/route.ts:8 GET`; `main:src/app/api/calling/campaigns/route.ts:41 POST`; `v2:src/app/api/calling/campaigns/route.ts:8 GET`; `v2:src/app/api/calling/campaigns/route.ts:49 POST`.

Literal consumers: `main:src/app/admin/calling/_client.tsx:101 (fetch)`; `main:src/app/admin/calling/_client.tsx:123 (fetch)`; `v2:src/app/admin/calling/_client.tsx:76 (fetch)`; `v2:src/app/admin/calling/_client.tsx:98 (fetch)`.

## /api/calling/export

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/export`.

Source methods: v2: GET.

Evidence: `v2:src/app/api/calling/export/route.ts:7 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/calling/interactions

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/interactions`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/calling/interactions/route.ts:7 POST`; `v2:src/app/api/calling/interactions/route.ts:7 POST`.

Literal consumers: `main:src/components/calling/CallInteractionModal.tsx:52 (fetch)`; `v2:src/components/calling/CallInteractionModal.tsx:52 (fetch)`; `v2:src/components/modules/admin/mobile-calling-page.tsx:48 (fetch)`.

## /api/calling/templates/[id]/status

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/templates/[id]/status`.

Source methods: main: PATCH; v2: PATCH.

Evidence: `main:src/app/api/calling/templates/[id]/status/route.ts:12 PATCH`; `v2:src/app/api/calling/templates/[id]/status/route.ts:12 PATCH`.

Literal consumers: `main:src/app/admin/calling/templates/_client.tsx:78 (fetch)`; `v2:src/app/admin/calling/templates/_client.tsx:78 (fetch)`.

## /api/calling/templates

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/templates`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/calling/templates/route.ts:8 GET`; `main:src/app/api/calling/templates/route.ts:41 POST`; `v2:src/app/api/calling/templates/route.ts:8 GET`; `v2:src/app/api/calling/templates/route.ts:41 POST`.

Literal consumers: `main:src/app/admin/calling/templates/_client.tsx:53 (fetch)`; `main:src/app/admin/calling/templates/_client.tsx:58 (fetch)`; `v2:src/app/admin/calling/templates/_client.tsx:53 (fetch)`; `v2:src/app/admin/calling/templates/_client.tsx:58 (fetch)`; `v2:src/components/modules/admin/mobile-calling-page.tsx:42 (read)`.

## /api/calling/templates/use

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/templates/use`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/calling/templates/use/route.ts:8 POST`; `v2:src/app/api/calling/templates/use/route.ts:7 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/calling/ui-context

**C13 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/calling/ui-context`.

Source methods: main: GET.

Evidence: `main:src/app/api/calling/ui-context/route.ts:15 GET`.

Literal consumers: `main:src/app/admin/calling/_client.tsx:87 (fetch)`; `main:src/app/admin/calling/campaigns/[id]/page.tsx:110 (fetch)`.

## /api/calling/workloads

**C13 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/calling/workloads`.

Source methods: v2: GET.

Evidence: `v2:src/app/api/calling/workloads/route.ts:7 GET`.

Literal consumers: `v2:src/app/admin/calling/campaigns/[id]/page.tsx:166 (fetch)`.

## /api/city-head/dashboard

**C11 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/city-head/dashboard`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/city-head/dashboard/route.ts:19 GET`; `v2:src/app/api/city-head/dashboard/route.ts:19 GET`.

Literal consumers: `main:src/components/modules/city-head/city-head-dashboard.tsx:142 (fetch)`; `v2:src/components/modules/city-head/city-head-dashboard.tsx:142 (fetch)`; `v2:src/components/modules/city-head/mobile-city-head-dashboard.tsx:64 (fetch)`.

## /api/events/[id]/registrations

**C07 / C00** — legacy adapter to canonical registration service; reject client flags/action check-in. Canonical: `/api/admin/events/[id]/registrations`.

Source methods: v2: GET, POST.

Evidence: `v2:src/app/api/events/[id]/registrations/route.ts:16 GET`; `v2:src/app/api/events/[id]/registrations/route.ts:112 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/guardian/dashboard

**C19 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/guardian/dashboard`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/guardian/dashboard/route.ts:56 GET`; `v2:src/app/api/guardian/dashboard/route.ts:56 GET`.

Literal consumers: `main:src/components/modules/guardian/guardian-dashboard.tsx:168 (fetch)`; `main:src/components/modules/guardian/guardian-history-page.tsx:171 (fetch)`; `v2:src/components/modules/guardian/guardian-dashboard.tsx:99 (fetch)`; `v2:src/components/modules/guardian/guardian-history-page.tsx:171 (fetch)`; `v2:src/components/modules/guardian/mobile-guardian-dashboard.tsx:79 (fetch)`.

## /api/guardian/schedule

**C12 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/guardian/schedule`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/guardian/schedule/route.ts:16 GET`; `v2:src/app/api/guardian/schedule/route.ts:16 GET`.

Literal consumers: `main:src/components/modules/guardian/guardian-schedule-page.tsx:92 (fetch)`; `v2:src/components/modules/guardian/guardian-schedule-page.tsx:92 (fetch)`.

## /api/park/attendance/[eventId]/close

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/[eventId]/close`.

Source methods: main: PATCH; v2: PATCH.

Evidence: `main:src/app/api/park/attendance/[eventId]/close/route.ts:10 PATCH`; `v2:src/app/api/park/attendance/[eventId]/close/route.ts:12 PATCH`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:393 (fetch)`; `main:src/components/modules/park/park-dashboard.tsx:337 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:403 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:366 (fetch)`; `v2:src/components/modules/park/park-dashboard.tsx:337 (fetch)`.

## /api/park/attendance/[eventId]/records/[recordId]

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/[eventId]/records/[recordId]`.

Source methods: main: PATCH; v2: PATCH.

Evidence: `main:src/app/api/park/attendance/[eventId]/records/[recordId]/route.ts:14 PATCH`; `v2:src/app/api/park/attendance/[eventId]/records/[recordId]/route.ts:10 PATCH`.

Literal consumers: `main:src/components/shared/attendance-edit-dialog.tsx:123 (fetch)`; `v2:src/components/shared/attendance-edit-dialog.tsx:123 (fetch)`.

## /api/park/attendance/[eventId]/reset

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/[eventId]/reset`.

Source methods: main: DELETE; v2: DELETE.

Evidence: `main:src/app/api/park/attendance/[eventId]/reset/route.ts:8 DELETE`; `v2:src/app/api/park/attendance/[eventId]/reset/route.ts:7 DELETE`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:368 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:378 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:343 (fetch)`.

## /api/park/attendance/[eventId]

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/[eventId]`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/park/attendance/[eventId]/route.ts:11 GET`; `main:src/app/api/park/attendance/[eventId]/route.ts:141 POST`; `v2:src/app/api/park/attendance/[eventId]/route.ts:15 GET`; `v2:src/app/api/park/attendance/[eventId]/route.ts:152 POST`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:284 (fetch)`; `main:src/hooks/use-attendance-sync.ts:56 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:283 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:225 (fetch)`.

## /api/park/attendance/[eventId]/staff

**C10 / C00** — legacy historical GET adapter; POST gated until explicit canonical staff-session mapping. Canonical: `/api/park/attendance/[eventId]/staff`.

Source methods: main: GET, POST.

Evidence: `main:src/app/api/park/attendance/[eventId]/staff/route.ts:13 GET`; `main:src/app/api/park/attendance/[eventId]/staff/route.ts:62 POST`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/park/attendance/check-alerts

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/check-alerts`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/park/attendance/check-alerts/route.ts:7 POST`; `v2:src/app/api/park/attendance/check-alerts/route.ts:8 POST`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:284 (fetch)`; `main:src/hooks/use-attendance-sync.ts:56 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:283 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:225 (fetch)`.

## /api/park/attendance/events

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/events`.

Source methods: main: POST, GET; v2: POST, GET.

Evidence: `main:src/app/api/park/attendance/events/route.ts:11 POST`; `main:src/app/api/park/attendance/events/route.ts:110 GET`; `v2:src/app/api/park/attendance/events/route.ts:10 POST`; `v2:src/app/api/park/attendance/events/route.ts:91 GET`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:284 (fetch)`; `main:src/components/modules/park/park-attendance-page.tsx:98 (fetch)`; `main:src/hooks/use-attendance-sync.ts:56 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:283 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:225 (fetch)`.

## /api/park/attendance

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/park/attendance/route.ts:24 GET`; `main:src/app/api/park/attendance/route.ts:258 POST`; `v2:src/app/api/park/attendance/route.ts:24 GET`; `v2:src/app/api/park/attendance/route.ts:111 POST`.

Literal consumers: `main:src/components/modules/park/park-attendance-page.tsx:87 (fetch)`.

## /api/park/attendance/sync

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/sync`.

Source methods: main: POST; v2: POST.

Evidence: `main:src/app/api/park/attendance/sync/route.ts:16 POST`; `v2:src/app/api/park/attendance/sync/route.ts:6 POST`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:284 (fetch)`; `main:src/components/modules/park/attendance-roster.tsx:331 (fetch)`; `main:src/hooks/use-attendance-sync.ts:159 (fetch)`; `main:src/hooks/use-attendance-sync.ts:56 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:283 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:225 (fetch)`; `v2:src/lib/offline/sync-attendance.ts:23 (fetch)`.

## /api/park/attendance/warnings

**C09 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/attendance/warnings`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/park/attendance/warnings/route.ts:14 GET`; `v2:src/app/api/park/attendance/warnings/route.ts:15 GET`.

Literal consumers: `main:src/components/modules/park/attendance-roster.tsx:284 (fetch)`; `main:src/components/modules/park/attendance-roster.tsx:298 (fetch)`; `main:src/hooks/use-attendance-sync.ts:56 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:283 (fetch)`; `v2:src/components/modules/park/attendance-roster.tsx:301 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:225 (fetch)`.

## /api/park/dashboard

**C11 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/dashboard`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/park/dashboard/route.ts:17 GET`; `v2:src/app/api/park/dashboard/route.ts:19 GET`.

Literal consumers: `main:src/components/modules/park/park-dashboard.tsx:326 (fetch)`; `v2:src/components/modules/murabbi/mobile-murabbi-dashboard.tsx:61 (fetch)`; `v2:src/components/modules/park/mobile-park-dashboard.tsx:61 (fetch)`; `v2:src/components/modules/park/park-dashboard.tsx:326 (fetch)`.

## /api/park/guardians

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/guardians`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/park/guardians/route.ts:27 GET`; `main:src/app/api/park/guardians/route.ts:290 POST`; `v2:src/app/api/park/guardians/route.ts:27 GET`; `v2:src/app/api/park/guardians/route.ts:290 POST`.

Literal consumers: `main:src/components/modules/park/park-guardians-page.tsx:243 (fetch)`; `main:src/components/modules/park/park-guardians-page.tsx:709 (fetch)`; `v2:src/components/modules/park/park-guardians-page.tsx:243 (fetch)`; `v2:src/components/modules/park/park-guardians-page.tsx:709 (fetch)`.

## /api/park/participants

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/participants`.

Source methods: main: GET, POST; v2: GET, POST.

Evidence: `main:src/app/api/park/participants/route.ts:33 GET`; `main:src/app/api/park/participants/route.ts:347 POST`; `v2:src/app/api/park/participants/route.ts:33 GET`; `v2:src/app/api/park/participants/route.ts:347 POST`.

Literal consumers: `main:src/components/modules/park/park-participants-page.tsx:356 (fetch)`; `main:src/components/modules/park/park-participants-page.tsx:864 (fetch)`; `v2:src/components/modules/park/park-participants-page.tsx:356 (fetch)`; `v2:src/components/modules/park/park-participants-page.tsx:864 (fetch)`.

## /api/park/roster

**C17 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/roster`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/park/roster/route.ts:30 GET`; `v2:src/app/api/park/roster/route.ts:30 GET`.

Literal consumers: `main:src/components/modules/park/park-roster-page.tsx:797 (fetch)`; `v2:src/components/modules/park/park-roster-page.tsx:797 (fetch)`.

## /api/park/staff-attendance/[eventId]/close

**C10 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/staff-attendance/[eventId]/close`.

Source methods: v2: PATCH.

Evidence: `v2:src/app/api/park/staff-attendance/[eventId]/close/route.ts:9 PATCH`.

Literal consumers: `v2:src/components/modules/park/mobile-attendance-page.tsx:446 (fetch)`; `v2:src/components/modules/park/park-attendance-page.tsx:512 (fetch)`.

## /api/park/staff-attendance/[eventId]

**C10 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/staff-attendance/[eventId]`.

Source methods: v2: GET, PATCH.

Evidence: `v2:src/app/api/park/staff-attendance/[eventId]/route.ts:32 GET`; `v2:src/app/api/park/staff-attendance/[eventId]/route.ts:62 PATCH`.

Literal consumers: `v2:src/components/modules/park/mobile-attendance-page.tsx:279 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:428 (fetch)`; `v2:src/components/modules/park/park-attendance-page.tsx:490 (fetch)`; `v2:src/components/modules/park/park-attendance-page.tsx:499 (fetch)`.

## /api/park/staff-attendance

**C10 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/park/staff-attendance`.

Source methods: v2: GET, POST.

Evidence: `v2:src/app/api/park/staff-attendance/route.ts:52 GET`; `v2:src/app/api/park/staff-attendance/route.ts:89 POST`.

Literal consumers: `v2:src/components/modules/park/mobile-attendance-page.tsx:258 (fetch)`; `v2:src/components/modules/park/mobile-attendance-page.tsx:410 (fetch)`; `v2:src/components/modules/park/park-attendance-page.tsx:106 (fetch)`; `v2:src/components/modules/park/park-attendance-page.tsx:168 (fetch)`.

## /api/reports/attendance/class-stats

**C11 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/reports/attendance/class-stats`.

Source methods: main: GET.

Evidence: `main:src/app/api/reports/attendance/class-stats/route.ts:24 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/reports/attendance/murabbi-summary

**C11 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/reports/attendance/murabbi-summary`.

Source methods: main: GET.

Evidence: `main:src/app/api/reports/attendance/murabbi-summary/route.ts:24 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/reports/attendance/student-summary

**C11 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/reports/attendance/student-summary`.

Source methods: main: GET.

Evidence: `main:src/app/api/reports/attendance/student-summary/route.ts:25 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/search

**C02 / C00** — restore main endpoint under reviewed clause. Canonical: `/api/search`.

Source methods: main: GET.

Evidence: `main:src/app/api/search/route.ts:105 GET`.

Literal consumers: none detected; retain direct-API acceptance and trace indirect consumers before implementation.

## /api/student/attendance-history

**C19 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/student/attendance-history`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/student/attendance-history/route.ts:28 GET`; `v2:src/app/api/student/attendance-history/route.ts:28 GET`.

Literal consumers: `main:src/components/modules/student/student-history-page.tsx:158 (fetch)`; `v2:src/components/modules/student/student-history-page.tsx:158 (fetch)`.

## /api/student/dashboard

**C19 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/student/dashboard`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/student/dashboard/route.ts:18 GET`; `v2:src/app/api/student/dashboard/route.ts:18 GET`.

Literal consumers: `main:src/components/modules/student/student-dashboard.tsx:238 (fetch)`; `v2:src/components/modules/student/mobile-student-dashboard.tsx:66 (fetch)`; `v2:src/components/modules/student/student-dashboard.tsx:238 (fetch)`.

## /api/student/schedule

**C12 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/student/schedule`.

Source methods: main: GET; v2: GET.

Evidence: `main:src/app/api/student/schedule/route.ts:16 GET`; `v2:src/app/api/student/schedule/route.ts:16 GET`.

Literal consumers: `main:src/components/modules/student/student-schedule-page.tsx:146 (fetch)`; `v2:src/components/modules/student/student-schedule-page.tsx:146 (fetch)`.

## /api/user/profile

**C03 / C00** — retain v2 path/shape except explicit clause changes. Canonical: `/api/user/profile`.

Source methods: main: GET, PATCH; v2: GET, PATCH.

Evidence: `main:src/app/api/user/profile/route.ts:31 GET`; `main:src/app/api/user/profile/route.ts:106 PATCH`; `v2:src/app/api/user/profile/route.ts:31 GET`; `v2:src/app/api/user/profile/route.ts:108 PATCH`.

Literal consumers: `main:src/components/modules/admin/settings-page.tsx:110 (fetch)`; `main:src/components/modules/admin/settings-page.tsx:89 (fetch)`; `main:src/components/modules/student/student-profile-page.tsx:110 (fetch)`; `main:src/components/modules/student/student-profile-page.tsx:119 (fetch)`; `v2:src/components/modules/admin/settings-page.tsx:110 (fetch)`; `v2:src/components/modules/admin/settings-page.tsx:89 (fetch)`; `v2:src/components/modules/student/mobile-student-profile-view.tsx:27 (readJson)`.
