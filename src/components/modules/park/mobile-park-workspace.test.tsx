// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileParkWorkspace } from "./mobile-park-workspace";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));

const PARK_NAV = { parkId: "park-1", parkName: "Gulberg Park", murabbiCount: 2, studentCount: 12 };

const DASHBOARD = {
  park: { id: "park-1", name: "Gulberg Park", cityName: "Lahore" },
  groupBreakdown: [
    { id: "g1", name: "Group One", totalParticipants: 6, latestProgress: 75, latestSessionDate: "2026-09-13" },
    { id: "g2", name: "Group Two", totalParticipants: 6, latestProgress: 40 },
  ],
};

describe("MobileParkWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockReturnValue({ data: DASHBOARD, isLoading: false, isError: false, refetch: vi.fn() });
  });

  afterEach(() => cleanup());

  it("shows the selected park and its real groups with the attendance controls", () => {
    render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={vi.fn()} onOpenAttendance={vi.fn()} />);

    expect(screen.getByText("Park workspace")).toBeDefined();
    expect(screen.getByText("Gulberg Park")).toBeDefined();
    expect(screen.getByText("Lahore")).toBeDefined();
    expect(screen.getByText("Group One")).toBeDefined();
    expect(screen.getByText("Group Two")).toBeDefined();
    expect(screen.getByRole("button", { name: /Open & Mark Attendance Roster/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /All Groups/ })).toBeDefined();
  });

  it("hands the selected park id back to PwaApp from every attendance control", () => {
    const onOpenAttendance = vi.fn();
    render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={vi.fn()} onOpenAttendance={onOpenAttendance} />);

    fireEvent.click(screen.getByRole("button", { name: /Open & Mark Attendance Roster/ }));
    expect(onOpenAttendance).toHaveBeenLastCalledWith(expect.objectContaining({ parkId: "park-1" }));

    fireEvent.click(screen.getByRole("button", { name: /All Groups/ }));
    expect(onOpenAttendance).toHaveBeenLastCalledWith(expect.objectContaining({ parkId: "park-1" }));

    fireEvent.click(screen.getByRole("button", { name: /Open attendance for Group Two/ }));
    expect(onOpenAttendance).toHaveBeenLastCalledWith(expect.objectContaining({ parkId: "park-1" }));
    expect(onOpenAttendance).toHaveBeenCalledTimes(3);
  });

  it("keeps Structure, Lessons and Planner as truthful unavailable states, not navigation", () => {
    const onOpenAttendance = vi.fn();
    const onBack = vi.fn();
    render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={onBack} onOpenAttendance={onOpenAttendance} />);

    fireEvent.click(screen.getByLabelText("Structure (not available yet)"));
    expect(screen.getByText("Structure is not available yet.")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Lessons (not available yet)"));
    expect(screen.getByText("Lessons is not available yet.")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Planner (not available yet)"));
    expect(screen.getByText("Planner is not available yet.")).toBeDefined();

    expect(onOpenAttendance).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByText("Park workspace")).toBeDefined();
  });

  it("calls onBack when the workspace is dismissed", () => {
    const onBack = vi.fn();
    render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={onBack} onOpenAttendance={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Back to parks"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows loading and error states for the group list", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
    const { unmount } = render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={vi.fn()} onOpenAttendance={vi.fn()} />);
    expect(screen.getByText("Loading park groups…")).toBeDefined();
    unmount();

    mocks.useQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
    render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={vi.fn()} onOpenAttendance={vi.fn()} />);
    expect(screen.getByText("Could not load park groups")).toBeDefined();
  });

  it("shows a truthful empty state and no All Groups control without groups", () => {
    mocks.useQuery.mockReturnValue({ data: { park: DASHBOARD.park, groupBreakdown: [] }, isLoading: false, isError: false, refetch: vi.fn() });
    render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={vi.fn()} onOpenAttendance={vi.fn()} />);

    expect(screen.getByText("No groups assigned to this park yet.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /All Groups/ })).toBeNull();
  });

  it("shows a no-park state when nothing is selected", () => {
    render(<MobileParkWorkspace parkNav={null} onBack={vi.fn()} onOpenAttendance={vi.fn()} />);

    expect(screen.getByText("No park selected")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Open & Mark Attendance Roster/ })).toBeNull();
  });

  it("shows an explicit no-session state instead of a fabricated 0% for a group without progress", () => {
    mocks.useQuery.mockReturnValue({
      data: { park: DASHBOARD.park, groupBreakdown: [{ id: "g3", name: "Group Three" }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    const { container } = render(<MobileParkWorkspace parkNav={PARK_NAV} onBack={vi.fn()} onOpenAttendance={vi.fn()} />);

    expect(screen.getByText("No session")).toBeDefined();
    expect(container.textContent).not.toContain("0%");
    expect(container.textContent).not.toContain("0 Shabab");
  });
});
