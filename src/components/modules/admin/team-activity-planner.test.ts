import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { TeamActivityPlanner } from "./team-activity-planner";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MEMBERS = [{
  id: "membership-1",
  title: "Designer",
  staffMeta: { id: "staff-1", user: { name: "Ayesha", email: "ayesha@example.test", isActive: true } },
}];

describe("TeamActivityPlanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: vi.fn() });
    mocks.useMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("shows manager creation and completion controls from server-derived permissions", () => {
    mocks.useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: [{
          id: "activity-1",
          title: "Prepare poster",
          description: null,
          status: "in_progress",
          scheduledFor: null,
          assignedStaffMetaId: "staff-1",
          assignedStaff: { id: "staff-1", user: { name: "Ayesha", isActive: true } },
        }],
        total: 1,
        meta: { canManage: true, currentStaffMetaId: "manager-1" },
      },
    });

    const html = renderToString(React.createElement(TeamActivityPlanner, { teamId: "team-1", members: MEMBERS }));

    expect(html).toContain("Create activity");
    expect(html).toContain("Complete");
    expect(html).toContain("Cancel");
  });

  it("shows self-start but not manager controls for a directly assigned viewer", () => {
    mocks.useQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: [{
          id: "activity-1",
          title: "Prepare poster",
          description: null,
          status: "planned",
          scheduledFor: null,
          assignedStaffMetaId: "staff-1",
          assignedStaff: { id: "staff-1", user: { name: "Ayesha", isActive: true } },
        }],
        total: 1,
        meta: { canManage: false, currentStaffMetaId: "staff-1" },
      },
    });

    const html = renderToString(React.createElement(TeamActivityPlanner, { teamId: "team-1", members: MEMBERS }));

    expect(html).toContain("Start");
    expect(html).not.toContain("Create activity");
    expect(html).not.toContain("Complete");
  });

  it("renders a safe access error without exposing activity data", () => {
    mocks.useQuery.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    const html = renderToString(React.createElement(TeamActivityPlanner, { teamId: "team-1", members: MEMBERS }));

    expect(html).toContain("You do not have access to this team activity planner");
    expect(html).not.toContain("Prepare poster");
  });
});
