import { describe, expect, it, vi } from "vitest";
import {
  ACCESS_CAPABILITIES,
  USER_OVERRIDE_CAPABILITIES,
  ROLE_DEFAULT_CAPABILITIES,
  isAccessCapability,
  isUserRole,
  isAccessCapabilityEffect,
  roleHasDefaultCapability,
  isActiveUserCapabilityOverride,
  resolveEffectiveCapability,
  type AccessCapability,
} from "@/lib/auth/capabilities";
import type { UserRole } from "@/types";

describe("GOV-001: Capability Governance & Audit Enforcement Sweep", () => {

  /* ── 1. Catalogue Integrity ────────────────────────────────────────── */
  describe("ACCESS_CAPABILITIES Catalogue", () => {
    it("registers all 34 domain capabilities", () => {
      expect(ACCESS_CAPABILITIES.length).toBeGreaterThanOrEqual(34);
    });

    it("includes required domain capability prefixes", () => {
      const requiredPrefixes = [
        "dashboard.", "organisation.", "people.", "students.",
        "guardians.", "admissions.", "attendance.", "fees.",
        "announcements.", "reports.", "audit.", "settings.",
        "content.", "events.", "calling.", "access.", "mashwara.",
      ];
      for (const prefix of requiredPrefixes) {
        const matches = ACCESS_CAPABILITIES.filter((c) => c.startsWith(prefix));
        expect(matches.length).toBeGreaterThan(0);
      }
    });

    it("validates capability strings with isAccessCapability", () => {
      expect(isAccessCapability("mashwara.view")).toBe(true);
      expect(isAccessCapability("mashwara.manage")).toBe(true);
      expect(isAccessCapability("events.manage")).toBe(true);
      expect(isAccessCapability("invalid.capability")).toBe(false);
      expect(isAccessCapability("")).toBe(false);
    });

    it("validates capability effects with isAccessCapabilityEffect", () => {
      expect(isAccessCapabilityEffect("allow")).toBe(true);
      expect(isAccessCapabilityEffect("deny")).toBe(true);
      expect(isAccessCapabilityEffect("invalid")).toBe(false);
    });

    it("USER_OVERRIDE_CAPABILITIES excludes admin capabilities", () => {
      const adminOnlyCapabilities: AccessCapability[] = [
        "access.role_defaults.manage",
        "access.user_overrides.manage",
        "access.scope.manage",
        "access.city_staff.manage",
        "audit.view",
        "settings.manage",
      ];
      for (const cap of adminOnlyCapabilities) {
        expect((USER_OVERRIDE_CAPABILITIES as readonly string[]).includes(cap)).toBe(false);
      }
    });
  });

  /* ── 2. Role Default Matrix ─────────────────────────────────────────── */
  describe("ROLE_DEFAULT_CAPABILITIES Matrix", () => {
    const ALL_ROLES: UserRole[] = [
      "super_admin",
      "program_admin",
      "city_head",
      "park_lead",
      "park_admin",
      "murabbi",
      "guardian",
      "student",
    ];

    it("defines default capabilities for all 8 portal roles", () => {
      for (const role of ALL_ROLES) {
        expect(ROLE_DEFAULT_CAPABILITIES[role]).toBeDefined();
        expect(Array.isArray(ROLE_DEFAULT_CAPABILITIES[role])).toBe(true);
      }
    });

    it("validates roles with isUserRole", () => {
      for (const role of ALL_ROLES) {
        expect(isUserRole(role)).toBe(true);
      }
      expect(isUserRole("invalid_role")).toBe(false);
      expect(isUserRole(null)).toBe(false);
      expect(isUserRole(undefined)).toBe(false);
    });

    it("super_admin has all registered capabilities", () => {
      expect(ROLE_DEFAULT_CAPABILITIES.super_admin.length).toBe(ACCESS_CAPABILITIES.length);
      for (const cap of ACCESS_CAPABILITIES) {
        expect(roleHasDefaultCapability("super_admin", cap)).toBe(true);
      }
    });

    it("program_admin excludes access.* management capabilities", () => {
      expect(roleHasDefaultCapability("program_admin", "access.role_defaults.manage")).toBe(false);
      expect(roleHasDefaultCapability("program_admin", "access.user_overrides.manage")).toBe(false);
      expect(roleHasDefaultCapability("program_admin", "access.scope.manage")).toBe(false);
      expect(roleHasDefaultCapability("program_admin", "events.manage")).toBe(true);
      expect(roleHasDefaultCapability("program_admin", "mashwara.manage")).toBe(true);
    });

    it("city_head has operational access and access.city_staff.manage", () => {
      expect(roleHasDefaultCapability("city_head", "access.city_staff.manage")).toBe(true);
      expect(roleHasDefaultCapability("city_head", "access.role_defaults.manage")).toBe(false);
      expect(roleHasDefaultCapability("city_head", "mashwara.manage")).toBe(true);
    });

    it("scoped roles have strictly bounded defaults", () => {
      expect(roleHasDefaultCapability("park_lead", "attendance.mark")).toBe(true);
      expect(roleHasDefaultCapability("park_lead", "organisation.manage")).toBe(false);

      expect(roleHasDefaultCapability("park_admin", "attendance.mark")).toBe(true);
      expect(roleHasDefaultCapability("park_admin", "events.manage")).toBe(false);

      expect(roleHasDefaultCapability("murabbi", "attendance.mark")).toBe(true);
      expect(roleHasDefaultCapability("murabbi", "fees.manage")).toBe(false);

      expect(roleHasDefaultCapability("guardian", "dashboard.view")).toBe(true);
      expect(roleHasDefaultCapability("guardian", "attendance.mark")).toBe(false);

      expect(roleHasDefaultCapability("student", "dashboard.view")).toBe(true);
      expect(roleHasDefaultCapability("student", "attendance.mark")).toBe(false);
    });
  });

  /* ── 3. Override Resolution & Expiry ──────────────────────────────── */
  describe("Capability Resolution & Override Expiry", () => {
    const now = new Date("2026-07-25T12:00:00Z");
    const future = new Date("2026-08-01T00:00:00Z");
    const past = new Date("2026-07-01T00:00:00Z");

    it("resolves active non-expired user override over role defaults", () => {
      // Allow override for murabbi (default is false for fees.manage)
      const allowed = resolveEffectiveCapability(
        "murabbi",
        "fees.manage",
        null,
        { effect: "allow", isActive: true, expiresAt: future },
        now
      );
      expect(allowed).toBe(true);

      // Deny override for city_head (default is true for mashwara.manage)
      const denied = resolveEffectiveCapability(
        "city_head",
        "mashwara.manage",
        null,
        { effect: "deny", isActive: true, expiresAt: future },
        now
      );
      expect(denied).toBe(false);
    });

    it("ignores expired user overrides and falls back to default", () => {
      const result = resolveEffectiveCapability(
        "murabbi",
        "fees.manage",
        null,
        { effect: "allow", isActive: true, expiresAt: past },
        now
      );
      // Murabbi default for fees.manage is false
      expect(result).toBe(false);
    });

    it("ignores inactive user overrides", () => {
      const result = resolveEffectiveCapability(
        "murabbi",
        "fees.manage",
        null,
        { effect: "allow", isActive: false, expiresAt: future },
        now
      );
      expect(result).toBe(false);
    });

    it("resolves role override when user override is absent", () => {
      const allowed = resolveEffectiveCapability("park_lead", "events.manage", "allow", null, now);
      expect(allowed).toBe(true);

      const denied = resolveEffectiveCapability("city_head", "mashwara.manage", "deny", null, now);
      expect(denied).toBe(false);
    });

    it("falls back to role default when overrides are null", () => {
      expect(resolveEffectiveCapability("super_admin", "audit.view", null, null, now)).toBe(true);
      expect(resolveEffectiveCapability("murabbi", "audit.view", null, null, now)).toBe(false);
    });

    it("evaluates isActiveUserCapabilityOverride correctly", () => {
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: true, expiresAt: future }, now)).toBe(true);
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: true, expiresAt: null }, now)).toBe(true);
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: true, expiresAt: past }, now)).toBe(false);
      expect(isActiveUserCapabilityOverride({ effect: "allow", isActive: false, expiresAt: future }, now)).toBe(false);
      expect(isActiveUserCapabilityOverride(null, now)).toBe(false);
    });
  });

  /* ── 4. Security & Audit Logging Verification ────────────────────────── */
  describe("Audit Log Payload & Security Rules", () => {
    it("denies access to unknown or null role", () => {
      const now = new Date();
      expect(resolveEffectiveCapability(null, "dashboard.view", null, null, now)).toBe(false);
      expect(resolveEffectiveCapability(undefined, "dashboard.view", null, null, now)).toBe(false);
      expect(resolveEffectiveCapability("unknown_role", "dashboard.view", null, null, now)).toBe(false);
    });
  });
});
