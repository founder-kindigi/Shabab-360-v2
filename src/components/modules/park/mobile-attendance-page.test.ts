import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
  signIn: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/stores/useAppStore", () => ({
  useAppStore: () => ({ selectedDate: "2026-08-29", setSelectedDate: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { MobileAttendancePage } from "./mobile-attendance-page";

describe("MobileAttendancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders unauthenticated sign-in prompt when session is unauthenticated", () => {
    mocks.useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    mocks.useQuery.mockReturnValue({ data: null, isLoading: false });

    const html = renderToString(React.createElement(MobileAttendancePage));
    expect(html).toContain("Sign In Required");
    expect(html).toContain("Go to Sign In");
    expect(html).not.toContain("password123");
    expect(html).not.toContain("Password123!");
  });

  it("does not leak embedded test credentials when unauthenticated", () => {
    mocks.useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    mocks.useQuery.mockReturnValue({ data: null, isLoading: false });

    const html = renderToString(React.createElement(MobileAttendancePage));
    expect(html).not.toContain("Quick Sign In");
    expect(html).not.toContain("lead.statelife@shabab360.org");
    expect(html).not.toContain("park_lead@shabab360.pk");
  });

  it("renders park selection state and guards prepare query when authenticated with no resolved park", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { id: "u-admin-1", name: "HQ Admin", role: "super_admin" } },
      status: "authenticated",
    });

    const queryCalls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      queryCalls.push(options);
      return { data: null, isLoading: false };
    });

    const html = renderToString(React.createElement(MobileAttendancePage));
    expect(html).toContain("Select a Park");
    expect(html).toContain("Please select a park location");

    const prepareQueryConfig = queryCalls.find((query) => {
      const config = query as { queryKey?: unknown; enabled?: boolean };
      return Array.isArray(config.queryKey) && config.queryKey[0] === "mobile-attendance-sessions";
    }) as { enabled?: boolean } | undefined;
    expect(prepareQueryConfig).toBeDefined();
    expect(prepareQueryConfig?.enabled).toBe(false);
  });

  it("requires a park staff member to choose a group before loading a roster", () => {
    mocks.useSession.mockReturnValue({
      data: {
        user: {
          id: "u-park-lead-1",
          name: "Park Lead",
          role: "park_lead",
          assignedParkId: "park-1",
        },
      },
      status: "authenticated",
    });

    const queryCalls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      queryCalls.push(options);
      const config = options as { queryKey?: unknown[] };
      const key = config.queryKey?.[0];

      if (key === "mobile-attendance-parks") {
        return { data: [{ id: "park-1", name: "Park One" }], isLoading: false };
      }
      if (key === "mobile-attendance-sessions") {
        return {
          data: {
            events: [{ id: "event-1", groupId: "group-1", groupName: "Group 1", markedCount: 0, participantCount: 20, isClosed: false }],
            preparation: { isOffDate: false },
          },
          isLoading: false,
        };
      }
      return { data: null, isLoading: false };
    });

    const html = renderToString(React.createElement(MobileAttendancePage));
    expect(html).toContain("Group Selection");
    expect(html).toContain("Group 1");
    expect(html).toContain("Choose a group to open its attendance roster.");

    const rosterQueryConfig = queryCalls.find((query) => {
      const config = query as { queryKey?: unknown; enabled?: boolean };
      return Array.isArray(config.queryKey) && config.queryKey[0] === "mobile-attendance-roster";
    }) as { enabled?: boolean } | undefined;
    expect(rosterQueryConfig).toBeDefined();
    expect(rosterQueryConfig?.enabled).toBe(false);
  });
});
