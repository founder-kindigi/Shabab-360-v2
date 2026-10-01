# ATT01 production Team Access provisioning — design

Date: 2026-09-18. Owner: Astra. Status: **design + guarded preflight candidate;
no live provisioning path is authorized.** Nothing here was run against a database.

No production or staging system, database, account, password, credential or handoff
was read, created, modified or contacted while producing this design. Every example
uses synthetic values on the reserved `example.invalid` domain.

## 1. Current-contract findings

| Area | Current state |
| --- | --- |
| Persisted roles | Nine internal names: `super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi`, `muawin`, `student`, `guardian` (`src/types` `UserRole`, mirrored by `PRODUCT_ROLE_LABELS`). Product labels: System Owner, Program Head, City Head, Park Lead, Park Admin, Murabbi, Muawin, Shabab, Guardian. |
| User record | `users`: `id`, `email` (unique), `passwordHash`, `name?`, `phone?`, `mustResetPwd` (default true), `tokenVersion` (default 0), `isActive` (default true), timestamps. |
| Staff record | `staff_meta`: `id`, `userId` (unique), `role`, `assignedCityId?`, `assignedParkId?`, `assignedGroupId?`, `assistsMurabbiId?`, `isActive`, timestamps. Relation set is what carries scope. |
| Scope relations | `assignedCity → City`, `assignedPark → Park`, `assignedGroup → Group`, `assistsMurabbi → StaffMeta` (`onDelete: SetNull`). Hierarchy is authoritative from `Group.parkId` with the batch park as a null fallback. |
| Existing local tools | `scripts/provision-lahore-team-access.ts` (roles `murabbi`, `muawin`, `park_lead`, plus `unassigned`) and `scripts/provision-local-city-head.ts` (single `city_head` pinned to Lahore `LHR`). Both **require `--target sqlite` and refuse PostgreSQL**, refuse URLs/UNC paths, default to a read-only preflight, require an explicit confirmation flag plus a backup directory, and verify a file-level backup before writing. |
| Password handling | 24 random bytes base64url, bcrypt cost 12. The plaintext exists only in memory and in the DPAPI handoff. `writeDpapiHandoff` requires Windows, encrypts with `DataProtectionScope::CurrentUser`, writes mode `0600`, and is called **before** any account activation — a handoff failure leaves every account inactive. Plaintext is never written to disk or printed. |
| Audit / receipts | The local provisioners do not emit `audit_log` rows; `operation_receipts` is for idempotent attendance writes, not provisioning. Production provisioning therefore needs explicit audit emission (section 8). |
| SQLite vs PostgreSQL | Both schemas declare the same `users`/`staff_meta` fields, including `assistsMurabbiId` with `onDelete: SetNull` and `@@index([assistsMurabbiId])`; the PostgreSQL migration adds the self-referential foreign key and SQLite does not. **No schema change is required by this design** — every field a production plan needs already exists in both models, so no migration is proposed. |
| Capability boundary | Capability grants never widen hierarchy scope; a missing assignment denies. Production provisioning must set real scope ids rather than relying on capabilities. |

## 2. Implementation status

Implemented now, in `src/lib/auth/production-access.ts` (no connection, no
environment read, no write):

- `buildAccessPlan(rows, lookup)` — pure planning against an operator-injected
  read-only lookup port; fails closed on every unresolved scope, unauthorized role
  or conflict.
- `summarizeAccessPlan(plan)` — aggregate-only dry-run projection.
- `assertAccessExecutionAuthorized(request)` — the execution gate.
- `applyAccessPlan(plan, ports)` — the protected-handoff-first ordering, driven by
  injected `AccessWritePorts`.

Deliberately **not** implemented, because the production contract is unresolved:

- no CLI entry point (a CLI must not be able to reach a database until the
  connection contract below is approved);
- no concrete PostgreSQL registry/writer and no connection handling;
- no audit emission inside a transaction;
- no account-disable/reissue implementation.

The existing local tools are unchanged; no shared safety defect was found in them.

## 3. Approved input format

One row per requested account, provided by an owner-approved source. The document
records the *shape* only and never real values.

```
ref,role,city,park,group,assists_ref
row-1,City Head,<approved city code>,,,
row-2,Park Lead,<approved city code>,<approved park>,,
row-3,Murabbi,<approved city code>,<approved park>,<approved group>,
row-4,Muawin,<approved city code>,<approved park>,,row-3
```

Rules:

- `ref` is an opaque row reference used in refusals and audit so no report needs an
  email. Real inputs never appear in this repository.
- `role` accepts the internal name or the product label, case-insensitively.
- `email` is an approved work email; a missing or malformed value is refused.
- All values are validated by strict schema before any lookup; unknown columns and
  unknown roles are refused rather than ignored.

## 4. Role-to-scope requirements and denial conditions

| Product label | Role | Required scope | Group | Denied when |
| --- | --- | --- | --- | --- |
| Program Head | `program_admin` | organisation | n/a | never for scope |
| City Head | `city_head` | city (pinned) | n/a | city not supplied, unknown or inactive |
| Park Lead | `park_lead` | city + park | optional (teaching) | park missing/unknown/inactive, or group not in that park |
| Park Admin | `park_admin` | city + park | never | park missing/unknown/inactive, or a group is supplied |
| Murabbi | `murabbi` | city + park | optional | park missing/unknown/inactive; without a group the account is active but group/attendance data stays denied |
| Muawin | `muawin` | city + park | **never** | park missing/unknown/inactive, any group supplied, or an invalid assistance target |
| Shabab | `student` | own participant record | n/a | refused by this path — created from participant records |
| Guardian | `guardian` | own children | n/a | refused by this path — created from guardian records |
| — | `super_admin` | — | — | always refused; it is a technical identity, never an operating account |

Refusal codes: `unknown_role`, `system_owner_role`, `non_staff_role`,
`missing_work_email`, `duplicate_email`, `city_required`, `city_not_found`,
`city_inactive`, `park_required`, `park_not_found`, `park_inactive`,
`group_not_allowed`, `group_not_found`, `assistance_not_allowed`,
`assistance_target_invalid`, `existing_account_conflict`.

A plan with any refusal is **not** applied (`applyAccessPlan` refuses). No partial
provisioning.

## 5. Duplicates and idempotency

- Two rows with the same normalized email in one request → the second is refused
  (`duplicate_email`); the first is planned.
- An existing account with the same role **and** the same city/park/group → outcome
  `already-configured`: no write, no password, no handoff entry. Re-running the same
  request is therefore a no-op.
- An existing account with a different role or different scope → refused
  (`existing_account_conflict`). The path never silently re-roles or re-scopes an
  account; that is a separate, separately authorized change.

## 6. Account activation rules

- A new account is created **active** only when: the role is staff-provisionable, an
  approved work email exists, the city/park/group scope resolves to an active record,
  and there is no conflicting existing account.
- `mustResetPwd` stays true so the recipient must replace the one-time password.
- `tokenVersion` starts at 0; deactivation later increments it to invalidate live
  sessions.
- The staff record carries the resolved `assignedCityId` / `assignedParkId` /
  `assignedGroupId` / `assistsMurabbiId`; a Muawin never receives a group.
- No account is created for a role that is not staff-provisionable, and no generic
  "admin" account path exists.

## 7. Password generation and encrypted per-recipient handoff

- One random password per planned account (`crypto.randomBytes(24).toString("base64url")`),
  hashed with bcrypt cost 12; the hash is what is persisted.
- The plaintext exists only in memory and inside the protected handoff. It is never
  returned by `applyAccessPlan`, never written to a log or report, and never printed.
- The handoff is written by an injected writer. The approved Windows implementation
  is `writeDpapiHandoff`, which uses `DataProtectionScope::CurrentUser`: the file can
  only be decrypted by the same Windows user on that machine, so the handoff must be
  produced and consumed by the intended operator account.
- **Ordering is enforced:** `applyAccessPlan` writes the protected handoff first and
  only then activates accounts. If the handoff throws, no activation runs at all.
- A later reviewed pass must decide whether the production handoff is one file per
  operator or one file per recipient; the current candidate only requires that every
  credential is protected before the first write.

## 8. Audit requirements

Each activated account must produce, **in the same transaction as the activation**:

- one `audit_log` row: `action = "access_provision"`, `entityType = "user"`,
  `entityId = <userId>`, `newValues = { role, assignedCityId, assignedParkId,
  assignedGroupId, hasAssistance }`, `reason = <owner approval reference>`;
- no email, phone, password, password hash or handoff content in the payload;
- a matching row for a deactivation (`action = "access_deactivate"`).

The audit write is part of the production writer that is not yet implemented; it is
a required condition of that writer, not an optional extra. Until it exists, a live
run must not proceed.

## 9. Dry-run output requirements

`summarizeAccessPlan` returns aggregates only:

- `mode: "dry-run"`, `writesPerformed: false`;
- `total`, `planned`, `alreadyConfigured`, `refused`;
- `countsByRole` for accounts that would be created;
- `refusalCodes` counted by code;
- `requiresProtectedHandoff`.

No ref, email, scope id, password or handoff content appears in the summary, and the
refusal list carries only `{ ref, code }`. A dry run performs zero writes and opens
zero connections.

## 10. Execution confirmation

`assertAccessExecutionAuthorized` requires all of:

1. `execute` is explicitly requested (default is dry run);
2. the exact acknowledgement `CONFIRM-PRODUCTION-TEAM-ACCESS` is supplied;
3. an explicit `--target postgres`.

Anything else is refused before any write. A plan containing a refusal is refused
even with a valid confirmation.

## 11. Rollback and account-disable process

- **Before any write:** abort; nothing to unwind.
- **Handoff or activation failure mid-run:** the desired contract is one transaction
  per account, so a failure affects only that account. The current candidate stops at
  the first activation error and reports how many accounts were activated; a partial
  run must be treated as partially applied, never assumed complete.
- **Whole-run rollback:** restore the verified pre-run backup (Gate B of the rollout
  runbook) and re-run the read-only verification.
- **Single account rollback:** deactivate, never delete — set `users.isActive = false`
  and `staff_meta.isActive = false` and increment `tokenVersion` so live sessions are
  invalidated; the audit action records it. Deletion is not used because attendance,
  audit and receipt history reference the identity.
- **Credential exposure:** reissue through the protected handoff (the local
  provisioner already has a guarded reissue path) and record the reason.

## 12. City Head creation and verification (city-only scope)

- A City Head row requires an approved city code; the plan resolves it to an **active**
  city and stores it as `assignedCityId`. No city, an unknown city, or an inactive
  city is refused — the account is never created with a null city.
- The City Head never receives a park or group, and never an assistance link.
- Verification (no credential ever shown): after activation, read back the account and
  confirm `role = city_head`, `assignedCityId` equals the approved city,
  `assignedParkId` and `assignedGroupId` are null, and `isActive` is true. Then, with
  the operator holding the decrypted credential, confirm the session reports
  city-scoped data only and that a cross-city identifier is denied.
- A City Head with a missing or foreign city must be denied by the server on every
  city-scoped surface; the provisioning check asserts the persisted assignment, and
  the smoke test asserts the denial.

## 13. Scope validation for the other roles

- **Park Lead / Park Admin:** city and park required; the park must belong to the
  resolved city (the lookup is city-scoped). A Park Lead may carry a teaching group;
  a Park Admin must not.
- **Murabbi:** city and park required; a group is optional. Without a group the
  account is active but denied group and attendance data until an assigned group
  exists; the plan marks this as `groupUndecided` so the operator sees it.
- **Muawin:** city and park required, **no group ever**; an optional assistance
  target must be an accepted Murabbi, or a Park Lead with a group, in the **same
  park**. Self-assistance and cross-park assistance are refused.
- **Shabab and Guardian:** not staff accounts. They are created from participant and
  guardian records; this path refuses them so an operator cannot accidentally create
  a staff account for a student or a guardian.
- Every role is additionally checked against the server-side scope rules at request
  time; provisioning only writes the assignment, it never widens it.

## 14. Prohibited actions and no-go conditions

Prohibited:

- creating a `super_admin` or any generic unrestricted administrator account;
- provisioning Shabab or Guardian through the staff path;
- assigning a group to a Muawin, or an assistance target outside the same park;
- printing, committing, logging or reporting a plaintext password, a handoff content,
  or a private workbook row;
- reading `.env` or embedding a connection string anywhere in the repository;
- writing before the protected handoff succeeds;
- running against production from this repository while the writer is unwired;
- deleting an account instead of deactivating it.

No-go conditions (do not start a live run):

- any refusal in the plan;
- no owner approval reference for the run;
- no verified, rehearsed backup;
- the protected-handoff writer or the audit writer is not available;
- the target is not explicitly `--target postgres`;
- the approved input contains an email that is not a real approved work address, or a
  role that is not staff-provisionable.

## 15. Owner decisions required before any live provisioning

1. **Connection contract** — how the operator supplies the production connection at
   run time (a flag, an injected runner, or an approved secret-manager reference),
   given this repository must never hold it.
2. **Writer ownership** — who owns the PostgreSQL writer that creates the `users` +
   `staff_meta` rows and the audit row in one transaction, and where it lives.
3. **Handoff granularity** — one handoff file per operator or per recipient.
4. **Audit retention and approval reference** — what the `reason` value must cite.
5. **Who may run it** — the named operator set and the approval record format.
6. **City Head operational confirmation** — the exact city code and the verification
   procedure for the first live City Head.

Until 1–5 are decided, the write path stays unwired and this remains a preflight.

## Non-claims

No live provisioning, account creation, password handling, migration, deployment or
external database contact occurred. This design does not authorize production access
provisioning, and the guarded candidate deliberately cannot reach a database.
