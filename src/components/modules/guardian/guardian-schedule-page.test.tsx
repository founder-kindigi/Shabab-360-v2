// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { GuardianSchedulePage } from "./guardian-schedule-page";
import { useQuery } from "@tanstack/react-query";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "guardian" } }, status: "authenticated" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/guardian/schedule",
}));

const mockedUseQuery = vi.mocked(useQuery);

describe("GuardianSchedulePage", () => {
  afterEach(() => {
    cleanup();
    mockedUseQuery.mockClear();
  });

  it("renders unassigned state safely without crashing", () => {
    mockedUseQuery.mockReturnValue({ 
      data: { 
        weekStart: "2024-01-01", 
        weekEnd: "2024-01-07", 
        weekLabel: "Jan 1 - Jan 7", 
        children: [{ 
          participant: { id: "1", name: "Test Child" }, 
          group: null, 
          events: [] 
        }] 
      }, 
      isLoading: false 
    } as any);
    render(<GuardianSchedulePage />);
    const unassignedElements = screen.getAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBeGreaterThan(0);
  });
  
  it("renders assigned state without Unassigned text", () => {
    mockedUseQuery.mockReturnValue({ 
      data: { 
        weekStart: "2024-01-01", 
        weekEnd: "2024-01-07", 
        weekLabel: "Jan 1 - Jan 7", 
        children: [{ 
          participant: { id: "1", name: "Test Child" }, 
          group: { name: "Group assigned", parkName: "Test Park" }, 
          events: [] 
        }] 
      }, 
      isLoading: false 
    } as any);
    render(<GuardianSchedulePage />);
    const assignedElements = screen.getAllByText(/Group assigned/i);
    expect(assignedElements.length).toBeGreaterThan(0);
    const unassignedElements = screen.queryAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBe(0);
  });

  it("safely ignores unassigned children from the detailed events list", () => {
    mockedUseQuery.mockReturnValue({ 
      data: { 
        weekStart: "2024-01-01", 
        weekEnd: "2024-01-07", 
        weekLabel: "Jan 1 - Jan 7", 
        children: [{ 
          participant: { id: "1", name: "Unassigned Child with Event" }, 
          group: null, 
          events: [{ dayOfWeek: 0, title: "Orphan Event", timeStr: "10:00 AM", isClosed: false }] 
        }] 
      }, 
      isLoading: false 
    } as any);
    render(<GuardianSchedulePage />);
    
    // The child itself should render with Unassigned badge.
    const unassignedElements = screen.getAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBeGreaterThan(0);
    
    const orphanEvent = screen.queryByText(/Orphan Event/i);
    expect(orphanEvent).toBeNull();
  });
});
