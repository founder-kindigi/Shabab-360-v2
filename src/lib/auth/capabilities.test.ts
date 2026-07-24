import { describe, expect, it } from "vitest";
import {
  ACCESS_CAPABILITIES,
  USER_OVERRIDE_CAPABILITIES,
  isAccessCapability,
  ROLE_DEFAULT_CAPABILITIES,
  resolveEffectiveCapability,
  roleHasDefaultCapability,
} from "@/lib/auth/capabilities";

describe("access capability policy", () => {
  it("uses a fixed catalogue with no duplicate capability codes", () => {
    expect(new Set(ACCESS_CAPABILITIES).size).toBe(ACCESS_CAPABILITIES.length);
    expect(isAccessCapability("attendance.mark")).toBe(true);
    expect(isAccessCapability("events.manage")).toBe(false);
    expect(isAccessCapability("/api/admin/users")).toBe(false);
  });

  it("gives every supported role an explicit default policy", () => {
    expect(Object.keys(ROLE_DEFAULT_CAPABILITIES).sort()).toEqual([
      "city_head",
      "guardian",
      "murabbi",
      "park_admin",
      "park_lead",
      "program_admin",
      "student",
      "super_admin",
    ]);
  });

  it("reserves access administration for Super Admin at soft launch", () => {
    expect(roleHasDefaultCapability("super_admin", "access.role_defaults.manage")).toBe(true);
    expect(roleHasDefaultCapability("super_admin", "access.user_overrides.manage")).toBe(true);
    expect(roleHasDefaultCapability("super_admin", "access.scope.manage")).toBe(true);
    expect(roleHasDefaultCapability("program_admin", "access.user_overrides.manage")).toBe(false);
    expect(roleHasDefaultCapability("city_head", "access.user_overrides.manage")).toBe(false);
    expect(roleHasDefaultCapability("city_head", "access.city_staff.manage")).toBe(true);
    expect(roleHasDefaultCapability("program_admin", "access.city_staff.manage")).toBe(false);
  });

  it("does not turn view-only or partial operational duties into broad management", () => {
    expect(roleHasDefaultCapability("park_lead", "organisation.manage")).toBe(false);
    expect(roleHasDefaultCapability("park_lead", "guardians.manage")).toBe(false);
    expect(roleHasDefaultCapability("park_lead", "fees.manage")).toBe(false);
    expect(roleHasDefaultCapability("park_admin", "admissions.manage")).toBe(false);
    expect(roleHasDefaultCapability("murabbi", "attendance.correct")).toBe(false);
  });

  it("denies missing roles and unsupported capabilities by default", () => {
    expect(roleHasDefaultCapability(null, "dashboard.view")).toBe(false);
    expect(roleHasDefaultCapability(undefined, "dashboard.view")).toBe(false);
  });

  it("uses individual access rules ahead of role rules and ignores expired overrides", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");

    expect(
      resolveEffectiveCapability("park_admin", "attendance.mark", "allow", {
        effect: "deny",
        isActive: true,
        expiresAt: null,
      }, now)
    ).toBe(false);
    expect(
      resolveEffectiveCapability("park_admin", "attendance.mark", "deny", {
        effect: "allow",
        isActive: true,
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      }, now)
    ).toBe(false);
    expect(
      resolveEffectiveCapability("park_admin", "attendance.mark", null, {
        effect: "unknown",
        isActive: true,
        expiresAt: null,
      }, now)
    ).toBe(false);
  });

  it("resolves role override configuration correctly when no individual override exists", () => {
    const now = new Date();
    expect(
      resolveEffectiveCapability("park_admin", "attendance.mark", "allow", null, now)
    ).toBe(true);
    expect(
      resolveEffectiveCapability("park_admin", "attendance.mark", "deny", null, now)
    ).toBe(false);
    expect(
      resolveEffectiveCapability("park_admin", "attendance.mark", null, null, now)
    ).toBe(true);
    expect(
      resolveEffectiveCapability("park_admin", "attendance.correct", null, null, now)
    ).toBe(false);
  });

  it("fails closed for unknown roles or invalid inputs in resolution", () => {
    const now = new Date();
    expect(
      resolveEffectiveCapability("invalid_role", "attendance.mark", "allow", null, now)
    ).toBe(false);
  });

  // ── Student profile capability tests ─────────────────────────────────

  it("grants student profile capabilities to super_admin and program_admin", () => {
    expect(roleHasDefaultCapability("super_admin", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("super_admin", "students.profile.manage")).toBe(true);
    expect(roleHasDefaultCapability("super_admin", "students.profile.sensitive.view")).toBe(true);
    expect(roleHasDefaultCapability("super_admin", "students.profile.sensitive.manage")).toBe(true);
    expect(roleHasDefaultCapability("program_admin", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("program_admin", "students.profile.manage")).toBe(true);
    expect(roleHasDefaultCapability("program_admin", "students.profile.sensitive.view")).toBe(true);
    expect(roleHasDefaultCapability("program_admin", "students.profile.sensitive.manage")).toBe(true);
  });

  it("grants city_head all four student profile capabilities", () => {
    expect(roleHasDefaultCapability("city_head", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("city_head", "students.profile.manage")).toBe(true);
    expect(roleHasDefaultCapability("city_head", "students.profile.sensitive.view")).toBe(true);
    expect(roleHasDefaultCapability("city_head", "students.profile.sensitive.manage")).toBe(true);
  });

  it("grants park_lead and murabbi only profile.view", () => {
    expect(roleHasDefaultCapability("park_lead", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("park_lead", "students.profile.manage")).toBe(false);
    expect(roleHasDefaultCapability("park_lead", "students.profile.sensitive.view")).toBe(false);
    expect(roleHasDefaultCapability("park_lead", "students.profile.sensitive.manage")).toBe(false);
    expect(roleHasDefaultCapability("murabbi", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("murabbi", "students.profile.manage")).toBe(false);
    expect(roleHasDefaultCapability("murabbi", "students.profile.sensitive.view")).toBe(false);
    expect(roleHasDefaultCapability("murabbi", "students.profile.sensitive.manage")).toBe(false);
  });

  it("denies park_admin all student profile capabilities", () => {
    expect(roleHasDefaultCapability("park_admin", "students.profile.view")).toBe(false);
    expect(roleHasDefaultCapability("park_admin", "students.profile.manage")).toBe(false);
    expect(roleHasDefaultCapability("park_admin", "students.profile.sensitive.view")).toBe(false);
    expect(roleHasDefaultCapability("park_admin", "students.profile.sensitive.manage")).toBe(false);
  });

  it("grants guardian and student only profile.view", () => {
    expect(roleHasDefaultCapability("guardian", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("guardian", "students.profile.manage")).toBe(false);
    expect(roleHasDefaultCapability("guardian", "students.profile.sensitive.view")).toBe(false);
    expect(roleHasDefaultCapability("guardian", "students.profile.sensitive.manage")).toBe(false);
    expect(roleHasDefaultCapability("student", "students.profile.view")).toBe(true);
    expect(roleHasDefaultCapability("student", "students.profile.manage")).toBe(false);
    expect(roleHasDefaultCapability("student", "students.profile.sensitive.view")).toBe(false);
    expect(roleHasDefaultCapability("student", "students.profile.sensitive.manage")).toBe(false);
  });

  it("does not add sensitive capabilities to USER_OVERRIDE_CAPABILITIES", () => {
    // Only profile.view and profile.manage are in USER_OVERRIDE_CAPABILITIES.
    // sensitive.view and sensitive.manage are role-level only.
    expect(USER_OVERRIDE_CAPABILITIES.includes("students.profile.view")).toBe(true);
    expect(USER_OVERRIDE_CAPABILITIES.includes("students.profile.manage")).toBe(true);
    expect((USER_OVERRIDE_CAPABILITIES as readonly string[]).includes("students.profile.sensitive.view")).toBe(false);
    expect((USER_OVERRIDE_CAPABILITIES as readonly string[]).includes("students.profile.sensitive.manage")).toBe(false);
  });
});
