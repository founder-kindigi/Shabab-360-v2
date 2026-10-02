# ATT01 PostgreSQL runtime restore

Date: 2026-09-18. Task: prepare an approved, local-only disposable PostgreSQL
runtime so ATT01's 32-migration replay can be verified. Mode: **read-only
investigation only**.

## 1. Status

**`BLOCKED_PENDING_APPROVED_RUNTIME_SOURCE`**

No approved restore source exists on this computer or in the repository: there is
no documented archive, no bootstrap script, no cached artifact, and no
owner-provided package or path for the disposable PostgreSQL runtime. Nothing was
downloaded, installed, extracted, started or executed, and no file was written
into `.next/` or any runtime location.

## 2. What the runtime must be

The repository's own harness defines the required shape. It is a self-contained
PostgreSQL 18 binary tree consumed from the repository root:

| Requirement | Consumed as | Source of truth |
| --- | --- | --- |
| Server binaries | `<runtime>/usr/lib/postgresql/18/bin/{initdb,pg_ctl,postgres,psql,pg_dump,pg_restore}` | `start-disposable-postgres.sh`, `stop-disposable-postgres.sh`, `rehearse-native-restore.sh` |
| Shared libraries | `<runtime>/usr/lib/x86_64-linux-gnu` (exported as `LD_LIBRARY_PATH`) | same |
| Server data files | `<runtime>/usr/share/postgresql/18` (passed to `initdb -L`) | `start-disposable-postgres.sh` |
| Runtime root | `.next/astra-native-postgres/runtime` | `ATT01_POSTGRES_MIGRATION_GATE.md` §9, `ATT01_POSTGRES_DISPOSABLE_REPLAY.md` §2 |

The documented alternative is the WASM path used by
`verify-postgres-migrations.mjs`:
`.next/astra-pg-runtime/node_modules/@electric-sql/pglite` (package
`@electric-sql/pglite`).

Both runtime roots are inside `.next/`, which is git-ignored
(`.gitignore:17:/.next/`), so a restored runtime would never be staged or
committed.

## 3. Searched locations and findings

### Repository documentation and history

| Searched | Result |
| --- | --- |
| `docs/delivery/reports/ATT01_POSTGRES_MIGRATION_GATE.md`, `ATT01_POSTGRES_DISPOSABLE_REPLAY.md` | describe the required path and the *run* commands; contain no source, URL, package name or restore procedure |
| `docs/reviews/v2-audit-2026-09-08/` (76 files: harness scripts, `*.md`, `*.json`, `*.mts`, `*.mjs`) | harness **consumes** the runtime; no file creates, downloads or restores it |
| `docs/reviews/v2-audit-2026-09-08/astra-corrections-native-postgres-environment.json` | records only `provider: "native PostgreSQL 18.6"` and a disposable directory under `.next/` that no longer exists — no origin |
| `ASTRA_CORRECTION_HANDOFF.md`, `IMPLEMENTATION_STATUS.md`, `C2_03_HANDOFF.md`, `C2_04_HANDOFF.md`, `PRE_CORRECTION_MEMORY.md` | say "PostgreSQL 18.6 disposable WSL instance"/"disposable WSL cluster"; no source, package, tarball or URL |
| `docs/` grep for `18.6`, `postgresql-18`, `apt-get`, `apt install`, `curl`, `wget`, `http(s)://`, `.tar`, `.deb`, `apt.postgresql` | no runtime provenance (matches are unrelated docs links) |
| `docs/MIGRATION_DESIGN.md` | covers Supabase Staging/Production only; no local runtime source |
| Git history (`git log --all` for `*astra-native-postgres*`, `*.deb`, `*.tar.gz`, `*.tar.xz`, `*.tgz`, `*.zip`) | only three tracked evidence JSONs (`astra-native-postgres-db-{acceptance,final,results}.json`); **no runtime or archive was ever committed** |
| Repository bootstrap scripts (`scripts/**`, `.agents/**`, `.codex/**`) | none references the PostgreSQL runtime |

### Filesystem

| Searched | Result |
| --- | --- |
| `.next/astra-native-postgres`, `.next/astra-native-postgres/runtime`, `.next/astra-pg-runtime`, `.next/astra-browser-runtime` | all absent; `.next/` holds only Next.js build output |
| Repo root archive files (`*.zip/tar/gz/xz/tgz/7z/deb/msi/exe`) | none |
| `download/` (2 entries) | a README and a `.docx` only |
| `upload/` (35 entries) | markdown docs and PNG screenshots only |
| `tool-results/` (66 entries, recursive, name match `postgres\|pg_\|pglite\|runtime\|astra\|archives`) | one directory `tool-results/att01-astra-review/` containing only `lahore-refresh-dry-run.json` |
| `initdb` / `pg_ctl` binaries under `D:\iBuild` (recursive) and `C:\Users\csabu` (recursive) | none |
| Directories matching `*postgres*` / `*astra*` under `D:\iBuild` | only unrelated `node_modules` packages in other projects (`postgres`, `postgres-array`, `@supabase/postgrest-js`, `astral-regex`, …) |
| `PATH` (`initdb`, `pg_ctl`, `postgres`, `psql`, `createdb`, `pg_dump`) | none found |
| `C:\Program Files`, `C:\Program Files (x86)`, `C:\ProgramData` (name match `postgres\|pgsql\|pgAdmin`), `D:\PostgreSQL`, `C:\PostgreSQL`, `C:\tools\pgsql` | absent |
| `PG*` / `POSTGRES*` environment variables | none set |
| `C:\Users\csabu\Downloads`, `Documents` (recursive) | only unrelated project zips; **no PostgreSQL/PGlite archive** |
| npm global root and `node_modules` (`@electric-sql`, `pglite`, `embedded-postgres`, `pg-mem`, `pg`) | absent |
| Other worktrees: `D:\iBuild\Shabab-360-c0-20260911` (no `.next`), `shabab360-v3`, `shabab360-temp` | no runtime |
| WSL Ubuntu: `command -v initdb pg_ctl postgres psql`, `/usr/lib/postgresql/*` | nothing installed |

## 4. Integrity / origin evidence for a restored runtime

**None — nothing was restored.** No artifact was located, so there is nothing to
checksum, sign or attest. To close this gate, the owner must supply a source whose
integrity can be verified before restore, for example:

- the archive, `.deb` package or directory tree, plus its SHA-256 (or a signed
  manifest of all files); and
- an explicit statement of origin: package name and version (for example the
  Ubuntu/Debian `postgresql-18` package from which the tree was extracted) with
  the expected checksum, or the local path it was copied from.

Verification procedure that would be applied on receipt (not yet run): hash every
file, compare against the supplied manifest, confirm the binary set
(`initdb`, `pg_ctl`, `postgres`, `psql`, `pg_dump`, `pg_restore`) and the
`usr/share/postgresql/18` data directory exist, then restore **only** into
`.next/astra-native-postgres/runtime`.

## 5. Localhost / disposable-harness safety evidence

The existing harness is already approved and is safe by construction; no change to
it is proposed or required.

| Property | Evidence |
| --- | --- |
| Binds loopback only | `pg_ctl … -o "-h 127.0.0.1 -p 54391 -k $pg_data"` — never `0.0.0.0`, never a hostname |
| No credentials | `initdb … --auth=trust`; the only connection string is a generated local one |
| Disposable data directory | `pg_data=$(mktemp -d /tmp/shabab-astra-postgres-XXXXXXXX)` |
| Refuses to stop anything else | `stop-disposable-postgres.sh` requires `realpath "$pg_data"` to match `/tmp/shabab-astra-postgres-*` **and** `PG_VERSION` to exist |
| Disposable database | `CREATE DATABASE astra_synthetic_review` on that throwaway cluster |
| No external target | all commands are local binaries with `-h 127.0.0.1`; no connection URL is accepted |
| Runtime is ignored | `git check-ignore -v .next/astra-native-postgres` → `.gitignore:17:/.next/` |

The native path requires the WSL `Ubuntu` distro that is already present
(currently `Stopped`); using a pre-built binary tree needs no package
installation.

## 6. Exact next replay command (to run only after the runtime is restored)

```bash
# 1. Verify the restored tree against the owner-supplied checksum/manifest, e.g.
#      sha256sum -c <manifest>
#    and confirm:
#      .next/astra-native-postgres/runtime/usr/lib/postgresql/18/bin/{initdb,pg_ctl,psql}
#      .next/astra-native-postgres/runtime/usr/share/postgresql/18

# 2. Start the disposable loopback-only cluster, replay all 32 migrations and
#    compare the result with the PostgreSQL schema, then stop and discard:
sh docs/reviews/v2-audit-2026-09-08/start-disposable-postgres.sh
bash -lc 'cd /mnt/d/iBuild/Shabab-360-v2 && node docs/reviews/v2-audit-2026-09-08/verify-postgres-migrations.mjs'
sh docs/reviews/v2-audit-2026-09-08/stop-disposable-postgres.sh
```

Alternative WASM path (no server process): restore
`.next/astra-pg-runtime/node_modules/@electric-sql/pglite` and run only
`node docs/reviews/v2-audit-2026-09-08/verify-postgres-migrations.mjs`.

## 7. Actions not performed

- Nothing downloaded, installed, extracted or executed; no runtime restored.
- No PostgreSQL, Docker, WSL package or npm package installed; Docker Desktop not
  used.
- No cluster started, no port bound, no data directory created, no `/tmp` writes.
- No `.env` read; no credential used; no external/LAN/production/staging host
  contacted.
- No `prisma migrate deploy`, `db push`, `db pull`, `prisma generate`,
  `migrate resolve`, deployment, push or commit.
- No migration, schema, `prisma/dev.db`, workbook or application code modified.
- Only read-only checks (`Test-Path`, `Get-Command`, filtered `Get-ChildItem`,
  `git log`, `git check-ignore`, `git status`) plus a scoped `git diff --check`
  were run.

## 8. Changed files and ignored-runtime status

- **Changed files: none.** This task produced no source, config or data change;
  only this report file is new.
- Working tree unchanged: 132 modified tracked files, 395 untracked paths, 0
  staged — all pre-existing and preserved.
- `prisma/dev.db` remains an untouched, uncommitted tracked modification.
- **Runtime artifacts: none exist.** If restored, the runtime would live under
  `.next/astra-native-postgres/runtime` (or `.next/astra-pg-runtime`), which
  `git check-ignore -v` confirms is ignored by `.gitignore:17:/.next/`, so it
  would never be staged or committed.
- Scoped `git diff --check`: no changes of ours to check. Repository-wide
  `git diff --check` exits 2 on two pre-existing whitespace errors in unrelated
  files (`src/app/api/park/attendance/[eventId]/close/route.test.ts:165`,
  `src/lib/attendance/__tests__/dropout-policy.test.ts:169`).

## 9. What the owner must provide to unblock

One of the following, explicitly approved:

1. The **local path** of an approved PostgreSQL 18 binary tree (with the
   `usr/lib/postgresql/18/bin` + `usr/lib/x86_64-linux-gnu` +
   `usr/share/postgresql/18` layout) plus its SHA-256 manifest; or
2. The **local archive/package** (for example the `postgresql-18` `.deb`) to
   extract into `.next/astra-native-postgres/runtime`, plus its checksum and
   origin; or
3. The **PGlite package** for `.next/astra-pg-runtime` (name, version, integrity
   hash); or
4. Explicit written authorization naming the local source URL/package the operator
   may use to obtain the runtime, since this task forbids downloading it
   unilaterally.

No migration replay, production readiness or team-pilot readiness is claimed.
