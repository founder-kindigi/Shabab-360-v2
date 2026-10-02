/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegistrationFormsPage } from "./registration-forms-page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
vi.mock("next-auth/react");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/useAppStore");

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("RegistrationFormsPage - City Head Create Form Fallback", () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
    (useAppStore as any).mockImplementation((selector: any) => {
      // Mock store returning NO selectedCityId
      const state = { selectedCityId: null, navigateTo: vi.fn(), setSelectedFormId: vi.fn() };
      return selector ? selector(state) : state;
    });
  });

  it("submits the form using session assignedCityId when city API returns 403 (City Head)", async () => {
    (useSession as any).mockReturnValue({
      data: { user: { assignedCityId: "city-123", role: "city_head" } },
    });

    (global.fetch as any).mockImplementation(async (url: string, options?: any) => {
      if (url.includes("/api/admin/registration-forms")) {
        if (options?.method === "POST") {
          return { ok: true, json: async () => ({ id: "new-form", slug: "test-slug" }) };
        }
        return { ok: true, json: async () => ({ data: [], total: 0, page: 1, pageSize: 20 }) };
      }
      if (url.includes("/api/admin/cities")) {
        return { ok: false, status: 403, json: async () => ({ error: "Forbidden" }) };
      }
      return { ok: false, status: 404 };
    });

    render(
      <TestWrapper>
        <RegistrationFormsPage />
      </TestWrapper>
    );

    // Open create dialog
    fireEvent.click(await screen.findByText("Create Form"));

    // Wait for the 403 fallback to hide the city select logic
    await waitFor(() => {
      expect(screen.queryByText("Loading context...")).toBeNull();
    });

    // Fill form
    fireEvent.change(await screen.findByPlaceholderText("e.g. Murabbi Training 2026"), { target: { value: "Test Title" } });
    fireEvent.change(await screen.findByPlaceholderText("e.g. murabbi-training-2026"), { target: { value: "test-slug" } });

    // Ensure button is not disabled
    const createBtn = screen.getByRole("button", { name: "Create Draft" });
    expect((createBtn as HTMLButtonElement).disabled).toBe(false);

    // Mock mutate fetch


    fireEvent.click(createBtn);

    await waitFor(() => {
      const fetchCalls = (global.fetch as any).mock.calls;
      const postCall = fetchCalls.find((c: any) => c[1]?.method === "POST");
      expect(postCall).toBeDefined();
      const payload = JSON.parse(postCall[1].body);
      expect(payload.ownerCityId).toBe("city-123");
    });
  });

  it("copies the complete public URL for a published form", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    (useSession as any).mockReturnValue({
      data: { user: { assignedCityId: null, role: "super_admin" } },
    });
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes("/api/admin/registration-forms")) {
        return {
          ok: true,
          json: async () => ({
            data: [{
              id: "form-1",
              slug: "murabbi-training-lahore",
              ownerCityId: "city-123",
              title: "Murabbi Training Lahore",
              status: "published",
              version: 1,
              publishedVersion: 1,
              createdAt: "2026-10-01T00:00:00.000Z",
            }],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        };
      }
      if (url.includes("/api/admin/cities")) {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      return { ok: false, status: 404 };
    });

    render(
      <TestWrapper>
        <RegistrationFormsPage />
      </TestWrapper>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Copy Link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/register/forms/murabbi-training-lahore"
      );
    });
  });
});










