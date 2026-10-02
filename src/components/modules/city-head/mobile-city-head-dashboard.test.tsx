// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => mocks.useSession(),
}));
vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: "light" }),
}));

import { MobileCityHeadDashboard } from "./mobile-city-head-dashboard";
import { ROLE_DEFAULT_CAPABILITIES } from "@/lib/auth/capabilities";
import { canOpenScreen } from "@/lib/auth/screen-access";

/** Exactly the shape GET /api/city-head/dashboard returns for the Lahore City Head. */
const LAHORE = {
  city: { id: "city-lhr", name: "Lahore", code: "LHR" },
  metrics: { parkCount: 2, batchCount: 1, groupCount: 18, totalParticipants: 339, totalStaff: 24 },
  batches: [{ id: "batch-4", name: "Batch 4" }],
  attendance7Day: { present: 100, late: 10, absent: 20, excused: 5, attended: 110, marked: 135, eligible: 150, rate: 73 },
  parkBreakdown: [
    {
      id: "park-1", name: "Gulberg Park", participants: 60, groups: 3, murabbiCount: 5,
      attendance: { present: 40, late: 2, absent: 8, excused: 1, attended: 42, marked: 51, eligible: 60, rate: 70 },
    },
    {
      id: "park-2", name: "Iqbal Park", participants: 30, groups: 2, murabbiCount: 3,
      attendance: { present: 20, late: 1, absent: 9, excused: 0, attended: 21, marked: 30, eligible: 30, rate: 70 },
    },
  ],
};

const NO_DATA = {
  ...LAHORE,
  metrics: { parkCount: 0, batchCount: 0, groupCount: 0, totalParticipants: 0, totalStaff: 0 },
  batches: [],
  attendance7Day: { present: 0, late: 0, absent: 0, excused: 0, attended: 0, marked: 0, eligible: 0, rate: null },
  parkBreakdown: [],
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

let fetchMock: ReturnType<typeof vi.fn>;

function renderDashboard(props: { onNavigate?: (screen: string) => void; onSelectPark?: (park: unknown) => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MobileCityHeadDashboard {...props} />
    </QueryClientProvider>
  );
}

describe("MobileCityHeadDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: { user: { id: "ch-1", role: "city_head", name: "Arslan Akram", assignedCityId: "city-lhr" } },
      status: "authenticated",
    });
    fetchMock = vi.fn(() => Promise.resolve(json(LAHORE)));
    (global as any).fetch = fetchMock;
  });

  afterEach(() => cleanup());

  it("renders the exact values the City Head API returned", async () => {
    renderDashboard();

    await screen.findByText("Lahore");
    expect(screen.getByText("LHR")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();               // parks KPI
    expect(screen.getByText("339")).toBeDefined();             // participants KPI
    expect(screen.getByText("73%")).toBeDefined();             // 7-day attendance KPI
    expect(screen.getByText("18 groups · 24 staff")).toBeDefined();
    expect(screen.getByText("Batch 4")).toBeDefined();         // the API batch name
    expect(screen.getByText("110 attended out of 150 eligible marks")).toBeDefined();

    expect(screen.getByText("Parks Performance Ranking (2)")).toBeDefined();
    expect(screen.getByText("Gulberg Park")).toBeDefined();
    expect(screen.getByText("5 Murabbis • 60 Shabab • 3 groups")).toBeDefined();
    expect(screen.getByText("3 Murabbis • 30 Shabab • 2 groups")).toBeDefined();
    expect(screen.getAllByText("70%")).toHaveLength(2);
  });

  it("requests only the server-scoped City Head dashboard", async () => {
    renderDashboard();
    await screen.findByText("Lahore");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/city-head/dashboard");
  });

  it("never renders the previously fabricated values for a different API response", async () => {
    fetchMock = vi.fn(() => Promise.resolve(json({
      city: { id: "city-mul", name: "Multan", code: "MUL" },
      metrics: { parkCount: 1, batchCount: 1, groupCount: 4, totalParticipants: 41, totalStaff: 6 },
      batches: [{ id: "batch-7", name: "Batch 7" }],
      attendance7Day: { present: 42, late: 2, absent: 30, excused: 6, attended: 44, marked: 80, eligible: 80, rate: 55 },
      parkBreakdown: [
        {
          id: "park-9", name: "Cantt Park", participants: 41, groups: 4, murabbiCount: 6,
          attendance: { present: 12, late: 2, absent: 6, excused: 1, attended: 14, marked: 21, eligible: 40, rate: 35 },
        },
      ],
    })));
    (global as any).fetch = fetchMock;

    renderDashboard();

    await screen.findByText("Multan");
    expect(screen.getByText("Batch 7")).toBeDefined();
    expect(screen.getByText("Cantt Park")).toBeDefined();
    expect(screen.getByText("6 Murabbis • 41 Shabab • 4 groups")).toBeDefined();
    expect(screen.getByText("55%")).toBeDefined();   // city 7-day KPI
    expect(screen.getByText("35%")).toBeDefined();   // that park's own rate

    // Nothing from the fabricated Lahore sample may leak into a real response.
    for (const fabricated of [
      "Lahore Chapter", "Model Town Park", "Gulberg Park", "Jilani Park (Race Course)",
      "Iqbal Park", "Bagh-e-Jinnah", "Batch 4", "12 Murabbis", "68 Shabab", "310", "72%",
    ]) {
      expect(screen.queryByText(fabricated)).toBeNull();
    }
    expect(screen.queryByText(/Model Town, Lahore/)).toBeNull();
  });

  it("shows a loading state while the dashboard request is in flight", () => {
    fetchMock = vi.fn(() => new Promise(() => {}));
    (global as any).fetch = fetchMock;

    renderDashboard();

    expect(screen.getByText("Loading city data...")).toBeDefined();
    expect(screen.queryByText("Lahore")).toBeNull();
  });

  it("shows an API error with Retry and recovers on retry", async () => {
    fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ error: "Internal server error" }, 500))
      .mockResolvedValue(json(LAHORE));
    (global as any).fetch = fetchMock;

    renderDashboard();

    await screen.findByText("City data could not be loaded.");
    expect(screen.getByText("Internal server error")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));

    await screen.findByText("Lahore");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a missing city assignment as a denial, not an empty dashboard", async () => {
    fetchMock = vi.fn(() => Promise.resolve(json({ error: "No city assigned" }, 403)));
    (global as any).fetch = fetchMock;

    renderDashboard();

    await screen.findByText("No city is assigned to your account.");
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
    expect(screen.queryByText("Parks Performance Ranking (0)")).toBeNull();
    expect(screen.queryByText("Lahore")).toBeNull();
  });

  it("reports no active batch and truthful zeroes when the city has no data", async () => {
    fetchMock = vi.fn(() => Promise.resolve(json(NO_DATA)));
    (global as any).fetch = fetchMock;

    renderDashboard();

    await screen.findByText("No active batch");
    expect(screen.getByText("No parks in this city yet")).toBeDefined();
    expect(screen.getByText("No completed attendance data in the last 7 days")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.getByText("0 groups · 0 staff")).toBeDefined();
    expect(screen.getByText("Parks Performance Ranking (0)")).toBeDefined();
  });

  it("shows a dash instead of a rate when the API has no eligible marks", async () => {
    fetchMock = vi.fn(() => Promise.resolve(json({
      ...LAHORE,
      attendance7Day: { present: 0, late: 0, absent: 0, excused: 0, attended: 0, marked: 0, eligible: 0, rate: null },
      parkBreakdown: [
        {
          id: "park-1", name: "Gulberg Park", participants: 60, groups: 3, murabbiCount: 5,
          attendance: { present: 0, late: 0, absent: 0, excused: 0, attended: 0, marked: 0, eligible: 0, rate: null },
        },
      ],
    })));
    (global as any).fetch = fetchMock;

    renderDashboard();

    await screen.findByText("No completed attendance data in the last 7 days");
    // The KPI and the park row both fall back to an em dash, never to 0%.
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("hands the API's own park counts to the park selection", async () => {
    const onSelectPark = vi.fn();
    renderDashboard({ onSelectPark });

    fireEvent.click(await screen.findByText("Iqbal Park"));

    expect(onSelectPark).toHaveBeenCalledWith({
      parkId: "park-2",
      parkName: "Iqbal Park",
      murabbiCount: 3,
      studentCount: 30,
    });
  });

  it("navigates only through the screen ids it is given", async () => {
    const onNavigate = vi.fn();
    renderDashboard({ onNavigate });

    await screen.findByText("Lahore");
    fireEvent.click(screen.getByText("Mashwara"));
    fireEvent.click(screen.getByText("Calling"));
    fireEvent.click(screen.getByText("Central Store"));
    fireEvent.click(screen.getByText("Admissions"));
    fireEvent.click(screen.getByText("View All →"));

    expect(onNavigate.mock.calls.map((call) => call[0])).toEqual([
      "mashwara", "calling", "inventory", "admissions", "parks",
    ]);
  });

  it("only offers City Command destinations the City Head role can actually open", () => {
    const cityHeadHas = (capability: string) =>
      (ROLE_DEFAULT_CAPABILITIES.city_head as readonly string[]).includes(capability);

    for (const destination of ["mashwara", "calling", "inventory", "admissions", "parks", "notifications"]) {
      expect(canOpenScreen(destination, "city_head", cityHeadHas)).toBe(true);
    }
    // A destination the role cannot open must never be presented.
    expect(canOpenScreen("audit-log", "city_head", cityHeadHas)).toBe(false);
    expect(canOpenScreen("security-access", "city_head", cityHeadHas)).toBe(false);
  });
});
