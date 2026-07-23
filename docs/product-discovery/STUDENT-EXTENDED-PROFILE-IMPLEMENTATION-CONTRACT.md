# STUDENT-EXTENDED-PROFILE-IMPLEMENTATION-CONTRACT

**Status:** Implementation-ready contract (docs only — no code, no schema, no data)
**Owner:** Codex (design); implementation follows PKG-09 integration
**Base:** codex/production-hardening @ 49a40e9
**Reference source:** `Batch 2 _ Profiles.xlsx` (field-template reference only — no real workbook data, names, or PII committed)

---

## 1. Overview

### 1.1 Purpose

The extended Student Profile stores programme-relevant information about a participant beyond the canonical `Participant` model. It is a **per-participant additive record** created on demand when an authorised user first saves extra data. There is no bulk creation and no historical import.

### 1.2 Canonical Fields — Never Duplicated

The following fields exist on `Participant`, `Guardian`, `GuardianChild`, or `Group`/`Batch`/`Park`/`City`. They are **never** stored in the extended profile:

- `Participant.name, phone, dateOfBirth, age, gradeClass, gender, address, groupId, state, joinedAt`
- `Guardian.name, phone, cnic, address, relation` (via `GuardianChild`)
- `Group.name, Batch.name/startDate, Park.name, City.name`

The extended profile stores only supplementary biographical, developmental, and wellbeing data.

### 1.3 Tab Mapping (Workbook → Contract)

The source workbook `Batch 2 _ Profiles.xlsx` organises fields under grouped headers. These map to six logical tabs in the extended profile:

| Tab | Content | Workbook Header Sources |
|-----|---------|-----------------------|
| Education | School, College, Education system, Previous results, Awards/Achievements, Average Grade/%, Fav. subjects | Academic Record |
| Family & Background | Father Name, Father Occupation, Siblings, Financial status, Native Area, Ethnicity, Mode of Transport | Family, Personal |
| Interests & Skills | Subjects of Interest, Extra curricular, Hobbies, Sports, Learning style, Curiosity, Special Talent, Current Skills, Skills want to learn | Interest & Hobbies, Talent & Skills |
| Goals & Development | General Goals, Vision, Mission, Career Aspirations, Academic/Professional Interests, College/University Plans, Future Career Goals, Strengths, Weaknesses, Good habits | Goals & Mission, Career Goals, Strengths/Weaknesses |
| Support & Wellbeing | Disability, Special Need, Bad habits, Deen Background, Moral character, Namaz | Strengths/Weaknesses, Goals & Mission, Personality and Skills |
| Personality & Skills | Leadership Skills, Responsibility, Moral character, Communication Skills, Teamwork Skills, Problem-Solving Skills, Creativity, Critical Thinking, Adaptability, Initiative, Self-Motivation, Integrity, Empathy, Reading, Learning interest (self-assessment scales) | Personality and Skills |

### 1.4 Duplicate Column "Responsibility"

The workbook has two columns named "Responsibility": one under `Strengths/Weaknesses` (a Likert-scale self-assessment trait) and one under `Personality and Skills` (same). There is exactly **one** canonical target field: `personalityResponsibility` on the extended profile. Any future import that encounters two "Responsibility" columns must flag the conflict for reconciliation — never silently overwrite or sum.

---

## 2. Verified Current Model Reconciliation

### 2.1 Relevant Existing Models

| Model | Key Fields | Notes |
|-------|-----------|-------|
| `Participant` | id, userId, name, phone, dateOfBirth, age, gradeClass, gender, address, groupId, state, joinedAt | Canonical participant record |
| `Guardian` | id, userId, name, phone, cnic, address, isActive | Canonical guardian record |
| `GuardianChild` | id, guardianId, participantId, relation | Links guardian to participant |
| `User` | id, email, isActive, tokenVersion | Login identity |
| `StaffMeta` | id, userId, role, assignedCityId?, assignedParkId?, assignedGroupId?, isActive | Staff assignment; city scope derivation |
| `AuditLog` | id, userId?, action, entityType, entityId?, oldValues?, newValues?, reason?, createdAt | Redacted audit |

### 2.2 Existing Authorization Patterns

- **Module gate:** `requireCapability(capability)` — checks session + resolution order (user override → role override → default → deny)
- **Data gate:** `requireResourceScope(user, {cityId, parkId, groupId})` or `canAccessResourceScope()`
- **Audit:** `logAudit(params)` or `createAuditLogData(params)` inside transactions
- **Capability catalogue** in `src/lib/auth/capabilities.ts` — new codes added there

### 2.3 Existing Capabilities That Apply

| Code | Notes |
|------|-------|
| `students.manage` | Grants student record management — extended profile is a student record |
| `people.view` | Required for staff to read participant lists |
| `guardians.manage` | Guardian can see linked child data |

---

## 3. Proposed Capability And Role Defaults

### 3.1 New Capabilities

```typescript
"students.profile.view",    // Read extended profile data for eligible participants
"students.profile.manage",  // Create and update extended profile data
"students.profile.sensitive.view",  // Read Support & Wellbeing (sensitive) fields
"students.profile.sensitive.manage", // Write Support & Wellbeing fields
```

### 3.2 Role Defaults

| Role | profile.view | profile.manage | sensitive.view | sensitive.manage |
|------|-------------|---------------|---------------|-----------------|
| `super_admin` | YES | YES | YES | YES |
| `program_admin` | YES | YES | YES | YES |
| `city_head` | YES (own city) | YES (own city) | YES (own city) | YES (own city) |
| `park_lead` | YES (own park) | — | — | — |
| `park_admin` | — | — | — | — |
| `murabbi` | YES (own group) | — | — | — |
| `guardian` | YES (linked child only) | — | — | — |
| `student` | YES (own only, non-sensitive fields) | — | — | — |

**Staff with existing `students.manage`** default also receive `profile.view` and `profile.manage` for non-sensitive fields. Sensitive fields require the explicit `sensitive.*` capability.

---

## 4. Authorization Model

### 4.1 Scope Derivation

| Actor | Scope | Rule |
|-------|-------|------|
| HQ (`super_admin`, `program_admin`) | Explicit cityId | Must provide `cityId` (400 if missing). Never blind cross-city access. |
| City Head | `StaffMeta.assignedCityId` | Single city. Mismatch → 403. |
| Park Lead | `assignedParkId` → `Park.cityId` | Participants in own park. |
| Park Admin | — | — |
| Murabbi | `assignedGroupId` → `Group.batch.cityId` | Participants in own group (read-only). |
| Guardian | Linked `GuardianChild.participant` | Own linked children only. |
| Student | Own `Participant.id` | Own profile only. |

### 4.2 Enforcement Pattern

```typescript
// LAYER 1: Capability gate
const auth = await requireCapability("students.profile.view");
if (auth instanceof NextResponse) return auth;

// LAYER 2: Server-derived participant scope
//   HQ: requires explicit cityId query param (400 if missing);
//       if supplied but participant not in that city → 403
//   Staff: derive city via StaffMeta, then verify participant.group.batch/city/park
//   Guardian: verify linked via GuardianChild
//   Student: verify owns the participant record
const resolvedCity = resolveActorCity(auth.user, providedCityId);
if (resolvedCity === null) {
  if (isHqRole(auth.user.role)) return new NextResponse(null, { status: 400 });
  return new NextResponse(null, { status: 403 });
}
if (!(await canAccessParticipantProfile(auth.user, participantId, resolvedCity))) {
  return new NextResponse(null, { status: 403 });
}

// LAYER 3: Sensitive field access (if reading/writing Support & Wellbeing)
if (requestIncludesSensitiveFields && !(await requireCapability("students.profile.sensitive.view"))) {
  return new NextResponse(null, { status: 403 });
}
```

### 4.3 Sensitive Field Rules

**Support & Wellbeing fields** (`disability`, `specialNeed`, `financialStatus`, `badHabits`, `deenBackground`, `moralCharacter`, `namaz`) have stricter rules:

- Never appear in list/search results, exports, audit payloads, or dashboard cards.
- Require `sensitive.view` or `sensitive.manage` capability in addition to the base profile capability.
- Guardian cannot see these fields on linked children (owner decision D2).
- Student cannot see or edit their own sensitive fields (owner decision D3).
- Audit of sensitive field writes redacts the actual values.

---

## 5. Additive Prisma Model

### 5.1 StudentExtendedProfile

```prisma
model StudentExtendedProfile {
  id                    String   @id @default(cuid())
  participantId         String   @unique
  // Education tab
  school                String?
  college               String?
  educationSystem       String?  // e.g. "Matric", "O/A Level", "FBISE"
  previousResults       String?  // Free text summary
  awardsAchievements    String?  // Free text
  averageGrade          String?  // e.g. "A", "85%", "3.5 GPA"
  favouriteSubjects     String?  // Free text
  // Family & Background tab
  fatherName            String?  // Factual name — does NOT create or replace a Guardian record
  fatherOccupation      String?
  siblings              String?  // Free text summary
  financialStatus       String?  // SENSITIVE — free text
  nativeArea            String?
  ethnicity             String?
  modeOfTransport       String?
  // Interests & Skills tab
  subjectsOfInterest    String?
  extraCurricular       String?
  hobbies               String?
  sports                String?
  learningStyle         String?
  curiosity             String?
  specialTalent         String?
  currentSkills         String?
  skillsWantToLearn     String?
  // Goals & Development tab
  generalGoals          String?
  vision                String?
  mission               String?
  deenBackground        String?  // SENSITIVE — free text
  careerAspirations     String?
  academicInterests     String?
  collegePlans          String?
  futureCareerGoals     String?
  strengths             String?
  weaknesses            String?
  goodHabits            String?
  badHabits             String?  // SENSITIVE
  // Support & Wellbeing tab — ALL SENSITIVE
  disability            String?  // SENSITIVE
  specialNeed           String?  // SENSITIVE
  moralCharacter        String?  // SENSITIVE
  namaz                 String?  // SENSITIVE — free text description of practice
  // Personality & Skills tab (self-assessment — Likert or free text)
  leadershipSkills      String?
  personalityResponsibility String?  // Single canonical target for duplicate "Responsibility" columns
  communicationSkills   String?
  teamworkSkills        String?
  problemSolvingSkills  String?
  creativity            String?
  criticalThinking      String?
  adaptability          String?
  initiative            String?
  selfMotivation        String?
  integrity             String?
  empathy               String?
  reading               String?
  learningInterest      String?
  // Metadata
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([participantId])
  @@map("student_extended_profiles")
}
```

### 5.2 Design Decisions

- **On-demand creation:** The profile row is created by Prisma `upsert` on the first write. No seed or bulk creation. The record only exists when an authorised user saves data.
- **All text fields:** Every extended field is `String?` to accommodate free-text input, short descriptions, or Likert-scale labels. No enum constraints for pilot flexibility.
- **`fatherName` clarification:** `fatherName` is a **factual biographical context field** stored on the extended profile. It does **not** create, duplicate, or replace a `Guardian` record. If the participant has a linked Guardian with relation "Father", that Guardian record remains the canonical source. `fatherName` here is supplementary context (e.g. for programmes that record paternal lineage separately from the guardian relationship).
- **`guardianPhone` excluded:** The workbook field "Guardian Phone" maps to the existing `Guardian.phone` field. The extended profile must not duplicate it. When a profile is created, the system does not write a `guardianPhone` field. Any future import attempting to map "Guardian Phone" to the extended profile must report an unresolved match for reconciliation.
- **`personalityResponsibility`:** Single canonical target for the duplicate "Responsibility" workbook column. Any future import that finds two "Responsibility" columns must flag the conflict and refuse to overwrite this field silently.

---

## 6. Zod Contracts

### 6.1 Shared Primitives

```typescript
const participantIdSchema = z.string().cuid();
```

### 6.2 Profile Update Schema

All fields are optional — a partial update writes only the supplied fields. The profile row is upserted (created if absent, merged if existing).

```typescript
const updateProfileSchema = z.object({
  // Education
  school: z.string().max(200).optional(),
  college: z.string().max(200).optional(),
  educationSystem: z.string().max(100).optional(),
  previousResults: z.string().max(2000).optional(),
  awardsAchievements: z.string().max(2000).optional(),
  averageGrade: z.string().max(50).optional(),
  favouriteSubjects: z.string().max(500).optional(),
  // Family & Background
  fatherName: z.string().max(200).optional(),
  fatherOccupation: z.string().max(200).optional(),
  siblings: z.string().max(500).optional(),
  nativeArea: z.string().max(200).optional(),
  ethnicity: z.string().max(100).optional(),
  modeOfTransport: z.string().max(100).optional(),
  // Interests & Skills
  subjectsOfInterest: z.string().max(500).optional(),
  extraCurricular: z.string().max(500).optional(),
  hobbies: z.string().max(500).optional(),
  sports: z.string().max(500).optional(),
  learningStyle: z.string().max(200).optional(),
  curiosity: z.string().max(500).optional(),
  specialTalent: z.string().max(500).optional(),
  currentSkills: z.string().max(1000).optional(),
  skillsWantToLearn: z.string().max(1000).optional(),
  // Goals & Development
  generalGoals: z.string().max(1000).optional(),
  vision: z.string().max(1000).optional(),
  mission: z.string().max(1000).optional(),
  careerAspirations: z.string().max(1000).optional(),
  academicInterests: z.string().max(500).optional(),
  collegePlans: z.string().max(1000).optional(),
  futureCareerGoals: z.string().max(1000).optional(),
  strengths: z.string().max(2000).optional(),
  weaknesses: z.string().max(2000).optional(),
  goodHabits: z.string().max(1000).optional(),
  // Support & Wellbeing (sensitive — requires sensitive.manage)
  financialStatus: z.string().max(500).optional(),
  deenBackground: z.string().max(2000).optional(),
  badHabits: z.string().max(1000).optional(),
  disability: z.string().max(1000).optional(),
  specialNeed: z.string().max(1000).optional(),
  moralCharacter: z.string().max(2000).optional(),
  namaz: z.string().max(1000).optional(),
  // Personality & Skills
  leadershipSkills: z.string().max(500).optional(),
  personalityResponsibility: z.string().max(500).optional(),
  communicationSkills: z.string().max(500).optional(),
  teamworkSkills: z.string().max(500).optional(),
  problemSolvingSkills: z.string().max(500).optional(),
  creativity: z.string().max(500).optional(),
  criticalThinking: z.string().max(500).optional(),
  adaptability: z.string().max(500).optional(),
  initiative: z.string().max(500).optional(),
  selfMotivation: z.string().max(500).optional(),
  integrity: z.string().max(500).optional(),
  empathy: z.string().max(500).optional(),
  reading: z.string().max(500).optional(),
  learningInterest: z.string().max(500).optional(),
}).strict(); // Rejects unknown fields including any attempt to supply participantId, cityId, or audit fields
```

### 6.3 Profile Response Schema

The GET endpoint returns a filtered response based on the caller's capabilities. Two behaviours:

1. **Standard GET** (no `?includeSensitive=true`): sensitive fields are always omitted from the response body. The caller receives 200 with non-sensitive data. No error.
2. **GET with `?includeSensitive=true`**: the server checks for `sensitive.view`. If granted, sensitive fields are populated. If denied, the endpoint returns **403**.

```typescript
// Server-side logic:
async function getProfile(participantId: string, includeSensitive: boolean) {
  const profile = await db.studentExtendedProfile.findUnique({ where: { participantId } });
  if (!profile) return NextResponse.json(null, { status: 200 }); // empty state — no error

  let result = { ...profile };
  const sensitiveFields = [
    "financialStatus", "deenBackground", "badHabits",
    "disability", "specialNeed", "moralCharacter", "namaz",
  ];

  if (includeSensitive) {
    // Permission check — deny if missing
    const auth = await requireCapability("students.profile.sensitive.view");
    if (auth instanceof NextResponse) return auth; // 403
  } else {
    // Strip sensitive fields silently
    for (const field of sensitiveFields) {
      delete result[field];
    }
  }

  return NextResponse.json(result);
}
```

---

## 7. API Route Matrix

### 7.1 Profile Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `GET` | `/api/admin/students/[participantId]/profile` | getProfile | `students.profile.view` | `canAccessParticipantProfile` via `resolveActorCity`; HQ must supply `?cityId=` (400 if missing); sensitive fields silently omitted unless `includeSensitive=true` with `sensitive.view` (403 if missing) | — |
| `PUT` | `/api/admin/students/[participantId]/profile` | upsertProfile | `students.profile.manage` | Same scope derivation; HQ requires `?cityId=`; sensitive fields require `sensitive.manage` | `updateProfileSchema` |
| `GET` | `/api/me/profile` | myProfile | `students.profile.view` | Own participant record (student only) — server validates self-ownership. Guardian uses `/api/guardian/children/[participantId]/profile`. | — |
| `GET` | `/api/guardian/children/[participantId]/profile` | guardianGetProfile | `students.profile.view` | Server validates `GuardianChild` link; sensitive fields omitted; `includeSensitive=true` returns 403 for guardian | — |
| `GET` | `/api/admin/students/profile/search` | searchProfiles | `students.profile.view` | HQ requires `cityId` (400 if missing); scoped derives from StaffMeta; sensitive fields never in results | `{ cityId?, query?, page, limit }` |

### 7.2 Scope Helper

```typescript
async function canAccessParticipantProfile(
  user: SessionUser,
  participantId: string,
  providedCityId?: string
): Promise<boolean> {
  // HQ: must supply cityId (400 if missing); verify participant belongs to that city
  // Staff: derive city from StaffMeta; verify participant's group/batch/city matches
  // Guardian: verify GuardianChild link to participant
  // Student: verify own participant record
}
```

---

## 8. UI-State Contract

### 8.1 Profile Page (Staff View)

**Tabs:** Education | Family & Background | Interests & Skills | Goals & Development | Support & Wellbeing | Personality & Skills

**Empty state (profile does not exist yet):** "No extended profile data yet. Fill in details to get started." — with a "Create Profile" button for authorised staff.

**Loading state:** Skeleton tabs while fetching. Disabled save button during mutation.

**Error state:**
- `400`: "Invalid input."
- `403`: "You do not have permission to view or edit this data."
- `404`: "Participant not found."
- Sensitive fields show "[Restricted]" placeholder by default. An "Include sensitive fields" toggle (staff only) triggers `?includeSensitive=true`; if `sensitive.view` is missing, the toggle shows a 403 message.

**Save behaviour:** Auto-save on field blur or explicit "Save" button. Partial update (only changed fields sent).

### 8.2 Student Self-View

- Read-only display of own profile (non-sensitive fields only).
- No edit capability (subject to owner decision D3).
- Support & Wellbeing tab entirely hidden.

### 8.3 Guardian View

- Read-only display of linked child's profile.
- Support & Wellbeing tab entirely hidden (owner decision D2).
- No edit capability (subject to owner decision D4).

### 8.4 Search/List Behaviour

- The extended profile search endpoint returns only participant name + group + canonical fields.
- No extended profile data appears in search results, exports, attendance lists, or dashboard cards.
- Sensitive fields are never exposed outside the dedicated profile detail view.

---

## 9. Privacy And Audit

### 9.1 Audit Events

| Operation | Action String | Entity Type | Notes |
|-----------|--------------|-------------|-------|
| Create extended profile | `student_profile.create` | `StudentExtendedProfile` | newValues includes all initial fields (redacted sensitive) |
| Update extended profile | `student_profile.update` | `StudentExtendedProfile` | oldValues + newValues (redacted sensitive) |

### 9.2 Mandatory Explicit Audit Sanitizer

The existing `createAuditLogData()` helper's generic `SENSITIVE_AUDIT_FIELD` regex is insufficient for the extended profile's free-text wellbeing fields. The implementation **must** create an explicit Student Profile audit sanitizer in `src/lib/student-profile/audit.ts` that redacts every Support & Wellbeing field before any audit payload is logged:

```typescript
// src/lib/student-profile/audit.ts
const PROFILE_SENSITIVE_FIELDS = [
  "financialStatus", "deenBackground", "badHabits",
  "disability", "specialNeed", "moralCharacter", "namaz",
];

export function redactProfileSensitiveValues(values?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!values) return undefined;
  const redacted = { ...values };
  for (const field of PROFILE_SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = "[REDACTED]";
    }
  }
  return redacted;
}

// Usage: call before createAuditLogData or logAudit
const sanitizedNew = redactProfileSensitiveValues(newValues);
```

This sanitizer must be called **before** `createAuditLogData()` or `logAudit()`. The generic helper does not reliably catch all free-text wellbeing content.

### 9.3 Sensitive Data Protection

- Support & Wellbeing fields are never included in list/search API responses.
- Support & Wellbeing fields are redacted in audit logs.
- Support & Wellbeing tab is hidden from guardian and student self-view.
- Export endpoints exclude all extended profile data (unless a specific future owner-approved export template includes it).

### 9.3 `fatherName` And Guardian Relationship

`fatherName` on the extended profile is **not** a Guardian record. It is supplementary biographical context. The existing `Guardian` + `GuardianChild` model remains the canonical source for guardian relationships. When staff enter `fatherName`, the system stores it on the extended profile without creating or modifying any Guardian record.

---

## 10. Migration Sequence

### 10.1 Prerequisites

- PKG-09's dynamic capability-governance contract (capability catalogue, role defaults, named-user eligibility) must be implemented before this module's routes deploy. The catalogue rises from 36 to 40 with the four new profile capabilities.

### 10.2 Steps

1. **Add model** `StudentExtendedProfile` to both `prisma/schema.prisma` and `prisma/postgres/schema.prisma`.
2. **Generate Prisma client.**
3. **Create additive local migration (SQLite):** `npx prisma migrate dev --name add_student_extended_profile`
4. **Align PostgreSQL.**
5. **Add capability constants** to `src/lib/auth/capabilities.ts`: `students.profile.view`, `students.profile.manage`, `students.profile.sensitive.view`, `students.profile.sensitive.manage`.
6. **Add role defaults** per §3.2.
7. **Create API routes** per §7.
8. **Create scope helper** `canAccessParticipantProfile`.
9. **Create Zod schemas** per §6.
10. **Add tests** per §12.
11. **Run full quality gates:** lint, typecheck, test suite, SQLite build, PostgreSQL build.

### 10.3 Rollback

Standard rollback: disable routes and remove capability codes. The additive table remains intact. No destructive rollback. Backup before migration.

---

## 11. Files To Create

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add `StudentExtendedProfile` model |
| `prisma/postgres/schema.prisma` | Add same model |
| `src/lib/auth/capabilities.ts` | Add 4 new capability codes + role defaults |
| `src/lib/student-profile/zod.ts` | Zod schemas |
| `src/lib/student-profile/types.ts` | TypeScript types |
| `src/lib/student-profile/scope.ts` | `canAccessParticipantProfile` helper |
| `src/app/api/admin/students/[participantId]/profile/route.ts` | GET, PUT |
| `src/app/api/me/profile/route.ts` | GET (self — student only) |
| `src/app/api/guardian/children/[participantId]/profile/route.ts` | GET (guardian — validated via GuardianChild) |
| `src/app/api/admin/students/profile/search/route.ts` | GET (search) |
| `src/components/modules/student-profile/profile-page.tsx` | Tabbed profile page |
| `src/components/modules/student-profile/education-tab.tsx` | Education tab |
| `src/components/modules/student-profile/family-tab.tsx` | Family & Background tab |
| `src/components/modules/student-profile/interests-tab.tsx` | Interests & Skills tab |
| `src/components/modules/student-profile/goals-tab.tsx` | Goals & Development tab |
| `src/components/modules/student-profile/wellbeing-tab.tsx` | Support & Wellbeing tab (sensitive) |
| `src/components/modules/student-profile/personality-tab.tsx` | Personality & Skills tab |
| `src/__tests__/api/student-profile/allow.test.ts` | Allow tests |
| `src/__tests__/api/student-profile/deny.test.ts` | Deny tests |
| `src/__tests__/api/student-profile/error.test.ts` | Error tests |
| `src/__tests__/api/student-profile/audit.test.ts` | Audit tests |

---

## 12. Test Matrix

### 12.1 Allow Tests

| ID | Test | Expected |
|----|------|----------|
| PROF-ALLOW-001 | City Head creates extended profile for participant in own city (non-sensitive fields) | 200 |
| PROF-ALLOW-002 | City Head updates non-sensitive fields on existing profile | 200 |
| PROF-ALLOW-003 | City Head with `sensitive.manage` writes Support & Wellbeing fields | 200 |
| PROF-ALLOW-004 | Murabbi reads extended profile for participant in own group (non-sensitive) | 200 |
| PROF-ALLOW-005 | Park Lead reads extended profile for participant in own park | 200 |
| PROF-ALLOW-006 | Guardian reads linked child's non-sensitive profile fields | 200 |
| PROF-ALLOW-007 | Student reads own non-sensitive profile fields | 200 |
| PROF-ALLOW-008 | Super Admin reads extended profile with explicit cityId | 200 |
| PROF-ALLOW-009 | City Head with `sensitive.view` reads Support & Wellbeing with `?includeSensitive=true` | 200 (sensitive fields populated) |
| PROF-ALLOW-010 | Profile upserted on first write (no prior record) | 201 (created) |
| PROF-ALLOW-011 | City Head reads profile without `?includeSensitive=true` — sensitive fields silently omitted | 200 (non-sensitive only) |

### 12.2 Deny Tests

| ID | Test | Expected |
|----|------|----------|
| PROF-DENY-001 | Unauthenticated user reads profile | 401 |
| PROF-DENY-002 | Park Admin reads extended profile (no profile.view) | 403 |
| PROF-DENY-003 | Park Admin writes extended profile (no profile.manage) | 403 |
| PROF-DENY-004 | City Head writes extended profile for participant in another city | 403 |
| PROF-DENY-005 | Student reads own profile with `?includeSensitive=true` | 403 (no sensitive.view) |
| PROF-DENY-006 | City Head writes sensitive fields without `sensitive.manage` | 403 |
| PROF-DENY-007 | Student writes own profile (no profile.manage for self) | 403 |
| PROF-DENY-008 | Guardian writes linked child's profile | 403 |
| PROF-DENY-009 | Park Lead reads participant in another park | 403 |
| PROF-DENY-010 | HQ reads profile without cityId | 400 |
| PROF-DENY-011 | HQ searches profiles without cityId | 400 |
| PROF-DENY-012 | Client supplies `participantId` in request body (strict schema) | 400 |
| PROF-DENY-013 | Student reads another student's profile | 403 |
| PROF-DENY-014 | Guardian reads linked child's profile with `?includeSensitive=true` | 403 (no sensitive.view) |
| PROF-DENY-015 | City Head reads profile detail with `?cityId=` set to a different city | 403 |

### 12.3 Error Tests

| ID | Test | Expected |
|----|------|----------|
| PROF-ERR-001 | Update with field exceeding max length | 400 |
| PROF-ERR-002 | Update non-existent participant ID | 404 |
| PROF-ERR-003 | Search with invalid page (< 1) | 400 |

### 12.4 Audit Tests

| ID | Test | Expected |
|----|------|----------|
| PROF-AUDIT-001 | Creating extended profile creates audit log entry | AuditLog with action `student_profile.create` exists |
| PROF-AUDIT-002 | Updating profile creates audit log entry | AuditLog with action `student_profile.update` exists |
| PROF-AUDIT-003 | Sensitive fields are redacted in audit payload | Values show `[REDACTED]` |
| PROF-AUDIT-004 | Reads do not create audit log entries | No audit log created |

---

## 13. Owner Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| D1 | **Student self-edit** — may students edit their own non-sensitive profile fields (Education, Interests, Goals)? | Allow edit vs Read-only | Affects PUT auth for student role |
| D2 | **Guardian sensitive access** — may guardians see Support & Wellbeing fields on linked children? | Yes vs No | Affects field filtering for guardian role |
| D3 | **Student sensitive access** — may students see their own Support & Wellbeing fields? | Yes vs No | Affects field filtering for student role |
| D4 | **Guardian edit** — may guardians update family/background data for linked children? | Allow edit vs Read-only | Affects PUT auth for guardian role |

---

*End of STUDENT-EXTENDED-PROFILE-IMPLEMENTATION-CONTRACT*
