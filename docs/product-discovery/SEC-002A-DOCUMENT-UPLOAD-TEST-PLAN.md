# SEC-002A: Document Upload Security Test Plan

**Task:** SEC-002A
**Owner:** DeepSeek
**Status:** Draft — input for Codex SEC-002 implementation
**Created:** 2026-07-21
**Scope:** Test plan for the document-upload POST/GET/DELETE handlers at
`src/app/api/upload/document/route.ts`. Covers entity authorization, path
allowlisting, file validation, safe error handling, and Vercel compatibility.
Targets the SEC-001 findings (P1-0, P1-1) approved at commit `6c14e68`.

---

## 1. Current State

### Route: `src/app/api/upload/document/route.ts`

Three handlers, all calling `requireAuth()` only:

| Handler | Input source | Current validation | Missing |
|---------|-------------|-------------------|---------|
| `POST` | `formData`: `file`, `entityType`, `entityId` | MIME type in `ALLOWED_TYPES`, 5 MB `MAX_SIZE` | No capability/role/scope gate; `entityType` not allowlisted; MIME-only (no magic bytes); no file-name validation |
| `GET` | Query params: `entityType`, `entityId` | None beyond null check | No capability/role/scope gate; `entityType` not allowlisted |
| `DELETE` | Query params: `entityType`, `entityId`, `fileName` | None beyond null check | No capability/role/scope gate; `entityType` not allowlisted; `fileName` not validated |

**`ALLOWED_TYPES`:** `application/pdf`, `application/msword`,
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
`image/jpeg`, `image/png`

### Route: `src/app/api/upload/avatar/route.ts`

Same MIME-only pattern for JPEG/PNG/WebP, 2 MB limit, `requireAuth()` only.
Out of scope for this test plan unless otherwise noted, but follows the same
magic-byte and size-bound test patterns.

### Known callers

No UI caller file exists on the current `codex/production-hardening` branch.
The route is referenced in historical documentation. Tests should verify the
API directly without assuming a UI consumer.

---

## 2. Entity Authorization Tests

### 2.1 Entity-Type Allowlist (Codex/Product Decision Required)

The implementation must define an allowlist of valid `entityType` strings.
The allowlist values and their exact casing **require Codex/product approval.**
Examples for discussion only — not implementation requirements:

| Option | Entity types | Notes |
|--------|-------------|-------|
| A | `admission`, `participant`, `announcement` | Matches known entity types with document attachments |
| B | `admission`, `participant` | Narrower — announcements may not need file storage |

Tests below use placeholder values marked `[ALLOWED]`. The actual allowlist
must be substituted during implementation.

| # | Handler | Payload | Expected | Verifies |
|---|---------|---------|----------|----------|
| EA-1 | POST | `entityType="[ALLOWED]"`, valid file | 200 | Allowlisted type accepted |
| EA-2 | POST | `entityType=""` | 400 | Empty type rejected |
| EA-3 | POST | `entityType="unknown_type"` | 400 | Non-allowlisted type rejected |
| EA-4 | POST | `entityType="../../config"` | 400 | Traversal payload rejected |
| EA-5 | POST | `entityType="documents/../../../etc"` | 400 | Deep traversal rejected |
| EA-6 | POST | `entityType="[ALLOWED]\n"` with trailing control char | 400 | Control chars rejected |
| EA-7 | POST | `entityType="[ALLOWED]"` with wrong case | 400 | Case-sensitive rejection |
| EA-8 | GET | `entityType="[ALLOWED]"`, valid entityId | 200 | Allowlisted type accepted |
| EA-9 | GET | `entityType="unknown_type"` | 400 | Non-allowlisted type rejected |
| EA-10 | DELETE | `entityType="[ALLOWED]"`, valid entityId + fileName | 200 | Allowlisted type accepted |
| EA-11 | DELETE | `entityType="unknown_type"` | 400 | Non-allowlisted type rejected |

### 2.2 Capability and Role Gates (Codex/Product Decision Required)

Each handler should enforce a capability check. The exact capability and
role-to-capability mapping **requires Codex/product approval.** Examples for
discussion:

| Handler | Option 1 | Option 2 | Rationale |
|---------|----------|----------|-----------|
| POST | `organisation.manage` | `people.view` | Uploading modifies entity data vs. read-only access to attach files |
| GET | `organisation.view` | `people.view` | Reading metadata is a view operation |
| DELETE | `organisation.manage` | `people.manage` | Deleting modifies entity data |

Tests below assume a future approved capability gate exists. The placeholder
`[APPROVED_CAPABILITY]` must be replaced during implementation.

| # | Handler | Auth state | Expected | Verifies |
|---|---------|-----------|----------|----------|
| CR-1 | POST | No session | 401 | Unauthenticated rejected |
| CR-2 | POST | Authenticated but missing `[APPROVED_CAPABILITY]` | 403 | Insufficient capability |
| CR-3 | POST | Authenticated with `[APPROVED_CAPABILITY]` | 200 | Sufficient capability |
| CR-4 | GET | No session | 401 | Unauthenticated rejected |
| CR-5 | GET | Authenticated but missing `[APPROVED_CAPABILITY]` | 403 | Insufficient capability |
| CR-6 | DELETE | No session | 401 | Unauthenticated rejected |
| CR-7 | DELETE | Authenticated but missing `[APPROVED_CAPABILITY]` | 403 | Insufficient capability |

### 2.3 Entity Ownership and Scope Denial

After capability passes, the handler must verify the requesting user has scope
over the entity. The scope-resolution mechanism for uploaded entities (e.g.
resolving an admission ID to its owning city) is **not yet designed** — this
test matrix assumes a future `requireResourceScope`-like helper exists.

| # | Handler | User role | Entity scope | Expected | Verifies |
|---|---------|-----------|-------------|----------|----------|
| EO-1 | POST | City Head (Lahore) | Entity in Lahore | 200 | Own-city upload allowed |
| EO-2 | POST | City Head (Lahore) | Entity in Islamabad | 403 | Cross-city upload denied |
| EO-3 | GET | Park Lead (State Life) | Entity in State Life | 200 | Own-park read allowed |
| EO-4 | GET | Park Lead (State Life) | Entity in Iqbal Park | 403 | Cross-park read denied |
| EO-5 | DELETE | Park Lead (State Life) | Entity in State Life, valid fileName | 200 | Own-park delete allowed |
| EO-6 | DELETE | Park Lead (State Life) | Entity in Iqbal Park, valid fileName | 403 | Cross-park delete denied |
| EO-7 | POST | Murabbi | Entity in own group | 403 | Murabbi denied at capability level |
| EO-8 | GET | Super Admin | Entity in any city | 200 | HQ bypass allowed |
| EO-9 | GET | Program Admin | Entity in any city | 200 | HQ bypass allowed |

---

## 3. File Name and Path Validation Tests

### 3.1 `fileName` Validation (DELETE handler)

`fileName` must match `^[a-zA-Z0-9_-]+\.[a-z]+$` and must be verified to
belong to the specified `entityId` before deletion (cross-entity delete
prevention).

| # | `fileName` value | Expected | Verifies |
|---|-----------------|----------|----------|
| FN-1 | `doc-123.pdf` | 200 | Normal name accepted |
| FN-2 | `vacation_photo.JPG` | 400 | Uppercase extension rejected |
| FN-3 | `../../etc/passwd` | 400 | Path traversal rejected |
| FN-4 | `../../../etc/shadow` | 400 | Deep traversal rejected |
| FN-5 | `file.with.dots.pdf` | 400 | Multiple dots rejected |
| FN-6 | `file` (no extension) | 400 | No extension rejected |
| FN-7 | `.hidden` | 400 | Dotfile rejected |
| FN-8 | `file<.pdf` | 400 | Angle brackets rejected |
| FN-9 | `file with spaces.pdf` | 400 | Spaces rejected |
| FN-10 | `a.exe` | 400 | Extension not in allowed set |
| FN-11 | Empty string | 400 | Empty rejected |

### 3.2 Cross-Entity File Name Tampering

| # | Scenario | Expected | Verifies |
|---|----------|----------|----------|
| CE-1 | DELETE with `entityId=A`, `fileName` = file belonging to entity B | 403 or 404 | Cross-entity delete prevented |
| CE-2 | GET with `entityId=A` only returns metadata for entity A's files | Only entity A files | Metadata is entity-scoped |

---

## 4. File Type and Content Tests

### 4.1 MIME Type Spoofing (Magic Bytes)

All file-upload handlers must verify file content via magic-byte signatures,
not just the browser-provided MIME type.

| # | Uploaded content | Spoofed MIME type | Expected | Verifies |
|---|-----------------|-------------------|----------|----------|
| MB-1 | Valid PDF (`%PDF` header) | `application/pdf` | 200 | Legitimate PDF accepted |
| MB-2 | Valid DOCX (ZIP header `PK\x03\x04`) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 200 | Legitimate DOCX accepted |
| MB-3 | Valid JPEG (`\xFF\xD8\xFF`) | `image/jpeg` | 200 | Legitimate JPEG accepted |
| MB-4 | Valid PNG (`\x89PNG`) | `image/png` | 200 | Legitimate PNG accepted |
| MB-5 | Windows executable (`MZ` header) | `application/pdf` | 400 | MIME spoofing rejected |
| MB-6 | ZIP file | `application/pdf` | 400 | MIME spoofing rejected |
| MB-7 | Plain text "hello world" | `application/pdf` | 400 | MIME spoofing rejected |
| MB-8 | HTML `<script>alert(1)</script>` | `application/pdf` | 400 | Script injection via spoofed MIME rejected |
| MB-9 | Empty buffer (0 bytes) | `application/pdf` | 400 | Empty file rejected |
| MB-10 | PDF with appended ZIP data | `application/pdf` | 400 | Polyglot rejected |

### 4.2 File Size

| # | Upload size | Expected | Verifies |
|---|------------|----------|----------|
| FS-1 | 1 KB (valid PDF) | 200 | Small file accepted |
| FS-2 | 5 MB - 1 byte (valid content) | 200 | Boundary: just under limit accepted |
| FS-3 | 5 MB + 1 byte | 400 | Boundary: just over limit rejected |
| FS-4 | 50 MB | 400 | Large file rejected |
| FS-5 | 0 bytes (empty) | 400 | Empty file rejected |

---

## 5. Malformed Request Tests

| # | Scenario | Expected | Verifies |
|---|----------|----------|----------|
| MR-1 | POST with no `formData` (empty body) | 400 | Missing form data |
| MR-2 | POST with no file part | 400 | Missing file |
| MR-3 | POST with no `entityType` | 400 | Missing entity type |
| MR-4 | POST with no `entityId` | 400 | Missing entity ID |
| MR-5 | POST with non-POST content-type (`application/json`) | 400 or 500 | Content-type handling |
| MR-6 | GET with missing `entityType` | 400 | Missing query param |
| MR-7 | GET with missing `entityId` | 400 | Missing query param |
| MR-8 | DELETE with missing `entityType` | 400 | Missing query param |
| MR-9 | DELETE with missing `entityId` | 400 | Missing query param |
| MR-10 | DELETE with missing `fileName` | 400 | Missing query param |
| MR-11 | DELETE with non-existent `fileName` | 404 | File not found |

---

## 6. Safe Response and Error Tests

| # | Scenario | Expected | Verifies |
|---|----------|----------|----------|
| SR-1 | POST success: verify response shape `{ url, name, size, sizeFormatted }` | 200 | Correct response shape |
| SR-2 | POST success: verify `url` starts with `/uploads/documents/` | 200 | Correct URL prefix |
| SR-3 | POST success: verify `size` matches uploaded bytes | 200 | Size consistency |
| SR-4 | All error responses: no stack trace, no `error.message` from internal exceptions | 400/403/500 | No internal leak |
| SR-5 | All 400 responses: `{ error: string }` shape | 400 | Consistent error shape |
| SR-6 | GET succeeds on non-existent entityId (returns empty `{ files: [] }`) | 200 | Missing metadata returns empty |
| SR-7 | Audit log: verify POST creates audit entry | Check audit DB | Mutation audited |
| SR-8 | Audit log: verify DELETE creates audit entry | Check audit DB | Mutation audited |

---

## 7. Vercel Ephemeral Storage — Acceptance Criteria

The current `public/uploads/` filesystem is **non-persistent** across Vercel
deployments. The SEC-002 implementation must not pretend otherwise.

| # | Criterion | Acceptance |
|---|-----------|-----------|
| VE-1 | Uploads are local-development-only | The route documents that stored files are lost on redeploy. No claim of durability. |
| VE-2 | Uploads fail gracefully when storage is unavailable | `mkdir`/`writeFile` errors produce 500, not a crash |
| VE-3 | The route does not depend on durable external storage | No S3/Supabase SDK import, no external-write dependency |
| VE-4 | OR the route explicitly gates off with a clear error | If the implementation chooses to disable uploads until durable storage is configured, it returns a 501 or clear config error |
| VE-5 | Concurrent `mkdir({ recursive: true })` is safe | Multiple simultaneous requests for the same entityType do not collide |
| VE-6 | No uploaded file is treated as a backup or archival record | The audit log is the authoritative history, not the file system |

---

## 8. Focused Test-File Plan

| Test file | What it covers | Estimated tests |
|-----------|---------------|-----------------|
| `src/app/api/upload/document/route.test.ts` | Entity-type allowlist, capability gates, scope denial, fileName validation, MIME/magic-byte spoofing, file size, malformed requests, safe responses | 40-50 |
| `src/app/api/upload/avatar/route.test.ts` | Same magic-byte and size patterns (JPEG/PNG/WebP specific) | 10-15 |

### Key assertions per test category

| Category | Critical assertion |
|----------|-------------------|
| Entity-type | `expect(db.someModel.findUnique).not.toHaveBeenCalled()` — DB not touched on validation failure |
| Capability | `expect(requireCapability).toHaveBeenCalledWith(...)` — correct capability invoked |
| Scope denial | `expect(response.status).toBe(403)` with no filesystem write |
| Magic bytes | `expect(response.status).toBe(400)` for spoofed MIME with wrong content |
| Path traversal | `expect(response.status).toBe(400)` before `mkdir` or `writeFile` |
| Safe errors | `expect(body.error).not.toContain("Error:")` |

---

## 9. Handoff

```
Task ID: SEC-002A
Branch and base commit: agent/deepseek/SEC-002A-document-upload-test-plan @ 2a3fcc7
Commit SHA: (pending)
Changed files: docs/product-discovery/SEC-002A-DOCUMENT-UPLOAD-TEST-PLAN.md
What changed:
  - Entity authorization test matrix: 9 scope-denial tests across POST/GET/DELETE
    with cross-city, cross-park, and HQ bypass scenarios
  - Entity-type allowlist tests: uses [ALLOWED] placeholder — actual values
    require Codex/product approval; recorded as options not requirements
  - Capability/role gate tests: uses [APPROVED_CAPABILITY] placeholder —
    mapping requires Codex/product approval; recorded as options not requirements
  - File name validation: 11 tests covering regex allowlist, traversal, control
    chars, empty
  - Cross-entity file name tampering: 2 tests
  - Magic-byte spoofing: 10 tests covering legitimate and spoofed content
  - File size: 5 tests covering boundary, overflow, empty
  - Malformed request: 11 tests covering missing parts, wrong content-type
  - Safe response and error: 8 tests
  - Vercel ephemeral storage: 6 criteria — no durability claim; requires safe
    disable or explicit local-only path
  - Focused test-file plan with estimated test counts and critical assertions
  - Current route/caller inventory from codex/production-hardening @ 2a3fcc7
What was intentionally excluded:
  - No application code, tests, schemas, migrations, or deployment changes
  - No storage-provider design or product policy changes
  - No prescribed allowlist values or capability-to-route mapping as requirements
Commands run and results:
  - git diff --check 2a3fcc7...HEAD: pass
  - git diff --name-only 2a3fcc7...HEAD: docs/product-discovery/SEC-002A-DOCUMENT-UPLOAD-TEST-PLAN.md only
Known risks, owner decisions, and follow-up work:
  - Entity-type allowlist values require Codex/product approval
  - Capability-to-handler mapping requires Codex/product approval
  - Scope-resolution helper for entity ownership not yet designed
  - Vercel local-only storage constraint documented; durable storage is out of scope
Ready for Codex review.
```
