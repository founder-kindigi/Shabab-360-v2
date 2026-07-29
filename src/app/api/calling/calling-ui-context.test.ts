/**
 * GET /api/calling/ui-context – unit tests
 *
 * Scope: Authorization gates and shape of the context response.
 * No Prisma, no migrations, no PII, no campaign data.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mock next-auth ────────────────────────────────────────────────────────────
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// ── Mock authOptions (required by requireAuth import chain) ───────────────────
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// ── Mock capability-access ────────────────────────────────────────────────────
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { userHasCapability } from "@/lib/auth/capability-access";
import { GET } from "./ui-context/route";

const mockGetSession = vi.mocked(getServerSession);
const mockHasCap = vi.mocked(userHasCapability);

function makeSession(
  role: string,
  extra: Record<string, unknown> = {}
): { user: Record<string, unknown> } {
  return { user: { id: "user-1", role, ...extra } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/calling/ui-context", () => {
  describe("1. Authentication gate", () => {
    it("returns 401 when no session", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await GET();
      expect(res).toBeInstanceOf(NextResponse);
      expect(res.status).toBe(401);
    });
  });

  describe("2. Authorization gate (calling.view)", () => {
    it("returns 403 when calling.view is absent", async () => {
      mockGetSession.mockResolvedValue(makeSession("murabbi"));
      mockHasCap.mockResolvedValue(false);
      const res = await GET();
      expect(res.status).toBe(403);
    });
  });

  describe("3. Correct shape for a scoped caller (city_head)", () => {
    it("returns canView=true, isHq=false, both manage flags from server", async () => {
      mockGetSession.mockResolvedValue(
        makeSession("city_head", { assignedCityId: "city-lhe" })
      );
      mockHasCap
        .mockResolvedValueOnce(true) // calling.view
        .mockResolvedValueOnce(false) // calling.poc.manage
        .mockResolvedValueOnce(false); // calling.templates.manage
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        canView: true,
        canManagePoc: false,
        canManageTemplates: false,
        isHq: false,
      });
    });

    it("scoped caller with poc.manage returns canManagePoc=true", async () => {
      mockGetSession.mockResolvedValue(
        makeSession("city_head", { assignedCityId: "city-lhe" })
      );
      mockHasCap
        .mockResolvedValueOnce(true) // calling.view
        .mockResolvedValueOnce(true) // calling.poc.manage
        .mockResolvedValueOnce(false); // calling.templates.manage
      const res = await GET();
      const body = await res.json();
      expect(body.canManagePoc).toBe(true);
      expect(body.isHq).toBe(false);
    });
  });

  describe("4. Correct shape for HQ (super_admin)", () => {
    it("returns isHq=true and full manage flags", async () => {
      mockGetSession.mockResolvedValue(makeSession("super_admin"));
      mockHasCap
        .mockResolvedValueOnce(true) // calling.view
        .mockResolvedValueOnce(true) // calling.poc.manage
        .mockResolvedValueOnce(true); // calling.templates.manage
      const res = await GET();
      const body = await res.json();
      expect(body).toEqual({
        canView: true,
        canManagePoc: true,
        canManageTemplates: true,
        isHq: true,
      });
    });
  });

  describe("5. Response must not leak PII or role strings", () => {
    it("response body contains no role, staffMetaId, name, phone, campaign, or lead fields", async () => {
      mockGetSession.mockResolvedValue(makeSession("super_admin"));
      mockHasCap.mockResolvedValue(true);
      const res = await GET();
      const body = await res.json();
      const forbidden = [
        "role",
        "staffMetaId",
        "name",
        "phone",
        "campaigns",
        "leads",
        "email",
        "cityId",
      ];
      for (const key of forbidden) {
        expect(body).not.toHaveProperty(key);
      }
    });
  });
});
