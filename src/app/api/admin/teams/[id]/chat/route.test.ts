import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: vi.fn() }));
vi.mock("@/lib/auth/events-scope", () => ({ resolveActorCity: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLogData: vi.fn((data) => data) }));
vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: { findUnique: vi.fn() },
    staffTeamMembership: { findFirst: vi.fn() },
    teamChatMessage: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const activeTeam = { id: "team_1", cityId: "city_lahore", name: "Sports Team", isActive: true };

describe("Internal Team Chat API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(activeTeam as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(userHasCapability).mockResolvedValue(false);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ staffMetaId: "staff_1" } as any);
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({
      teamChatMessage: { create: db.teamChatMessage.create },
      auditLog: { create: vi.fn() },
    }));
  });

  it("returns 401 before looking up a team", async () => {
    vi.mocked(requireAuth).mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any);

    const res = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/chat"), {
      params: Promise.resolve({ id: "team_1" }),
    });

    expect(res.status).toBe(401);
    expect(db.collaborationTeam.findUnique).not.toHaveBeenCalled();
  });

  it("denies a same-city user who is not an active member and cannot manage the team", async () => {
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/chat"), {
      params: Promise.resolve({ id: "team_1" }),
    });

    expect(res.status).toBe(403);
    expect(db.teamChatMessage.findMany).not.toHaveBeenCalled();
  });

  it("denies a foreign-city member before listing retained messages", async () => {
    vi.mocked(resolveActorCity).mockResolvedValue({ error: "City mismatch", status: 403, cityId: "city_other" } as any);

    const res = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/chat"), {
      params: Promise.resolve({ id: "team_1" }),
    });

    expect(res.status).toBe(403);
    expect(db.teamChatMessage.findMany).not.toHaveBeenCalled();
  });

  it("returns retained messages to an active member without leaking author email", async () => {
    vi.mocked(db.teamChatMessage.findMany).mockResolvedValue([{
      id: "msg_1", teamId: "team_1", message: "Hello team!", isFlagged: false, createdAt: new Date(),
      author: { id: "staff_1", user: { name: "Ali Khan" } },
    }] as any);
    vi.mocked(db.teamChatMessage.count).mockResolvedValue(1);

    const res = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/chat"), {
      params: Promise.resolve({ id: "team_1" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].author).toEqual({ id: "staff_1", name: "Ali Khan" });
  });

  it("rejects malformed pagination before querying messages", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/teams/team_1/chat?limit=101"), {
      params: Promise.resolve({ id: "team_1" }),
    });

    expect(res.status).toBe(400);
    expect(db.teamChatMessage.findMany).not.toHaveBeenCalled();
  });

  it("retains archived messages but denies new posts", async () => {
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({ ...activeTeam, isActive: false } as any);

    const res = await POST(new NextRequest("http://localhost/api/admin/teams/team_1/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Hello?" }),
    }), { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(400);
    expect(db.teamChatMessage.create).not.toHaveBeenCalled();
  });

  it("creates a message and its audit record atomically for an active member", async () => {
    vi.mocked(db.teamChatMessage.create).mockResolvedValue({
      id: "msg_new", teamId: "team_1", message: "Ready for match", isFlagged: false, createdAt: new Date(),
      author: { id: "staff_1", user: { name: "Ali Khan" } },
    } as any);
    const auditCreate = vi.fn();
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback({
      teamChatMessage: { create: db.teamChatMessage.create },
      auditLog: { create: auditCreate },
    }));

    const res = await POST(new NextRequest("http://localhost/api/admin/teams/team_1/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Ready for match" }),
    }), { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(201);
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect((await res.json()).author.email).toBeUndefined();
  });

  it("does not let a manager post without active membership", async () => {
    vi.mocked(userHasCapability).mockResolvedValue(true);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);

    const res = await POST(new NextRequest("http://localhost/api/admin/teams/team_1/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Manager note" }),
    }), { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(403);
  });
});
