// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { MobileParksPage } from "./mobile-parks-page";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useQuery: vi.fn(),
  useEffectiveCapabilities: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/hooks/use-effective-capabilities", () => ({
  useEffectiveCapabilities: mocks.useEffectiveCapabilities,
}));

// Mock global fetch for POST
global.fetch = vi.fn();

describe("MobileParksPage", () => {
  afterEach(() => { cleanup(); vi.resetAllMocks(); global.fetch = vi.fn(); });
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: { user: { role: "main_admin" } },
    });
    mocks.useEffectiveCapabilities.mockReturnValue({
      has: (cap: string) => cap === "organisation.manage",
    });
    mocks.useQueryClient.mockReturnValue({
      invalidateQueries: mocks.invalidateQueries,
    });

    // Default GET fetch mocks for useQuery
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-cities") {
        return { data: [{ id: "city1", name: "Karachi" }] };
      }
      return { data: [], isLoading: false, isError: false };
    });
  });

  it("renders loading state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") return { isLoading: true };
      return { data: [] };
    });
    render(<MobileParksPage onParkSelect={vi.fn()} />);
    expect(screen.getByText("Loading parks...")).toBeDefined();
  });

  it("renders empty state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") return { data: [], isLoading: false };
      return { data: [] };
    });
    render(<MobileParksPage onParkSelect={vi.fn()} />);
    expect(screen.getByText("No parks found.")).toBeDefined();
  });

  it("renders error state", () => {
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") return { isError: true, isLoading: false };
      return { data: [] };
    });
    render(<MobileParksPage onParkSelect={vi.fn()} />);
    expect(screen.getByText("Failed to load parks.")).toBeDefined();
  });

  it("offers a retry that refetches after a failed parks load", () => {
    const refetch = vi.fn();
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") return { isError: true, isLoading: false, refetch };
      return { data: [] };
    });
    render(<MobileParksPage onParkSelect={vi.fn()} />);

    fireEvent.click(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps Add unavailable without organisation.manage", () => {
    mocks.useEffectiveCapabilities.mockReturnValue({ has: () => false });
    render(<MobileParksPage onParkSelect={vi.fn()} />);
    expect(screen.queryByLabelText("Add park")).toBeNull();
  });

  it("HQ cannot submit before choosing a city", async () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "super_admin" } } });

    render(<MobileParksPage onParkSelect={vi.fn()} />);

    fireEvent.click(screen.getAllByLabelText("Add park")[0]);

    // Type name
    fireEvent.change(screen.getAllByPlaceholderText("e.g. Johar Park")[0], { target: { value: "New Park" } });

    // Submit without city
    fireEvent.click(screen.getAllByText("Save park")[0]);

    expect(screen.getByText("Please select a city.")).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("HQ POST contains selected cityId and 201 refetches and clears/closes", async () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "program_admin" } } });
    (global.fetch as any).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({}), { status: 201 })));


    render(<MobileParksPage onParkSelect={vi.fn()} />);

    fireEvent.click(screen.getAllByLabelText("Add park")[0]);

    // Select city and type name
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "city1" } });
    fireEvent.change(screen.getAllByPlaceholderText("e.g. Johar Park")[0], { target: { value: "HQ Park" } });

    // Submit
    fireEvent.click(screen.getAllByText("Save park")[0]);

    // Verification
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/parks", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "HQ Park", address: "", cityId: "city1" })
    }));

    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-parks-list"] });

      expect(screen.queryByText("Save park")).toBeNull(); // sheet closed
    });
  });

  it("City Head POST omits cityId", async () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "city_head" } } });
    (global.fetch as any).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({}), { status: 201 })));


    render(<MobileParksPage onParkSelect={vi.fn()} />);

    fireEvent.click(screen.getAllByLabelText("Add park")[0]);

    // Type name
    fireEvent.change(screen.getAllByPlaceholderText("e.g. Johar Park")[0], { target: { value: "City Head Park" } });

    // Ensure city selector is not rendered
    expect(screen.queryByRole("combobox")).toBeNull();

    // Submit
    fireEvent.click(screen.getAllByText("Save park")[0]);

    // Verification
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/parks", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "City Head Park", address: "" }) // No cityId
    }));
  });

  it("Failed POST preserves entered data and shows the API error", async () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "city_head" } } });
    (global.fetch as any).mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: "Park already exists" }), { status: 409 })));


    render(<MobileParksPage onParkSelect={vi.fn()} />);

    fireEvent.click(screen.getAllByLabelText("Add park")[0]);

    // Type name
    fireEvent.change(screen.getAllByPlaceholderText("e.g. Johar Park")[0], { target: { value: "Dup Park" } });

    // Submit
    fireEvent.click(screen.getAllByText("Save park")[0]);

    await waitFor(() => {
      expect(screen.getByText("Park already exists")).toBeDefined();
    });

    // Input should still be there
    expect((screen.getAllByPlaceholderText("e.g. Johar Park")[0] as HTMLInputElement).value).toBe("Dup Park");
  });

  it("shows the park's real Batch 4 from its groups when it owns no batch directly", () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "super_admin", roleLabel: "System Owner" } } });
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") {
        return {
          data: [{ id: "park-2", name: "Johar Town", city: { name: "Lahore" }, _count: { batches: 0 } }],
          isLoading: false,
          isError: false,
        };
      }
      if (options.queryKey[0] === "admin-parks-groups") {
        return {
          data: [
            { id: "g1", parkId: "park-2", batch: { id: "b4", name: "Batch 4" } },
            { id: "g2", parkId: "park-2", batch: { id: "b4", name: "Batch 4" } },
          ],
          isLoading: false,
          isError: false,
        };
      }
      return { data: [] };
    });

    render(<MobileParksPage onParkSelect={vi.fn()} />);

    expect(screen.getByText("Lahore • Batch 4")).toBeDefined();
    expect(screen.queryByText(/0 batches/)).toBeNull();
  });

  it("falls back to the endpoint's direct batch count when groups are unavailable", () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "super_admin" } } });
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") {
        return {
          data: [{ id: "park-9", name: "Griffin", city: { name: "Lahore" }, _count: { batches: 2 } }],
          isLoading: false,
          isError: false,
        };
      }
      if (options.queryKey[0] === "admin-parks-groups") {
        return { data: [], isLoading: false, isError: false };
      }
      return { data: [] };
    });

    render(<MobileParksPage onParkSelect={vi.fn()} />);

    expect(screen.getByText("Lahore • 2 batches")).toBeDefined();
  });

  it("shows a truthful No batch state instead of a fabricated batch", () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "super_admin" } } });
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") {
        return {
          data: [{ id: "park-3", name: "State Life", city: { name: "Lahore" }, _count: { batches: 0 } }],
          isLoading: false,
          isError: false,
        };
      }
      if (options.queryKey[0] === "admin-parks-groups") {
        return { data: [], isLoading: false, isError: false };
      }
      return { data: [] };
    });

    render(<MobileParksPage onParkSelect={vi.fn()} />);

    expect(screen.getByText("Lahore • No batch")).toBeDefined();
  });

  it("uses the server product label and never guesses 'Main admin'", () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "city_head", roleLabel: "City Head" } } });
    const { container } = render(<MobileParksPage onParkSelect={vi.fn()} />);

    expect(container.textContent).toContain("City Head");
    expect(container.textContent).not.toContain("Main admin");
  });

  it("omits the role badge rather than defaulting to 'Main admin' when no label exists", () => {
    mocks.useSession.mockReturnValue({ data: { user: { role: "city_head" } } });
    const { container } = render(<MobileParksPage onParkSelect={vi.fn()} />);

    expect(container.textContent).not.toContain("Main admin");
  });

  it("renders no hardcoded batch chip or fabricated inventory count", () => {
    const { container } = render(<MobileParksPage onParkSelect={vi.fn()} />);

    expect(container.textContent).not.toContain("13 item types");
    expect(container.textContent).toContain("Central Store");
  });

  it("passes no fabricated murabbi/student counts when the endpoint returns none", () => {
    const onParkSelect = vi.fn();
    mocks.useSession.mockReturnValue({ data: { user: { role: "super_admin", roleLabel: "System Owner" } } });
    mocks.useQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "admin-parks-list") {
        return { data: [{ id: "park-7", name: "Johar Town", city: { name: "Lahore" }, _count: { batches: 1 } }], isLoading: false, isError: false };
      }
      return { data: [] };
    });

    render(<MobileParksPage onParkSelect={onParkSelect} />);
    fireEvent.click(screen.getByText("Johar Town"));

    expect(onParkSelect).toHaveBeenCalledWith(expect.objectContaining({ parkId: "park-7", murabbiCount: null, studentCount: null }));
  });
});
