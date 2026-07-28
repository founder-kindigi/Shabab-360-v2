import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({
  db: {
    studentExtendedProfile: { findUnique: mocks.findUnique },
    participant: { findUnique: mocks.findUnique },
  },
}));

import { GET } from "./route";

describe("Me Student Extended Profile Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue({ user: { id: "student-1", role: "student" } });
  });

  it("denies unauthenticated or missing capability before data access", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("denies access if role is not student", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "admin-1", role: "program_admin" } });
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("student can access own participant profile tied to user.id", async () => {
    mocks.findUnique.mockImplementation(async (args) => {
      if (args.where?.userId === "student-1") return { id: "p-1" };
      if (args.where?.participantId === "p-1") return { participantId: "p-1", school: "School C" };
      return null;
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.school).toBe("School C");
  });

  it("sensitive fields are always omitted", async () => {
    mocks.findUnique.mockImplementation(async (args) => {
      if (args.where?.userId === "student-1") return { id: "p-1" };
      if (args.where?.participantId === "p-1") return { participantId: "p-1", school: "School C", badHabits: "Smoking" };
      return null;
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.school).toBe("School C");
    expect(data.badHabits).toBeUndefined();
  });
});
