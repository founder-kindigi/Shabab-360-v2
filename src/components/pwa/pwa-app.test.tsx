// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  has: vi.fn(() => true),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => mocks.useSession(),
  signOut: vi.fn(),
}));
vi.mock("@/hooks/use-effective-capabilities", () => ({
  useEffectiveCapabilities: () => ({ has: mocks.has }),
}));
vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: "light" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/stores/useAppStore", () => ({
  useAppStore: () => ({ navigateTo: vi.fn(), selectedDate: "2026-09-17", setSelectedDate: vi.fn() }),
}));
vi.mock("@/hooks/use-attendance-sync", () => ({
  useAttendanceSync: () => ({
    markAttendance: vi.fn(),
    pendingCount: 0,
    failedCount: 0,
    isSyncing: false,
    isOnline: true,
    lastSyncError: null,
    syncNow: vi.fn(),
    retryFailed: vi.fn(),
    discardFailedItem: vi.fn(),
    getFailedItems: vi.fn(),
    refreshCounts: vi.fn(),
  }),
}));
vi.mock("@/components/modules/park/offline-queue-panel", () => ({
  OfflineQueuePanel: () => <div data-testid="offline-queue-panel" />,
}));

import { PwaApp } from "./pwa-app";

const DASHBOARD = {
  park: { id: "park-1", name: "Gulberg Park", cityName: "Lahore" },
  batch: { id: "batch-4", name: "Batch 4" },
  recentSummary: { totalParticipants: 12, activeGroups: 2 },
  todayAttendance: { rate: 50 },
  groupBreakdown: [
    { id: "g1", name: "Group One", totalParticipants: 6, latestProgress: 75, latestSessionDate: "2026-09-13" },
    { id: "g2", name: "Group Two", totalParticipants: 6, latestProgress: 40 },
  ],
  events: [{ id: "ev-1", title: "Sunday Session", isClosed: false, isLive: true }],
};

const PREPARE = {
  date: "2026-09-17",
  parkId: "park-1",
  events: [{
    id: "ev-1", groupId: "g1", groupName: "Group One", title: "Sunday Session",
    eventDate: "2026-09-13T00:00:00.000Z", isClosed: false, resetVersion: 0,
    participantCount: 6, markedCount: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0, progress: 0,
  }],
  preparation: { prepared: 0, eligibleGroups: 1, isOffDate: false },
};

const ROSTER = {
  permissions: { canCorrect: false },
  event: {
    id: "ev-1", title: "Sunday Session", groupId: "g1", groupName: "Group One",
    batchName: "Batch 4", parkName: "Gulberg Park", eventDate: "2026-09-13T00:00:00.000Z",
    isClosed: false, resetVersion: 0, closedAt: null, closedByName: null,
  },
  roster: [{
    participantId: "p1", participantName: "Alpha Student", phone: null, status: null,
    recordId: null, markedAt: null, markedByName: null,
  }],
  summary: { total: 1, present: 0, absent: 0, late: 0, excused: 0, unmarked: 1 },
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}

let fetchMock: ReturnType<typeof vi.fn>;

function prepareCalls() {
  return fetchMock.mock.calls.filter((call) => String(call[0]).startsWith("/api/park/attendance/prepare"));
}

function prepareBody() {
  const call = prepareCalls().at(-1);
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : null;
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PwaApp />
    </QueryClientProvider>
  );
}

async function openWorkspaceFromParks() {
  renderApp();
  // Home stays the Park Lead dashboard.
  await screen.findByText("Gulberg Park");

  fireEvent.click(screen.getByRole("button", { name: "Parks" }));
  await screen.findByText("Your assigned park");

  fireEvent.click(await screen.findByRole("button", { name: /Gulberg Park/ }));
  await screen.findByText("Park workspace");
}

/** The real attendance screen lists its returned sessions; pick one to load the roster. */
async function selectReturnedSession() {
  fireEvent.click(await screen.findByRole("button", { name: "Select Group One" }));
  await screen.findByText("Alpha Student");
}

describe("PwaApp Park Lead navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: {
        user: { id: "u-park-1", role: "park_lead", name: "Park Lead", assignedParkId: "park-1", tokenVersion: 1 },
      },
      status: "authenticated",
    });

    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/park/attendance/prepare")) return Promise.resolve(json(PREPARE));
      if (url.startsWith("/api/park/attendance/parks")) return Promise.resolve(json([{ id: "park-1", name: "Gulberg Park" }]));
      if (url.startsWith("/api/park/attendance/ev-1")) return Promise.resolve(json(ROSTER));
      if (url.startsWith("/api/park/dashboard")) return Promise.resolve(json(DASHBOARD));
      if (url.startsWith("/api/park/staff-attendance")) return Promise.resolve(new Response("{}", { status: 403 }));
      return Promise.resolve(json({}));
    });
    (global as any).fetch = fetchMock;
  });

  afterEach(() => cleanup());

  it("routes Parks → assigned park → workspace → All Groups → attendance with the selected park id", async () => {
    await openWorkspaceFromParks();

    expect(screen.getByText("Group One")).toBeDefined();
    expect(screen.getByRole("button", { name: /All Groups/ })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /All Groups/ }));

    // The whole attendance flow runs with the park selected in PwaApp state.
    await selectReturnedSession();
    expect(prepareCalls().length).toBeGreaterThan(0);
    expect(prepareBody().parkId).toBe("park-1");
  });

  it("routes a group card to the same scoped attendance screen", async () => {
    await openWorkspaceFromParks();

    fireEvent.click(screen.getByRole("button", { name: /Open attendance for Group Two/ }));

    await selectReturnedSession();
    expect(prepareBody().parkId).toBe("park-1");
  });

  it("returns from attendance to the workspace and from the workspace to Parks", async () => {
    await openWorkspaceFromParks();

    fireEvent.click(screen.getByRole("button", { name: /All Groups/ }));
    await selectReturnedSession();

    fireEvent.click(screen.getByLabelText("Go back"));
    await screen.findByText("Park workspace");
    expect(screen.getByText("Gulberg Park")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Back to parks"));
    await screen.findByText("Your assigned park");
    expect(screen.queryByText("Park workspace")).toBeNull();
  });

  it("never shows the generic admin park detail page to a Park Lead", async () => {
    await openWorkspaceFromParks();

    expect(screen.queryByText("Park detail unavailable")).toBeNull();
    expect(screen.queryByText("Main admin")).toBeNull();
    // The legacy 5-tab strip is not rendered.
    expect(screen.queryByRole("button", { name: "Dashboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Attendance" })).toBeNull();
  });

  it("keeps Structure, Lessons and Planner as truthful unavailable states", async () => {
    await openWorkspaceFromParks();

    fireEvent.click(screen.getByLabelText("Structure (not available yet)"));
    await screen.findByText("Structure is not available yet.");
    expect(screen.getByText("Park workspace")).toBeDefined();
    expect(screen.queryByText("Your assigned park")).toBeNull();

    fireEvent.click(screen.getByLabelText("Lessons (not available yet)"));
    await screen.findByText("Lessons is not available yet.");

    fireEvent.click(screen.getByLabelText("Planner (not available yet)"));
    await screen.findByText("Planner is not available yet.");
    expect(screen.queryByText("Park detail unavailable")).toBeNull();
  });

  it("keeps the Parks tab a scoped selector and Home the dashboard", async () => {
    renderApp();

    await screen.findByText("Gulberg Park");
    fireEvent.click(screen.getByRole("button", { name: "Parks" }));
    await screen.findByText("Your assigned park");

    // The selector shows only the assigned park card, not a dashboard.
    expect(screen.getByRole("button", { name: /Gulberg Park/ })).toBeDefined();
    expect(screen.queryByText("Open & Mark Attendance Roster")).toBeNull();
    await waitFor(() => expect(screen.queryByText("Park workspace")).toBeNull());
  });
});

const CITY_HEAD_DASHBOARD = {
  city: { id: "city-lhr", name: "Lahore", code: "LHR" },
  metrics: { parkCount: 6, batchCount: 1, groupCount: 18, totalParticipants: 339, totalStaff: 24 },
  batches: [{ id: "batch-4", name: "Batch 4" }],
  attendance7Day: { present: 100, late: 10, absent: 20, excused: 5, attended: 110, marked: 135, eligible: 150, rate: 73 },
  parkBreakdown: [
    {
      id: "park-1", name: "Gulberg Park", participants: 60, groups: 3, murabbiCount: 5,
      attendance: { present: 40, late: 2, absent: 8, excused: 1, attended: 42, marked: 51, eligible: 60, rate: 70 },
    },
  ],
};

describe("PwaApp City Head navigation", () => {
  function cityHeadFetch() {
    return vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/city-head/dashboard")) return Promise.resolve(json(CITY_HEAD_DASHBOARD));
      return Promise.resolve(json({}));
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: {
        user: { id: "u-city-1", role: "city_head", name: "Arslan Akram", assignedCityId: "city-lhr", tokenVersion: 1 },
      },
      status: "authenticated",
    });
  });

  afterEach(() => cleanup());

  it("renders the City Head dashboard from its own scoped endpoint", async () => {
    const fetchMock = cityHeadFetch();
    (global as any).fetch = fetchMock;

    renderApp();

    expect(await screen.findByText("Lahore")).toBeDefined();
    expect(screen.getByText("339")).toBeDefined();
    expect(screen.getByText("Batch 4")).toBeDefined();
    expect(screen.getByText("Gulberg Park")).toBeDefined();
    expect(screen.getByRole("button", { name: "Info" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Forms" })).toBeNull();

    // Home is the City Head portal, never the HQ dashboard, and never an
    // unscoped admin park list.
    expect(screen.queryByText("Analytics")).toBeNull();
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("/api/city-head/dashboard");
    expect(urls.some((url) => url.startsWith("/api/admin/parks"))).toBe(false);
    expect(urls.some((url) => url.startsWith("/api/admin/home-analytics"))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(await screen.findByText("Registration forms")).toBeDefined();
  });

  it("keeps the HQ dashboard for Program Head and System Owner", async () => {
    for (const role of ["program_admin", "super_admin"]) {
      vi.clearAllMocks();
      mocks.useSession.mockReturnValue({
        data: { user: { id: `u-${role}`, role, name: "HQ User", tokenVersion: 1 } },
        status: "authenticated",
      });
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/admin/home-analytics")) {
          return Promise.resolve(json({ parks: [], byMurabbi: [], daily: [], batches: [], batch: null, multiBatch: false }));
        }
        return Promise.resolve(json({}));
      });
      (global as any).fetch = fetchMock;

      const view = renderApp();
      expect(await screen.findByText("Analytics")).toBeDefined();
      expect(screen.queryByText("Lahore")).toBeNull();

      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.startsWith("/api/city-head/dashboard"))).toBe(false);
      view.unmount();
    }
  });
});

const MURABBI_DASHBOARD = {
  park: { id: "park-1", name: "Gulshan Ravi Park", cityName: "Lahore" },
  batch: { id: "batch-4", name: "Batch 4" },
  recentSummary: { totalParticipants: 8, activeGroups: 1 },
  todayAttendance: { present: 0, rate: 0 },
  groupBreakdown: [{ id: "g1", name: "Group 2", totalParticipants: 8, latestProgress: 60 }],
  events: [],
};

const MURABBI_PREPARE_WITH_SESSION = {
  date: "2026-09-17",
  parkId: "park-1",
  events: [{
    id: "ev-1", groupId: "g1", groupName: "Group 2", title: "Sunday Session",
    eventDate: "2026-09-13T00:00:00.000Z", isClosed: false, resetVersion: 0,
    participantCount: 8, markedCount: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0, progress: 0,
  }],
  preparation: { prepared: 0, eligibleGroups: 1, isOffDate: false },
};

const MURABBI_ROSTER = {
  permissions: { canCorrect: false },
  event: {
    id: "ev-1", title: "Sunday Session", groupId: "g1", groupName: "Group 2",
    batchName: "Batch 4", parkName: "Gulshan Ravi Park", eventDate: "2026-09-13T00:00:00.000Z",
    isClosed: false, resetVersion: 0, closedAt: null, closedByName: null,
  },
  roster: [{
    participantId: "p1", participantName: "Alpha Student", phone: null, status: null,
    recordId: null, markedAt: null, markedByName: null,
  }],
  summary: { total: 1, present: 0, absent: 0, late: 0, excused: 0, unmarked: 1 },
};

describe("PwaApp Murabbi navigation", () => {
  function murabbiFetch(preparePayload: unknown, dashboardPayload: unknown = MURABBI_DASHBOARD) {
    return vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/park/attendance/prepare")) return Promise.resolve(json(preparePayload));
      if (url.startsWith("/api/park/attendance/parks")) return Promise.resolve(json([{ id: "park-1", name: "Gulshan Ravi Park" }]));
      if (url.startsWith("/api/park/attendance/ev-1")) return Promise.resolve(json(MURABBI_ROSTER));
      if (url.startsWith("/api/park/dashboard")) return Promise.resolve(json(dashboardPayload));
      if (url.startsWith("/api/park/staff-attendance")) return Promise.resolve(new Response("{}", { status: 403 }));
      return Promise.resolve(json({}));
    });
  }

  function prepareBodies(fetchMock: ReturnType<typeof vi.fn>) {
    return fetchMock.mock.calls
      .filter((call) => String(call[0]).startsWith("/api/park/attendance/prepare"))
      .map((call) => JSON.parse(String((call[1] as RequestInit).body)));
  }

  function usedAdminParks(fetchMock: ReturnType<typeof vi.fn>) {
    return fetchMock.mock.calls.some((call) => String(call[0]).startsWith("/api/admin/parks"));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: {
        user: { id: "u-murabbi-1", role: "murabbi", name: "Abdullah", assignedParkId: "park-1", assignedGroupId: "g1", tokenVersion: 1 },
      },
      status: "authenticated",
    });
  });

  it("opens the scoped attendance workspace even when today has no class", async () => {
    const fetchMock = murabbiFetch({ date: "2026-09-17", parkId: "park-1", events: [], preparation: { prepared: 0, eligibleGroups: 0, isOffDate: false } });
    (global as any).fetch = fetchMock;

    renderApp();

    await screen.findByText("No class scheduled today");
    fireEvent.click(screen.getByRole("button", { name: /Open Group Attendance/ }));

    await screen.findByText("No scheduled classes on this date");
    expect(screen.getByLabelText("Choose attendance date")).toBeDefined();
    const bodies = prepareBodies(fetchMock);
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.at(-1).parkId).toBe("park-1");
    expect(usedAdminParks(fetchMock)).toBe(false);
  });

  it("opens the Murabbi's own group session and marks only that group", async () => {
    const fetchMock = murabbiFetch(MURABBI_PREPARE_WITH_SESSION, {
      ...MURABBI_DASHBOARD,
      events: [{ id: "ev-1", isClosed: false, title: "Sunday Session" }],
    });
    (global as any).fetch = fetchMock;

    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: /Mark Group Attendance/ }));

    // The Murabbi's assigned group auto-selects, so the real roster loads.
    await screen.findByText("Alpha Student");
    expect(screen.getByRole("button", { name: "Select Group 2" })).toBeDefined();
    expect(screen.queryByText("Group 1")).toBeNull();
    expect(prepareBodies(fetchMock).at(-1).parkId).toBe("park-1");
    expect(usedAdminParks(fetchMock)).toBe(false);
  });

  it("does not offer attendance to an unassigned Murabbi", async () => {
    mocks.useSession.mockReturnValue({
      data: { user: { id: "u-murabbi-2", role: "murabbi", name: "Unassigned", assignedParkId: "park-1", assignedGroupId: null, tokenVersion: 1 } },
      status: "authenticated",
    });
    const fetchMock = murabbiFetch(
      { date: "2026-09-17", parkId: "park-1", events: [], preparation: { prepared: 0, eligibleGroups: 0, isOffDate: false } },
      { ...MURABBI_DASHBOARD, groupBreakdown: [], events: [] }
    );
    (global as any).fetch = fetchMock;

    renderApp();

    await screen.findByText("No group assigned yet");
    expect(screen.queryByRole("button", { name: /Group Attendance/ })).toBeNull();
    expect(prepareBodies(fetchMock)).toHaveLength(0);
  });
});
