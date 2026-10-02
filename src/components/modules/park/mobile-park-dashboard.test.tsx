// @vitest-environment jsdom
import React from "react";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MobileParkDashboard } from "./mobile-park-dashboard";

afterEach(() => { cleanup(); });

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: { user: { name: "Test Lead", role: "park_lead" } } })),
}));

vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: "light" }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

describe("MobileParkDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state while query is in flight", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    const { container } = render(<MobileParkDashboard onNavigate={vi.fn()} />);
    expect(container.textContent).toContain("Loading park data");
    expect(container.textContent).not.toContain("Gulberg");
    expect(container.textContent).not.toContain("Lahore");
    expect(container.textContent).not.toContain("Group Abu Bakr");
    expect(container.textContent).not.toContain("Murabbi");
    expect(container.textContent).not.toContain("Today Att.");
    expect(container.textContent).not.toContain("Open & Mark Attendance Roster");
  });

  it("shows error state when query returns null (failed/forbidden)", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, isError: false, refetch: vi.fn() });

    const { container } = render(<MobileParkDashboard onNavigate={vi.fn()} />);
    expect(container.textContent).toContain("Could not load park data");
    expect(container.textContent).not.toContain("Gulberg");
    expect(container.textContent).not.toContain("Lahore");
    expect(container.textContent).not.toContain("Group");
    expect(container.textContent).not.toContain("Batch");
    expect(container.textContent).not.toContain("Open & Mark Attendance Roster");
  });

  it("shows no-assignment state when park is absent from response", () => {
    mockUseQuery.mockReturnValue({
      data: { park: null, batch: null, groupBreakdown: [], events: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = render(<MobileParkDashboard onNavigate={vi.fn()} />);
    expect(container.textContent).toContain("No park assigned");
    expect(container.textContent).not.toContain("Group Abu Bakr");
    expect(container.textContent).not.toContain("Gulberg");
    expect(container.textContent).not.toContain("Lahore");
    expect(container.textContent).not.toContain("Open & Mark Attendance Roster");
  });

  it("renders real data and actionable event correctly", () => {
    mockUseQuery.mockReturnValue({
      data: {
        park: { id: "p1", name: "Real Park", cityName: "Real City" },
        batch: { id: "b1", name: "Batch 5" },
        recentSummary: { totalParticipants: 100 },
        todayAttendance: { rate: 88 },
        groupBreakdown: [
          { id: "g1", name: "Real Group", murabbiName: "Real Murabbi", totalParticipants: 10, todayProgress: 90 },
        ],
        events: [{ id: "e1", isClosed: false, title: "Special Session" }],
      },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<MobileParkDashboard onNavigate={vi.fn()} />);
    expect(container.textContent).toContain("Real Park");
    expect(container.textContent).toContain("Real City");
    expect(container.textContent).toContain("88%");
    expect(container.textContent).toContain("Batch 5");
    expect(container.textContent).toContain("Real Group");
    expect(container.textContent).toContain("Real Murabbi");
    expect(container.textContent).toContain("Special Session");
    expect(container.textContent).toContain("Open");
    // No fake data
    expect(container.textContent).not.toContain("Gulberg");
    expect(container.textContent).not.toContain("Lahore");
    expect(container.textContent).not.toContain("Group Abu Bakr");
    expect(container.textContent).not.toContain("Assigned Murabbi");
  });

  it("shows no-session state when park and batch exist but no open event", () => {
    mockUseQuery.mockReturnValue({
      data: {
        park: { id: "p1", name: "Real Park", cityName: "Real City" },
        batch: { id: "b1", name: "Batch 5" },
        recentSummary: { totalParticipants: 100 },
        todayAttendance: { rate: 88 },
        groupBreakdown: [],
        events: [],
      },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<MobileParkDashboard onNavigate={vi.fn()} />);
    expect(container.textContent).toContain("Real Park");
    expect(container.textContent).toContain("No Session Scheduled");
    expect(container.textContent).not.toContain("Open");
    expect(container.textContent).not.toContain("Gulberg");
  });

  it("shows each group's latest recorded-session rate when today has no class", () => {
    mockUseQuery.mockReturnValue({
      data: {
        park: { id: "p1", name: "Real Park", cityName: "Real City" },
        batch: { id: "b1", name: "Batch 5" },
        recentSummary: { totalParticipants: 22 },
        todayAttendance: { rate: 0 },
        groupBreakdown: [{
          id: "g1", name: "Real Group", murabbiName: "Real Murabbi", totalParticipants: 10,
          todayProgress: 0, latestSessionDate: "2026-09-13", latestProgress: 80,
        }],
        events: [],
      },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<MobileParkDashboard onNavigate={vi.fn()} />);

    expect(container.textContent).toContain("Groups Breakdown · Latest Session");
    expect(container.textContent).toContain("Latest 2026-09-13");
    expect(container.textContent).toContain("80%");
  });

  it("hands the real park id back to PwaApp from the attendance controls", () => {
    const onOpenAttendance = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        park: { id: "park-1", name: "Real Park", cityName: "Real City" },
        batch: { id: "b1", name: "Batch 5" },
        recentSummary: { totalParticipants: 100 },
        todayAttendance: { rate: 88 },
        groupBreakdown: [{ id: "g1", name: "Real Group", totalParticipants: 10, latestProgress: 90 }],
        events: [{ id: "e1", isClosed: false, title: "Special Session" }],
      },
      isLoading: false,
      isError: false,
    });

    render(<MobileParkDashboard onNavigate={vi.fn()} onOpenAttendance={onOpenAttendance} />);

    fireEvent.click(screen.getByRole("button", { name: /Open & Mark Attendance Roster/ }));
    expect(onOpenAttendance).toHaveBeenLastCalledWith(expect.objectContaining({ parkId: "park-1" }));

    fireEvent.click(screen.getByRole("button", { name: /All Groups/ }));
    expect(onOpenAttendance).toHaveBeenLastCalledWith(expect.objectContaining({ parkId: "park-1" }));
    expect(onOpenAttendance).toHaveBeenCalledTimes(2);
  });

  it("never routes Structure, Lessons or Planner anywhere and says so", () => {
    const onNavigate = vi.fn();
    mockUseQuery.mockReturnValue({
      data: {
        park: { id: "park-1", name: "Real Park", cityName: "Real City" },
        batch: { id: "b1", name: "Batch 5" },
        recentSummary: { totalParticipants: 100 },
        todayAttendance: { rate: 88 },
        groupBreakdown: [{ id: "g1", name: "Real Group", totalParticipants: 10, latestProgress: 90 }],
        events: [{ id: "e1", isClosed: false, title: "Special Session" }],
      },
      isLoading: false,
      isError: false,
    });

    render(<MobileParkDashboard onNavigate={onNavigate} onOpenAttendance={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Structure (not available yet)"));
    expect(screen.getByText("Structure is not available yet.")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Lessons (not available yet)"));
    expect(screen.getByText("Lessons is not available yet.")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Planner (not available yet)"));
    expect(screen.getByText("Planner is not available yet.")).toBeDefined();

    // No silent navigation back to the dashboard or anywhere else.
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
