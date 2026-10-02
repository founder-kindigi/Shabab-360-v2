// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { MobileGuardianDashboard } from "./mobile-guardian-dashboard";
import { useQuery } from "@tanstack/react-query";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "guardian", id: "1" } }, status: "authenticated" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/guardian/dashboard",
}));

const mockedUseQuery = vi.mocked(useQuery);

describe("MobileGuardianDashboard", () => {
  afterEach(() => {
    cleanup();
    mockedUseQuery.mockClear();
  });
  
  it("renders unassigned state safely without crashing", () => {
    mockedUseQuery.mockImplementation((args: any) => {
      if (args.queryKey?.[0] === "guardian-dash-real") return { data: { children: [{ id: "1", name: "Test Child", parkName: null, groupName: null, rate: 100 }] }, isLoading: false } as any;
      return { data: undefined, isLoading: false } as any;
    });
    render(<MobileGuardianDashboard />);
    const unassignedElements = screen.getAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBeGreaterThan(0);
  });
  
  it("renders assigned state without Unassigned text", () => {
    mockedUseQuery.mockImplementation((args: any) => {
      if (args.queryKey?.[0] === "guardian-dash-real") return { data: { children: [{ id: "1", name: "Test Child", parkName: "Test Park", groupName: "Group assigned", rate: 100 }] }, isLoading: false } as any;
      return { data: undefined, isLoading: false } as any;
    });
    render(<MobileGuardianDashboard />);
    const assignedElements = screen.getAllByText(/Group assigned/i);
    expect(assignedElements.length).toBeGreaterThan(0);
    const unassignedElements = screen.queryAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBe(0);
  });
});
