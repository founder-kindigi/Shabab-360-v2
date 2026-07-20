# Pilot Operations Runbook

This runbook is for the free-tier pilot only. It does not authorize a production launch until the owner has completed the secret-rotation, database-migration, and deployment gates in `TASK_BACKLOG.md`.

## Before Each Deployment

1. Confirm the Vercel plan is eligible for the intended pilot use.
2. Confirm no `.env` file, SQLite database, credential, reset link, or production data is tracked in Git.
3. Set environment values only in the approved deployment secret store. Do not paste them into issues, logs, or chat.
4. Confirm CI is green: Prisma generation, lint, typecheck, tests, production build, dependency audit, and sensitive-file guard.
5. Confirm the deployment uses the lockfile-backed package manager and does not run a database migration automatically.

## Daily Pilot Check

1. Open the deployed home page and confirm it returns normally over HTTPS.
2. Sign in with a non-production test account and confirm the intended role lands on its dashboard.
3. Confirm an unauthenticated request to a protected API route returns `401` and a cross-origin mutation returns `403`.
4. Review Vercel runtime and build logs for `audit_write_failed`, application `500` responses, or repeated login failures.
5. Review the in-app notification queue for unexpectedly pending or failed operational messages. Do not inspect message bodies when they could contain personal data unless resolving an incident.

## Weekly Pilot Check

1. Review Vercel deployment history and retain the last known-good deployment URL.
2. Review error trends in Vercel logs, especially `audit_write_failed` and failed authentication requests.
3. Confirm the project remains within the chosen free-tier service limits and that the pilot's use remains eligible for the selected plan.
4. Confirm no uploaded files are treated as durable storage. Avatar and document uploads remain disabled until private object storage is approved.
5. Record the check date, reviewer, incidents, and rollback decision in the project handover log without including passwords, tokens, CNICs, or unnecessary personal data.

## Incident Response

### Failed Deployment Or Severe Runtime Regression

1. Stop further deployments.
2. Promote the last known-good Vercel deployment through the Vercel dashboard.
3. Verify the home page, sign-in flow, and a protected route after rollback.
4. Preserve relevant build or runtime log references, then open a follow-up task with the failing deployment URL and timestamp.

### Audit Write Failure

1. Treat an `audit_write_failed` event as an integrity warning, not as a harmless log entry.
2. Pause high-impact administrative changes when failures repeat or coincide with database errors.
3. Review deployment/runtime logs and database connectivity without copying user identifiers or before/after values into tickets.
4. Confirm the database is healthy, then perform a controlled administrative action and verify the corresponding audit record exists.
5. Record the resolution and any data gap for handover review.

### Suspected Secret Exposure

1. Rotate the exposed secret or credential immediately in its provider and Vercel environment settings.
2. Remove the exposure from active files and current Git tracking; do not delay rotation while discussing history rewriting.
3. Invalidate affected sessions by rotating `NEXTAUTH_SECRET` and document whether a repository-history rewrite is required.
4. Re-deploy, verify authentication, and limit incident notes to references and timestamps rather than secret values.

## Local Codex Visual Browser Recovery

Status on 2026-07-15: visual browser automation is operational with the locally installed Browser plugin runtime `26.707.71524`.

### Confirmed Root Cause

The generated browser client attempted to replace the Codex Node kernel's protected `globalThis.process` property. Guarding that assignment exposed a second incompatibility: the protected kernel process object does not provide the full `versions` and event-listener surface expected by the generated browser bundle.

### Machine-Local Repair

This repair is outside the repository and can be overwritten by a Codex Browser plugin update.

- Runtime file: `C:\Users\csabu\.codex\plugins\cache\openai-bundled\browser\26.707.71524\scripts\browser-client.mjs`
- Original backup: `browser-client.mjs.codex-backup-20260715`
- Original SHA-256: `57EE77A283EB230C6C6D47353AF13A25CEC4C331B511868C8FBF7CCD3DD1B2F6`
- Patched SHA-256: `34078F23975E81137DDD496AA0CF04EFA3A73B26F0947FB808F71281E873B22A`

The compatibility block keeps the protected kernel global untouched while giving the generated bundle its own complete shims:

```js
const process = processShim;
const global = Object.create(globalThis);
Object.defineProperty(global, "process", { value: processShim });

try {
  globalThis.process ??= processShim;
} catch {
  // The Codex Node kernel may provide a protected process shim.
}
globalThis.global = globalThis.global ?? globalThis;
try {
  globalThis.global.process ??= processShim;
} catch {
  // Preserve the protected kernel shim when it cannot be replaced.
}
```

### Verification Evidence

The patched runtime initialized successfully, attached the Codex in-app browser, and completed this click-based localhost journey without creating data:

1. Opened `http://localhost:3000/`.
2. Signed in through the Super Admin demo control.
3. Opened Admissions from the navigation.
4. Opened New Application.
5. Confirmed Emergency Contact Name, Emergency Contact Phone, Previous Education, and Reference were each uniquely present and visible.
6. Cancelled the dialog without submitting an application.

### After A Plugin Update

1. Test the newly installed runtime without modifying it; the upstream bundle may already be fixed.
2. If the same bootstrap error returns, capture the exact stack and compare the new bootstrap code before applying this workaround.
3. Do not restore the old backup over a newer plugin version.
4. Re-run the authenticated click journey above before treating browser-based validation as available.

## Data And Rollback Boundary

The current SQLite file is not an acceptable Vercel production database. Do not run `prisma db push`, destructive schema commands, or data imports against a live target during this pilot. Production database cutover, backup, restore rehearsal, and private file storage are separate Postgres/Supabase tasks and require their documented approval gates.
