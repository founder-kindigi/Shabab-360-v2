# SEC-005: Upload Disable Consumer Audit

**Task:** SEC-005
**Owner:** DeepSeek
**Status:** Draft — pending Codex review
**Created:** 2026-07-22
**Scope:** Audit all current client and server consumers of `api/upload/document`
and `api/upload/avatar` to confirm whether SEC-002 (disable document upload)
and SEC-004 (disable avatar upload) break any existing UI or action.

**Methodology:** Searched the `codex/production-hardening` branch at commit
`2a3fcc7` for UI components, API route callers, and server-side imports
referencing either upload route. Reviewed historical documentation for
previously existing consumer components.

---

## 1. Current Consumer State

### 1.1 UI Callers

The base branch (`2a3fcc7`) contains **zero** UI components that call either
upload route.

| Suspected caller | Found on base branch? | Evidence |
|-----------------|----------------------|----------|
| `components/shared/avatar-upload.tsx` | **Not found** | Does not exist in `git ls-tree` at `2a3fcc7`. Present only in historical worktrees and archived documentation. |
| `components/shared/document-upload.tsx` | **Not found** | Same — exists in `worktrees/hierarchy-phase-b/` history but not on base. |
| Any `fetch()`, `axios`, or direct `XMLHttpRequest` to `api/upload/...` | **Not found** | `git grep` for `api/upload`, `uploadDocument`, `uploadAvatar`, `document-upload`, `avatar-upload` in `*.ts` `*.tsx` returns zero matches at `2a3fcc7`. |

### 1.2 API Route Files

Both route files exist and are importable but have no internal consumers:

| Route | File on branch | Imported by any other file? |
|-------|---------------|----------------------------|
| `api/upload/document` (POST/GET/DELETE) | `src/app/api/upload/document/route.ts` | No — no other file imports this module. |
| `api/upload/avatar` (POST/GET) | `src/app/api/upload/avatar/route.ts` | No — no other file imports this module. |

### 1.3 Historical Context

The `RUNTIME-001` task (`docs/TASK_BACKLOG.md` line 27) explicitly removed
upload UI components from the current branch:

> "Unsupported avatar and admission-document upload controls, local avatar
> persistence, and calls to missing upload APIs are removed; the UI uses
> initials and explicitly defers documents until private Supabase Storage is
> configured."

The `agent-ctx/14-file-upload-system.md` and `reviews/ui_to_api_integration_map.md`
reference the `avatar-upload.tsx` and `document-upload.tsx` components as callers,
but these documents describe a previous architectural state (stored in
`worktrees/hierarchy-phase-b/`). No corresponding source files exist on the
base branch today.

---

## 2. Breakage Impact

**Assessment: No UI or action is broken by SEC-002 or SEC-004.**

Both routes were **already unreachable from the application UI** before either
disable commit was applied. The avatar upload route was called by
`avatar-upload.tsx` (Settings page profile picture), which was removed in a
prior hardening pass. The document upload route was called by
`document-upload.tsx` (admission documents, announcement attachments), which
was also removed.

| Before SEC-002/004 | After SEC-002/004 | Impact |
|-------------------|-------------------|--------|
| Both routes existed but had no UI caller | Both routes return 503 (authenticated) or 401 (unauthenticated) | **None** — no caller to break |
| Route files contained ~220 lines with filesystem imports and MIME-only validation | Route files are ~18 lines with auth + 503 only | **Improved** — attack surface removed |
| Avatar metadata was readable cross-user via `?userId=` GET param | GET returns 503 | **None** — no UI called this endpoint |

---

## 3. Required Safe UX for 503

No UX changes are needed because no consumer exists. However, if a future
task reintroduces upload UI components, the 503 response must be handled:

| Scenario | Handling |
|----------|----------|
| Upload button clicked → 503 | Show a toast or inline message: "File upload is temporarily unavailable." |
| Avatar change → 503 | Show fallback initials. Display message: "Profile pictures are not available yet." |
| Document list attempted → 503 | Show empty state: "Document storage is not yet configured." |
| Any 503 response body | `{ "error": "...temporarily disabled..." }` — display the error string in UI |

**Important:** No UI component should attempt filesystem workarounds
(localStorage blobs, IndexedDB file storage). The disable is intentional and
should be surface-level only.

---

## 4. Stale User-Facing Upload Promises

| Location | Stale promise | Action |
|----------|--------------|--------|
| `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` line 819 | "Do not accept real document/avatar uploads until private storage is complete." | ✅ Already aligned — the disable implements this rule. |
| `docs/OPERATIONS_RUNBOOK.md` line 26 | "Avatar and document uploads remain disabled until private object storage is approved." | ✅ Already aligned. |
| `docs/TASK_BACKLOG.md` line 27 | "Calls to missing upload APIs are removed; the UI uses initials and explicitly defers documents." | ✅ Already executed — no UI caller exists. |
| `src/app/api/upload/avatar/route.ts` | File comment implied filesystem storage was intended | The old code has been replaced by the disabled handler — no stale promise remains. |
| `src/app/api/upload/document/route.ts` | Same — old code had ALLOWED_TYPES, MAX_SIZE, readMeta functions implying active storage | Replaced by disabled handler. |

---

## 5. Temporary Filesystem Workarounds

No temporary filesystem workaround is proposed or recommended. The disable
is intentional — both SEC-002 and SEC-004 eliminate filesystem reads/writes
entirely and return a safe 503. Re-enabling uploads requires the managed
durable storage solution specified below.

---

## 6. Future Durable-Private-Storage Acceptance Checklist

When uploads are re-enabled, the implementation must satisfy all of the
following before returning anything other than 503:

### 6.1 Storage Provider

- [ ] Backed by Supabase Storage (or equivalent managed object storage).
- [ ] Files are stored with server-authorised access (signed URLs with expiry).
- [ ] Files are **not** stored in Vercel's ephemeral `public/` filesystem.
- [ ] No file is accessible via a public URL without authorisation.
- [ ] File lifecycle: TTL or explicit cleanup on record deletion.

### 6.2 Entity Authorization

- [ ] `entityType` is validated against a server-side allowlist.
- [ ] The requesting user's scope (city/park/group) covers the target entity.
- [ ] Cross-entity reads return 403.
- [ ] Cross-entity deletes return 403.
- [ ] Capability gates match the operation (e.g. `organisation.manage` for upload/delete, `organisation.view` for read).

### 6.3 File Validation

- [ ] File content verified by magic bytes, not just MIME type.
- [ ] File size bounded by server-enforced limit.
- [ ] File name validated against a safe regex pattern.
- [ ] Empty files (0 bytes) rejected.
- [ ] Polyglot files (valid PDF + appended payload) rejected or detected.

### 6.4 Error and Audit

- [ ] All upload/delete mutations recorded in the audit log.
- [ ] Error responses never leak internal details, stack traces, or file paths.
- [ ] 503 remains as a fallback response anywhere the storage provider is unreachable.
- [ ] A readiness endpoint or config flag allows the frontend to show/hide upload UI without calling a 503 route first.

---

## 7. Handoff

```
Task ID: SEC-005
Branch and base commit: agent/deepseek/SEC-005-upload-disable-consumer-audit @ 2a3fcc7
Commit SHA: (pending)
Changed files: docs/product-discovery/SEC-005-UPLOAD-DISABLE-CONSUMER-AUDIT.md
What changed:
  - Confirmed zero UI consumers exist for either upload route on the base
    branch. avatar-upload.tsx and document-upload.tsx were removed in a prior
    hardening pass (RUNTIME-001) and exist only in historical worktrees.
  - No server-side file imports either route module.
  - SEC-002 (document upload) and SEC-004 (avatar upload) break zero callers.
  - Required safe UX for 503 documented for future re-enablement.
  - Stale upload promises aligned — the disable is consistent with existing
    documentation (Blueprint, Runbook, Task Backlog).
  - No temporary filesystem workaround proposed.
  - Future durable-private-storage acceptance checklist provided (storage
    provider, entity auth, file validation, error/audit).
What was intentionally excluded:
  - No application code, tests, schemas, migrations, deployment, .env, or
    data changes.
Commands run and results:
  - git diff --check: pass
Known risks, owner decisions, and follow-up work:
  - None. No breakage found.
Ready for Codex review.
```
