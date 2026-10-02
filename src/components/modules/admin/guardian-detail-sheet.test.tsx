// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { GuardianDetailSheet } from "./guardian-detail-sheet";
import { useQuery } from "@tanstack/react-query";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "super_admin", id: "1" } }, status: "authenticated" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/guardians",
}));

const mockedUseQuery = vi.mocked(useQuery);

describe("GuardianDetailSheet", () => {
  afterEach(() => {
    cleanup();
    mockedUseQuery.mockClear();
  });

  it("renders unassigned state safely without crashing", () => {
    mockedUseQuery.mockReturnValue({
      data: {
        guardian: { id: "g1", name: "Guardian", phone: "123", cnic: "123", address: "123", isActive: true, user: null, children: [{ participant: { id: "1", name: "Child", phone: null, gender: null, state: "active", joinedAt: "2024" }, relation: "Father", group: null }] },
        feeSummary: { totalChildren: 1, totalExpected: 0, totalPaid: 0, outstanding: 0, overdueFees: 0 },
        recentPayments: []
      }, isLoading: false
    } as any);
    render(<GuardianDetailSheet open={true} onOpenChange={vi.fn()} guardianId="guardian-1" guardianName="Test Guardian" />);
    const unassignedElements = screen.getAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBeGreaterThan(0);
  });

  it("renders assigned state without Unassigned text", () => {
    mockedUseQuery.mockReturnValue({
      data: {
        guardian: { id: "g1", name: "Guardian", phone: "123", cnic: "123", address: "123", isActive: true, user: null, children: [{ participant: { id: "1", name: "Child", phone: null, gender: null, state: "active", joinedAt: "2024" }, relation: "Father", group: { id: "g1", name: "Group assigned", cityId: "c1", programId: "p1", _count: { participants: 1 }, batch: { name: "Batch 1", park: { name: "Park 1" } } } }] },
        feeSummary: { totalChildren: 1, totalExpected: 0, totalPaid: 0, outstanding: 0, overdueFees: 0 },
        recentPayments: []
      }, isLoading: false
    } as any);
    render(<GuardianDetailSheet open={true} onOpenChange={vi.fn()} guardianId="guardian-1" guardianName="Test Guardian" />);
    
    const assignedElements = screen.getAllByText(/Group assigned/i);
    expect(assignedElements.length).toBeGreaterThan(0);
    const unassignedElements = screen.queryAllByText(/Unassigned/i);
    expect(unassignedElements.length).toBe(0);
  });
});
