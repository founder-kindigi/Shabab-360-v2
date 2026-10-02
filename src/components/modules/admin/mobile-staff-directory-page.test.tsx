// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MobileStaffDirectoryPage } from "./mobile-staff-directory-page";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "super_admin" } }, status: "authenticated" })
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn().mockReturnValue({
    data: {
      data: [
        {
          id: "1",
          name: "Test Muawin Linked",
          role: "muawin",
          staffMeta: { assistsMurabbiId: "m1", assistsMurabbi: { user: { name: "Hassan" } } },
        },
        {
          id: "2",
          name: "Test Muawin Unlinked",
          role: "muawin",
          staffMeta: {},
        },
        {
          id: "3",
          name: "Test Park Lead",
          role: "park_lead",
          assignedStudents: 15,
          staffMeta: {},
        }
      ]
    },
    isLoading: false,
  }),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@/store", () => ({
  useAppStore: () => ({ navigateTo: vi.fn() }),
}));

describe("Mobile Staff Directory Page", () => {
  it("renders Muawin labels correctly and keeps Park Lead intact", () => {
    render(<MobileStaffDirectoryPage />);
    
    // Muawin linked
    expect(screen.getByText("Muawin — assists Hassan")).toBeTruthy();
    
    // Muawin unlinked
    expect(screen.getByText("Muawin — no murabbi assigned")).toBeTruthy();
    
    // Park Lead intact (15 Shabab badge)
    expect(screen.getByText("15 Shabab")).toBeTruthy();
  });
});
