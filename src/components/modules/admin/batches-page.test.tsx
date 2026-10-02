// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { BatchesPage } from "./batches-page";
import { useQuery, useMutation } from "@tanstack/react-query";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "super_admin" } }, status: "authenticated" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// Mock the UI Select component so it renders as a native select for easy testing
vi.mock("../../../components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => {
    return (
      <select
        data-testid="mock-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Select...</option>
        {children}
      </select>
    );
  },
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => (
    <option value={value}>{children}</option>
  ),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

describe("BatchesPage - Create Batch", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockedUseQuery.mockImplementation((opts: any) => {
      if (opts.queryKey[0] === "admin-parks-dropdown") {
        return { data: [{ id: "p1", name: "Test Park", city: { id: "c1", name: "Test City" } }], isLoading: false } as any;
      }
      if (opts.queryKey[0] === "batch-certificates") {
        return { data: { certificates: [] }, isLoading: false } as any;
      }
      return { data: [], isLoading: false } as any;
    });

    mockedUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requires End Date on creation and prevents submit without it", async () => {
    render(<BatchesPage />);

    // Open create dialog
    const createBtn = screen.getByRole("button", { name: /Create Batch/i });
    fireEvent.click(createBtn);

    // Dialog should open
    const dialogTitle = await screen.findByText("Create Batch", { selector: "h2" });
    expect(dialogTitle).not.toBeNull();

    // Fill form except End Date
    const nameInput = screen.getByLabelText(/Batch Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Batch" } });

    // Select Park via native select mock
    const parkSelect = screen.getAllByTestId("mock-select")[0]; // the first one should be Create dialog's select
    fireEvent.change(parkSelect, { target: { value: "p1" } });

    const startInput = screen.getByLabelText(/Start Date/i, { exact: true });
    fireEvent.change(startInput, { target: { value: "2025-01-01" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Create Batch" });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);

    // Expect the error message for End Date to appear
    expect(await screen.findByText("End Date is required")).not.toBeNull();
    
    // Mutation should not be called
    expect(mockMutate).not.toHaveBeenCalled();

    // Now fill End Date
    const endInput = screen.getByLabelText("End Date");
    fireEvent.change(endInput, { target: { value: "2025-02-01" } });

    // Submit again
    fireEvent.submit(form!);

    // Mutation should be called exactly with the right object
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({
      name: "Test Batch",
      parkId: "p1",
      startDate: "2025-01-01",
      endDate: "2025-02-01",
    });
  });
});
