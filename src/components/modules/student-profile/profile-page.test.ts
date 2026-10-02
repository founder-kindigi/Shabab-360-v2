// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
  mutationConfigs: [] as Array<{
    mutationFn: (variables: any) => Promise<any>;
    onSuccess?: (data: any, variables: any) => void;
    onError?: (error: any) => void;
  }>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useQueryClient: mocks.useQueryClient,
  useMutation: (config: (typeof mocks.mutationConfigs)[number]) => {
    mocks.mutationConfigs.push(config);
    return {
      isPending: false,
      mutate: (variables: any) => {
        void config.mutationFn(variables)
          .then((data: any) => config.onSuccess?.(data, variables))
          .catch((error: any) => config.onError?.(error));
      },
    };
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => React.createElement("div", null, children),
  TabsList: ({ children }: any) => React.createElement("div", null, children),
  TabsTrigger: ({ children }: any) => React.createElement("button", null, children),
  TabsContent: ({ children }: any) => React.createElement("div", null, children),
}));

import { StudentProfilePage } from "./profile-page";

const profileData = { school: "Test School" };
const activeStatus = { state: "active", dropoutAt: null, dropoutReason: null, dropoutSource: null };
const dropoutStatus = { state: "dropout", dropoutAt: "2026-08-01T00:00:00.000Z", dropoutReason: "Left the program", dropoutSource: "manual" };
const manageCapabilities = { canView: true, canManage: true, canViewSensitive: false, canManageSensitive: false };

function mockQueries(status: typeof activeStatus | typeof dropoutStatus) {
  mocks.useQuery.mockImplementation((options: any) => {
    if (options?.queryKey?.[0] === "student-dropout-status") {
      return { data: status, isLoading: false, error: null };
    }
    return { data: profileData, isLoading: false, error: null };
  });
}

function dropoutMutation() {
  const config = mocks.mutationConfigs.find((candidate) => String(candidate.mutationFn).includes("/dropout"));
  if (!config) throw new Error("dropout mutation was not registered");
  return config;
}

describe("StudentProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationConfigs.length = 0;
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the sensitive wellbeing tab in edit mode for a manage-sensitive user", () => {
    mockQueries(activeStatus);
    render(React.createElement(StudentProfilePage, {
      participantId: "p-1",
      capabilities: { canView: true, canManage: true, canViewSensitive: false, canManageSensitive: true },
    }));

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    expect(screen.getAllByText("Support & Wellbeing").length).toBeGreaterThan(0);
    expect(screen.getByText("Financial Status (Sensitive)")).toBeTruthy();
  });

  it("requires a rejoin date and sends the selected date when reactivating", async () => {
    mockQueries(dropoutStatus);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ participantId: "p-1", state: "active" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(StudentProfilePage, { participantId: "p-1", capabilities: manageCapabilities }));

    const rejoinInput = screen.getByLabelText(/rejoin date/i) as HTMLInputElement;
    const reason = screen.getByPlaceholderText(/reason for reactivation/i);
    const button = screen.getByRole("button", { name: /reactivate student/i }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    fireEvent.change(reason, { target: { value: "Returning after medical leave" } });
    // Reason alone is not enough; the rejoin date is still missing.
    expect(button.disabled).toBe(true);

    fireEvent.change(rejoinInput, { target: { value: "2026-09-01" } });
    expect(button.disabled).toBe(false);

    fireEvent.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; body: string }];
    expect(String(url)).toContain("/api/admin/students/p-1/dropout");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({
      action: "reactivate",
      reason: "Returning after medical leave",
      effectiveDate: "2026-09-01",
    });

    // The selected date is cleared after a successful reactivation.
    await waitFor(() => expect((screen.getByLabelText(/rejoin date/i) as HTMLInputElement).value).toBe(""));
  });

  it("does not offer a rejoin date or send one for an active participant", async () => {
    mockQueries(activeStatus);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ participantId: "p-1", state: "dropout" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(StudentProfilePage, { participantId: "p-1", capabilities: manageCapabilities }));

    expect(screen.queryByLabelText(/rejoin date/i)).toBeNull();
    const reason = screen.getByPlaceholderText(/reason for discontinuing/i);
    const button = screen.getByRole("button", { name: /mark as dropout/i }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fireEvent.change(reason, { target: { value: "Confirmed manual withdrawal" } });
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ action: "dropout", reason: "Confirmed manual withdrawal" });
    expect(body).not.toHaveProperty("effectiveDate");
  });
});
