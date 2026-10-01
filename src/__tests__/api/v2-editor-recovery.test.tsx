// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const session = vi.hoisted(() => ({ user: { id: "synthetic-owner" } }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: session, status: "authenticated" }) }));
vi.mock("@/hooks/use-effective-capabilities", () => ({ useEffectiveCapabilities: () => ({ isLoading: false, has: () => true }) }));
vi.mock("@/hooks/use-online-status", () => ({ useOnlineStatus: () => true }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { StudentProfilePage } from "@/components/modules/student-profile/profile-page";
import { FeesPage } from "@/components/modules/admin/fees-page";
import { MobileCallingPage } from "@/components/modules/admin/mobile-calling-page";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.stubGlobal("localStorage", storage()); vi.stubGlobal("sessionStorage", storage());
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request: vi.fn(async (_name, _options, callback) => callback({ name: _name })) } });
  localStorage.clear(); sessionStorage.clear(); session.user.id = "synthetic-owner";
});
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

it("keeps the edit's original version after a background profile refresh and submits only changed fields", async () => {
  const cache = client();
  const original = { school: "Original school", hobbies: "Reading", updatedAt: "2026-09-01T00:00:00.000Z" };
  const writes: RequestInit[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PUT") { writes.push(options); return Response.json({ error: "Newer version exists" }, { status: 409 }); }
    return Response.json(url.includes("/dropout") ? { state: "active" } : original);
  }));
  render(<QueryClientProvider client={cache}><StudentProfilePage participantId="participant" cityId="city" capabilities={{ canView: true, canManage: true, canViewSensitive: false, canManageSensitive: false }} /></QueryClientProvider>);
  fireEvent.click(await screen.findByText("Edit Profile"));
  const input = screen.getByDisplayValue("Original school");
  fireEvent.change(input, { target: { value: "My edit" } });
  await act(async () => { cache.setQueryData(["student-profile", "participant", "city", false], { ...original, school: "Concurrent edit", updatedAt: "2026-09-02T00:00:00.000Z" }); });
  expect((input as HTMLInputElement).value).toBe("My edit");
  fireEvent.click(screen.getByText("Save"));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(new Headers(writes[0].headers).get("If-Match")).toBe(original.updatedAt);
  expect(JSON.parse(writes[0].body as string)).toEqual({ school: "My edit" });
  expect(screen.getByDisplayValue("My edit")).toBeTruthy();
});

it("confirms an interrupted payment from its saved key even when no outstanding participant remains", async () => {
  const key = "shabab-payment-attempt:synthetic-owner";
  const body = { participantId: "already-paid", amount: 100, method: "cash" };
  localStorage.setItem(key, JSON.stringify({ key: "stable-synthetic-retry-key", fingerprint: JSON.stringify(["fee", body]) }));
  const writes: { url: string; options: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      writes.push({ url, options });
      return Response.json({ id: "payment", receiptNo: "SYN-0001", amount: 100, participant: { name: "Synthetic" } }, { status: 201 });
    }
    return Response.json(url.endsWith("payments") ? { unpaidParticipants: [], payments: [] } : { data: [], pagination: { totalPages: 1 } });
  }));
  render(<QueryClientProvider client={client()}><FeesPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByText("Confirm pending payment"));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0].url).toBe("/api/admin/fees/fee/payments");
  expect(new Headers(writes[0].options.headers).get("Idempotency-Key")).toBe("stable-synthetic-retry-key");
  expect(JSON.parse(writes[0].options.body as string)).toEqual(body);
  await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
  expect(await screen.findByText("SYN-0001")).toBeTruthy();
});

it("keeps an unacknowledged payment retry record and hides another account's saved attempt", async () => {
  const key = "shabab-payment-attempt:synthetic-owner";
  localStorage.setItem(key, JSON.stringify({ key: "stable-synthetic-retry-key", fingerprint: JSON.stringify(["fee", { participantId: "p", amount: 100, method: "cash" }]) }));
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? Promise.reject(Error("Disconnected")) : Response.json({ data: [], pagination: { totalPages: 1 } })));
  const cache = client(); const view = render(<QueryClientProvider client={cache}><FeesPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByText("Confirm pending payment"));
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  expect(localStorage.getItem(key)).not.toBeNull();
  session.user.id = "other-owner";
  view.rerender(<QueryClientProvider client={cache}><FeesPage /></QueryClientProvider>);
  await waitFor(() => expect(screen.queryByText("Confirm pending payment")).toBeNull());
  expect(localStorage.getItem(key)).not.toBeNull();
});

it("does not send or replace a payment attempt while another tab holds its lock", async () => {
  const key = "shabab-payment-attempt:synthetic-owner";
  const pending = JSON.stringify({ key: "other-tab-key", fingerprint: JSON.stringify(["fee", { participantId: "p", amount: 100, method: "cash" }]) });
  localStorage.setItem(key, pending);
  vi.mocked(navigator.locks.request).mockImplementation((async (_name: string, _options: unknown, callback: (lock: null) => unknown) => callback(null)) as typeof navigator.locks.request);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [], pagination: { totalPages: 1 } })));
  render(<QueryClientProvider client={client()}><FeesPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByText("Confirm pending payment"));
  await waitFor(() => expect(navigator.locks.request).toHaveBeenCalled());
  expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.method !== "POST")).toBe(true);
  expect(localStorage.getItem(key)).toBe(pending);
});

it("selects a real calling campaign and loads its next lead page and persisted scripts", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("/leads")) return Response.json(Array.from({ length: 20 }, (_, i) => ({ id: String(i), status: "pending", callerName: "Synthetic caller", notes: null, application: { applicantName: "Synthetic lead " + i, guardianPhone: null } })));
    if (url.includes("/templates")) return Response.json([{ id: "script", title: "Persisted script", body: "Approved synthetic content", status: "approved" }]);
    return Response.json([{ id: "real-campaign", cityId: "city", name: "Actual campaign", status: "active" }]);
  }));
  render(<QueryClientProvider client={client()}><MobileCallingPage /></QueryClientProvider>);
  fireEvent.change(await screen.findByLabelText("Calling campaign"), { target: { value: "real-campaign" } });
  expect(await screen.findByText("Synthetic lead 0")).toBeTruthy(); expect(await screen.findByText("Persisted script")).toBeTruthy();
  fireEvent.click(screen.getByText("Next"));
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("real-campaign/leads?status=all&page=2&pageSize=20"))).toBe(true));
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/default/"))).toBe(false);
});

it("shows a calling load failure instead of an invented empty pipeline", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, { status: 503 })));
  render(<QueryClientProvider client={client()}><MobileCallingPage /></QueryClientProvider>);
  expect((await screen.findByRole("alert")).textContent).toContain("Campaigns could not be loaded");
  expect(screen.queryByText("No active campaigns in your scope.")).toBeNull();
});

function storage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, String(value)); }, removeItem: (key: string) => { values.delete(key); }, clear: () => values.clear() }; }
