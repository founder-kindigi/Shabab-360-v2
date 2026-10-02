# C0-01 — Preservation and isolated consolidation setup

2026-09-11. Owner: Astra. **Outcome: C0-01 local preparation accepted; C1 comparison ready.** This is task verification, not independent application review, feature parity, merge approval or release approval. The wider C0 operational requirement to identify the production trigger remains open before merge; it does not prevent local C1 work.

## Source identity and preservation

Fresh `git fetch origin` succeeded; published refs match BASE-01. The original checkout remains on v2. The candidate includes uncommitted UI restoration, delivery work and unrelated owner changes; its identity is the file manifest, not HEAD alone.

| Reference | Commit | Local preservation tag |
| --- | --- | --- |
| v2 / origin/v2 | 401ff322726c3ceab9b05db776b2b076e63bbaf5 | codex/c0-v2-20260911 |
| Published origin/main | dedb91a640ea244ce9323cd1dcde2a40d74bb718 | codex/c0-main-20260911 |
| Original local main | 054dbb775e630ddb153c5e9a225b4980b43b493c | codex/c0-local-main-20260911 |

Common ancestor: `159ba859c280b2ee197d4136f797b6385d772f4d`. Published main/v2 divergence is 172/272 commits, with 171 patch-unique main commits, 108 main-only paths and 233 changed shared paths. These counts remain investigation scope, not feature counts.

Private recovery directory: `D:\iBuild\Shabab-360-c0-20260911`. Keep its contents local: the working snapshot includes private source workbooks/screens, and the complete history bundle may include historical private blobs. Neither is a publication artifact or operational database backup.

| Asset | Evidence |
| --- | --- |
| candidate.zip | 1,288 selected files; 13,882,242 bytes; SHA-256 `b749e7b471ffd0803b3c12816c1aa780f258dfc1f49ee60854bccb8ee96cd1cc` |
| restore-candidate/ | Every selected file restored and SHA-256 verified; zero mismatches |
| histories.bundle | All three tagged histories; 13,630,617 bytes; SHA-256 `98e3b3e1974773a6d61cb47093f294750ce87c6813bffab18fcd1bed425931d9` |
| restored-histories.git/ | Bundle imported into a separate bare repository; three exact tag targets verified; `git fsck --full` exit 0 |
| snapshot-manifest.json | Original immutable creation manifest; includes selected hashes, exclusions, deleted tracked paths and index-state hash |
| integration/ | Clean worktree on `codex/main-v2-consolidation`, based on published main `dedb91a`; no v2 merge or overlay applied |

[C0_SNAPSHOT.json](C0_SNAPSHOT.json) records the original snapshot. Its 38 explicit exclusions are 36 tracked worktree links/directories, the already deleted older B4 workbook, and `prisma/dev.db`. Ignored environment files, dependencies and build outputs were outside Git's candidate selection. The tracked `.env.example` template is included; actual environment files and operational database contents were not opened or archived. Existing worktree directories and deleted-file state remain untouched.

The assets were first created in a Git-ignored `local-consolidation-20260911` directory inside the repo. Inspection found that TypeScript/ESLint did not exclude that location. `git worktree move` relocated the registered checkout; native PowerShell moved the five other named assets to the sibling directory. The old directory is empty. No lint/TypeScript configuration changed. [C0_RELOCATION.json](C0_RELOCATION.json) supplies current locations; creation manifests/archive bytes remain unchanged.

## Verification and reproduction

Creation command: `python scripts/delivery/preserve-consolidation.py --create` (exit 0). It checked BASE-01 source hashes, made the archive and restored into a fresh directory. The initial `--verify-original` passed before relocation. **For current verification use `python scripts/delivery/verify-consolidation.py`**; the original creation script intentionally retains its historical paths and should not be rerun to overwrite recovery evidence.

The final verifier checks original files except the four explicitly listed coordination documents, the unchanged index/HEAD/branch/deletions, every restored/archive file, archive membership/hash, both sets of preservation tags, bundle validity, bare repository integrity, and the clean integration worktree. See [C0_VERIFICATION.json](C0_VERIFICATION.json). New C0 reports/scripts and C1 packet were created after the snapshot and are not claimed to be inside it.

The relocated Git repositories are owner-created. A first verification attempt under the sandbox account stopped at Git's dubious-ownership check (exit 1); rerunning as the owning user passed. No global `safe.directory` exception or Git security configuration was changed. Python used: `C:/Users/csabu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`.

For recovery, first verify the manifest/archive hashes and bundle. Use the already validated bare history copy or fetch the bundle's named tags into a new empty repository. Check out the desired pinned baseline in another fresh directory; restore only manifest-selected archive paths with path traversal checks, then apply the recorded tracked deletions explicitly. Verify every restored file before use. Never extract over the owner's existing checkout. This preserves Git history and working-file contents, not ignored runtime configuration, installed dependencies or operational database state. No destructive recovery exercise was run against the original checkout.

Fresh post-relocation lint/typecheck results are in [C0_CHECKS.json](C0_CHECKS.json). No application source, schema, routing, dependencies or configuration changed. BASE-01's 187 files / 1,375 passing tests and matching historical build inputs remain baseline evidence; tests/build/browser/database checks were not rerun as C0 parity verification. Later C1–C3 must verify actual behavior and the combined candidate.

## Operational observations and merge boundary

Read-only GitHub inspection of `founder-kindigi/Shabab-360-v2` found main at the pinned SHA with REST `protected: false`; the repository rulesets endpoint returned `[]`. This is not evidence of a protected merge workflow. No remote rules/settings changed.

Current v2 `.github/workflows/ci.yml` runs on PRs targeting main/dev/codex branches and manual dispatch. It selects Node 22, installs the lockfile, generates Prisma, then runs lint, typecheck, tests, SQLite build, production dependency audit and a tracked-sensitive-file guard. Published main has additional provider schema/SQLite migration checks requiring C1/C2 reconciliation. This source inspection does not assert that any remote checks ran or are required by branch policy.

Vercel read-only commands: `vercel project inspect shabab360 --non-interactive` and `vercel api /v9/projects/shabab360 --method GET --raw --scope outhecs --non-interactive`, filtered to project metadata without saving raw output. Project settings confirm Next.js, root `.`, Node **24.x**, and **`npm run build:postgres`**. Metadata showed Git deployments `createDeployments: enabled`, but no link/production-branch value. A null field does not prove absence of an automatic production trigger. See [C0_OPERATIONS.json](C0_OPERATIONS.json).

Before any merge/push that could ship code:

1. Complete C1 dispositions and C2 reconciliation, then C3 exact-candidate checks and independent review. Use a reviewable PR preserving both histories; do not rely on nonexistent branch protection.
2. Refresh published main and reverify any affected candidate. Explicitly resolve Node 22 CI versus Node 24 hosting and the provider build/CI differences.
3. Confirm the actual production branch and all deployment triggers with project/Git integration evidence. Resolve auto-deploy coupling before main changes; do not infer permission from v2 approval.
4. Resolve operational schema/history compatibility and an approved backup/rollback procedure through a separately scoped read-only assessment. Any live migration/deployment needs its own concrete authorized task.

No merge, new commit, push, deployment, live migration, provider send or account change occurred in C0. Local tags and integration branch/worktree creation are the only Git mutations beyond fetching.

## Next task and future overlay

[C1-01](../tasks/C1-01.md) is the only ready next task: behavior/data parity for all main-only paths/commits plus shared conflicts. Keep the original v2 checkout available; read the immutable restored candidate for reproducible working-file comparisons.

Only after C1, C2 may perform a normal merge of pinned v2 history into the main-based integration branch, resolve conflicts deliberately, and incorporate the approved dirty working candidate through a reviewed path-level overlay. Use snapshot hashes and deletion records as provenance, not a blind copy or bulk stage. Main-only functionality must retain its recorded disposition; audit evidence and unrelated work must remain intact. Private datasets and tracked Git links need explicit hygiene decisions before any commit. No overlay is applied by this packet.
