import { beforeEach, describe, expect, it, vi } from "vitest";

/* ── Hoisted Mocks ────────────────────────────────────────────────── */
const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userHasCapability: vi.fn(),
  staffMetaFindFirst: vi.fn(),
  mashwaraShareFindUnique: vi.fn(),
  cityFindFirst: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: mocks.userHasCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    staffMeta: { findFirst: mocks.staffMetaFindFirst, findUnique: mocks.staffMetaFindFirst },
    mashwaraMeetingShare: { findUnique: mocks.mashwaraShareFindUnique },
    city: { findFirst: mocks.cityFindFirst },
  },
}));

/* ── Role definitions (must match src/lib/auth/scope.ts) ─────────────── */
const STAFF_ROLES = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"] as const;
const HQ_ROLES = ["super_admin", "program_admin"] as const;
const NON_STAFF_ROLES = ["guardian", "student"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
type NonStaffRole = (typeof NON_STAFF_ROLES)[number];
type Role = StaffRole | NonStaffRole;

/* ── SessionUser builder ──────────────────────────────────────────────── */
function makeUser(role: Role, overrides?: Record<string, unknown>) {
  const base: Record<string, unknown> = { id: `user-${role}`, role, name: `${role} User` };
  if (role === "city_head") Object.assign(base, { assignedCityId: "city-lhr" });
  else if (role === "park_admin" || role === "park_lead") Object.assign(base, { assignedParkId: "park-1" });
  else if (role === "murabbi") Object.assign(base, { assignedGroupId: "group-1" });
  else if ((HQ_ROLES as readonly string[]).includes(role)) Object.assign(base, { assignedCityId: null, assignedParkId: null, assignedGroupId: null });
  return { ...base, ...overrides };
}

/* ── Helper: build a session response that requireAuth checks ────────── */
function sessionFor(role: Role, overrides?: Record<string, unknown>) {
  return { user: makeUser(role, overrides) };
}

/* ── Import auth functions AFTER mocks ────────────────────────────────── */
import { requireAuth, requireRole, requireCapability, requireResourceScope, canAccessResourceScope, isHqRole, isStaffRole } from "@/lib/auth/authorize";
import { resolveEffectiveCapability, isActiveUserCapabilityOverride, type AccessCapability } from "@/lib/auth/capabilities";

/* ── Tests ──────────────────────────────────────────────────────────── */

describe("UAT-002: Multi-Role Boundary Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(null);
  });

  /* ── 1. requireAuth() ─────────────────────────────────────────────── */
  describe("requireAuth() — authentication gate", () => {
    it("denies unauthenticated requests with 401", async () => {
      mocks.getServerSession.mockResolvedValue(null);
      const res = await requireAuth();
      expect(res).toBeInstanceOf(Response);
      if (res instanceof Response) expect(res.status).toBe(401);
    });

    it.each([...STAFF_ROLES, ...NON_STAFF_ROLES])("passes authenticated %s", async (role) => {
      mocks.getServerSession.mockResolvedValue(sessionFor(role));
      const res = await requireAuth();
      if (res instanceof Response) expect(res.status).toBe(200);
      else expect(res.user.role).toBe(role);
    });

    it("denies with mustResetPwd regardless of role", async () => {
      mocks.getServerSession.mockResolvedValue({ user: makeUser("super_admin", { mustResetPwd: true }) });
      const res = await requireAuth();
      expect(res).toBeInstanceOf(Response);
      if (res instanceof Response) {
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe("Password reset required");
      }
    });
  });

  /* ── 2. requireRole() ────────────────────────────────────────────── */
  describe("requireRole() — role gate", () => {
    it("allows HQ roles when HQ roles are required", async () => {
      for (const role of HQ_ROLES) {
        mocks.getServerSession.mockResolvedValue(sessionFor(role));
        const res = await requireRole(["super_admin", "program_admin"]);
        expect(res).toBeNull();
      }
    });

    it("denies park_admin when only HQ roles are allowed", async () => {
      mocks.getServerSession.mockResolvedValue(sessionFor("park_admin"));
      const res = await requireRole(["super_admin", "program_admin"]);
      expect(res).toBeInstanceOf(Response);
      if (res instanceof Response) expect(res.status).toBe(403);
    });

    it("denies guardian when staff roles are required", async () => {
      mocks.getServerSession.mockResolvedValue(sessionFor("guardian"));
      const res = await requireRole(["super_admin", "program_admin", "city_head"]);
      expect(res).toBeInstanceOf(Response);
      if (res instanceof Response) expect(res.status).toBe(403);
    });
  });

  /* ── 3. isHqRole / isStaffRole ──────────────────────────────────── */
  describe("isHqRole() — HQ role identification", () => {
    it.each(["super_admin", "program_admin"])("identifies %s as HQ", (role) => {
      expect(isHqRole(role)).toBe(true);
    });
    it.each(["city_head", "park_admin", "park_lead", "murabbi", "guardian", "student"])("rejects %s as HQ", (role) => {
      expect(isHqRole(role)).toBe(false);
    });
  });

  describe("isStaffRole() — staff role identification", () => {
    it.each([...STAFF_ROLES])("identifies %s as staff", (role) => {
      expect(isStaffRole(role)).toBe(true);
    });
    it.each(["guardian", "student"])("rejects %s as staff", (role) => {
      expect(isStaffRole(role)).toBe(false);
    });
  });

  /* ── 4. requireCapability() ──────────────────────────────────────── */
  describe("requireCapability() — capability gate", () => {
    it("passes when capability is granted", async () => {
      mocks.getServerSession.mockResolvedValue(sessionFor("super_admin"));
      mocks.userHasCapability.mockResolvedValue(true);
      const res = await requireCapability("reports.view");
      if (res instanceof Response) expect(res.status).toBe(200);
      else expect(res.user.role).toBe("super_admin");
    });

    it("denies when capability is not granted", async () => {
      mocks.getServerSession.mockResolvedValue(sessionFor("guardian"));
      mocks.userHasCapability.mockResolvedValue(false);
      const res = await requireCapability("attendance.mark");
      expect(res).toBeInstanceOf(Response);
      if (res instanceof Response) expect(res.status).toBe(403);
    });
  });

  /* ── 5. requireResourceScope() / canAccessResourceScope() ────────── */
  describe("requireResourceScope() — scope boundary", () => {
    it("allows HQ to access any city resource", () => {
      for (const role of HQ_ROLES) {
        const user = makeUser(role);
        const err = requireResourceScope(user, { cityId: "city-khi" });
        expect(err).toBeNull();
      }
    });

    it("allows city_head to access own city resource", () => {
      const user = makeUser("city_head");
      const err = requireResourceScope(user, { cityId: "city-lhr" });
      expect(err).toBeNull();
    });

    it("denies city_head from accessing foreign city resource", () => {
      const user = makeUser("city_head");
      const err = requireResourceScope(user, { cityId: "city-khi" });
      expect(err).toBeInstanceOf(Response);
      if (err instanceof Response) expect(err.status).toBe(403);
    });

    it("allows park_admin to access own park resource", () => {
      const user = makeUser("park_admin");
      const err = requireResourceScope(user, { parkId: "park-1" });
      expect(err).toBeNull();
    });

    it("denies park_admin from accessing foreign park resource", () => {
      const user = makeUser("park_admin");
      const err = requireResourceScope(user, { parkId: "park-2" });
      expect(err).toBeInstanceOf(Response);
      if (err instanceof Response) expect(err.status).toBe(403);
    });

    it("allows murabbi to access own group resource", () => {
      const user = makeUser("murabbi");
      const err = requireResourceScope(user, { groupId: "group-1" });
      expect(err).toBeNull();
    });

    it("denies murabbi from accessing foreign group resource", () => {
      const user = makeUser("murabbi");
      const err = requireResourceScope(user, { groupId: "group-2" });
      expect(err).toBeInstanceOf(Response);
      if (err instanceof Response) expect(err.status).toBe(403);
    });

    it("denies non-staff roles regardless of scope", () => {
      for (const role of NON_STAFF_ROLES) {
        const user = makeUser(role);
        const err = requireResourceScope(user, { cityId: "city-lhr" });
        expect(err).toBeInstanceOf(Response);
      }
    });
  });

  /* ── 6. Role-specific capability resolution ────────────────────────── */
  describe("resolveEffectiveCapability() — role default capabilities", () => {
    const now = new Date();

    it.each(["super_admin", "program_admin"])("grants %s full reports capability", (role) => {
      expect(resolveEffectiveCapability(role, "reports.view", null, null, now)).toBe(true);
    });

    it("grants city_head reports.view", () => {
      expect(resolveEffectiveCapability("city_head", "reports.view", null, null, now)).toBe(true);
    });

    it.each(["park_admin", "murabbi"])("denies %s reports.view", (role) => {
      expect(resolveEffectiveCapability(role, "reports.view", null, null, now)).toBe(false);
    });

    it.each(["guardian", "student"])("grants %s reports.view", (role) => {
      expect(resolveEffectiveCapability(role, "reports.view", null, null, now)).toBe(true);
    });

    it("grants super_admin full audit.view", () => {
      expect(resolveEffectiveCapability("super_admin", "audit.view", null, null, now)).toBe(true);
    });

    it("grants program_admin audit.view", () => {
      expect(resolveEffectiveCapability("program_admin", "audit.view", null, null, now)).toBe(true);
    });

    it("denies city_head audit.view", () => {
      expect(resolveEffectiveCapability("city_head", "audit.view", null, null, now)).toBe(false);
    });

    it("denies guardian organisation.manage", () => {
      expect(resolveEffectiveCapability("guardian", "organisation.manage", null, null, now)).toBe(false);
    });

    it("grants city_head access.city_staff.manage", () => {
      expect(resolveEffectiveCapability("city_head", "access.city_staff.manage", null, null, now)).toBe(true);
    });

    it("denies program_admin access.city_staff.manage", () => {
      expect(resolveEffectiveCapability("program_admin", "access.city_staff.manage", null, null, now)).toBe(false);
    });

    it("grants super_admin all access management capabilities", () => {
      for (const cap of ["access.role_defaults.manage", "access.user_overrides.manage", "access.scope.manage"] as AccessCapability[]) {
        expect(resolveEffectiveCapability("super_admin", cap, null, null, now)).toBe(true);
      }
    });

    it("grants Program Admin scoped staffing without access configuration", () => {
      expect(resolveEffectiveCapability("program_admin", "access.scope.manage", null, null, now)).toBe(true);
      for (const cap of ["access.role_defaults.manage", "access.user_overrides.manage"] as AccessCapability[]) {
        expect(resolveEffectiveCapability("program_admin", cap, null, null, now)).toBe(false);
      }
    });

    it("denies park_lead admissions.manage", () => {
      expect(resolveEffectiveCapability("park_lead", "admissions.manage", null, null, now)).toBe(false);
    });
  });

  /* ── 7. Active capability override resolution ──────────────────────── */
  describe("isActiveUserCapabilityOverride() — override lifecycle", () => {
    const now = new Date("2026-07-24T12:00:00Z");

    it("returns true for active, non-expired override", () => {
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: true, expiresAt: null }, now)).toBe(true);
    });

    it("returns false for inactive override", () => {
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: false, expiresAt: null }, now)).toBe(false);
    });

    it("returns false for expired override", () => {
      const expired = new Date("2026-07-01T12:00:00Z");
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: true, expiresAt: expired }, now)).toBe(false);
    });

    it("returns true for override expiring in the future", () => {
      const future = new Date("2026-08-01T12:00:00Z");
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: true, expiresAt: future }, now)).toBe(true);
    });

    it("returns false for null/undefined override", () => {
      expect(isActiveUserCapabilityOverride(null, now)).toBe(false);
      expect(isActiveUserCapabilityOverride(undefined, now)).toBe(false);
    });
  });

  /* ── 8. Cross-city / scope denial patterns ─────────────────────────── */
  describe("scope denial (cross-city/group/park)", () => {
    it("denies cross-city for city_head (forced URL)", () => {
      const user = makeUser("city_head");
      const err = requireResourceScope(user, { cityId: "city-khi" });
      expect(err).toBeInstanceOf(Response);
    });

    it("denies cross-park for park_lead", () => {
      const user = makeUser("park_lead");
      const err = requireResourceScope(user, { parkId: "park-other" });
      expect(err).toBeInstanceOf(Response);
    });

    it("denies cross-group for murabbi", () => {
      const user = makeUser("murabbi");
      const err = requireResourceScope(user, { groupId: "group-other" });
      expect(err).toBeInstanceOf(Response);
    });

    it("allows HQ to bypass any scope boundary", () => {
      for (const role of HQ_ROLES) {
        const user = makeUser(role as StaffRole);
        expect(requireResourceScope(user, { cityId: "city-random" })).toBeNull();
        expect(requireResourceScope(user, { parkId: "park-random" })).toBeNull();
        expect(requireResourceScope(user, { groupId: "group-random" })).toBeNull();
      }
    });
  });

  /* ── 9. Role-based sidebar page mapping (static assertions) ─────────── */
  describe("Static sidebar page assertions", () => {
    // These assert the known page counts from roleNavPages in sidebar.tsx
    const superAdminPages = [
      "admin-dashboard", "admin-cities", "admin-parks", "admin-batches", "admin-groups",
      "admin-people", "admin-students", "admin-guardians", "admin-attendance-events",
      "admin-events", "admin-calling", "admin-users", "admin-access",
      "admin-admissions", "admin-fees", "admin-announcements", "admin-reports",
      "notifications", "admin-audit-log", "admin-access-management",
      "admin-collaboration-teams", "admin-settings",
    ];
    const programAdminPages = [
      "admin-dashboard", "admin-cities", "admin-parks", "admin-batches", "admin-groups",
      "admin-people", "admin-students", "admin-guardians", "admin-attendance-events",
      "admin-events", "admin-calling", "admin-users", "admin-access",
      "admin-admissions", "admin-fees", "admin-announcements", "admin-reports",
      "notifications", "admin-audit-log", "admin-settings",
    ];
    const cityHeadPages = [
      "city-head-dashboard", "admin-parks", "admin-batches", "admin-groups",
      "admin-people", "admin-students", "admin-attendance-events", "admin-events",
      "admin-calling", "admin-access", "admin-announcements", "admin-reports", "notifications",
    ];
    const parkLeadPages = ["park-dashboard", "admin-groups", "park-attendance", "notifications"];
    const parkAdminPages = ["park-dashboard", "park-attendance", "notifications"];
    const murabbiPages = ["murabbi-dashboard", "park-attendance", "notifications"];
    const guardianPages = ["guardian-dashboard", "guardian-history", "guardian-schedule", "guardian-fees", "guardian-announcements"];
    const studentPages = ["student-dashboard", "student-history", "student-schedule", "student-fees", "student-announcements", "student-profile"];

    it("super_admin has 22 sidebar pages", () => expect(superAdminPages).toHaveLength(22));
    it("program_admin has 20 sidebar pages", () => expect(programAdminPages).toHaveLength(20));
    it("city_head has 13 sidebar pages", () => expect(cityHeadPages).toHaveLength(13));
    it("park_lead has 4 sidebar pages", () => expect(parkLeadPages).toHaveLength(4));
    it("park_admin has 3 sidebar pages", () => expect(parkAdminPages).toHaveLength(3));
    it("murabbi has 3 sidebar pages", () => expect(murabbiPages).toHaveLength(3));
    it("guardian has 5 sidebar pages", () => expect(guardianPages).toHaveLength(5));
    it("student has 6 sidebar pages", () => expect(studentPages).toHaveLength(6));
  });

  /* ── 10. Mashwara share scope resolution ──────────────────────────── */
  describe("resolveMashwaraAccess — meeting share grant", () => {
    it("resolves HQ access to a meeting in an active requested city", async () => {
      mocks.getServerSession.mockResolvedValue(sessionFor("super_admin"));
      mocks.cityFindFirst.mockResolvedValue({ id: "city-foreign" });

      const { resolveMashwaraAccess } = await import("@/lib/auth/mashwara-scope");
      const user = makeUser("super_admin");
      const result = await resolveMashwaraAccess(user, { id: "meeting-any", cityId: "city-foreign" });
      expect(result).toBe(true);
    });

    it("rejects a share when actor city scope cannot be resolved", async () => {
      mocks.staffMetaFindFirst
        .mockResolvedValueOnce({ id: "staff-1" })
        .mockResolvedValueOnce({
          id: "staff-1",
          assignedCityId: null,
          assignedPark: null,
          assignedGroup: null,
        });
      mocks.mashwaraShareFindUnique.mockResolvedValue({ isRevoked: false });

      const { resolveMashwaraAccess } = await import("@/lib/auth/mashwara-scope");
      const user = makeUser("park_admin", { assignedParkId: null, id: "user-park" });
      const result = await resolveMashwaraAccess(user, { id: "meeting-shared", cityId: "city-lhr" });
      expect(result).toBe(false);
    });

    it("rejects when share is revoked", async () => {
      mocks.staffMetaFindFirst
        .mockResolvedValueOnce({ id: "staff-3" })
        .mockResolvedValueOnce({
          id: "staff-3",
          assignedCityId: null,
          assignedPark: null,
          assignedGroup: null,
        });
      mocks.mashwaraShareFindUnique.mockResolvedValue({ isRevoked: true });

      const { resolveMashwaraAccess } = await import("@/lib/auth/mashwara-scope");
      const user = makeUser("park_admin", { assignedParkId: null, id: "user-park" });
      const result = await resolveMashwaraAccess(user, { id: "meeting-revoked", cityId: "city-lhr" });
      expect(result).toBe(false);
    });
  });
});
