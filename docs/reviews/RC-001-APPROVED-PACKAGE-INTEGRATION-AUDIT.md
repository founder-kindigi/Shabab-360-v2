# Release Candidate 001 - Approved Package Integration Audit

## Overview
This document serves as a documentation-only release manifest for integrating approved package commits. This audit does not imply merge, deployment, or UAT acceptance.

## Commit Audit

### 1. TEAM-004: 3152c68
- **SHA**: `3152c68`
- **Parent**: `caf671a`
- **Source Branch**: `agent/antigravity/TEAM-004-collaboration-membership-hardening`
- **Changed Files**:
  - `src/app/api/admin/collaboration-teams/route.ts`
  - `src/app/api/admin/teams/can-manage/route.ts`
  - `src/app/api/admin/teams/route.ts`
  - `src/app/api/admin/teams/teams-api.test.ts`
  - `src/components/modules/admin/collaboration-teams-page.tsx`
- **Classification**: Clean integration candidate.
- **Flags**: None.

### 2. EVENT-304: 1211445
- **SHA**: `1211445`
- **Parent**: `10a6329`
- **Source Branch**: `agent/antigravity/EVENT-304-route-hardening-tests`
- **Changed Files**:
  - `src/app/api/admin/events/[id]/planner-items/route.ts`
  - `src/app/api/admin/events/[id]/responsibilities/route.ts`
  - `src/app/api/admin/events/[id]/route.ts`
  - `src/app/api/admin/events/events-routes.test.ts`
  - `src/app/api/admin/events/teams/[teamId]/memberships/route.ts`
  - `src/lib/auth/events-scope.ts`
- **Classification**: Clean integration candidate.
- **Flags**: None.

### 3. CALL-004: b9355d4
- **SHA**: `b9355d4`
- **Parent**: `630b5e9`
- **Source Branches**: `agent/antigravity/CALL-004-calling-api-hardening`, `agent/antigravity/PROFILE-007-extended-profile-hardening`
- **Changed Files**:
  - `src/app/api/calling/assignments/route.ts`
  - `src/app/api/calling/calling-api.test.ts`
- **Classification**: Commit-only candidate from mixed history.
- **Flags**: Mixed history branch detected.

### 4. MASHWARA-304: 635d18c
- **SHA**: `635d18c`
- **Parent**: `a4ff804`
- **Source Branch**: `agent/antigravity/MASHWARA-304-fixes`
- **Changed Files**:
  - `src/__tests__/integration/mashwara-e2e.test.ts`
  - `src/app/api/admin/mashwara/[id]/decisions/route.ts`
  - `src/app/api/admin/mashwara/[id]/shares/[shareId]/route.ts`
  - `src/app/api/admin/mashwara/[id]/shares/route.ts`
  - `src/app/api/admin/mashwara/mashwara-api.test.ts`
  - `src/lib/auth/mashwara-scope.test.ts`
  - `src/lib/auth/mashwara-scope.ts`
- **Classification**: Clean integration candidate.
- **Flags**: None.

### 5. PROFILE-007: bbeb0ff
- **SHA**: `bbeb0ff`
- **Parent**: `91526c6`
- **Source Branch**: `agent/antigravity/PROFILE-007-extended-profile-hardening`
- **Changed Files**:
  - `src/components/modules/student-profile/profile-page.test.ts`
  - `src/components/modules/student-profile/profile-page.tsx`
- **Classification**: Commit-only candidate from mixed history.
- **Flags**: Mixed history branch detected.

### 6. CP-UI-001: 4eccae4
- **SHA**: `4eccae4`
- **Parent**: `d5fbbdb`
- **Source Branch**: `agent/antigravity/CP-UI-001-content-planner-workspace`
- **Changed Files**:
  - `src/app/api/admin/content-planner/plans/route.test.ts`
  - `src/app/api/admin/content-planner/plans/route.ts`
- **Classification**: Clean integration candidate.
- **Flags**: None.

### 7. MOB-018: 706d208
- **SHA**: `706d208`
- **Parent**: `8fa16af`
- **Source Branch**: `agent/antigravity/MOB-018-desktop-sidebar-scroll`
- **Changed Files**:
  - `src/components/layout/sidebar.tsx`
- **Classification**: Clean integration candidate.
- **Flags**: None.

### 8. DB-005: bc010ae
- **SHA**: `bc010ae`
- **Parent**: `8fa16af`
- **Source Branch**: `agent/antigravity/DB-005-ci-sqlite-migration-chain`
- **Changed Files**:
  - `.github/workflows/ci.yml`
  - `src/__tests__/release/production-build.test.ts`
- **Classification**: Commit-only candidate from mixed history.
- **Flags**: Configuration modification (`.github/workflows/ci.yml`). Branch contains contaminated subsequent commit.

### 9. SEC-011 v2: 35b9ab1
- **SHA**: `35b9ab1`
- **Parent**: `8fa16af`
- **Source Branch**: `agent/f0c75b8a/SEC-011-v2`
- **Changed Files**:
  - `src/app/api/admin/guardians/[id]/account/route.test.ts`
  - `src/app/api/admin/guardians/invite/route.test.ts`
  - `src/app/api/admin/import/routes.test.ts`
  - `src/app/api/admin/invite/route.test.ts`
  - `src/app/api/admin/students/[id]/account/route.test.ts`
  - `src/app/api/admin/users/[id]/route.test.ts`
  - `src/lib/security/sensitive-response.ts`
- **Classification**: Clean integration candidate.
- **Flags**: None.

## Contaminated Commit Analysis (REJECTED)

### SEC-011 v1: 9f9c895
- **SHA**: `9f9c895`
- **Parent**: `bc010ae`
- **Source Branch**: `agent/antigravity/DB-005-ci-sqlite-migration-chain`
- **Classification**: REJECT / NOT ELIGIBLE
- **Flags**:
  - Contains `.worktrees` artifacts.
  - Contains generated databases (`prisma/.ci-migrate/ci-migration.db`).
  - Contains unrelated files (e.g., `docs/verification/OWNER-RELEASE-CHECKLIST.md`).
- **Verdict**: Explicitly marked as not eligible for integration.

## Mixed-History Branches
The following branches contain mixed history or contaminated commits. **Do not merge these branches directly.** Only cherry-pick the exact eligible commits listed below:
- `agent/antigravity/CALL-004-calling-api-hardening`: Only `b9355d4` is eligible.
- `agent/antigravity/PROFILE-007-extended-profile-hardening`: Only `bbeb0ff` and `b9355d4` are eligible.
- `agent/antigravity/DB-005-ci-sqlite-migration-chain`: Only `bc010ae` is eligible. `9f9c895` must be excluded.

## Integration Plan
1. **Safe Integration Order**:
   - `bc010ae` (DB-005 - CI updates, isolated)
   - `706d208` (MOB-018 - UI isolated)
   - `4eccae4` (CP-UI-001 - Content planner)
   - `1211445` (EVENT-304 - Events)
   - `3152c68` (TEAM-004 - Teams)
   - `635d18c` (MASHWARA-304 - Mashwara)
   - `35b9ab1` (SEC-011 v2 - Security headers, applied directly)
   - `b9355d4` (CALL-004 - Calling assignments)
   - `bbeb0ff` (PROFILE-007 - Profile UI)
2. **Dependency/Conflict-Sensitive File Analysis**:
   - Commits modify mostly isolated areas.
   - `CALL-004` and `PROFILE-007` share history, so applying them sequentially as commits ensures no conflicts.
   - `SEC-011 v2` touches security response headers. Must be verified alongside other API tests.
3. **Mandatory Post-Integration Checks**:
   - Run `npm run typecheck` and `npm run lint`.
   - Run `npm run test` for all affected domains.
   - Run `npm run build` to verify the production build and CI modifications.
4. **Rollback Approach**:
   - In case of a conflict, abort the cherry-pick.
   - If tests fail post-integration, use `git revert <sha>` for the specific problematic commit, or `git reset --hard` to the pre-integration base if multiple issues arise.
5. **Limitations**:
   - This audit does not guarantee business logic correctness or replace UAT.
