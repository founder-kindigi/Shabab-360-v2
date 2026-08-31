import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? React.createElement("div", { "data-slot": "dialog" }, children) : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("div", { "data-slot": "dialog-content", className }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

import { MobileContentPlannerPage } from "./mobile-content-planner-page";
import { SessionFormDialog, BlockFormDialog } from "./mobile-planner-dialogs";

function queryConfig(calls: unknown[], key: string) {
  return calls.find((call) => {
    const config = call as { queryKey?: unknown };
    return Array.isArray(config.queryKey) && config.queryKey[0] === key;
  }) as { enabled?: boolean; queryKey?: unknown[] } | undefined;
}

const mockPlan = {
  id: "plan-1",
  name: "Lahore Batch 4 Curriculum",
  kind: "template" as const,
  status: "published" as const,
  city: { id: "city-1", name: "Lahore" },
  _count: { sessions: 1 },
  sessions: [
    {
      id: "session-1",
      sessionDate: "2026-08-30",
      weekLabel: "Week 1",
      dayLabel: "Class 1",
      isOffDay: false,
      status: "published",
      focusArea: "Leadership & Drills",
      _count: { blocks: 1 },
    },
  ],
};

const mockBlock = {
  id: "block-1",
  category: "tadreeb",
  title: "Tadreeb Core Values",
  content: "Read lesson 1 on community brotherhood.",
  sortOrder: 0,
  status: "published",
  team: { id: "team-1", name: "Tadreeb Team", code: "tadreeb" },
  resources: [],
};

describe("MobileContentPlannerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useMutation.mockImplementation(() => ({ mutate: vi.fn(), isPending: false }));
  });

  it("hides all management controls when canManage is false", () => {
    mocks.useQuery.mockImplementation((options: unknown) => {
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: false, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [mockPlan] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plan") {
        return { data: mockPlan, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-blocks") {
        return { data: { blocks: [mockBlock] }, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));

    expect(html).toContain("Tadreeb Core Values");
    expect(html).not.toContain('data-testid="add-session-button"');
    expect(html).not.toContain('data-testid="edit-session-button"');
    expect(html).not.toContain('data-testid="mark-delivered-button"');
    expect(html).not.toContain('data-testid="cancel-session-button"');
    expect(html).not.toContain('data-testid="add-block-button"');
    expect(html).not.toContain('data-testid="edit-block-block-1"');
    expect(html).not.toContain('data-testid="delete-block-block-1"');
  });

  it("renders management controls when canManage is true and session is active", () => {
    mocks.useQuery.mockImplementation((options: unknown) => {
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [mockPlan] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plan") {
        return { data: mockPlan, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-blocks") {
        return { data: { blocks: [mockBlock] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-teams") {
        return { data: [{ id: "team-1", name: "Tadreeb Team", code: "tadreeb" }], isLoading: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));

    expect(html).toContain('data-testid="add-session-button"');
    expect(html).toContain('data-testid="edit-session-button"');
    expect(html).toContain('data-testid="mark-delivered-button"');
    expect(html).toContain('data-testid="cancel-session-button"');
    expect(html).toContain('data-testid="add-block-button"');
    expect(html).toContain('data-testid="edit-block-block-1"');
    expect(html).toContain('data-testid="delete-block-block-1"');
  });

  it("hides Mark Delivered, Edit, and Cancel controls when session is cancelled", () => {
    const cancelledPlan = {
      ...mockPlan,
      sessions: [
        {
          ...mockPlan.sessions[0],
          status: "cancelled",
        },
      ],
    };

    mocks.useQuery.mockImplementation((options: unknown) => {
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [cancelledPlan] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plan") {
        return { data: cancelledPlan, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-blocks") {
        return { data: { blocks: [mockBlock] }, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));

    expect(html).toContain("cancelled");
    expect(html).not.toContain('data-testid="mark-delivered-button"');
    expect(html).not.toContain('data-testid="edit-session-button"');
    expect(html).not.toContain('data-testid="cancel-session-button"');
    expect(html).not.toContain('data-testid="add-block-button"');
    expect(html).not.toContain('data-testid="edit-block-block-1"');
    expect(html).not.toContain('data-testid="delete-block-block-1"');
  });

  it("treats delivered sessions as terminal and read-only (hides all mutation controls)", () => {
    const deliveredPlan = {
      ...mockPlan,
      sessions: [
        {
          ...mockPlan.sessions[0],
          status: "delivered",
        },
      ],
    };

    mocks.useQuery.mockImplementation((options: unknown) => {
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [deliveredPlan] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plan") {
        return { data: deliveredPlan, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-blocks") {
        return { data: { blocks: [mockBlock] }, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));

    expect(html).toContain("Delivered");
    expect(html).not.toContain('data-testid="mark-delivered-button"');
    expect(html).not.toContain('data-testid="edit-session-button"');
    expect(html).not.toContain('data-testid="cancel-session-button"');
    expect(html).not.toContain('data-testid="add-block-button"');
    expect(html).not.toContain('data-testid="edit-block-block-1"');
    expect(html).not.toContain('data-testid="delete-block-block-1"');
  });

  it("renders Operational off-day notice and hides all block management controls when session is an off-day", () => {
    const offDayPlan = {
      ...mockPlan,
      sessions: [
        {
          ...mockPlan.sessions[0],
          isOffDay: true,
          status: "published",
        },
      ],
    };

    mocks.useQuery.mockImplementation((options: unknown) => {
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [offDayPlan] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plan") {
        return { data: offDayPlan, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));

    expect(html).toContain("Operational off-day");
    expect(html).toContain('data-testid="off-day-section"');
    expect(html).not.toContain('data-testid="add-block-button"');
    expect(html).not.toContain('data-testid="edit-block-block-1"');
    expect(html).not.toContain('data-testid="delete-block-block-1"');
  });

  it("filters teams matching exact canonical code without falling back to mismatched teams", () => {
    const dialogHtml = renderToString(
      React.createElement(BlockFormDialog, {
        open: true,
        onOpenChange: vi.fn(),
        mode: "create",
        categoryLabel: "Sports",
        expectedTeamCode: "sports",
        form: { teamId: "", title: "", content: "", sortOrder: 0 },
        teams: [],
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        isPending: false,
      })
    );

    expect(dialogHtml).toContain("No active sports team found in this city");
    expect(dialogHtml).toContain("disabled");
  });

  it("renders visible session-error-banner containing 409 conflict error message", async () => {
    const conflictMessage = "A session already exists for this date in this plan";

    // 1. Assert visible rendering of error message in SessionFormDialog
    const errorDialogHtml = renderToString(
      React.createElement(SessionFormDialog, {
        open: true,
        onOpenChange: vi.fn(),
        mode: "create",
        form: {
          sessionDate: "2026-08-30",
          weekLabel: "Week 1",
          dayLabel: "Class 1",
          focusArea: "",
          isOffDay: false,
          status: "published",
        },
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        isPending: false,
        errorMessage: conflictMessage,
      })
    );

    expect(errorDialogHtml).toContain('data-testid="session-error-banner"');
    expect(errorDialogHtml).toContain(conflictMessage);

    // 2. Assert component-registered useMutation executes and throws 409 error
    const capturedMutations: any[] = [];
    mocks.useMutation.mockImplementation((options: any) => {
      capturedMutations.push(options);
      return { mutate: vi.fn(), isPending: false };
    });

    mocks.useQuery.mockImplementation((options: unknown) => {
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [mockPlan] }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plan") {
        return { data: mockPlan, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    renderToString(React.createElement(MobileContentPlannerPage));
    const createSessionMutationConfig = capturedMutations[0];
    expect(createSessionMutationConfig).toBeDefined();

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: conflictMessage }),
    });

    try {
      await expect(
        createSessionMutationConfig.mutationFn({
          planId: "plan-1",
          sessionDate: "2026-08-30",
          isOffDay: false,
        })
      ).rejects.toThrow(conflictMessage);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("requires HQ to select a city before requesting plans", () => {
    const calls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      calls.push(options);
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: true }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-cities") {
        return { data: { data: [{ id: "city-1", name: "Lahore" }] }, isLoading: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));
    expect(html).toContain("Choose a city");
    expect(queryConfig(calls, "pwa-content-planner-plans")?.enabled).toBe(false);
  });

  it("uses server-derived scope for non-HQ users without sending cityId", () => {
    const calls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      calls.push(options);
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, canManage: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [] }, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    renderToString(React.createElement(MobileContentPlannerPage));
    const plans = queryConfig(calls, "pwa-content-planner-plans");
    expect(plans?.enabled).toBe(true);
    expect(plans?.queryKey).toEqual(["pwa-content-planner-plans", "scoped"]);
  });

  it("disables all dependent planner queries on context 403 / unverified access", () => {
    const calls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      calls.push(options);
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: undefined, isLoading: false, isError: true };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));

    expect(html).toContain("Planner access unavailable");
    expect(html).toContain("Your planner access could not be verified");

    const plans = queryConfig(calls, "pwa-content-planner-plans");
    const planDetail = queryConfig(calls, "pwa-content-planner-plan");
    const blocks = queryConfig(calls, "pwa-content-planner-blocks");

    expect(plans?.enabled).toBeFalsy();
    expect(planDetail?.enabled).toBeFalsy();
    expect(blocks?.enabled).toBeFalsy();
  });
});
