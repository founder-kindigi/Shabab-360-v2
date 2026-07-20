import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET as getGuardianAttendance } from "./guardian/attendance-history/route";
import { GET as getGuardianFees } from "./guardian/fees/route";
import { GET as getGuardianSchedule } from "./guardian/schedule/route";
import { GET as getMurabbiGroups } from "./murabbi/groups/route";
import { GET as getParkSchedule } from "./park/schedule/route";
import { GET as getStudentAttendance } from "./student/attendance-history/route";
import { GET as getStudentFees } from "./student/fees/route";
import { GET as getStudentSchedule } from "./student/schedule/route";

const request = (path: string) => new NextRequest(`http://localhost${path}`);

describe("portal capability gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it.each([
    ["guardian attendance", () => getGuardianAttendance(request("/api/guardian/attendance-history?participantId=participant-1")), "reports.view"],
    ["guardian fees", () => getGuardianFees(), "reports.view"],
    ["guardian schedule", () => getGuardianSchedule(request("/api/guardian/schedule")), "reports.view"],
    ["student attendance", () => getStudentAttendance(request("/api/student/attendance-history")), "reports.view"],
    ["student fees", () => getStudentFees(), "reports.view"],
    ["student schedule", () => getStudentSchedule(request("/api/student/schedule")), "reports.view"],
    ["park schedule", () => getParkSchedule(request("/api/park/schedule")), "reports.view"],
    ["Murabbi groups", () => getMurabbiGroups(), "people.view"],
  ])("blocks %s without its module capability", async (_name, run, capability) => {
    const response = await run();

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith(capability);
  });

  it("checks the portal role before its capability", async () => {
    mocks.requireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await getGuardianFees();

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).not.toHaveBeenCalled();
  });
});
