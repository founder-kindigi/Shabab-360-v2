// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, cleanup, screen } from "@testing-library/react";
import { StudentsPage } from "./students-page";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/admin/students"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useEffectiveCapabilities: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("next/navigation", () => ({
  useRouter: mocks.useRouter,
  usePathname: mocks.usePathname,
  useSearchParams: mocks.useSearchParams,
}));

vi.mock("@/hooks/use-effective-capabilities", () => ({
  useEffectiveCapabilities: mocks.useEffectiveCapabilities,
}));

describe("StudentsPage", () => {

  it("renders error state", () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<StudentsPage />);
    expect(screen.getByText("Failed to load students")).toBeDefined();
  });

  it("keeps write actions unavailable without organisation.manage", () => {
    mocks.useEffectiveCapabilities.mockReturnValue({
      has: () => false,
    });
    render(<StudentsPage />);
    expect(screen.queryByText(/Add student/i)).toBeNull();
    expect(screen.queryByText(/Import/i)).toBeNull();
  });
  afterEach(() => { cleanup(); });
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: { user: { role: "main_admin" } },
    });
    mocks.useQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    });
    mocks.useEffectiveCapabilities.mockReturnValue({
      has: () => true,
    });
    
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-students") return { data: { data: [], pagination: {} }, isLoading: false, isError: false };
      return { data: [], isLoading: false };
    });
    mocks.useMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("renders empty state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
        if (options.queryKey[0] === "admin-students") {
          return { data: { data: [], pagination: {} }, isLoading: false, isError: false };
        }
        return { data: undefined };
    });
    render(<StudentsPage />);
        expect(screen.getByText("No students yet")).toBeDefined();
    expect(screen.queryByText("Failed to load students")).toBeNull();
  });

  it("renders access denied error when API returns 403", async () => {
    let capturedQueryFn: any = null;
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-students") {
        capturedQueryFn = options.queryFn;
        return { data: undefined, isLoading: false, isError: true, error: new Error("Access Denied") };
      }
      return { data: [], isLoading: false };
    });

    render(<StudentsPage />);

    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({})
    });

    await expect(capturedQueryFn()).rejects.toThrow("Access Denied");
    expect(screen.getByText("Access Denied")).toBeDefined();
    expect(screen.queryByText("No students yet")).toBeNull();
  });

  it("renders loading state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-students") return { isLoading: true };
      return { data: [], isLoading: false };
    });
    const { container } = render(<StudentsPage />);
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });

  it("renders successful list of students", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-students") {
        return {
          data: {
            data: [{
              id: "1",
              name: "Jane Smith",
              state: "active",
              group: { name: "Group A", batch: { name: "Batch 1", park: { name: "Park X", city: { name: "City Y" } } } }
            }],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 }
          },
          isLoading: false,
          isError: false,
        };
      }
      return { data: [], isLoading: false };
    });
    render(<StudentsPage />);
    expect(screen.getAllByText("Jane Smith")[0]).toBeDefined();
    expect(screen.queryByText("secret.janesmith@example.com")).toBeNull();
    expect(screen.queryByText("5544332211")).toBeNull();
    expect(screen.queryByText("2026-09-02T00:00:00Z")).toBeNull();
    expect(screen.queryByText("2010-01-01")).toBeNull();
    expect(screen.queryByText("Secret Guardian")).toBeNull();
    expect(screen.queryByText("9988776655")).toBeNull();
  });
});
