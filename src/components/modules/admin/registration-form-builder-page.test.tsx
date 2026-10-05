/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { RegistrationFormBuilderPage } from "./registration-form-builder-page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
vi.mock("@/stores/useAppStore");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("RegistrationFormBuilderPage - Editor State", () => {
  afterEach(cleanup);
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = { selectedFormId: "form-123", navigateTo: vi.fn() };
      return selector ? selector(state) : state;
    });
  });

  it("retains the later edit as visible and dirty after an in-flight save and refetch complete", async () => {
    let releaseSave: () => void = () => {};
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let getCount = 0;

    (global.fetch as any).mockImplementation(async (_url: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        await saveGate;
        return {
          ok: true,
          json: async () => ({ data: { id: "form-123", version: 2, title: "Edited Title", intro: "", fields: [], settings: { eligibilityText: "", feeText: "", privacyNotice: "", contactConsentText: "", successText: "Received" }, status: "draft" } }),
        };
      }
      getCount += 1;
      const serverData =
        getCount === 1
          ? { id: "form-123", version: 1, title: "Initial Title", intro: "", fields: [], settings: { eligibilityText: "", feeText: "", privacyNotice: "", contactConsentText: "", successText: "Received" }, status: "draft" }
          : { id: "form-123", version: 2, title: "Server Title", intro: "", fields: [], settings: { eligibilityText: "", feeText: "", privacyNotice: "", contactConsentText: "", successText: "Received" }, status: "draft" };
      return { ok: true, json: async () => ({ data: serverData }) };
    });

    render(
      <TestWrapper>
        <RegistrationFormBuilderPage />
      </TestWrapper>
    );

    const titleInput = await screen.findByDisplayValue("Initial Title");
    expect(titleInput).toBeDefined();

    fireEvent.change(titleInput, { target: { value: "Edited Title" } });
    expect((titleInput as HTMLInputElement).value).toBe("Edited Title");

    const saveBtn = screen.getByRole("button", { name: /Save Draft/ });
    expect(saveBtn.textContent).toContain("*");

    fireEvent.click(saveBtn);

    // Edit again while the save request is still in flight.
    fireEvent.change(titleInput, { target: { value: "Edited Again" } });
    expect((titleInput as HTMLInputElement).value).toBe("Edited Again");

    releaseSave();

    // The save's onSuccess invalidates the builder query, so a refetch (GET #2)
    // delivers the server's "Server Title" and the header reflects it.
    await waitFor(() => {
      expect(getCount).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("Server Title")).toBeDefined();
    });

    // The later edit must remain both visible and dirty once the save and refetch
    // complete: the refetched server value must not overwrite the local edit.
    expect((screen.getByDisplayValue("Edited Again") as HTMLInputElement).value).toBe("Edited Again");
    expect(screen.queryByDisplayValue("Server Title")).toBeNull();
    expect(screen.getByRole("button", { name: /Save Draft/ }).textContent).toContain("*");
  });

  it("generates API-valid keys when adding the first question to a blank form", async () => {
    let savedBody: any = null;
    (global.fetch as any).mockImplementation(async (_url: string, options?: { method?: string; body?: string }) => {
      if (options?.method === "PATCH") {
        savedBody = JSON.parse(options.body || "{}");
        return { ok: true, json: async () => ({ version: 2, status: "draft" }) };
      }
      return {
        ok: true,
        json: async () => ({
          data: {
            id: "form-123",
            version: 1,
            title: "Blank Form",
            intro: "",
            fields: [],
            settings: {
              eligibilityText: "",
              feeText: "",
              privacyNotice: "",
              contactConsentText: "",
              successText: "Received",
            },
            status: "draft",
          },
        }),
      };
    });

    render(
      <TestWrapper>
        <RegistrationFormBuilderPage />
      </TestWrapper>
    );

    await screen.findByDisplayValue("Blank Form");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Questions" }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("button", { name: "Add Question" }));
    fireEvent.click(screen.getByRole("button", { name: /Save Draft/ }));

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect(savedBody.fields).toHaveLength(1);
    expect(savedBody.fields[0].key).toMatch(/^[a-z][a-zA-Z0-9]{0,39}$/);
    expect(savedBody.fields[0].key).not.toContain("_");
  });
});
