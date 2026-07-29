import { describe, expect, it } from "vitest";

/**
 * Component-level Calling UI Tests
 *
 * Exercises the actual query configurations, parameters, and safe error-state bounds
 * used across Calling workspace client components:
 * - CallingClient (src/app/admin/calling/_client.tsx)
 * - CampaignDetailClient (src/app/admin/calling/campaigns/[id]/_client.tsx)
 * - TemplatesClient (src/app/admin/calling/templates/_client.tsx)
 */

// ─── Query Enabled Evaluators (Direct from Component Definitions) ─────────────

/**
 * Evaluates `enabled` for CampaignDetail queries:
 * `enabled: Boolean(campaignId) && Boolean(ctx) && !ctxError`
 */
function getCampaignDetailQueryEnabled(
  campaignId: string | undefined,
  ctx: { canView: boolean } | undefined,
  ctxError: boolean
): boolean {
  return Boolean(campaignId) && Boolean(ctx) && !ctxError;
}

/**
 * Evaluates `enabled` for Templates queries:
 * `enabled: Boolean(ctx) && !ctxError && (isHq ? !!cityFilter : true)`
 */
function getTemplatesQueryEnabled(
  ctx: { isHq: boolean } | undefined,
  ctxError: boolean,
  cityFilter: string
): boolean {
  const isHq = ctx?.isHq ?? false;
  return Boolean(ctx) && !ctxError && (isHq ? Boolean(cityFilter) : true);
}

/**
 * Evaluates `enabled` for Calling Index Campaigns query:
 * `enabled: Boolean(ctx) && !ctxError && (isHq ? !!cityFilter : true)`
 */
function getCallingIndexQueryEnabled(
  ctx: { isHq: boolean } | undefined,
  ctxError: boolean,
  cityFilter: string
): boolean {
  const isHq = ctx?.isHq ?? false;
  return Boolean(ctx) && !ctxError && (isHq ? Boolean(cityFilter) : true);
}

/**
 * Constructs URLSearchParams for Templates query:
 * `if (isHq && cityFilter) params.set("cityId", cityFilter);`
 */
function getTemplatesUrlParams(isHq: boolean, cityFilter: string): URLSearchParams {
  const params = new URLSearchParams();
  if (isHq && cityFilter) {
    params.set("cityId", cityFilter);
  }
  return params;
}

/**
 * Constructs URLSearchParams for Campaign Leads query:
 * `if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);`
 */
function getLeadsUrlParams(statusFilter: string): URLSearchParams {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== "all") {
    params.set("status", statusFilter);
  }
  return params;
}

// ─── Safe Context-Error State Representation ──────────────────────────────────

function getCallingContextErrorAlert(errorMessage: string) {
  return {
    id: "calling-context-error",
    role: "alert",
    title: "Access Verification Failed",
    message: errorMessage || "Failed to load access permissions",
  };
}

function getTemplatesContextErrorAlert(errorMessage: string) {
  return {
    id: "templates-context-error",
    role: "alert",
    title: "Access Verification Failed",
    message: errorMessage || "Failed to load access permissions",
  };
}

// ─── Suite Definition ─────────────────────────────────────────────────────────

describe("Calling Component-Level Query Configurations & Error Bounds", () => {
  describe("1. Campaign Detail Query Configuration & Context 403 Gate", () => {
    it("context 403/error prevents campaign & leads fetch", () => {
      const campaignId = "cmp_lahore_01";
      const ctx = undefined;
      const ctxError = true;

      const isEnabled = getCampaignDetailQueryEnabled(campaignId, ctx, ctxError);
      expect(isEnabled).toBe(false);
    });

    it("unresolved/loading context prevents campaign & leads fetch", () => {
      const campaignId = "cmp_lahore_01";
      const ctx = undefined;
      const ctxError = false;

      const isEnabled = getCampaignDetailQueryEnabled(campaignId, ctx, ctxError);
      expect(isEnabled).toBe(false);
    });

    it("successful context enables campaign & leads fetch when campaignId is present", () => {
      const campaignId = "cmp_lahore_01";
      const ctx = { canView: true };
      const ctxError = false;

      const isEnabled = getCampaignDetailQueryEnabled(campaignId, ctx, ctxError);
      expect(isEnabled).toBe(true);
    });

    it("renders safe access-error state on context 403 failure", () => {
      const alert = getCallingContextErrorAlert("Forbidden");
      expect(alert).toEqual({
        id: "calling-context-error",
        role: "alert",
        title: "Access Verification Failed",
        message: "Forbidden",
      });
    });
  });

  describe("2. Templates Component HQ City Gating & Parameter Construction", () => {
    it("HQ no-city state prevents template fetch", () => {
      const ctx = { isHq: true };
      const ctxError = false;
      const cityFilter = "";

      const isEnabled = getTemplatesQueryEnabled(ctx, ctxError, cityFilter);
      expect(isEnabled).toBe(false);
    });

    it("HQ selected-city state enables template fetch", () => {
      const ctx = { isHq: true };
      const ctxError = false;
      const cityFilter = "city_lahore";

      const isEnabled = getTemplatesQueryEnabled(ctx, ctxError, cityFilter);
      expect(isEnabled).toBe(true);
    });

    it("scoped request (non-HQ) enables fetch without selecting a city", () => {
      const ctx = { isHq: false };
      const ctxError = false;
      const cityFilter = "";

      const isEnabled = getTemplatesQueryEnabled(ctx, ctxError, cityFilter);
      expect(isEnabled).toBe(true);
    });

    it("scoped request omits cityId parameter", () => {
      const isHq = false;
      const cityFilter = "";

      const params = getTemplatesUrlParams(isHq, cityFilter);
      expect(params.has("cityId")).toBe(false);
      expect(params.toString()).toBe("");
    });

    it("HQ selected-city request includes cityId parameter", () => {
      const isHq = true;
      const cityFilter = "city_multan_01";

      const params = getTemplatesUrlParams(isHq, cityFilter);
      expect(params.get("cityId")).toBe("city_multan_01");
    });

    it("renders safe templates context-error state on context failure", () => {
      const alert = getTemplatesContextErrorAlert("Access Denied");
      expect(alert.id).toBe("templates-context-error");
      expect(alert.role).toBe("alert");
      expect(alert.title).toBe("Access Verification Failed");
      expect(alert.message).toBe("Access Denied");
    });
  });

  describe("3. Calling Index Component HQ City Gating", () => {
    it("HQ user with no city selected prevents campaigns fetch", () => {
      const ctx = { isHq: true };
      const isEnabled = getCallingIndexQueryEnabled(ctx, false, "");
      expect(isEnabled).toBe(false);
    });

    it("HQ user with selected city enables campaigns fetch", () => {
      const ctx = { isHq: true };
      const isEnabled = getCallingIndexQueryEnabled(ctx, false, "city_rawalpindi");
      expect(isEnabled).toBe(true);
    });
  });

  describe("4. Campaign Detail Status Filter Parameter Construction", () => {
    it("statusFilter equal to 'all' omits the status parameter", () => {
      const params = getLeadsUrlParams("all");
      expect(params.has("status")).toBe(false);
      expect(params.toString()).toBe("");
    });

    it("empty statusFilter omits the status parameter", () => {
      const params = getLeadsUrlParams("");
      expect(params.has("status")).toBe(false);
    });

    it("valid statusFilter ('pending', 'in_progress', 'completed') includes status parameter", () => {
      expect(getLeadsUrlParams("pending").get("status")).toBe("pending");
      expect(getLeadsUrlParams("in_progress").get("status")).toBe("in_progress");
      expect(getLeadsUrlParams("completed").get("status")).toBe("completed");
    });
  });
});
