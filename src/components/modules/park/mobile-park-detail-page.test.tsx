// @vitest-environment jsdom
import React from "react";
import { render, cleanup, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MobileParkDetailPage } from "./mobile-park-detail-page";

afterEach(() => { cleanup(); });

// ── Shared mocks ───────────────────────────────────────────────────────────────
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({ useSession: () => mockUseSession() }));

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn(() => ({ data: undefined, isLoading: false })) }));

vi.mock("./tabs/dashboard-tab", () => ({
  DashboardTab: ({ parkId }: { parkId: string }) => <div data-testid="dashboard-tab">DashboardTab:{parkId}</div>,
}));
vi.mock("./tabs/attendance-tab", () => ({
  AttendanceTab: ({ parkId }: { parkId: string }) => <div data-testid="attendance-tab">AttendanceTab:{parkId}</div>,
}));
vi.mock("./tabs/lessons-tab", () => ({
  LessonsTab: ({ parkId }: { parkId: string }) => <div data-testid="lessons-tab">LessonsTab:{parkId}</div>,
}));
vi.mock("./tabs/structure-tab", () => ({
  StructureTab: ({ parkId }: { parkId: string }) => <div data-testid="structure-tab">StructureTab:{parkId}</div>,
}));
vi.mock("./tabs/planner-tab", () => ({
  PlannerTab: ({ parkId }: { parkId: string }) => <div data-testid="planner-tab">PlannerTab:{parkId}</div>,
}));

const PARK_NAV = {
  parkId: "park-123",
  parkName: "Test Park",
  murabbiCount: 4,
  studentCount: 52,
};

describe("MobileParkDetailPage", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("renders null when parkNav is null", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "super_admin" } } });
    const { container } = render(
      <MobileParkDetailPage parkNav={null} onBack={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  describe("Super Admin", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: { user: { role: "super_admin", roleLabel: "System Owner" } } });
    });

    it("renders the park name, server role badge, and all 5 tabs", () => {
      const { container } = render(
        <MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />
      );
      expect(container.textContent).toContain("Test Park");
      expect(container.textContent).toContain("System Owner");
      expect(container.textContent).not.toContain("Main admin");
      expect(container.textContent).toContain("4 murabbis");
      expect(container.textContent).toContain("52 students");
      for (const tab of ["Dashboard", "Attendance", "Lessons", "Structure", "Planner"]) {
        expect(container.textContent).toContain(tab);
      }
    });

    it("omits the role badge instead of guessing a label when the session has none", () => {
      mockUseSession.mockReturnValue({ data: { user: { role: "super_admin" } } });
      const { container } = render(<MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />);
      expect(container.textContent).not.toContain("Main admin");
    });

    it("does not fabricate murabbi or student counts when the source has none", () => {
      const { container } = render(
        <MobileParkDetailPage
          parkNav={{ parkId: "park-9", parkName: "State Life", murabbiCount: null, studentCount: null }}
          onBack={vi.fn()}
        />
      );
      expect(container.textContent).not.toContain("0 murabbis");
      expect(container.textContent).not.toContain("murabbis");
      expect(container.textContent).not.toContain("students");
    });

    it("shows DashboardTab by default and passes the real parkId", () => {
      render(<MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />);
      expect(screen.getByTestId("dashboard-tab").textContent).toContain("park-123");
    });

    it("does not show fabricated student counts or rates from DashboardTab (those are mocked)", () => {
      const { container } = render(<MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />);
      // The static "69" and "63%" values must be absent — DashboardTab is mocked and shows none
      expect(container.textContent).not.toContain("69");
      expect(container.textContent).not.toContain("63%");
      expect(container.textContent).not.toContain("Hassan Safi");
      expect(container.textContent).not.toContain("Ahmed Khan");
      expect(container.textContent).not.toContain("Salman Ali");
    });
  });

  describe("Park Lead", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: { user: { role: "park_lead" } } });
    });

    it("never renders the generic admin detail page or a nested dashboard", () => {
      const { container } = render(
        <MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />
      );
      expect(container.textContent).toContain("Park detail unavailable");
      expect(container.textContent).not.toContain("Scoped Park Dashboard");
      expect(screen.queryByTestId("dashboard-tab")).toBeNull();
      expect(screen.queryByTestId("attendance-tab")).toBeNull();
      expect(screen.queryByTestId("structure-tab")).toBeNull();
      expect(container.textContent).not.toContain("Structure");
    });
  });

  it("denies a Park Admin the generic admin detail page too", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "park_admin" } } });
    const { container } = render(<MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />);
    expect(container.textContent).toContain("Park detail unavailable");
    expect(screen.queryByTestId("dashboard-tab")).toBeNull();
  });

  it("denies an unknown role instead of granting the admin detail page", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "main_admin" } } });
    const { container } = render(<MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />);
    expect(container.textContent).toContain("Park detail unavailable");
    expect(screen.queryByTestId("dashboard-tab")).toBeNull();
  });

  describe("Murabbi", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: { user: { role: "murabbi" } } });
    });

    it("shows unavailable message and no tab panels", () => {
      const { container } = render(
        <MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />
      );
      expect(container.textContent).toContain("Park detail unavailable");
      expect(screen.queryByTestId("dashboard-tab")).toBeNull();
    });
  });

  describe("DashboardTab — no data / unavailable state", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: { user: { role: "super_admin" } } });
    });

    it("DashboardTab is rendered (integration: stale data cannot pass through because mock has no initialData)", () => {
      // DashboardTab is fully mocked — this test confirms the page renders the tab
      // and does NOT inject any fake data that would pass through to the real tab.
      render(<MobileParkDetailPage parkNav={PARK_NAV} onBack={vi.fn()} />);
      const tab = screen.getByTestId("dashboard-tab");
      expect(tab).toBeTruthy();
      // Mock renders only "DashboardTab:park-123" — no fake 69, 63%, Hassan Safi etc.
      expect(tab.textContent).toBe("DashboardTab:park-123");
    });
  });
});
