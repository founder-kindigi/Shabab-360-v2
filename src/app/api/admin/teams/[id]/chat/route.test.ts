import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "./route";
import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: vi.fn(),
}));

vi.mock("@/lib/auth/events-scope", () => ({
  resolveActorCity: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: {
      findUnique: vi.fn(),
    },
    staffMeta: {
      findUnique: vi.fn(),
    },
    teamChatMessage: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Internal Team Chat API (GET & POST /api/admin/teams/[id]/chat)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any
    );

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/chat");
    const res = await GET(req, { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when team is outside assigned city scope", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
      isActive: true,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({
      error: "Scope mismatch",
      cityId: "city_karachi",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/chat");
    const res = await GET(req, { params: Promise.resolve({ id: "team_1" }) });

    expect(res.status).toBe(403);
  });

  it("returns paginated team chat messages", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
      isActive: true,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);

    vi.mocked(db.teamChatMessage.findMany).mockResolvedValue([
      {
        id: "msg_1",
        teamId: "team_1",
        message: "Hello team!",
        isFlagged: false,
        createdAt: new Date(),
        author: {
          id: "staff_1",
          userId: "usr_1",
          user: { name: "Ali Khan", email: "ali@example.com" },
        },
      },
    ] as any);
    vi.mocked(db.teamChatMessage.count).mockResolvedValue(1);

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/chat");
    const res = await GET(req, { params: Promise.resolve({ id: "team_1" }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].message).toBe("Hello team!");
  });

  it("rejects sending message to an archived team", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_archived",
      cityId: "city_lahore",
      name: "Old Team",
      isActive: false, // Archived team
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_archived/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Hello?" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "team_archived" }) });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("archived team");
  });

  it("posts new team chat message successfully", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
      id: "team_1",
      cityId: "city_lahore",
      name: "Sports Team",
      isActive: true,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue({ id: "staff_1" } as any);

    vi.mocked(db.teamChatMessage.create).mockResolvedValue({
      id: "msg_new",
      teamId: "team_1",
      message: "Ready for match",
      isFlagged: false,
      createdAt: new Date(),
      author: {
        id: "staff_1",
        user: { name: "Ali Khan", email: "ali@example.com" },
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/teams/team_1/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Ready for match" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "team_1" }) });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.id).toBe("msg_new");
    expect(data.message).toBe("Ready for match");
  });
});
