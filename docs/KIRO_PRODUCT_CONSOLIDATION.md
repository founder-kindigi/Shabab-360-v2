# Shabab 360 v2 - Kiro Product Consolidation

**Document Owner:** Kiro AI Agent
**Date:** 2026-07-15
**Status:** Supporting Product Discovery Synthesis - Not Authoritative
**Purpose:** Preserve Kiro's product analysis, detailed questions, and safeguarding ideas as an input to the authoritative Codex master blueprint

> **Authority notice:** [CODEX_SHABAB360_MASTER_BLUEPRINT.md](CODEX_SHABAB360_MASTER_BLUEPRINT.md)
> is the single working reference for further implementation. This Kiro report
> covers product discovery only and does not replace current-code evidence,
> security audits, migration/deployment gates, or owner-approved decisions.

---

## Document Overview

This consolidation synthesizes:
- Product Vision Input 01 (module and role requirements)
- Product Vision Input 02 (system flow story and implementation claims)
- Shabab Programme Gap Audit (public research and current-state analysis)
- README (document relationships)

**Use this document for:** Product-discovery detail, questions for the product
owner, safeguarding discussion, and comparison with the Codex master. Do not
use it alone for implementation order, technical architecture, or release
approval.

---

## 1. Programme Context

### 1.1 What is Shabab Alburhan?

Public material describes **Shabab Alburhan** as a selective youth leadership
and development programme within the Al-Burhan network. Claims about 15+ cities
require current internal confirmation.

**Possible framework from public/product material:** Mind, Body, Soul
development. Confirm the official framework and its relationship to the four
content categories before implementation.

**Target Participants:**
- Boys in grades 9-12 / O/A Levels
- Approximate age range inferred from grade levels: 14-19 years; confirm
  official age/grade eligibility
- Selective admission with limited seats and interview process

**Programme Characteristics:**
- Public material indicates weekend sessions, with some references to three
  hours; confirm the standard schedule
- Public material references parks; confirm venue and backup-venue policy
- Public material varies between 6+ months and one year; confirm duration by
  programme/city
- Tuition-free (optional event/camp fees may apply)
- Mentor-led small groups
- Public material mentions activities such as camping, outdoor survival,
  hiking, archery, swimming, teamwork, problem-solving, and leadership. Confirm
  which are national standards versus local examples.

**Operating Scale:**
- Multi-city programme (15+ cities claimed in public material)
- Park-based venue model
- Cohort/batch-based intake
- Group-based delivery with assigned mentors (Murabbis)

### 1.2 Programme Values and Objectives

- Islamic learning and spiritual development (Soul)
- Physical fitness and outdoor skills (Body)
- Leadership, character, and personal development (Mind)
- Community service and engagement
- Mentor guidance and tarbiyah
- Parent engagement and family involvement

---

## 2. Product Vision and Principles

### 2.1 Core Product Vision

**Shabab 360 is:** A role-driven operational platform for managing Shabab Alburhan youth programme across multiple cities, parks, and cohorts.

**It is NOT:** A generic education/school management system, a public social platform, or a fee-collection-first product.

### 2.2 Foundational Product Principles

1. **Role-Driven Experience:** Every user sees only what their role requires - different doors to different workspaces
2. **Operational, Not Administrative:** Dashboards surface exceptions and direct users to next actions, not just display metrics
3. **Offline-First Attendance:** Park operations must work without internet; sync when connectivity returns
4. **Safeguarding-First:** Youth programme requirements (consent, medical, incidents) are non-negotiable
5. **No Public Self-Registration:** All internal accounts created by administrators only
6. **Linked Relationships:** Guardians linked to children; students linked to groups; mentors assigned explicitly
7. **URL-Persistent Views:** Operational filters shareable and bookmarkable
8. **Contextual Handoffs:** Direct navigation between related records (student → access, guardian → access)
9. **Hierarchical Governance:** HQ → City → Park operational cascade with appropriate scope limits
10. **Exception-Driven:** Highlight what needs attention, not just report status

### 2.3 Public vs. Internal Access Model

**Public Website:**
- Programme information for general public
- Explains purpose, eligibility, values
- Login portal button for internal users
- Public admission submission boundary is a product decision: it may live on
  the public site, on a separate public campaign route, or be staff-entered

**Internal Portal (Login Required):**

- Email/password authentication
- Administrator-created accounts only
- First-login password reset flow
- Role-aware automatic routing to correct portal
- Session-based identity with server-side authorization

---

## 3. User Roles and Access Architecture

### 3.1 Role Hierarchy

```
Programme Governance
  └── Program Head (Markazi Masoul) - National HQ
      └── City Head (City Masoul) - City Operations
          └── Park Leadership And Operations
              ├── Park Lead
              ├── Park Admin
              └── Murabbi (Mentor) - Assigned Groups/Teams

Linked Programme Relationships
  ├── Shabab - Participant linked to group/team assignments
  └── Guardian - Family record linked to one or more Shabab
```

### 3.2 Role Definitions and Responsibilities

#### **Program Head (Markazi Masoul)** - National HQ Oversight
**Primary Landing:** `/admin` (HQ Dashboard)

**Responsibilities:**
- View national metrics across all cities
- Manage city entities (create, edit city name/code)
- Assign/reassign City Heads
- Identify systemic issues:
  - Cities without City Heads
  - Cities without active parks

  - Cities with high warning/dropout rates
- Access HQ exception boards
- Generate cross-city reports and exports
- Make national announcements
- Manage City Head access provisioning
- View audit logs

**Access Scope:** All cities, read/write at HQ level

**Key Pages:** `/admin`, `/admin/cities`, `/admin/reports`, `/admin/announcements`, `/admin/users`, `/admin/audit-log`

#### **City Head (City Masoul)** - City Operations Control
**Primary Landing:** `/admin` (City Dashboard - city-scoped)

**Responsibilities:**
- Manage parks within assigned city (create, edit, deactivate)
- Manage batches (create, configure rules, manage capacity)
- Manage groups (create, assign to batch, set capacity)
- Create attendance events for groups
- **People Operations:**
  - Create Shabab and place into groups immediately
  - Create Murabbis and assign to groups immediately
  - Move Shabab/Murabbis between groups
  - Bulk-move, bulk-activate, bulk-deactivate operations
  - Edit names, phone numbers, active/inactive status
- **Student Operations:**
  - Student directory with filters (park, batch, activity)

  - See who has login access
  - Navigate to access provisioning
- **Guardian Operations:**
  - Create guardians linked to children
  - Link additional children to existing guardians
  - Guardian directory with filters and search
  - Navigate to access provisioning
- Configure batch rules and settings
- Manage fees (if applicable)
- Make city-level announcements
- Generate city-scoped reports
- View city audit logs
- Provision access for park staff, guardians, students

**Dashboard Exceptions:**
- Parks without active batches
- Batches without groups
- Groups without today's attendance event
- Groups with Shabab but no Murabbi
- Warning or dropout participants
- Inactive Murabbis assigned to active groups

**Access Scope:** Assigned city only, full city operations

**Key Pages:** `/admin`, `/admin/parks`, `/admin/people`, `/admin/students`, `/admin/guardians`, `/admin/attendance-events`, `/admin/settings`, `/admin/fees`, `/admin/announcements`, `/admin/reports`, `/admin/users`

#### **Park Lead** - Park Management
**Primary Landing:** `/park` (Park Dashboard)

**Responsibilities:**
- View park operational status
- Modify Shabab attendance (correction authority)
- Monitor attendance event status (open/closed)
- Review offline sync queue health
- Oversee park-level operations
- Manage park-level exceptions

**Access Scope:** Assigned park only

**Key Pages:** `/park`, `/park/attendance`, `/park/attendance/[eventId]`

#### **Park Admin** - Ground Operations
**Primary Landing:** `/park` (Park Dashboard)

**Responsibilities:**
- Mark Shabab attendance for each group
- Mark team attendance
- Mark in-park class attendance
- Use offline-capable attendance workflows
- Monitor sync status and queue
- Handle attendance for Mashwara and training (when designated)

**Critical Requirement:** Must function fully offline with local queue and sync when online

**Access Scope:** Assigned park only

**Key Pages:** `/park`, `/park/attendance`, `/park/attendance/[eventId]`

#### **Murabbi (Mentor)** - Group Leadership
**Primary Landing:** TBD (likely `/park` or mentor-specific view)

**Responsibilities:**
- Lead assigned group(s)
- Support attendance marking
- Access Murabbi training content
- View group roster and participant information

**Future Requirements:** Mentor observation recording, participant development tracking, content delivery confirmation

**Access Scope:** Assigned group(s) only

#### **Guardian (Parent)** - Family Portal
**Primary Landing:** `/guardian`

**Responsibilities:**
- View linked child(ren) information
- View attendance for linked children
- View fee status for linked children
- Read announcements

**Current Limitations (P2 Gap):**
- Cannot submit consent
- Cannot update emergency/medical information
- Cannot confirm attendance or report absence
- Cannot approve trips/camps
- Cannot receive event-specific instructions

**Access Scope:** Linked children only - strictly enforced

**Key Pages:** `/guardian`

#### **Shabab (Student)** - Personal Portal
**Primary Landing:** `/student`

**Responsibilities:**

- View own attendance
- View own fee status
- Read announcements

**Future Requirements:** View development milestones, badges, curriculum progress, certificates

**Access Scope:** Own data only - strictly enforced

**Key Pages:** `/student`

### 3.3 Role Authorization Rules

The following are draft rules pending product-owner approval:

1. **Current account model:** One role per login; the target multi-role/context-switching model remains a decision
2. **Scope inheritance:** HQ sees all cities; City Head sees assigned city; Park roles see assigned park
3. **Guardian/Student scope:** Strictly limited to linked records only
4. **Access provisioning:** Proposed for HQ and appropriately scoped City Heads;
   confirm final authority and verify the current UI/API path
5. **Attendance:** Park Admin marks approved attendance types; Park Lead has
   correction authority. Murabbi and team-attendance rights remain decisions.
6. **Announcements:** Proposed national and city scopes; final audience and
   publishing authority remain decisions.

---

## 4. Core Modules and Features

### 4.1 Admissions Module

**Purpose:** Manage selective intake process from application through enrollment

**Intended Workflow From Product Input:**
1. Candidate submits admission form
2. Team schedules interview
3. Candidate receives interview slot (call + WhatsApp)
4. Registration fees collected (if applicable)

5. Candidate interview conducted
6. Guardian interview conducted
7. Reviewers record marks, remarks, score/rating, status
8. Approved candidate allocated to park
9. Enrolled student assigned to group
10. Murabbi assigned

**Recommended Statuses:**
- `New` → `Interview Scheduled` → `Interviewed` → `Approved` → `Enrolled`
- Terminal/paused: `Rejected`, `Hold`

**P0 Critical Issue - DATA LOSS:**
- Admission form collects: emergency contact, emergency phone, previous education, reference details
- **API and database DO NOT save these fields**
- Zod validation silently removes unknown fields
- Staff believe data is captured when it is NOT
- **Must fix before admissions are trusted**

**P1 Gaps - Admissions Too Shallow:**
- No configurable eligibility rules
- No structured screening rubric or assessor panel
- No capacity/waitlist handling
- Missing parent interview tracking as separate from candidate interview
- No consent capture during admission
- No education history persistence
- No referral tracking
- Generic interview scores (need rubric-based assessment)

- No structured reasoned decisions
- Conversion directly creates participant without consent/medical check

**Required Data to Capture (must be defined):**
- Emergency contact details (primary + secondary)
- Medical conditions and allergies
- Previous education details
- References and referral source
- Parent/guardian consent for programme participation
- Photo/media consent
- Transport arrangements
- Dietary requirements

**Integration Requirements:**
- WhatsApp integration for interview slot notifications
- Structured interview rubric (Mind, Body, Soul criteria?)
- Approval authority rules
- Admission campaign tracking

### 4.2 Attendance Module

**Purpose:** Track participant presence at sessions with offline-first capability

**Critical Requirement:** **OFFLINE-FIRST** - Must work without internet connectivity in parks

**Workflow:**
1. Park Admin opens attendance board (`/park/attendance`)
2. Sees today's events for the park
3. Selects event to open roster (`/park/attendance/[eventId]`)
4. Marks each participant: Present, Absent, Late, Excused
5. Action queued in IndexedDB (Dexie) local store
6. Roster updates immediately (optimistic UI)

7. Sync indicator shows: Queued → Syncing → Synced (or Failed)
8. When connectivity returns, automatic background sync
9. Failed items remain visible for manual retry
10. Consecutive absence alerts trigger

**Attendance Types:**
- Shabab group attendance (primary)
- Team attendance
- In-park class attendance
- Mashwara attendance
- Training attendance

**Authority:**
- Park Admin: Can mark attendance
- Park Lead: Can mark AND modify attendance
- Murabbi: TBD (likely can mark for assigned group)

**Technical Stack:**
- Dexie / IndexedDB for offline queue
- Per-participant queue items
- Sync state tracking
- Cache fallback for roster data
- Mobile-optimized interface

**P1 Gap - Sessions Too Simple:**
- Current: Only title, group, date
- Missing: Activity type, duration, venue, trainer, capacity, equipment, objectives
- One-event-per-group-per-day limit prevents multi-activity sessions
- Cannot represent camps, multiple blocks, workshops, field activities

**Future Requirements:**

- Richer activity model supporting camps, workshops, sports
- Multiple sessions per day
- Activity-specific rosters (swimming subset, archery group, etc.)
- Pre-attendance preparation checks (consent for activity, equipment issued)

### 4.3 Access Provisioning Module

**Purpose:** Centralized account creation and management for all roles

**Entry Points:**
- Direct: `/admin/users`
- From student directory: Row action → prefilled form
- From guardian directory: Row action → prefilled form
- From people operations: Access status check → prefilled form

**Capabilities:**
- Excel bulk import (template-based)
- Single account creation
- Single account update
- Contextual prefilling from source record

**Account Creation Rules:**
1. If `guardianId` present → Guardian context takes priority
2. `personId` becomes inactive in guardian mode
3. Role locked to `guardian` in guardian mode
4. Saving blocked if role is blank
5. Warning shown if no target linked (creates unlinked account)
6. First-login password reset can be required

**Target Types:**
- Person (staff, Shabab, Murabbi)
- Guardian (linked to child)
- Manual/Unlinked (no target)

**Display Information:**
- Target person or guardian name
- Whether target already has linked login
- Linked email (if exists)
- Password reset requirement status
- Action type: Create or Update
- Effective role being assigned

**Authorization:**
- HQ: Can provision all roles
- City Head: Can provision park staff, guardians, students within city

### 4.4 Content Planner Module

**Purpose:** Organize and deliver curriculum content for Shabab classes and Murabbi training

**Content Categories:**
- Four categories for Shabab class content (specific categories TBD)
- Separate section for Murabbi training content
- Content organized for delivery by Murabbis in Shabab classes

**Current Management:** Google Sheets (needs to be migrated to portal)

**P1 Gap - No Curriculum Model:**
- No data model for curriculum tracks
- No lesson plans, skills, badges, or milestones
- No participant development records
- No mentor observations or behavior tracking
- Cannot track learning outcomes or programme completion
- Certificates based only on attendance rate, not actual curriculum completion

**Required Definition:**

- The four Shabab class content categories
- Mind/Body/Soul track structure
- Learning objectives and milestones
- Skills and badge system
- Progression rules
- Completion criteria

**Future Requirements:**
- Content library with versioning
- Lesson planning and delivery tracking
- Murabbi training curriculum
- Resource attachments (PDFs, videos, presentations)
- Content effectiveness feedback

### 4.5 Calendar and Batch Planner Module

**Purpose:** Schedule and plan programme activities, events, and operational milestones

**Event Types:**
- Admission campaigns and timelines
- Park hunting (venue scouting)
- Batch inaugurations
- Closing ceremonies
- Operational planning activities
- Batch-specific event dates

**P1 Gap - Retrospective vs Operational:**
- Current "schedule" only reads historical attendance events
- Infers typical meeting days from past events
- Cannot create or publish future session plans
- No recurring schedule management
- No guardian notification of schedule changes
- No attendance confirmation collection
- Cannot manage camp itineraries or multi-day events

**Required Features:**
- Forward-looking event calendar
- Recurring session templates
- Event registration and capacity
- Guardian notification and confirmation
- Activity-specific scheduling (swimming, trips, camps)
- Operational timeline tracking (admission deadlines, etc.)
- Integration with attendance event creation
- Meeting links for virtual sessions
- Batch-specific event associations

**Required Definition:**
- Distinction between programme events, operational planning work, and class sessions
- Event ownership and responsibility assignment
- Calendar visibility by role

### 4.6 Events Module

**Purpose:** Manage special activities and programme experiences

**Event Types:**
- Swimming sessions
- Trips and excursions
- Camps (winter camps, tarbiyah camps, recreational camps)
- Inaugurations
- Closing ceremonies
- Sports activities
- Outdoor survival training
- Archery, hiking, other specialized activities

**Required Features:**
- Event creation with activity type
- Capacity management

- Participant registration and attendance
- Guardian consent for specific events
- Risk assessment for outdoor/travel activities
- Equipment and resource allocation
- Staff/mentor assignment
- Cost tracking (if applicable)
- Emergency contact validation
- Medical clearance requirements
- Transport arrangements
- Itinerary management for multi-day events

**P1 Safeguarding Gap:**
- No risk assessment model
- No event-specific consent tracking
- No medical clearance for activities
- No emergency procedures documentation
- No incident reporting for events

### 4.7 Finance Module

**Context:** Programme is tuition-free, but may have optional fees

**Fee Types:**
- Registration fees (where applicable, may be waived)
- Donations
- Event fees (trips, special activities)
- Sports and equipment purchases

**Current State:** Fee tracking exists but is too prominent in UI despite tuition-free nature

**P2 Gap:** Fees are too central to product experience despite being secondary to programme operations

**Required Definition:**

- Which finance items are optional, required, waived, or refundable
- Fee specificity: programme-level, event-level, city-level, park-level, or student-specific
- Waiver rules and approval process
- Payment methods and tracking
- Receipt generation
- Financial reporting requirements

**Future Requirements:**
- De-emphasize fees in UI
- Make fee module optional/configurable
- Event-specific fee association
- Scholarship/waiver management
- Donation tracking separate from fees

### 4.8 Procurement and Inventory Module

**Purpose:** Track programme materials, equipment, and park assets

**Required Features:**
- Item master list with quantities
- Park-specific inventory assignments
- Primary contact per park + assistant
- Purchase orders
- Item transfers between parks
- Stock levels and alerts

**P1 Gap - Simple Location Model:**
- Parks only have name, city, address
- No inventory ownership tracking
- No transfer workflows
- No loss reporting
- No approval chains
- No stock audit procedures

**Example Items:**
- Sports equipment (archery, swimming gear)
- Training materials
- First aid kits
- Activity supplies
- Camping equipment
- Educational resources

**Required Definition:**
- Inventory ownership, transfer, loss, approval workflows
- Stock audit procedures
- Requisition and approval process
- Equipment maintenance tracking

### 4.9 Community Module

**Purpose:** Internal social/engagement platform for participants and staff

**Vision:** Similar in concept to LetsVibeIt (social activity platform)

**Potential Features:**
- User profiles with joined groups, teams, and roles
- Community posts and interactions
- Group-specific discussions
- Event participation visibility
- Activity sharing
- Recognition and achievements

**Required Definition (Critical for Youth Programme):**
- Community moderation policies
- Privacy controls and settings
- Media upload rules and safeguarding
- Content moderation workflows
- Reporting and escalation procedures
- Age-appropriate interaction rules
- Staff oversight mechanisms

- Guardian visibility into child's community activity

**Safeguarding Considerations:**
- All participants are minors (14-19)
- Mentor-participant interaction guidelines
- Peer-to-peer communication rules
- Photo/video sharing policies
- External link policies

### 4.10 Online Resources Module

**Purpose:** Provide learning materials and references

**Resource Types:**
- Courses
- Books and e-books
- Articles
- Videos (if applicable)
- External links

**Potential Features:**
- Resource library with categories
- Search and filtering
- Role-based access (public, Shabab, Murabbi, etc.)
- Resource recommendations
- Progress tracking for courses
- Downloadable materials

### 4.11 Messaging Module

**Purpose:** Internal communication within the portal

**Concept:** Small internal messenger for platform users

**Required Definition (Critical for Youth Programme):**
- Messaging participants (who can message whom?)
- Message retention policies
- Reporting and moderation mechanisms
- Safeguarding rules:

  - Shabab-to-Shabab messaging allowed?
  - Murabbi-to-Shabab messaging policies
  - Group messaging vs. individual
  - Staff oversight and audit trails
  - Inappropriate content detection
  - Parent/guardian notification rules

**Potential Features:**
- One-on-one messaging
- Group chats
- Broadcast messages (announcements alternative)
- Read receipts
- Message history
- File/media sharing policies

### 4.12 Notifications Module

**Purpose:** Alert users to important information and actions

**Notification Types:**
- Attendance reminders
- Schedule changes
- Event registrations
- Fee reminders
- Administrative updates
- Emergency alerts

**Required Definition:**
- Notification channels (in-app, email, SMS, WhatsApp)
- Templates for each notification type
- Consent and opt-in requirements
- Delivery tracking and confirmation
- Escalation rules (e.g., if not read within X hours)
- Role-specific notification preferences
- Emergency broadcast protocols

**Integration Targets:**
- WhatsApp (mentioned for interview notifications)
- Email
- SMS
- In-app notifications

### 4.13 Announcements Module (Current)

**Purpose:** Broadcast information to user groups

**Current Features:**
- HQ announcements (national)
- City announcements (city-scoped)
- Park announcements (park-scoped)
- Visible to guardians and students
- Visible in admin dashboards

**Scope Control:**
- Program Head: National announcements
- City Head: City-specific announcements
- Park roles: TBD (park announcements?)

### 4.14 Reports and Exports Module

**Purpose:** Generate operational insights and compliance reports

**Current Reports:**
- Group attendance reports
- Team attendance reports
- Summary dashboard exports
- Fee reports
- Audit log exports

**P2 Gap - Wrong Focus:**

- Current reports focus on attendance and fees
- Missing programme health metrics

**Required Programme Health Reports:**
- Admission funnel analysis (applicants → interviewed → approved → enrolled)
- Cohort capacity tracking
- Mentor-to-participant ratios
- Consent completion rates (who has signed consents?)
- Planned vs. delivered session tracking
- Activity participation rates
- Camp readiness reports (consents, medical clearances)
- Retention and dropout analysis
- Development outcome tracking
- Safeguarding incident summaries
- Group coverage (groups without mentors)
- Inactive participant alerts

**Report Features:**
- Filters and saved presets
- URL-persistent scoped views
- City-focused reports from dashboard links
- Excel exports
- Date range selection
- Cross-city comparison (HQ)
- Drill-down capability

### 4.15 Members Directory Module

**Purpose:** Searchable directory of programme participants and staff

**Potential Features:**
- Member profiles with photo
- Filter by park, batch, group, role, team
- Search by name
- View joined groups and teams

- View community posts by member
- Contact information (with privacy controls)
- Role badges and titles
- Active/inactive status

**Privacy Considerations:**
- What information is visible to whom?
- Guardian access to directory
- Shabab access to directory
- Contact information protection

### 4.16 Audit Log Module (Current)

**Purpose:** Track administrative actions for accountability and compliance

**Current Features:**
- Records administrative operations
- Visible only to approved HQ audit roles under the current pilot policy
- Timestamped entries
- User attribution

**Future Requirements:**
- Filterable by action type, user, date range
- No general export by default. Any incident-specific extract requires owner
  approval and minimum-necessary scope under the audit data policy.
- Retention policies
- Critical action flagging (access changes, deletions)

---

## 5. Organizational Structure and Data Model

### 5.1 Hierarchical Entities

```
Organization (National Programme)
  └── City
      └── Park (Venue)
          └── Batch (Cohort/Intake)
              └── Group (Small Mentor-Led Unit)
                  ├── Shabab (Participants)
                  └── Murabbi (Mentor)
```

### 5.2 Teams and Titles

**Organizational Dimensions:** Each team member mapped to:
- Park (where they operate)
- Group (which group they lead/belong to)
- Role (their system role)
- Team (cross-cutting function)

**Team Types:**
- Sports team
- Skills team
- Tadreeb (training) team
- Other operational teams

**P1 Gap - Staff Assignment Model:**
- Current: One role, one city, one park, one group per staff member
- Missing:
  - Mentor teams across multiple groups
  - Coach specialties
  - Staff availability tracking
  - Training completion records
  - Safeguarding clearance status
  - Participant ratio enforcement
  - Mentor performance tracking

**Required Definition:**
- Role-permission matrix
- Whether users can hold multiple roles
- Whether users can be assigned to multiple parks, groups, teams
- Team hierarchy and responsibilities

### 5.3 Groups and Grouping Rules

**Current:** Groups created within batches

**Intended:** Groups auto-created from student's age and class, with manual override option

**Required Definition:**
- Age/class grouping rules
- Exceptions to automatic grouping
- Group capacity limits
- Reassignment authority
- Min/max group sizes
- Mentor-to-participant ratios per group

### 5.4 Participants and Guardians

**Participant (Shabab):**
- Core identity record
- Linked to group within batch
- Has attendance records
- May have linked login account
- Has linked guardian(s)
- Age/class/grade information

**Guardian:**
- Linked to one or more children (participants)
- Contact information
- May have linked login account
- Receives notifications about linked children

**P1 Critical Gap - Missing Safeguarding Data:**

Current guardian model only has:
- Basic contact information
- Link to children

**Missing (non-negotiable for youth programme):**
- Emergency contact details (primary + secondary)
- Emergency phone numbers
- Medical conditions for each child
- Allergy information
- Dietary requirements
- Consent records:
  - Programme participation consent

  - Photo/media consent
  - Trip/camp consent (event-specific)
  - Medical treatment consent
  - Data processing consent
- Pickup authorization (who can collect child)
- Transport arrangements and preferences
- Consent history and audit trail
- Consent withdrawal capability

**Missing (incident and safeguarding):**
- Incident reports (injuries, behavioral, safeguarding concerns)
- Incident follow-up and resolution
- Staff clearance records (background checks, training)
- Risk assessments per activity type
- Safeguarding case management

### 5.5 Venues and Locations

**Current Park Model:**
- Name
- City
- Address

**P1 Gap - Too Simple:**

**Required for Shabab Operations:**
- Primary venue (regular park location)
- Backup/indoor venues (weather contingency)
- Venue type: Public park, indoor facility, campsite, meeting point
- Venue capacity
- Operating hours and availability
- Facilities available (restrooms, water, first aid)
- Safety notes and hazards
- Emergency assembly points
- Nearest hospital/emergency services

- Access requirements and permissions
- Venue contact person
- Venue-specific equipment storage
- GPS coordinates

---

## 6. Critical Gaps and Priorities

### 6.1 Product-Discovery P0 - Must Fix Immediately

This is not the complete project P0 list. Security, invitation, database,
storage, notification delivery, clean verification, browser UAT, backup/restore,
and deployment blockers are maintained in the
[Codex master blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md) and
[production backlog](TASK_BACKLOG.md).

**1. Admissions Data Loss (Safety Critical)**
- **Issue:** Emergency contact, emergency phone, previous education, references collected but NOT saved
- **Impact:** Safety information believed to be captured but is lost
- **Root Cause:** API Zod schema and Prisma model don't include these fields
- **Fix Required:** Add fields to schema, update API validation, migrate data model
- **Evidence:** `src/components/modules/admin/admissions-page.tsx`, `src/app/api/admin/admissions/route.ts`, `prisma/schema.prisma`

### 6.2 P1 - Critical for Youth Programme Operations

**1. Safeguarding and Consent Foundation (Non-Negotiable)**
- **Issue:** No data model for consent, medical, emergency, incidents
- **Impact:** Cannot safely operate programme for minors with outdoor/travel activities
- **Required:**
  - Consent records model (multiple consent types)
  - Medical/allergy information
  - Emergency contacts (multiple)
  - Incident reporting system
  - Risk assessment per activity
  - Staff clearance tracking

**2. Curriculum and Development Tracking**
- **Issue:** No Mind/Body/Soul curriculum model, no development outcomes
- **Impact:** Cannot demonstrate programme is delivering stated objectives
- **Required:**
  - Curriculum tracks and content structure
  - Skills, badges, milestones
  - Participant development records
  - Mentor observations
  - Learning outcome tracking
  - Meaningful completion certificates

**3. Rich Activity and Session Model**
- **Issue:** Sessions are generic attendance events only
- **Impact:** Cannot represent camps, workshops, multi-activity days, specialized training
- **Required:**
  - Activity types (class, workshop, sport, camp, trip)
  - Session duration and schedule blocks
  - Venue-per-session
  - Trainer/leader assignment
  - Capacity and equipment
  - Session objectives
  - Pre-activity requirements (consent, equipment)

**4. Operational Calendar (Forward-Looking)**
- **Issue:** Current schedule is retrospective, based on historical attendance
- **Impact:** Cannot plan sessions, notify guardians, manage camp itineraries
- **Required:**
  - Future session scheduling
  - Recurring session templates
  - Guardian notifications and confirmations
  - Camp itinerary management

  - Event registration workflow
  - Integration with attendance

**5. Enhanced Admissions Process**
- **Issue:** Too shallow for selective youth programme
- **Impact:** Cannot properly screen, evaluate, track candidates
- **Required:**
  - Configurable eligibility rules
  - Structured interview rubric
  - Capacity and waitlist management
  - Parent interview tracking
  - Education history persistence
  - Consent capture during admission
  - Reasoned decision documentation

**6. Flexible Venue Model**
- **Issue:** Park model too simple for operational needs
- **Impact:** Cannot handle backup venues, camps, safety information
- **Required:**
  - Multiple venue types
  - Venue capacity and facilities
  - Safety information
  - Operating hours
  - Emergency procedures per venue

**7. Mentor Operations Model**
- **Issue:** Cannot represent mentor teams, specialties, clearances
- **Impact:** Cannot track mentor capacity, training, safeguarding status
- **Required:**
  - Multi-group assignments
  - Mentor specialties and availability
  - Training completion tracking
  - Safeguarding clearance status
  - Participant ratio enforcement

  - Performance observation

### 6.3 P2 - Important for Full Product Vision

**1. Interactive Guardian Portal**
- **Issue:** Guardian portal is read-only tracking
- **Impact:** Guardians cannot actively participate in programme operations
- **Required:**
  - Consent submission and updates
  - Emergency/medical information updates
  - Attendance confirmation
  - Absence reporting
  - Trip/camp approval
  - Event-specific instructions

**2. De-emphasize Fees**
- **Issue:** Fees too prominent despite tuition-free programme
- **Impact:** Wrong product focus, confusing for tuition-free context
- **Required:**
  - Make fee module optional/configurable
  - Move fees to secondary navigation
  - Event-specific fee associations only when needed

**3. Programme Health Reporting**
- **Issue:** Reports focus on attendance/fees, not programme outcomes
- **Impact:** Cannot measure what matters to leadership
- **Required:**
  - Admission funnel reports
  - Cohort capacity tracking
  - Mentor ratio reports
  - Consent completion tracking
  - Planned vs. delivered sessions
  - Retention and dropout analysis

  - Development outcome tracking
  - Safeguarding metrics

**4. Additional Modules (From Vision Input 01)**
- Content Planner (with curriculum structure)
- Events management
- Procurement and inventory
- Community platform (with safeguarding)
- Online resources
- Messaging (with safeguarding)
- Notifications (multi-channel)
- Members directory

---

## 7. Open Questions Requiring Product Owner Input

These questions **must be answered** before implementation can proceed on affected features:

### 7.1 Curriculum and Learning
1. What are the four Shabab class content categories?
2. What is the Mind/Body/Soul track structure and progression?
3. What are the learning objectives and milestones?
4. What skills and badges exist?
5. What defines programme completion vs. attendance completion?
6. How should development outcomes be measured?

### 7.2 Finance and Fees
1. Which fees are optional, required, waived, or refundable?
2. Are fees programme-level, event-level, city-level, park-level, or student-specific?
3. What are waiver rules and who can approve?
4. What payment methods are supported?

5. Should fees be de-emphasized or optional in UI?

### 7.3 Admissions Process
1. What are exact eligibility criteria?
2. What is the interview rubric (Mind/Body/Soul criteria)?
3. Who has approval authority at each stage?
4. How does WhatsApp integration work for notifications?
5. What education history details must be captured?
6. What reference information is needed?
7. How are admission campaigns tracked?

### 7.4 Grouping and Assignment
1. What are age/class automatic grouping rules?
2. What are exceptions to automatic grouping?
3. What are group capacity limits (min/max)?
4. Who has reassignment authority?
5. What are required mentor-to-participant ratios?

### 7.5 Events and Activities
1. What distinguishes programme events, operational planning events, and class sessions?
2. What activity types exist (categories)?
3. What are standard vs. optional activities per city?
4. Are robotics, rescue training mentioned in public material standard or local?

### 7.6 Procurement and Inventory
1. What are inventory ownership and transfer rules?

2. What are approval workflows for transfers and purchases?
3. What are loss reporting procedures?
4. What are stock audit requirements?
5. What inventory categories exist?

### 7.7 Community and Messaging
1. What are community moderation policies?
2. What are privacy and media upload rules?
3. Can Shabab message other Shabab?
4. What are Murabbi-to-Shabab messaging policies?
5. What are content moderation workflows?
6. What are reporting and escalation procedures?
7. What guardian visibility into child's community activity?
8. What are message retention policies?
9. What safeguarding rules apply?

### 7.8 Notifications
1. What notification channels (email, SMS, WhatsApp, in-app)?
2. What are notification templates per event type?
3. What are consent and opt-in requirements?
4. What are delivery tracking requirements?
5. What are escalation rules (e.g., unread emergency notifications)?

### 7.9 Roles and Permissions
1. Can users hold multiple roles?
2. Can users be assigned to multiple parks, groups, teams?
3. What is the complete role-permission matrix?

4. What are team hierarchies and responsibilities?

### 7.10 Safeguarding
1. What consent types are required?
2. What medical information must be collected?
3. What are incident reporting and follow-up procedures?
4. What staff clearance requirements (background checks)?
5. What are risk assessment procedures per activity type?
6. What are safeguarding case management workflows?
7. What are guardian consent withdrawal procedures?
8. What are pickup authorization policies?

### 7.11 Programme Operations
1. What is standard programme duration (6 months vs. 1 year)?
2. What is standard weekly schedule (day, time, duration)?
3. Do these vary by city?
4. What are official current city counts and participant numbers?
5. What are camp types and frequency?
6. What are parent engagement requirements?

---

## 8. Current Implementation Status

### 8.1 Implementation Claims (Require Verification)

Vision Input 02 lists extensive "claimed implemented" features. These claims are **explicitly noted as requiring independent verification** through:
- Browser UAT with real role accounts
- Live smoke tests across major workflows
- Data validation against actual Supabase content

- Production environment testing

**Claimed as implemented:**
- Next.js App Router, TypeScript, Tailwind CSS
- Supabase (Auth, Postgres, RLS)
- Dexie/IndexedDB for offline attendance
- Role-based routing and authorization
- HQ workspace (cities, reports, announcements, audit logs)
- City Head workspace (parks, people, students, guardians, attendance events, settings, fees)
- People operations (create, assign, bulk actions)
- Student directory with filters and access handoff
- Guardian directory with child linking and access handoff
- Access provisioning (bulk import, single account, contextual handoff)
- Park operations (dashboard, attendance board, offline roster)
- Guardian portal (attendance, fees, announcements)
- Student portal (attendance, fees, announcements)
- Reports and exports (filters, presets, URL persistence)
- Branded UI with role-aware navigation
- 113/113 tests passing (claimed)
- Production deployment at `https://shabab360.vercel.app` (claimed)

**Important:** Treat these as **source claims, not verified facts** until UAT confirms.

### 8.2 Foundations Present In The Checkout

The current checkout provides useful foundations. Browser UAT and complete
route coverage are still required before calling them fully working:
- City → Park → Batch → Group hierarchy
- Participant and guardian-to-participant links

- Central role/scope authorisation and negative tests for covered routes
- Admission stages and interviews
- Session attendance with multiple states
- Offline-capable attendance workflows
- Consecutive absence alerts
- Dashboards, announcements, notification polling, and a queue-only email
  outbox; provider delivery is not implemented
- Audit logs
- Reports and certificate generation

**This foundation should be preserved** while reshaping the product around Shabab's actual operations.

### 8.3 Verified Current Technical Stack And Staged Target

**Frontend:**
- Next.js 16.1 (App Router)
- TypeScript
- Tailwind CSS
- React components

**Current backend:**
- NextAuth 4 credentials authentication with bcrypt
- Prisma 6.11
- Active SQLite runtime through `prisma/schema.prisma`

**Staged target:**
- Supabase PostgreSQL through the reviewed Prisma Postgres schema
- Supabase private Storage after its authorisation design is implemented
- NextAuth remains the pilot identity provider; Supabase Auth/RLS are not the
  current checkout architecture

**Offline:**
- Dexie.js
- IndexedDB
- Service workers (if applicable)

**Exports:**
- exceljs library

**Deployment:**
- Vercel is the intended free-pilot app host
- The reported live URL remains a source claim, not an approved production
  deployment

---

## 9. Implementation Strategy and Roadmap

### 9.1 Recommended Implementation Order

The governing sequence is maintained in
[CODEX_SHABAB360_MASTER_BLUEPRINT.md](CODEX_SHABAB360_MASTER_BLUEPRINT.md).
Kiro's product findings map into that sequence as follows:

1. **Product consolidation:** Confirm programme facts, roles, curriculum,
   safeguarding policy, admissions rules, venues, fees, and module scope.
2. **Existing-system correctness:** Fix admissions data loss and all remaining
   security/runtime/API defects; complete clean checks and browser UAT.
3. **PostgreSQL and platform readiness:** Complete Staging runtime, private
   storage, notification delivery, backup/restore, and deployment rehearsal.
4. **Core programme model:** Implement approved safeguarding, multi-assignment,
   grouping, admissions, richer session/attendance, and guardian-action models.
5. **Programme delivery operations:** Implement curriculum/content planning,
   Murabbi training, calendar, events, venues, and delivery reporting.
6. **Finance and procurement:** Implement approved finance policy, expenses,
   inventory, park stock, purchase orders, and reconciliation.
7. **Engagement and knowledge:** Add resources, community, messaging,
   notification expansion, and member profiles only after safety rules.
8. **Restricted pilot:** Complete role, security, data, offline, storage,
   notification, report, backup, rollback, and quota gates before release.

### 9.2 Pre-Implementation Requirements

**Before starting any phase:**
1. Get product owner answers to open questions for that phase
2. Create detailed data model design
3. Define API contracts

4. Design UI/UX flows
5. Plan database migrations
6. Define test cases
7. Plan rollout and data migration

**For safeguarding-related features:**
1. Legal/compliance review
2. Safeguarding policy approval
3. Staff training plan
4. Incident response procedures
5. Data protection impact assessment

### 9.3 Success Criteria

**For each phase:**
- All P0/P1/P2 gaps closed as defined
- Product owner sign-off on design
- UAT passed with real role accounts
- Data migrations completed and verified
- Documentation updated
- Staff training completed (if needed)
- Rollout plan executed

**Overall product success:**
- Can safely operate youth programme with minors
- Demonstrates Mind/Body/Soul development outcomes
- Supports actual operational workflows (not generic education)
- Exception-driven dashboards direct users to actions
- Offline attendance works reliably in parks
- Guardians actively engaged via portal
- Reports measure programme health, not just attendance/fees
- Safeguarding policies enforced in system
- All roles see appropriate scope only

---

## 10. Data Sources and Evidence

This consolidation is based on:

### 10.1 Product Discovery Documents

1. **README.md** - Document overview and relationships
2. **PRODUCT_VISION_INPUT_01.md** (2026-07-15)
   - Product owner notes
   - Module list and requirements
   - Role definitions
   - Workflow requirements
   - Open questions list
3. **PRODUCT_VISION_INPUT_02.md** (2026-07-15)
   - System flow story (role-based journeys)
   - Current implementation claims
   - Operational model description
4. **SHABAB_PROGRAMME_GAP_AUDIT.md** (2026-07-15)
   - Public programme research (LinkedIn, websites)
   - Current application audit
   - Gap analysis with priority levels (P0, P1, P2)
   - Code evidence references

### 10.2 Public Programme Research Sources

From Gap Audit document:
- Official Al-Burhan Shabab announcement (LinkedIn)
- Al-Burhan Sialkot courses website
- Mufti Syed Adnan Kakakhail profile
- Lahore programme material (LinkedIn)
- Islamabad programme material (LinkedIn)
- Public mentor/programme material (LinkedIn)
- Public city-scale promotion (LinkedIn)

### 10.3 Code Evidence (From Gap Audit)

File references for identified gaps:

- Admissions UI: `src/components/modules/admin/admissions-page.tsx`
- Admissions API: `src/app/api/admin/admissions/route.ts`
- Interview API: `src/app/api/admin/admissions/[id]/interviews/route.ts`
- Conversion API: `src/app/api/admin/admissions/[id]/convert/route.ts`
- Attendance event API: `src/app/api/park/attendance/events/route.ts`
- Park schedule API: `src/app/api/park/schedule/route.ts`
- Guardian schedule API: `src/app/api/guardian/schedule/route.ts`
- Certificate generation: `src/app/api/admin/certificates/[participantId]/route.ts`
- Reports page: `src/components/modules/admin/reports-page.tsx`
- Sidebar navigation: `src/components/layout/sidebar.tsx`
- Database schema: `prisma/schema.prisma`

---

## 11. Key Terminology

**Programme-Specific Terms:**
- **Shabab:** Student participants (youth/young men aged 14-19)
- **Murabbi:** Mentor assigned to lead a group
- **Markazi Masoul:** Program Head (national level)
- **City Masoul:** City Head (city operations level)
- **Mashwara:** Meeting/consultation (attendance tracked)
- **Tadreeb:** Training
- **Tarbiyah:** Islamic upbringing/moral education
- **Park:** Venue where sessions are conducted (typically public parks)

- **Batch:** Cohort/intake of participants
- **Group:** Small mentor-led unit within a batch

**System-Specific Terms:**
- **Offline-first:** Design pattern where app works without internet, syncs when connected
- **Exception-driven:** Dashboard design that surfaces issues requiring attention
- **URL-persistent:** Filters and views encoded in URL, shareable and bookmarkable
- **Contextual handoff:** Navigation from one record directly to related workflow
- **Scope:** Data access boundary based on role (national, city, park, own-data-only)
- **RLS:** Row Level Security. Some older source documents describe it, but it
  is not the current checkout's primary authorisation model; current access is
  enforced through NextAuth, server-side policy, and Prisma-scoped queries.

**Priority Levels:**
- **P0:** Critical safety or data integrity issue - must fix immediately
- **P1:** Required for youth programme operations - non-negotiable
- **P2:** Important for full product vision - needed but can be phased

---

## 12. Document Maintenance

### 12.1 When to Update This Document

Update this consolidation when:
- Product owner provides answers to open questions
- New requirements or modules are defined
- Critical gaps are closed and verified
- Implementation phases complete
- Data model changes significantly

- UAT reveals discrepancies with claimed implementation
- Roadmap or priorities change

### 12.2 Related Documents

**Product Discovery Source Documents:**
- `docs/product-discovery/README.md`
- `docs/product-discovery/PRODUCT_VISION_INPUT_01.md`
- `docs/product-discovery/PRODUCT_VISION_INPUT_02.md`
- `docs/product-discovery/SHABAB_PROGRAMME_GAP_AUDIT.md`

**Authoritative Living Document:**
- `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`

**Supporting Living/Reference Documents:**
- This supporting report: `docs/KIRO_PRODUCT_CONSOLIDATION.md`
- `docs/IMPROVEMENT_PLAN.md` (technical hardening)
- `docs/MASTER_PLAN.md` (if exists)
- Module-specific documents in `docs/modules/`

**Reference Documents:**
- `docs/reference/ARCHITECTURE_PLAN.md`
- `docs/reference/software-requirements-specification.md`
- `docs/reference/system-description.md`

### 12.3 Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-07-15 | 1.0 | Initial consolidation from all product discovery materials | Kiro AI Agent |

---

## 13. Executive Summary

**What is Shabab 360?**

A role-driven operational platform for Shabab Alburhan. Public material points
to school-age boys and multi-city operations, but official ages, city count,
duration, framework, and standard activities still require internal approval.

**Current State:**

The application has a solid operational foundation with city→park→batch→group hierarchy, role-based access, attendance tracking, and basic dashboards. However, it is **not yet ready for youth programme operations**.

**Critical Issues:**

1. **Product P0 Data Loss:** Admissions form collects but does not save emergency contacts, previous education, or references. Medical history is a proposed future field, not part of the confirmed silent-loss defect.
2. **P1 No Safeguarding:** Missing consent, medical, emergency contact, incident reporting - non-negotiable for minors
3. **P1 No Curriculum:** Cannot track Mind/Body/Soul development or programme outcomes
4. **P1 Activity Model Too Simple:** Cannot represent camps, workshops, multi-activity days
5. **P1 Retrospective Not Operational:** Schedule based on history, cannot plan forward or notify guardians

**Transformation Required:**

This is **not cosmetic UI work**. It requires a **product rebase** around how Shabab actually operates:
- Safety-first: Add safeguarding foundation
- Programme-accurate: Model curriculum, activities, venues, mentors properly
- Operational: Forward planning, not just historical tracking
- Engaged: Interactive guardian portal, not read-only
- Outcome-focused: Reports that measure programme health

**Path Forward:**

1. Finalise the owner decisions and fix all existing-system P0 defects
2. Complete clean verification, browser UAT, PostgreSQL Staging, storage,
   notification, backup/restore, and deployment foundations
3. Implement the approved safeguarding and programme-accurate core model
4. Add programme delivery, guardian engagement, finance, and procurement
5. Add community, messaging, and other engagement modules only after safety
   approval

**Open Questions:**

47 specific questions requiring product owner input before implementation, covering curriculum structure, fee policies, admissions rubric, grouping rules, safeguarding policies, and more (see Section 7).

**Success Criteria:**

System that can safely operate a youth programme for minors with outdoor activities, demonstrates Mind/Body/Soul outcomes, supports actual operational workflows, and enforces safeguarding policies - not just a generic school management system.

---

## Appendix A: Quick Reference - Role Access Matrix

| Feature/Page | Program Head | City Head | Park Lead | Park Admin | Murabbi | Guardian | Student |
|--------------|--------------|-----------|-----------|------------|---------|----------|---------|
| HQ Dashboard | ✓ | - | - | - | - | - | - |
| City Management | ✓ | - | - | - | - | - | - |
| City Dashboard | ✓ | ✓ (scoped) | - | - | - | - | - |
| Park Management | ✓ | ✓ | - | - | - | - | - |
| Group Management | ✓ | ✓ | - | - | - | - | - |
| People Operations | ✓ | ✓ | - | - | - | - | - |
| Access Provisioning | ✓ | ✓ | - | - | - | - | - |
| Park Dashboard | ✓ | ✓ | ✓ | ✓ | TBD | - | - |

| Mark Attendance | - | - | - | ✓ | TBD | - | - |
| Modify Attendance | - | - | ✓ | - | - | - | - |
| Reports (All) | ✓ | - | - | - | - | - | - |
| Reports (City) | - | ✓ | - | - | - | - | - |
| Announcements (National) | ✓ | - | - | - | - | - | - |
| Announcements (City) | - | ✓ | - | - | - | - | - |
| View Own Attendance | - | - | - | - | - | - | ✓ |
| View Child Attendance | - | - | - | - | - | ✓ | - |
| View Own Fees | - | - | - | - | - | - | ✓ |
| View Child Fees | - | - | - | - | - | ✓ | - |
| Audit Logs (All) | ✓ | - | - | - | - | - | - |
| Audit Logs (City) | - | ✓ | - | - | - | - | - |

**Scope Legend:**
- ✓ = Full access at their scope level
- (scoped) = Limited to assigned city/park/group/children
- TBD = To be determined with product owner
- \- = No access

---

## Appendix B: Priority Gap Summary

### Product-Discovery P0 Gaps (1 item)
1. Admissions data loss (emergency contact, education, references not saved)

This is not the complete project release-blocker list; use the Codex master and
production backlog for the full P0 registry.

### P1 Gaps (7 categories)
1. Safeguarding and consent foundation

2. Curriculum and development tracking
3. Rich activity and session model
4. Operational calendar (forward-looking)
5. Enhanced admissions process
6. Flexible venue model
7. Mentor operations model

### P2 Gaps (4 categories + 8 modules)
1. Interactive guardian portal
2. De-emphasize fees
3. Programme health reporting
4. Additional modules:
   - Content Planner
   - Events management
   - Procurement and inventory
   - Community platform
   - Online resources
   - Messaging
   - Notifications
   - Members directory

---

## Appendix C: Module Status Overview

| Module | Status | Priority | Notes |
|--------|--------|----------|-------|
| Admissions | Partial - P0 bug | P0 + P1 | Data loss bug; needs enhancement |
| Attendance | Working | Maintain | Offline-first is working; sessions need enrichment |
| Access Provisioning | Working | Maintain | Contextual handoffs working |
| Dashboards | Working | Enhance | Exception-driven model good; needs more metrics |
| Announcements | Working | Maintain | Scope-based broadcasting working |
| Reports | Working | P2 | Needs programme health metrics |
| Audit Logs | Working | Maintain | Basic tracking in place |
| Content Planner | Missing | Phase 4 | In Google Sheets; needs approved curriculum model |

| Calendar/Planner | Missing | Phase 4 | Retrospective schedule exists; needs forward planning |
| Events | Missing | Phase 4 | Requires approved session, venue, consent, and safety model |
| Finance | Working | P2 | Too prominent; needs de-emphasis |
| Procurement | Missing | P2 | Mentioned in vision; no implementation |
| Community | Missing | P2 | Requires safeguarding design first |
| Online Resources | Missing | P2 | Mentioned in vision; no implementation |
| Messaging | Missing | P2 | Requires safeguarding design first |
| Notifications | Partial | P0 platform + later expansion | Polling/outbox foundation; sender, privacy, and delivery gates remain |
| Members Directory | Missing | P2 | Mentioned in vision; no implementation |
| Safeguarding | Decision first, then Phase 3 | Core | Policy, access, retention, and legal review precede implementation |

---

**END OF DOCUMENT**

---

*This is a supporting Kiro product-discovery synthesis as of 2026-07-15. The
Codex master blueprint governs requirements, priorities, technical direction,
and implementation order. Open questions still require product-owner approval.*
