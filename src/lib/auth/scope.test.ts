import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_ROLES,
  ORGANIZATION_MANAGEMENT_ROLES,
  STAFF_ROLES,
  canAccessResourceScope,
  isHqRole,
  isStaffRole,
  type SessionUser,
} from "@/lib/auth/scope";

function user(overrides: Partial<SessionUser>): SessionUser {
  return { id: "user-1", ...overrides };
}

describe("authorization scope policy", () => {
  it("recognizes only supported staff and headquarters roles", () => {
    // HQ Roles
    expect(isHqRole("super_admin")).toBe(true);
    expect(isHqRole("program_admin")).toBe(true);
    expect(isHqRole("city_head")).toBe(false);
    expect(isHqRole("park_admin")).toBe(false);
    expect(isHqRole("murabbi")).toBe(false);
    expect(isHqRole(null)).toBe(false);
    expect(isHqRole(undefined)).toBe(false);

    // Staff Roles
    expect(isStaffRole("super_admin")).toBe(true);
    expect(isStaffRole("program_admin")).toBe(true);
    expect(isStaffRole("city_head")).toBe(true);
    expect(isStaffRole("park_admin")).toBe(true);
    expect(isStaffRole("park_lead")).toBe(true);
    expect(isStaffRole("murabbi")).toBe(true);
    expect(isStaffRole("guardian")).toBe(false);
    expect(isStaffRole("student")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  describe("HQ Roles bypass behavior", () => {
    it("always allows access to any scope and resource properties", () => {
      const superAdmin = user({ role: "super_admin" });
      const progAdmin = user({ role: "program_admin" });

      // Empty scope
      expect(canAccessResourceScope(superAdmin, {})).toBe(true);
      expect(canAccessResourceScope(progAdmin, {})).toBe(true);

      // Mismatched scopes
      expect(canAccessResourceScope(superAdmin, { cityId: "any", parkId: "any" })).toBe(true);

      // Null/undefined parameters in scope
      expect(canAccessResourceScope(superAdmin, { cityId: null, parkId: undefined })).toBe(true);
    });

    it("denies HQ roles if the active route configuration excludes them", () => {
      const superAdmin = user({ role: "super_admin" });

      // Allowed roles explicitly defined and does not contain super_admin
      expect(canAccessResourceScope(superAdmin, {}, ATTENDANCE_ROLES)).toBe(false);
    });
  });

  describe("City Head Role checks", () => {
    const cityHead = user({ role: "city_head", assignedCityId: "city-pk" });

    it("allows access when cityId in scope matches assignment", () => {
      expect(canAccessResourceScope(cityHead, { cityId: "city-pk" })).toBe(true);
    });

    it("denies access when cityId does not match assignment", () => {
      expect(canAccessResourceScope(cityHead, { cityId: "city-in" })).toBe(false);
    });

    it("denies access when scope is empty or cityId is missing", () => {
      expect(canAccessResourceScope(cityHead, {})).toBe(false);
      expect(canAccessResourceScope(cityHead, { parkId: "park-1" })).toBe(false);
      expect(canAccessResourceScope(cityHead, { cityId: null })).toBe(false);
    });

    it("denies access when user assignment is missing", () => {
      const unassignedCityHead = user({ role: "city_head", assignedCityId: null });
      expect(canAccessResourceScope(unassignedCityHead, { cityId: "city-pk" })).toBe(false);
    });
  });

  describe("Park Admin and Park Lead Role checks", () => {
    const parkAdmin = user({ role: "park_admin", assignedParkId: "park-alpha" });
    const parkLead = user({ role: "park_lead", assignedParkId: "park-alpha" });

    it("allows access when parkId matches user's assigned park", () => {
      expect(canAccessResourceScope(parkAdmin, { parkId: "park-alpha" })).toBe(true);
      expect(canAccessResourceScope(parkLead, { parkId: "park-alpha" })).toBe(true);
    });

    it("denies access when parkId does not match user's assigned park", () => {
      expect(canAccessResourceScope(parkAdmin, { parkId: "park-beta" })).toBe(false);
      expect(canAccessResourceScope(parkLead, { parkId: "park-beta" })).toBe(false);
    });

    it("denies access when scope or assignment parameters are empty or null", () => {
      expect(canAccessResourceScope(parkAdmin, {})).toBe(false);
      expect(canAccessResourceScope(parkAdmin, { parkId: null })).toBe(false);

      const unassignedParkAdmin = user({ role: "park_admin", assignedParkId: null });
      expect(canAccessResourceScope(unassignedParkAdmin, { parkId: "park-alpha" })).toBe(false);
    });
  });

  describe("Murabbi Role checks", () => {
    const murabbi = user({ role: "murabbi", assignedGroupId: "group-x" });

    it("allows access when groupId matches user's assigned group", () => {
      expect(canAccessResourceScope(murabbi, { groupId: "group-x" })).toBe(true);
    });

    it("denies access when groupId does not match user's assigned group", () => {
      expect(canAccessResourceScope(murabbi, { groupId: "group-y" })).toBe(false);
    });

    it("denies access when scope or assignment parameters are empty or null", () => {
      expect(canAccessResourceScope(murabbi, {})).toBe(false);
      expect(canAccessResourceScope(murabbi, { groupId: null })).toBe(false);

      const unassignedMurabbi = user({ role: "murabbi", assignedGroupId: null });
      expect(canAccessResourceScope(unassignedMurabbi, { groupId: "group-x" })).toBe(false);
    });
  });

  describe("General Boundary & Safety Cases", () => {
    it("denies access to non-staff roles", () => {
      const guardian = user({ role: "guardian" });
      const student = user({ role: "student" });
      const anon = user({ role: undefined });

      expect(canAccessResourceScope(guardian, { cityId: "city-1" })).toBe(false);
      expect(canAccessResourceScope(student, { groupId: "group-1" })).toBe(false);
      expect(canAccessResourceScope(anon, {})).toBe(false);
    });

    it("denies access if user session ID is missing", () => {
      const invalidUser: SessionUser = { role: "super_admin", id: undefined };
      expect(canAccessResourceScope(invalidUser, {})).toBe(false);
    });

    it("enforces custom allowed roles parameter strictly", () => {
      const cityHead = user({ role: "city_head", assignedCityId: "city-1" });

      // Allowed roles lists that omit city_head
      expect(canAccessResourceScope(cityHead, { cityId: "city-1" }, ATTENDANCE_ROLES)).toBe(false);
      expect(canAccessResourceScope(cityHead, { cityId: "city-1" }, ["super_admin"])).toBe(false);

      // Allowed list containing city_head
      expect(canAccessResourceScope(cityHead, { cityId: "city-1" }, ORGANIZATION_MANAGEMENT_ROLES)).toBe(true);
    });
  });
});
