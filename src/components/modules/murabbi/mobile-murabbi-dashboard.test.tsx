/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { MobileMurabbiDashboard } from "./mobile-murabbi-dashboard";

afterEach(() => { cleanup(); });

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession: mocks.useSession }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

function dashboardData(overrides: Record<string, unknown> = {}) {
  return {
    park: { id: "park-1", name: "Gulshan Ravi Park", cityName: "Lahore" },
    groupBreakdown: [{ id: "g1", name: "Group 2" }],
    recentSummary: { totalParticipants: 10 },
    todayAttendance: { present: 5, rate: 50 },
    events: [],
    ...overrides,
  };
}

describe("MobileMurabbiDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.useSession.mockReturnValue({
      data: { user: { name: "Test Murabbi", role: "murabbi", assignedParkId: "park-1", assignedGroupId: "g1" } },
      status: "authenticated",
    });
  });

  it("offers group attendance on a scheduled day and hands the real park to PwaApp", () => {
    mocks.useQuery.mockReturnValue({
      data: dashboardData({ events: [{ id: "e1", isClosed: false, title: "Special Class" }] }),
      isLoading: false,
    });

    const onNavigate = vi.fn();
    const onOpenAttendance = vi.fn();

    render(<MobileMurabbiDashboard onNavigate={onNavigate} onOpenAttendance={onOpenAttendance} />);
    expect(screen.getByText("Gulshan Ravi Park")).toBeDefined();
    expect(screen.getAllByText(/Group 2/).length).toBeGreaterThan(0);
    expect(screen.getByText("Special Class")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Mark Group Attendance/ }));

    expect(onOpenAttendance).toHaveBeenCalledWith({
      parkId: "park-1",
      parkName: "Gulshan Ravi Park",
      murabbiCount: 0,
      studentCount: 10,
    });
    // The dashboard itself never navigates.
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("still opens the scoped attendance workspace when no class is scheduled today", () => {
    mocks.useQuery.mockReturnValue({ data: dashboardData({ events: [] }), isLoading: false });

    const onOpenAttendance = vi.fn();
    render(<MobileMurabbiDashboard onNavigate={vi.fn()} onOpenAttendance={onOpenAttendance} />);

    // Truthful no-session state, and the route into the workspace stays available.
    expect(screen.getByText("No class scheduled today")).toBeDefined();
    expect(screen.getByText("No session today")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Open Group Attendance/ }));
    expect(onOpenAttendance).toHaveBeenCalledWith(expect.objectContaining({ parkId: "park-1" }));
  });

  it("renders only the Murabbi's own group from the scoped response", () => {
    mocks.useQuery.mockReturnValue({
      data: dashboardData({ groupBreakdown: [{ id: "g1", name: "Group 2" }] }),
      isLoading: false,
    });

    const { container } = render(<MobileMurabbiDashboard onNavigate={vi.fn()} onOpenAttendance={vi.fn()} />);

    expect(container.textContent).toContain("Group 2");
    expect(container.textContent).not.toContain("Group 1");
    expect(container.textContent).not.toContain("No group assigned yet");
  });

  it("shows the explicit no-group state for an unassigned Murabbi and no attendance action", () => {
    mocks.useQuery.mockReturnValue({
      data: dashboardData({ groupBreakdown: [], events: [] }),
      isLoading: false,
    });

    const onOpenAttendance = vi.fn();
    render(<MobileMurabbiDashboard onNavigate={vi.fn()} onOpenAttendance={onOpenAttendance} />);

    expect(screen.getByText("No group assigned yet")).toBeDefined();
    expect(screen.getByText(/Group attendance stays unavailable/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Group Attendance/ })).toBeNull();
  });

  it("shows loading and failure states without fabricating group data", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
    const { unmount } = render(<MobileMurabbiDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText("Loading your group…")).toBeDefined();
    unmount();

    mocks.useQuery.mockReturnValue({ data: null, isLoading: false, isError: false, refetch: vi.fn() });
    render(<MobileMurabbiDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText("Could not load your group")).toBeDefined();
    expect(screen.queryByText(/Group Attendance/)).toBeNull();
  });

  it("shows a no-park state when the response carries no park", () => {
    mocks.useQuery.mockReturnValue({ data: dashboardData({ park: null }), isLoading: false });
    render(<MobileMurabbiDashboard onNavigate={vi.fn()} />);
    expect(screen.getByText("No park assigned")).toBeDefined();
  });
});
