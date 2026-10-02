/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccessProvisioningPage } from "./access-provisioning-page";
import * as nextAuthReact from "next-auth/react";
import { useQuery, useMutation } from "@tanstack/react-query";

vi.mock("next-auth/react");
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children, disabled, "aria-label": label }: any) => {
    return (
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Select...</option>
        {children}
      </select>
    );
  },
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value }: any) => <option value={value}>{value}</option>,
}));

describe("Access Provisioning Page (Muawin Role)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMutation as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("City Head cannot select Muawin until backend support is present", () => {
    (nextAuthReact.useSession as any).mockReturnValue({
      data: { user: { role: "city_head", assignedCityId: "c1" } },
      status: "authenticated",
    });

    (useQuery as any).mockReturnValue({ data: [] });

    const { container } = render(<AccessProvisioningPage />);
    const roleSelect = container.querySelectorAll("select")[0];
    const options = Array.from(roleSelect.options).map((o) => o.value);

    expect(options).not.toContain("muawin");
  });

  it("shows Muawin field and unavailable state when endpoint is unready (Super Admin)", async () => {
    (nextAuthReact.useSession as any).mockReturnValue({
      data: { user: { role: "super_admin" } },
      status: "authenticated",
    });

    const mockUseQuery = vi.fn((opts: any) => {
      const key = opts.queryKey?.[0];
      if (key === "admin-cities-dropdown") return { data: [{ id: "c1", name: "City 1" }] };
      if (key === "admin-parks-dropdown") return { data: [{ id: "p1", name: "Park 1", cityId: "c1" }] };
      if (key === "eligible-assistants") return { data: undefined, isError: true, isLoading: false };
      return { data: [] };
    });
    (useQuery as any).mockImplementation(mockUseQuery);

    const { container } = render(<AccessProvisioningPage />);

    const roleSelect = container.querySelectorAll("select")[0];
    fireEvent.change(roleSelect, { target: { value: "muawin" } });

    await waitFor(() => expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(2));
    const citySelect = container.querySelectorAll("select")[1];
    fireEvent.change(citySelect, { target: { value: "c1" } });

    await waitFor(() => expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(3));
    const parkSelect = container.querySelectorAll("select")[2];
    fireEvent.change(parkSelect, { target: { value: "p1" } });

    await waitFor(() => expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(4));

    expect(screen.queryByText(/Eligible assistants are unavailable until access setup is complete/i)).toBeTruthy();

    const assistsSelect = container.querySelectorAll("select")[3];
    expect(assistsSelect.disabled).toBe(true);
  });

  it("proves the page never calls /api/admin/users?pageSize=1000 and allows pageSize=20", () => {
    (nextAuthReact.useSession as any).mockReturnValue({
      data: { user: { role: "super_admin" } },
      status: "authenticated",
    });
    const mockUseQuery = vi.fn().mockReturnValue({ data: [] });
    (useQuery as any).mockImplementation(mockUseQuery);

    render(<AccessProvisioningPage />);

    const queryCalls = mockUseQuery.mock.calls;

    let foundPageSize20 = false;
    let foundPageSize1000 = false;

    for (const call of queryCalls) {
      const opts = call[0];
      const queryFnStr = opts.queryFn ? opts.queryFn.toString() : "";
      if (queryFnStr.includes("pageSize=20")) foundPageSize20 = true;
      if (queryFnStr.includes("pageSize=1000")) foundPageSize1000 = true;
    }

    expect(foundPageSize20).toBe(true);
    expect(foundPageSize1000).toBe(false);
  });

  it("proves the eligible-assistants query is enabled only after both Muawin role and park are selected", async () => {
    (nextAuthReact.useSession as any).mockReturnValue({
      data: { user: { role: "super_admin" } },
      status: "authenticated",
    });

    const mockUseQuery = vi.fn((opts: any) => {
      const key = opts.queryKey?.[0];
      if (key === "admin-cities-dropdown") return { data: [{ id: "c1", name: "City 1" }] };
      if (key === "admin-parks-dropdown") return { data: [{ id: "p1", name: "Park 1", cityId: "c1" }] };
      return { data: [] };
    });
    (useQuery as any).mockImplementation(mockUseQuery);

    const { container } = render(<AccessProvisioningPage />);

    // Check initial state
    let eligibleCalls = mockUseQuery.mock.calls.filter(c => c[0].queryKey?.[0] === "eligible-assistants");
    expect(eligibleCalls.every(c => c[0].enabled === false)).toBe(true);

    // Select role Muawin
    const roleSelect = container.querySelectorAll("select")[0];
    fireEvent.change(roleSelect, { target: { value: "muawin" } });

    // Select City
    await waitFor(() => expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(2));
    const citySelect = container.querySelectorAll("select")[1];
    fireEvent.change(citySelect, { target: { value: "c1" } });

    // Select Park
    await waitFor(() => expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(3));
    const parkSelect = container.querySelectorAll("select")[2];
    fireEvent.change(parkSelect, { target: { value: "p1" } });

    // After setting Park, it should be enabled
    await waitFor(() => {
      const calls = mockUseQuery.mock.calls.filter(c => c[0].queryKey?.[0] === "eligible-assistants");
      expect(calls.some(c => c[0].enabled === true)).toBe(true);
    });
  });
});
