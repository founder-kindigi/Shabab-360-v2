# Changelog - Shabab 360

All notable changes to the Shabab 360 platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-04

### Added
- Documented V2 Release Baseline specification ([`docs/V2_RELEASE_BASELINE.md`](file:///d:/iBuild/Shabab-360-v2/docs/V2_RELEASE_BASELINE.md)).
- Complete 39-screen interactive prototype with responsive desktop emulator frame studio and device mode toggles.
- End-to-end Access Management engine (`AM-001` through `AM-005`) with audit matrix and capability overrides.
- Lahore Batch 4 atomic staging import reconciliation (1 City, 6 Parks, 6 Batches, 13 Groups, 277 Participants, 180 Events, 2,967 Records).
- Collaboration teams (`Sports`, `Skills`, `Tadreeb`, `Media`, `Muawin`) added to database schema and staging.

### Security & Hardening
- Server-enforced hierarchy scoping (`authorize.ts` / `scope.ts`) preventing cross-city/cross-park access leaks.
- Fail-closed access matrix resolution and capability gate enforcement.
- Strict PII filtering on guardian search and student detail endpoints.
