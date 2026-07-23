import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  participantFindFirst: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    participant: {
      findFirst: mocks.participantFindFirst,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns authentication error when unauthenticated", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when user is not found in database", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-99", role: "student" } });
    mocks.userFindUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "User not found" });
    expect(mocks.participantFindFirst).not.toHaveBeenCalled();
  });

  it("returns populated age and gradeClass when participant record contains enriched fields", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "student" } });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Ali Ahmed",
      email: "ali@example.com",
      phone: "+923001234567",
      createdAt: new Date("2026-01-01"),
    });

    mocks.participantFindFirst.mockResolvedValue({
      id: "part-1",
      name: "Ali Ahmed",
      phone: "+923001234567",
      dateOfBirth: new Date("2009-05-15"),
      gender: "male",
      age: 17,
      gradeClass: "Grade 10",
      address: "Lahore",
      state: "active",
      joinedAt: new Date("2026-01-10"),
      group: {
        name: "Group A",
        batch: {
          name: "Batch 4",
          park: {
            name: "State Life Park",
            city: { name: "Lahore" },
          },
        },
      },
      attendanceRecords: [
        { status: "present" },
        { status: "present" },
        { status: "absent" },
      ],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.participant).toMatchObject({
      id: "part-1",
      name: "Ali Ahmed",
      age: 17,
      gradeClass: "Grade 10",
      gender: "male",
    });
    expect(json.attendanceSummary).toEqual({
      total: 3,
      present: 2,
      absent: 1,
      late: 0,
      excused: 0,
      rate: 67,
    });
  });

  it("returns null for age and gradeClass when participant enriched fields are missing/null", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-2", role: "student" } });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-2",
      name: "Usman Khan",
      email: "usman@example.com",
      phone: null,
      createdAt: new Date("2026-01-01"),
    });

    mocks.participantFindFirst.mockResolvedValue({
      id: "part-2",
      name: "Usman Khan",
      phone: null,
      dateOfBirth: null,
      gender: null,
      age: null,
      gradeClass: null,
      address: null,
      state: "active",
      joinedAt: new Date("2026-01-10"),
      group: {
        name: "Group B",
        batch: {
          name: "Batch 4",
          park: {
            name: "Iqbal Park",
            city: null,
          },
        },
      },
      attendanceRecords: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.participant).toMatchObject({
      id: "part-2",
      name: "Usman Khan",
      age: null,
      gradeClass: null,
    });
  });
});
