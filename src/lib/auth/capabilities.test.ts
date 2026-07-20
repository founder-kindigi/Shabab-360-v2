import { describe, expect, it } from "vitest";
import {
  ACCESS_CAPABILITIES,
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
  });

  it("does not turn view-only or partial operational duties into broad management", () => {
    expect(roleHasDefaultCapability("park_lead", "organisation.manage")).toBe(false);
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
});
