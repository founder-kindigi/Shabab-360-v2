/**
 * Tests for:
 *   PATCH  /api/admin/collaboration-teams/[teamId]/members/[memberId]
 *   DELETE /api/admin/collaboration-teams/[teamId]/members/[memberId]
 *
 * Covers: capability gate, 404, city-scope allow/deny, malformed JSON,
 * schema validation, 409 on already-inactive, successful update/deactivate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: vi.fn(),
  requireCityScope: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    staffTeamMembership: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

import * as auth from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { PATCH, DELETE } from "./route";

const url = (teamId: string, memberId: string) =>
  `http://localhost/api/admin/collaboration-teams/${teamId}/members/${memberId}`;
const params = (teamId: string, memberId: string) => ({
  params: Promise.resolve({ teamId, memberId }),
});

const ACTIVE_MEM = {
  id: "mem1",
  teamId: "t1",
  staffMetaId: "sm1",
  title: "Captain",
  isActive: true,
  endedAt: null,
  team: { cityId: "city-lhr" },
};
const INACTIVE_MEM = { ...ACTIVE_MEM, isActive: false, endedAt: new Date() };

describe("PATCH /api/admin/collaboration-teams/[teamId]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  const patchReq = (body: unknown) =>
    new NextRequest(url("t1", "mem1"), {
      method: "PATCH",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

  it("returns 403 when capability is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await PATCH(patchReq({ title: "New" }), params("t1", "mem1"));

    expect(res.status).toBe(403);
    expect(db.staffTeamMembership.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed JSON", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );

    const res = await PATCH(
      new NextRequest(url("t1", "mem1"), { method: "PATCH", body: "{{bad" }),
      params("t1", "mem1")
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid JSON");
  });

  it("returns 400 when no fields provided", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );

    const res = await PATCH(patchReq({}), params("t1", "mem1"));

    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too long", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );

    const res = await PATCH(
      patchReq({ title: "x".repeat(121) }),
      params("t1", "mem1")
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when membership does not exist", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(null as any);

    const res = await PATCH(patchReq({ title: "New" }), params("t1", "missing"));

    expect(res.status).toBe(404);
  });

  it("returns 404 when memberId belongs to a different team", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue({
      ...ACTIVE_MEM,
      teamId: "other-team",
    } as any);

    const res = await PATCH(patchReq({ title: "New" }), params("t1", "mem1"));

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is outside team city", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(ACTIVE_MEM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(false);

    const res = await PATCH(patchReq({ title: "New" }), params("t1", "mem1"));

    expect(res.status).toBe(403);
  });

  it("returns 409 when membership is already inactive", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(INACTIVE_MEM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    const res = await PATCH(patchReq({ title: "New" }), params("t1", "mem1"));

    expect(res.status).toBe(409);
  });

  it("updates title and returns 200", async () => {
    const updated = { ...ACTIVE_MEM, title: "New Title" };
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(ACTIVE_MEM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);
    vi.mocked(db.staffTeamMembership.update).mockResolvedValue(updated as any);

    const res = await PATCH(patchReq({ title: "New Title" }), params("t1", "mem1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("New Title");
  });
});

describe("DELETE /api/admin/collaboration-teams/[teamId]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  const delReq = () =>
    new NextRequest(url("t1", "mem1"), { method: "DELETE" });

  it("returns 403 when capability is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await DELETE(delReq(), params("t1", "mem1"));

    expect(res.status).toBe(403);
    expect(db.staffTeamMembership.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when membership does not exist", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(null as any);

    const res = await DELETE(delReq(), params("t1", "missing"));

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is outside team city", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(ACTIVE_MEM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(false);

    const res = await DELETE(delReq(), params("t1", "mem1"));

    expect(res.status).toBe(403);
  });

  it("returns 409 when membership is already inactive", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(INACTIVE_MEM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    const res = await DELETE(delReq(), params("t1", "mem1"));

    expect(res.status).toBe(409);
  });

  it("soft-deactivates membership and returns 200", async () => {
    const deactivated = { ...ACTIVE_MEM, isActive: false, endedAt: new Date() };
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(ACTIVE_MEM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);
    vi.mocked(db.staffTeamMembership.update).mockResolvedValue(deactivated as any);

    const res = await DELETE(delReq(), params("t1", "mem1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(false);
  });
});
