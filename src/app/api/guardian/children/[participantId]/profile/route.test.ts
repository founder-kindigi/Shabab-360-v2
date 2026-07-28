import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({
  db: {
    studentExtendedProfile: { findUnique: mocks.findUnique },
    guardianChild: { findFirst: mocks.findFirst },
  },
}));

import { GET } from "./route";

const params = { params: Promise.resolve({ participantId: "p-1" }) };

describe("Guardian Student Extended Profile Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue({ user: { id: "guardian-1", role: "guardian" } });
  });

  it("denies unauthenticated or missing capability before data access", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/guardian/children/p-1/profile"), params);
    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("denies access if role is not guardian", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "student-1", role: "student" } });
    const response = await GET(new NextRequest("http://localhost/api/guardian/children/p-1/profile"), params);
    expect(response.status).toBe(403);
  });

  it("guardian unrelated child returns 403 (or 404 depending on implementation)", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/api/guardian/children/p-1/profile"), params);
    expect(response.status).toBe(404);
  });

  it("guardian can access linked child", async () => {
    mocks.findFirst.mockResolvedValue({ id: "link-1" });
    mocks.findUnique.mockResolvedValue({ participantId: "p-1", school: "School D" });

    const response = await GET(new NextRequest("http://localhost/api/guardian/children/p-1/profile"), params);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.school).toBe("School D");
  });

  it("sensitive fields are always omitted", async () => {
    mocks.findFirst.mockResolvedValue({ id: "link-1" });
    mocks.findUnique.mockResolvedValue({ participantId: "p-1", school: "School D", financialStatus: "Good" });

    const response = await GET(new NextRequest("http://localhost/api/guardian/children/p-1/profile"), params);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.school).toBe("School D");
    expect(data.financialStatus).toBeUndefined();
  });
});
