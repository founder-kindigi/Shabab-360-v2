// @vitest-environment jsdom
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DashboardTab } from "./dashboard-tab";

afterEach(() => { cleanup(); });

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

describe("DashboardTab", () => {
  it("shows loading skeleton while query is in flight", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<DashboardTab parkId="p1" onGoToEvaluation={vi.fn()} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(container.textContent).not.toContain("69");
    expect(container.textContent).not.toContain("63%");
    expect(container.textContent).not.toContain("Hassan Safi");
  });

  it("shows truthful unavailable state when evalData is null", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });
    const { container } = render(<DashboardTab parkId="p1" onGoToEvaluation={vi.fn()} />);
    expect(container.textContent).toContain("Evaluation data unavailable");
    expect(container.textContent).not.toContain("69");
    expect(container.textContent).not.toContain("63%");
    expect(container.textContent).not.toContain("Hassan Safi");
    expect(container.textContent).not.toContain("Bilal Tariq");
    expect(container.textContent).not.toContain("Usman Ghani");
  });

  it("renders real data from API without any hardcoded fallback values", () => {
    mockUseQuery.mockReturnValue({
      data: {
        totalStudents: 42,
        completedCount: 10,
        presentToday: 35,
        allTimeRate: 81,
        murabbis: [{ name: "Real Murabbi", pending: 5, total: 10 }],
      },
      isLoading: false,
    });
    const { container } = render(<DashboardTab parkId="p1" onGoToEvaluation={vi.fn()} />);
    expect(container.textContent).toContain("42");
    expect(container.textContent).toContain("35");
    expect(container.textContent).toContain("81%");
    expect(container.textContent).toContain("Real Murabbi");
    // Fake values must be absent
    expect(container.textContent).not.toContain("69");
    expect(container.textContent).not.toContain("63%");
    expect(container.textContent).not.toContain("Hassan Safi");
  });

  it("shows dash for allTimeRate when API returns null for it", () => {
    mockUseQuery.mockReturnValue({
      data: { totalStudents: 10, completedCount: 0, presentToday: 0, allTimeRate: null, murabbis: [] },
      isLoading: false,
    });
    const { container } = render(<DashboardTab parkId="p1" onGoToEvaluation={vi.fn()} />);
    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toContain("63%");
  });
});
