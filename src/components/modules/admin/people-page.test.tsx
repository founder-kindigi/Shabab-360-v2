// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, cleanup, screen, waitFor, fireEvent } from "@testing-library/react";
import { PeoplePage } from "./people-page";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
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

vi.mock("@/hooks/use-effective-capabilities", () => ({
  useEffectiveCapabilities: mocks.useEffectiveCapabilities,
}));

describe("PeoplePage", () => {

  it("renders error state", () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<PeoplePage />);
    expect(screen.getByText("Failed to load staff")).toBeDefined();
  });

  it("keeps write actions unavailable without organisation.manage", () => {
    mocks.useEffectiveCapabilities.mockReturnValue({ has: () => false });
    mocks.useMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mocks.useQuery.mockImplementation((options: any) => {
        if (options.queryKey[0] === "admin-people") {
          return { data: { data: [{ id: "user1", name: "Ali Khan", staffMeta: { role: "murabbi" } }], pagination: {} }, isLoading: false, isError: false };
        }
        return { data: undefined };
    });
    render(<PeoplePage />);
    
    fireEvent.click(screen.getAllByText("Ali Khan")[0]);
    expect(screen.queryByText(/Edit User/i)).toBeNull();

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
    
    // Default empty state
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-people") {
        return { data: { data: [], pagination: {} }, isLoading: false, isError: false };
      }
      if (options.queryKey[0] === "admin-people-stats") {
        return { data: { total: 0, active: 0, inactive: 0, byRole: [] }, isLoading: false };
      }
      return { data: [], isLoading: false };
    });
  });

  it("renders empty state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
        if (options.queryKey[0] === "admin-people") {
          return { data: { data: [], pagination: {} }, isLoading: false, isError: false };
        }
        return { data: undefined };
    });
    render(<PeoplePage />);
    expect(screen.getByText("No staff members have been added yet.")).toBeDefined();
    expect(screen.queryByText("Failed to load staff")).toBeNull();
  });

  it("renders access denied error when API returns 403", async () => {
    let capturedQueryFn: any = null;
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-people") {
        capturedQueryFn = options.queryFn;
        return { data: undefined, isLoading: false, isError: true, error: new Error("Access Denied") };
      }
      return { data: [], isLoading: false };
    });

    render(<PeoplePage />);

    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({})
    });

    await expect(capturedQueryFn()).rejects.toThrow("Access Denied");
    expect(screen.getByText("Access Denied")).toBeDefined();
    expect(screen.queryByText("No staff members have been added yet.")).toBeNull();
  });

  it("renders loading state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-people") {
        return { isLoading: true };
      }
      return { data: [], isLoading: false };
    });
    const { container } = render(<PeoplePage />);
    // Check for skeletons instead of text
    expect(container.querySelector(".animate-pulse")).toBeDefined();
    expect(container.querySelector("p [data-slot='skeleton']")).toBeNull();
  });

  it("renders list of staff and safe data", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-people") {
        return {
          data: {
            data: [{
              id: "1",
              name: "John Doe",
              email: "secret.johndoe@example.com",
              phone: "1122334455",
              passwordResetAt: "2026-09-01T00:00:00Z",
              isActive: true,
              staffMeta: { role: "murabbi", isActive: true, assignedCity: { name: "City 1" } }
            }],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 }
          },
          isLoading: false,
          isError: false,
        };
      }
      if (options.queryKey[0] === "admin-people-stats") {
        return { data: { total: 1, active: 1, inactive: 0, byRole: [] }, isLoading: false };
      }
      return { data: [], isLoading: false };
    });
    render(<PeoplePage />);
    expect(screen.getAllByText("John Doe")[0]).toBeDefined();
    expect(screen.getAllByText("City 1")[0]).toBeDefined();
    expect(screen.queryByText("secret.johndoe@example.com")).toBeNull();
    expect(screen.queryByText("1122334455")).toBeNull();
    expect(screen.queryByText("2026-09-01T00:00:00Z")).toBeNull();
  });
});
