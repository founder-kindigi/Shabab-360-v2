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
    event: {
      findUnique: vi.fn(),
    },
    participant: {
      findUnique: vi.fn(),
    },
    eventRegistration: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("Events Operations & Registrations API (GET & POST /api/events/[id]/registrations)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any
    );

    const req = new NextRequest("http://localhost:3000/api/events/evt_1/registrations");
    const res = await GET(req, { params: Promise.resolve({ id: "evt_1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when event is outside actor city scope", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "evt_1",
      cityId: "city_lahore",
      title: "Summer Trip",
      capacity: 50,
      cost: 1000,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({
      error: "Scope mismatch",
      cityId: "city_karachi",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/events/evt_1/registrations");
    const res = await GET(req, { params: Promise.resolve({ id: "evt_1" }) });

    expect(res.status).toBe(403);
  });

  it("auto-waitlists registration when event capacity is reached", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "evt_1",
      cityId: "city_lahore",
      title: "Summer Swimming Camp",
      capacity: 10, // Max capacity 10
      cost: 500,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(db.participant.findUnique).mockResolvedValue({
      id: "part_11",
      name: "Tariq Ali",
      state: "active",
    } as any);

    // Active count is already 10 (capacity reached)
    vi.mocked(db.eventRegistration.count).mockResolvedValue(10);

    vi.mocked(db.eventRegistration.upsert).mockResolvedValue({
      id: "reg_wait_1",
      eventId: "evt_1",
      participantId: "part_11",
      status: "waitlisted",
      feeStatus: "unpaid",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/events/evt_1/registrations", {
      method: "POST",
      body: JSON.stringify({
        participantId: "part_11",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "evt_1" }) });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.status).toBe("waitlisted"); // Verified auto-waitlist!
  });

  it("executes mobile check-in when action is check_in", async () => {
    vi.mocked(requireCapability).mockResolvedValue({ user: { id: "usr_1" } } as any);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "evt_1",
      cityId: "city_lahore",
      title: "Youth Conference",
      capacity: 100,
      cost: 0,
    } as any);
    vi.mocked(resolveActorCity).mockResolvedValue({ cityId: "city_lahore" } as any);
    vi.mocked(db.participant.findUnique).mockResolvedValue({
      id: "part_01",
      name: "Hassan Farooq",
      state: "active",
    } as any);
    vi.mocked(db.eventRegistration.count).mockResolvedValue(5);

    vi.mocked(db.eventRegistration.upsert).mockResolvedValue({
      id: "reg_checkin_1",
      eventId: "evt_1",
      participantId: "part_01",
      status: "checked_in",
      checkedInAt: new Date(),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/events/evt_1/registrations", {
      method: "POST",
      body: JSON.stringify({
        participantId: "part_01",
        action: "check_in",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "evt_1" }) });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.status).toBe("checked_in");
  });
});
