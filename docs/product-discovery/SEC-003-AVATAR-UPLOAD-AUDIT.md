# SEC-003: Avatar Upload Security Audit

**Task:** SEC-003
**Owner:** DeepSeek
**Status:** Draft — pending Codex review
**Created:** 2026-07-22
**Scope:** Static security audit of `src/app/api/upload/avatar/route.ts`. No
code, tests, schemas, migrations, deployment, `.env`, or data changes.

---

## 1. Current State

### Route: `src/app/api/upload/avatar/route.ts`

| Handler | Auth | Input | Storage | Key risks |
|---------|------|-------|---------|-----------|
| `POST` | `requireAuth()` only | `formData.file` (File) | `public/uploads/avatars/` on local disk | MIME-only validation, no magic bytes, `requireAuth` only, public URL |
| `GET` | `requireAuth()` only | Query: `userId` (optional) | Reads `<userId>.json` metadata from same directory | User can read any other user's avatar metadata, no scope check |

**Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
**File size limit:** 2 MB
**File naming:** `{userId}-{timestamp}.{ext}`
**Metadata:** `public/uploads/avatars/<userId>.json` — stores `{ path, updatedAt }`

### Known callers

The shadcn `Avatar` component in `src/components/ui/avatar.tsx` is a Radix UI
primitive that renders initials or a fallback — it does **not** call the upload
API. No UI caller for this route was found in the current `codex/production-hardening`
commit. The route is present but unreachable from the current UI.

---

## 2. Risk Findings

### 2.1 Vercel Ephemeral / Public Filesystem Risk — P1

**Lines:** 54, 67, 80

```typescript
const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
const filePath = join(uploadDir, filename);
const metaPath = join(uploadDir, `${userId}.json`);
```

Files are written to `public/uploads/avatars/` under `process.cwd()`.

| Risk | Detail |
|------|--------|
| **Ephemeral** | Vercel's deployment filesystem is non-persistent. Uploaded avatars are lost on every redeployment. The route makes no mention of this constraint. |
| **Public URL** | `public/` is served as a static asset. Anyone with the URL (e.g. `/uploads/avatars/user-1-123456789.jpg`) can access the file without authentication. Vercel does not protect `public/` paths with auth. |
| **No cleanup** | Lost on redeploy, but stale files survive on disk during the deployment's lifetime. No lifecycle management. |

**Fix:** Document that avatar storage is local-development-only and lost on
redeploy. Before production use, move to managed object storage (Supabase
Storage) with server-authorised signed URLs.

---

### 2.2 MIME Only vs Magic-Byte Validation — P2

**Line:** 34: `if (!ALLOWED_TYPES.includes(file.type))`

The route validates the browser-provided `file.type` MIME string but does not
verify file content by reading magic bytes. An attacker can upload a JavaScript
file or executable with a spoofed `image/jpeg` MIME type.

| MIME spoof | Content | Current result | Expected after fix |
|------------|---------|---------------|-------------------|
| `image/jpeg` | `\xFF\xD8\xFF` (valid JPEG) | 200 | 200 |
| `image/jpeg` | `<script>alert(1)</script>` | 200 | 400 |
| `image/jpeg` | `MZ` (Windows executable) | 200 | 400 |
| `image/png` | `<html>...</html>` | 200 | 400 |
| `image/webp` | Any non-WebP content | 200 | 400 |

**Fix:** Verify magic bytes for each allowed type:
- JPEG: `\xFF\xD8\xFF` at offset 0
- PNG: `\x89PNG` at offset 0
- WebP: `RIFFxxxxWEBP` at offset 0-7

---

### 2.3 File Name and Path Handling — P1

**Line:** 51: `const filename = \`${userId}-${timestamp}.${ext}\``

The `ext` is derived from `getExtension(file.type)` which maps known MIME types
to safe extensions (`jpg`, `png`, `webp`), defaulting to `jpg`. This prevents
extension injection via MIME spoofing.

However:

| Risk | Detail | Severity |
|------|--------|----------|
| **No fileName validation** | `timestamp` is `Date.now()` — always a positive integer. The filename template is safe because `userId` is a cuid (alphanumeric + underscore) and `timestamp` is numeric. | Low |
| **Directory traversal in userId** | If a future change lets `userId` contain `../`, the file path could escape `avatars/`. Currently `userId` comes from the JWT session, not from user input, so this is not exploitable. | Low currently; P1 if session field becomes user-modifiable |

**Current assessment:** The filename construction is safe due to the
constrained input sources. The `ext` allowlist prevents arbitrary extension
injection. No fix needed beyond adding magic-byte verification which would also
reject non-image content regardless of extension.

---

### 2.4 Size Limits and Malformed Forms — P2

**Current:**

| Check | Value | Location |
|-------|-------|----------|
| File size limit | 2 MB (`MAX_SIZE`) | Line 7, checked at line 42 |
| Missing file | `if (!file)` → 400 | Line 29 |
| Invalid MIME | 400 with error message | Line 34 |
| Empty form data | Unhandled — `formData()` resolves to empty, `file` is null → 400 | Line 26-30 |

**Missing checks:**

| Missing | Risk | Severity |
|---------|------|----------|
| 0-byte file | `file.size = 0` passes `> MAX_SIZE` check (0 is not > 2MB). A 0-byte file is written to disk. | P3 |
| Non-form content-type | If `Content-Type` is not `multipart/form-data`, `formData()` throws a `TypeError`. Caught by the try/catch and returns generic 500. | P3 — no leak, but 500 isn't helpful |
| Concurrent writes | Two simultaneous uploads for the same userId produce `userId-timestamp-a.ext` and `userId-timestamp-b.ext`. The metadata JSON is overwritten by the last writer. No data corruption beyond the expected "latest wins" behaviour. | P3 |

---

### 2.5 Self-Service Authorization Boundary — P1

**Current auth chain:**

```typescript
// Line 20-21
const authResult = await requireAuth();
if (authResult instanceof NextResponse) return authResult;
const userId = authResult.user.id!;
```

The route calls `requireAuth()` only. No `requireCapability()`, no role check.

| Scenario | Current result | Assessment |
|----------|---------------|------------|
| Authenticated user uploads own avatar | 200 — stored under own userId | ✅ Intentional self-service |
| Authenticated user uploads to another userId | Not possible — `userId` is derived from JWT session, not from request body | ✅ Correct |
| Guardian uploads avatar | ✅ Allowed — `requireAuth()` passes | ✅ Intentional self-service |
| Student uploads avatar | ✅ Allowed | ✅ Intentional self-service |
| Unauthenticated request | 401 | ✅ Correct |

**GET handler (lines 97-116) — cross-user read:**

```typescript
const targetUserId = searchParams.get("userId") || userId;
```

A user can read any other user's avatar metadata by passing `?userId=<another-id>`.
There is no scope check. This is a minor information disclosure — the response
is just `{ path: "/uploads/avatars/...", updatedAt: "..." }`, and the path is
already a public URL. But it confirms which users have uploaded avatars and when.

| Scenario | Current result | Assessment |
|----------|---------------|------------|
| User GETs own avatar | 200 with metadata | ✅ Correct |
| User GETs another user's avatar | 200 with metadata | ⚠️ Information disclosure — minor, since URL is public anyway |

**Fix for GET:** Restrict `targetUserId` to the authenticated user's own ID
unless the caller has a capability like `people.view`. This aligns with the
self-service boundary.

---

### 2.6 Safe Error Responses — Pass

**Line 92:** `console.error("Avatar upload error:", error); return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });`

All error paths return generic messages with no stack traces or internal details.
The `formData()` TypeError mentioned in 2.4 is caught and returns a safe 500.

| Scenario | Status | Body | Assessment |
|----------|--------|------|------------|
| Server crash during write | 500 | `{ error: "Failed to upload avatar" }` | ✅ Safe — no internal leak |
| Invalid form content-type | 500 | `{ error: "Failed to upload avatar" }` | ✅ Safe — no internal leak |
| Missing file | 400 | `{ error: "No file provided" }` | ✅ Safe |
| Invalid MIME | 400 | `{ error: "Invalid file type..." }` | ✅ Safe — does not list valid types from code |
| File too large | 400 | `{ error: "File too large..." }` | ✅ Safe |

**No audit logging.** The route does not record upload events in the audit log.

---

## 3. Recommended Safe Containment Path

### 3.1 Option A: Disable (same pattern as SEC-002)

Replace the POST and GET handlers with a shared disabled handler that requires
auth then returns 503. This is the safest path given no UI caller exists.

**Pros:** Eliminates all risks immediately. Consistent with the document-upload
treatment in SEC-002.

**Cons:** If a future feature needs avatars, re-enabling requires
magic-byte validation, managed storage, and capability gates.

### 3.2 Option B: Harden in place

Apply these fixes before the route is connected to any UI caller:

| Fix | Priority | Description |
|-----|----------|-------------|
| Magic-byte verification | P1 | Check JPEG/PNG/WebP headers before writing |
| GET scope restriction | P1 | Restrict `targetUserId` to own ID unless `people.view` capability |
| Ephemeral storage documentation | P2 | Add source comment that files are lost on redeploy |
| Audit logging | P2 | Record upload and metadata read events |
| 0-byte rejection | P3 | Add `file.size < 1` check |
| Content-type check | P3 | Return 400 explicitly for non-form content-type |

### 3.3 Recommended path

**Option A (disable)** unless the owner confirms that avatar upload is actively
used or planned for the next release. The route has no UI caller and no tests.
Disabling it removes a public-filesystem write surface with minimal downside.

If Option B is chosen, the implementation must be coordinated with SEC-002's
managed-storage design — both routes share the same Vercel ephemeral
filesystem constraint and should migrate to Supabase Storage together.

---

## 4. Test Matrix

### 4.1 Auth and Authorization

| # | Test | Expected | If disabled |
|---|------|----------|-------------|
| A-1 | Unauthenticated POST | 401 | 401 |
| A-2 | Authenticated POST — own avatar | 200 | 503 |
| A-3 | Unauthenticated GET | 401 | 401 |
| A-4 | Authenticated GET — own avatar | 200 | 503 |
| A-5 | Authenticated GET — another user's avatar | 200 (currently), **403 after fix** | 503 |

### 4.2 Magic Bytes (if hardened)

| # | Upload content | Spoofed MIME | Expected |
|---|---------------|-------------|----------|
| MB-1 | Valid JPEG (`\xFF\xD8\xFF`) | `image/jpeg` | 200 |
| MB-2 | Valid PNG (`\x89PNG`) | `image/png` | 200 |
| MB-3 | Valid WebP (`RIFFxxxxWEBP`) | `image/webp` | 200 |
| MB-4 | Executable (`MZ` header) | `image/jpeg` | 400 |
| MB-5 | HTML `<script>alert(1)</script>` | `image/png` | 400 |
| MB-6 | Empty buffer (0 bytes) | `image/jpeg` | 400 |

### 4.3 File Size and Form

| # | Scenario | Expected |
|---|----------|----------|
| FS-1 | 1 KB valid JPEG | 200 |
| FS-2 | 2 MB valid JPEG (boundary) | 200 |
| FS-3 | 2 MB + 1 byte | 400 |
| FS-4 | 0 bytes (empty) | 400 |
| FS-5 | No file in form data | 400 |
| FS-6 | Non-multipart content-type | 400 |

### 4.4 Error Safety

| # | Scenario | Expected |
|---|----------|----------|
| ER-1 | All error responses — no stack trace | Consistent error shape |
| ER-2 | 400 responses — `{ error: string }` | Consistent shape |
| ER-3 | 500 responses — no internal details | Generic message only |

---

## 5. Handoff

```
Task ID: SEC-003
Branch and base commit: agent/deepseek/SEC-003-avatar-upload-audit @ 2a3fcc7
Commit SHA: (pending)
Changed files: docs/product-discovery/SEC-003-AVATAR-UPLOAD-AUDIT.md
What changed:
  - Full audit of src/app/api/upload/avatar/route.ts POST and GET handlers
  - Vercel ephemeral/public filesystem risk: files in public/ are
    unauthenticated and lost on redeploy
  - MIME-only validation: no magic-byte verification — spoofed MIME accepted
  - File name/path handling: safe due to constrained inputs (userId from JWT,
    timestamp numeric, ext from allowlist)
  - Size limits: 2 MB limit present; missing 0-byte rejection and form
    content-type check
  - Self-service authorization: POST correctly ties to own userId from session;
    GET allows reading any user's avatar metadata (minor disclosure)
  - Safe error responses: all paths return generic messages, no internal leaks
  - No audit logging on avatar mutations
  - No UI caller found — shadcn Avatar component is a Radix UI primitive only
  - Two paths recommended: Option A (disable, consistent with SEC-002) or
    Option B (harden with magic bytes, GET scope, audit, ephemeral docs)
  - Test matrix covering auth/scope, magic bytes, file size/form, error safety
What was intentionally excluded:
  - No code, tests, schemas, migrations, deployment, .env, or data changes
  - No Supabase Storage design (belongs in SEC-002 managed-storage follow-up)
  - No avatar upload test file creation (would be code change)
Commands run and results:
  - git diff --check: pass
Known risks, owner decisions, and follow-up work:
  - Owner decision: disable or harden in place? Route has no UI caller today.
  - If hardened: magic-byte verification, GET scope fix, audit logging, and
    0-byte rejection are the required changes
  - Ephemeral storage constraint must be solved before production — share the
    managed-storage design with SEC-002
Ready for Codex review.
```
