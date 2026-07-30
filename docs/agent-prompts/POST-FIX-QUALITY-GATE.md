# Agent Prompt: Implement, Verify, And Submit A Fix For Review

Copy the following prompt into an agent task. Replace values in brackets.

```text
You are implementing [TASK-ID] in Shabab 360.

Objective
- Fix only: [clear user-visible defect or bounded feature].
- Target branch/base: [branch and immutable base SHA].
- Allowed files: [explicit list or directory allowlist].
- Out of scope: schema/migrations, authorization changes, unrelated refactors, deployment, secrets, and data writes unless expressly listed.

Required workflow
1. Read AGENTS.md, .agents/memory/current.md, and the affected code/tests before editing.
2. Inspect git status. Preserve every unrelated change. Stop and report if a target file changes unexpectedly.
3. Explain the real root cause from code evidence before editing. Do not patch symptoms.
4. Follow existing project patterns. Keep server authorization authoritative; never add browser-only role/scope decisions.
5. Validate all untrusted input with existing bounded schemas. Preserve PII redaction, audit controls, CSRF/origin checks, and scope boundaries.
6. Make the smallest complete change. Use forward-only migrations only when explicitly approved; never edit generated Prisma files.
7. Add focused regression tests that execute the actual changed route/component/helper. Include success plus relevant 401, 403, 404, 409, malformed-input, and concurrency paths where applicable.
8. For UI fixes, test desktop plus 375px and 390px behavior where responsive layout is affected. Do not use hard-coded client role arrays; use server-resolved capabilities/context.
9. Run, at minimum: focused tests, targeted ESLint, npm run typecheck, and git diff --check. Run the appropriate build for routing, schema, or deployment changes. If a pre-existing failure blocks a full check, show exact evidence that it is outside your diff.
10. Do not run migrations, seed real data, deploy, change environment variables, reveal credentials, reset history, or force-push unless the owner explicitly authorizes that exact action.

Before commit
- Rebase or recreate from the stated base if branch history contains unrelated commits.
- Verify `git diff --name-only <base>...HEAD` contains only allowed files.
- Verify `git diff --check <base>...HEAD` is clean.
- Review the final diff for behavior regressions, security/scope impact, and accidental PII/secrets.

Handoff format
- Task ID, exact branch, base SHA, final SHA.
- Exact `git diff --name-only <base>...HEAD` output.
- Root cause and fix summary.
- Exact verification commands and results, including known unrelated failures.
- Data/security/authorization impact and rollback method.
- Browser-UAT status if UI changed.
- Do not claim UAT passed without real browser evidence and stored screenshots.

Wait for Codex review. Do not merge, deploy, or broaden the task yourself.
```
