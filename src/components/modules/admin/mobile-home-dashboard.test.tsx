// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileHomeDashboard } from "./mobile-home-dashboard";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession: mocks.useSession }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: "light" }),
}));

beforeAll(() => {
  // AttendanceChart measures its container with ResizeObserver, which jsdom lacks.
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const DATA = {
  totalParks: 2,
  totalStudents: 20,
  from: "2026-05-23",
  to: "2026-09-13",
  periodStart: "2026-05-23",
  periodEnd: "2026-09-13",
  hasCompletedSession: true,
  multiBatch: false,
  batch: { id: "batch-4", name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" },
  batches: [{ id: "batch-4", name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" }],
  parks: [
    {
      id: "p1", name: "Park One", attended: 14, total: 20, attendancePercentage: 70,
      latestSession: { date: "2026-09-13", attended: 6, total: 8, rate: 75 },
    },
    {
      id: "p2", name: "Park Two", attended: 4, total: 10, attendancePercentage: 40,
      latestSession: null,
    },
  ],
  byMurabbi: [
    {
      id: "m1", groupId: "g1", name: "Murabbi One", attended: 9, total: 20, rate: 45,
      latestSession: { date: "2026-09-13", attended: 5, total: 8, rate: 63 },
    },
  ],
  attendance: { present: 14, late: 4, absent: 2, excused: 0, unmarked: 10, total: 30, attended: 18, rate: 60 },
  daily: [
    { date: "2026-06-01", present: 5, late: 1, absent: 2, excused: 0, unmarked: 0, total: 8, attended: 6, rate: 75 },
    { date: "2026-09-13", present: 6, late: 0, absent: 2, excused: 0, unmarked: 0, total: 8, attended: 6, rate: 75 },
  ],
};

const EMPTY_PERIOD = {
  ...DATA,
  periodEnd: null,
  hasCompletedSession: false,
  daily: [],
  attendance: { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0, total: 0, attended: 0, rate: null },
  parks: DATA.parks.map((park) => ({ ...park, latestSession: null })),
};

const MULTI_BATCH = {
  ...DATA,
  multiBatch: true,
  batch: null,
  periodStart: null,
  periodEnd: null,
  daily: [],
  hasCompletedSession: true,
  batches: [
    { id: "batch-a", name: "Batch Alpha", startDate: "2025-01-06", endDate: "2025-12-31" },
    { id: "batch-b", name: "Batch Beta", startDate: "2026-05-23", endDate: "2027-01-31" },
  ],
};

let queryResult: any;
const queries: any[] = [];

function useQueryMock(options: any) {
  queries.push(options);
  return queryResult;
}

function renderDashboard() {
  return render(<MobileHomeDashboard />);
}

describe("MobileHomeDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.length = 0;
    queryResult = { data: DATA, isLoading: false, error: null };
    mocks.useSession.mockReturnValue({ data: { user: { id: "hq-1", role: "super_admin" } } });
    mocks.useQuery.mockImplementation(useQueryMock);
  });

  afterEach(() => cleanup());

  it("shows each park's latest real class session for Today, not the calendar day", () => {
    renderDashboard();

    expect(screen.getByRole("button", { name: /Batch 4/ })).toBeDefined();
    expect(screen.getByText("Latest class attendance · 13 Sep 2026")).toBeDefined();
    expect(screen.getByText("Park One")).toBeDefined();
    // Eligible-opportunity wording, not an ambiguous "6/8 attended".
    expect(screen.getByText("13 Sep 2026 · 6 attended out of 8 eligible marks")).toBeDefined();
    expect(screen.getByText("75%")).toBeDefined();
    expect(screen.getByText("Park Two")).toBeDefined();
    expect(screen.getByText("No class session recorded")).toBeDefined();
  });

  it("shows an explicit no-session state when no park has a recorded session", () => {
    queryResult = { data: { ...EMPTY_PERIOD, hasCompletedSession: true }, isLoading: false, error: null };
    renderDashboard();

    expect(screen.getByText("Latest class attendance")).toBeDefined();
    expect(screen.getByText("No class session was recorded in this period.")).toBeDefined();
  });

  it("labels the Trend period from the returned Batch start to the latest session", () => {
    renderDashboard();

    fireEvent.click(screen.getByText("Trend"));

    expect(screen.getByText("Batch attendance · 23 May 2026 to 13 Sep 2026")).toBeDefined();
  });

  it("renders a real graph and clarified period summary for Trend", () => {
    renderDashboard();

    fireEvent.click(screen.getByText("Trend"));

    expect(screen.getByRole("img", { name: "Attendance by day, 23 May 2026 to 13 Sep 2026" })).toBeDefined();
    // Axis labels come from the returned dates only.
    expect(screen.getByText("01 Jun")).toBeDefined();
    expect(screen.getByText("13 Sep")).toBeDefined();
    expect(screen.getByText(
      "Only days with a recorded class session are plotted (2 session days between 23 May 2026 to 13 Sep 2026)."
    )).toBeDefined();
    expect(screen.getByText("Dates: 23 May 2026 to 13 Sep 2026")).toBeDefined();
    expect(screen.getByText("Overall attendance: 18 attended out of 30 eligible marks (60%)")).toBeDefined();
    expect(screen.getByText("Marked: 20/30 (67%)")).toBeDefined();
    expect(screen.getByText("14 attended out of 20 eligible marks")).toBeDefined();
    // Each park keeps its own real denominator.
    expect(screen.getByText("4 attended out of 10 eligible marks")).toBeDefined();
  });

  it("states when only part of the period has recorded sessions", () => {
    queryResult = { data: { ...DATA, daily: [DATA.daily[1]] }, isLoading: false, error: null };
    renderDashboard();

    fireEvent.click(screen.getByText("Trend"));

    expect(screen.getByText(
      "Only days with a recorded class session are plotted (1 session day between 23 May 2026 to 13 Sep 2026)."
    )).toBeDefined();
  });

  it("shows a truthful empty state with no graph or rate when no session is completed", () => {
    queryResult = { data: EMPTY_PERIOD, isLoading: false, error: null };
    renderDashboard();

    fireEvent.click(screen.getByText("Trend"));

    expect(screen.getByText("No completed class session with attendance data yet.")).toBeDefined();
    expect(screen.getByText("The trend appears once a class session has recorded attendance.")).toBeDefined();
    expect(screen.queryByRole("img", { name: /Attendance by day/ })).toBeNull();
    expect(screen.queryByText(/Overall attendance:/)).toBeNull();
    expect(screen.queryByText(/Marked:/)).toBeNull();
  });

  it("shows materially different data for Today and Trend", () => {
    renderDashboard();
    expect(screen.getByText("13 Sep 2026 · 6 attended out of 8 eligible marks")).toBeDefined();
    expect(screen.queryByText("14 attended out of 20 eligible marks")).toBeNull();

    fireEvent.click(screen.getByText("Trend"));
    expect(screen.getByText("14 attended out of 20 eligible marks")).toBeDefined();
    expect(screen.queryByText("13 Sep 2026 · 6 attended out of 8 eligible marks")).toBeNull();
  });

  it("switches to real Murabbi latest sessions and period rows", () => {
    renderDashboard();

    fireEvent.click(screen.getByText("Murabbis"));
    expect(screen.getByText("Latest class attendance · 13 Sep 2026")).toBeDefined();
    expect(screen.getByText("Murabbi One")).toBeDefined();
    expect(screen.getByText("13 Sep 2026 · 5 attended out of 8 eligible marks")).toBeDefined();
    expect(screen.getByText("63%")).toBeDefined();
    expect(screen.queryByText("Park One")).toBeNull();

    fireEvent.click(screen.getByText("Trend"));
    expect(screen.getByText("9 attended out of 20 eligible marks")).toBeDefined();
    expect(screen.getByText("45%")).toBeDefined();
  });

  it("shows the loading state", () => {
    queryResult = { data: undefined, isLoading: true, error: null };
    renderDashboard();

    expect(screen.getByText("Loading analytics...")).toBeDefined();
    expect(screen.queryByText("Park One")).toBeNull();
  });

  it("shows the error state without fabricated rows", () => {
    queryResult = { data: undefined, isLoading: false, error: new Error("nope") };
    renderDashboard();

    expect(screen.getByText("Failed to load analytics")).toBeDefined();
    expect(screen.queryByText("Park One")).toBeNull();
  });

  it("shows a neutral multi-Batch state with no false single-Batch period or chart", () => {
    queryResult = { data: MULTI_BATCH, isLoading: false, error: null };
    renderDashboard();

    expect(screen.getByRole("button", { name: /All active batches/ })).toBeDefined();

    fireEvent.click(screen.getByText("Trend"));

    expect(screen.getAllByText("All active batches").length).toBeGreaterThan(0);
    expect(screen.getByText("2 active batches are in scope, so no single-batch period or trend chart is shown.")).toBeDefined();
    expect(screen.queryByRole("img", { name: /Attendance by day/ })).toBeNull();
    expect(screen.queryByText(/Dates:/)).toBeNull();
    expect(screen.queryByText(/Batch attendance ·/)).toBeNull();
    expect(screen.queryByText(/Batch Alpha/)).toBeNull();
    // Aggregate figures still cover every scoped batch, without a per-batch claim.
    expect(screen.getByText("Overall attendance: 18 attended out of 30 eligible marks (60%)")).toBeDefined();
    expect(screen.getByText("14 attended out of 20 eligible marks")).toBeDefined();
  });

  it("lets the server derive the period instead of requesting a rolling window", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(DATA), { status: 200 }));
    (global as any).fetch = fetchMock;
    renderDashboard();

    expect(queries).toHaveLength(1);
    const query = queries[0];
    expect(query.queryKey).toEqual(["admin-home-analytics"]);

    await query.queryFn();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/home-analytics");
  });
});
