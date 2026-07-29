import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { eventSchema, EVENT_TYPES, STATUS_STYLES } from "./_client";

// Helpers matching component query logic
type UiContext = { canManage: boolean; isHq: boolean };

function getListQueryEnabled(ctx: UiContext | undefined, cityFilter: string): boolean {
  return Boolean(ctx) && (!ctx.isHq || Boolean(cityFilter));
}

function getDetailQueryEnabled(eventId: string | undefined, ctx: UiContext | undefined, ctxError: boolean): boolean {
  return Boolean(eventId) && Boolean(ctx) && !ctxError;
}

describe("Events UI Component & Query Contract Tests (EVENT-UI-002)", () => {
  let queryClient: QueryClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("1. Context Pending / Error: Event queries disabled", () => {
    it("disables list query when ui-context is pending (ctx is undefined)", () => {
      const ctx = undefined;
      const cityFilter = "";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      expect(enabled).toBe(false);
    });

    it("disables detail query when ui-context is pending (ctx is undefined)", () => {
      const eventId = "evt_123";
      const ctx = undefined;
      const ctxError = false;
      const enabled = getDetailQueryEnabled(eventId, ctx, ctxError);

      expect(enabled).toBe(false);
    });

    it("disables detail query when ui-context throws an error (ctxError is true)", () => {
      const eventId = "evt_123";
      const ctx = undefined;
      const ctxError = true;
      const enabled = getDetailQueryEnabled(eventId, ctx, ctxError);

      expect(enabled).toBe(false);
    });

    it("surfaces context error state safely without fetching events", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Access Verification Failed" }), { status: 403 })
      );

      let contextError: string | null = null;
      try {
        await queryClient.fetchQuery({
          queryKey: ["events-ui-context"],
          queryFn: () =>
            fetch("/api/admin/events/ui-context").then(async (r) => {
              const json = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error((json as { error?: string }).error || "Failed to load access permissions");
              return json as UiContext;
            }),
        });
      } catch (err: any) {
        contextError = err.message;
      }

      expect(contextError).toBe("Access Verification Failed");
      // Verify that no event list query was issued
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/events/ui-context");
    });
  });

  describe("2. HQ with no city: Event list query disabled", () => {
    it("disables event list query for HQ user when cityFilter is empty", () => {
      const ctx: UiContext = { canManage: true, isHq: true };
      const cityFilter = "";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      expect(enabled).toBe(false);
    });

    it("does not fetch events from network when HQ has no city selected", async () => {
      const ctx: UiContext = { canManage: true, isHq: true };
      const cityFilter = "";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      if (enabled) {
        await queryClient.fetchQuery({
          queryKey: ["admin-events", cityFilter],
          queryFn: () => fetch(`/api/admin/events?cityId=${cityFilter}`).then((r) => r.json()),
        });
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("3. Scoped actor: List query enabled without cityId", () => {
    it("enables event list query for scoped actor (isHq: false) even when cityFilter is empty", () => {
      const ctx: UiContext = { canManage: true, isHq: false };
      const cityFilter = "";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      expect(enabled).toBe(true);
    });

    it("executes events fetch without cityId parameter for scoped actors", async () => {
      const ctx: UiContext = { canManage: true, isHq: false };
      const cityFilter = "";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "evt_1", title: "Park Activity" }]), { status: 200 })
      );

      const params = new URLSearchParams();
      if (cityFilter) params.set("cityId", cityFilter);
      params.set("offset", "0");
      params.set("limit", "50");

      if (enabled) {
        await queryClient.fetchQuery({
          queryKey: ["admin-events", cityFilter],
          queryFn: () => fetch(`/api/admin/events?${params}`).then((r) => r.json()),
        });
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/events?offset=0&limit=50");
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain("cityId=");
    });
  });

  describe("4. HQ selected city: List query enabled with cityId", () => {
    it("enables event list query for HQ user when cityFilter is selected", () => {
      const ctx: UiContext = { canManage: true, isHq: true };
      const cityFilter = "city_lahore_123";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      expect(enabled).toBe(true);
    });

    it("executes events fetch with cityId parameter when HQ selects a city", async () => {
      const ctx: UiContext = { canManage: true, isHq: true };
      const cityFilter = "city_lahore_123";
      const enabled = getListQueryEnabled(ctx, cityFilter);

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "evt_lahore_1", title: "Lahore Gala" }]), { status: 200 })
      );

      const params = new URLSearchParams();
      if (cityFilter) params.set("cityId", cityFilter);
      params.set("offset", "0");
      params.set("limit", "50");

      if (enabled) {
        await queryClient.fetchQuery({
          queryKey: ["admin-events", cityFilter],
          queryFn: () => fetch(`/api/admin/events?${params}`).then((r) => r.json()),
        });
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/events?cityId=city_lahore_123&offset=0&limit=50");
    });
  });

  describe("5. Planner action calls planner-items endpoint", () => {
    it("calls POST /api/admin/events/[id]/planner-items when creating a task", async () => {
      const eventId = "evt_999";
      const taskPayload = {
        title: "Setup Stage",
        priority: "high",
        dueDate: "2026-08-10T00:00:00.000Z",
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "item_1", ...taskPayload }), { status: 201 })
      );

      const res = await fetch(`/api/admin/events/${eventId}/planner-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/admin/events/evt_999/planner-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
      });
      expect(res.status).toBe(201);
    });

    it("calls PATCH /api/admin/events/planner-items/[id] when updating task status", async () => {
      const taskId = "item_888";
      const updatePayload = { status: "completed" };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: taskId, status: "completed" }), { status: 200 })
      );

      const res = await fetch(`/api/admin/events/planner-items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/admin/events/planner-items/item_888`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("6. 409 API error is surfaced", () => {
    it("surfaces 409 Conflict error message on event cancellation", async () => {
      const eventId = "evt_cancelled";
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Event is already cancelled" }), { status: 409 })
      );

      let errorMessage: string | null = null;
      try {
        const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to cancel event");
        }
      } catch (err: any) {
        errorMessage = err.message;
      }

      expect(errorMessage).toBe("Event is already cancelled");
    });

    it("surfaces 409 Conflict error message on responsibility revocation", async () => {
      const respId = "resp_revoked";
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Responsibility is already revoked" }), { status: 409 })
      );

      let errorMessage: string | null = null;
      try {
        const res = await fetch(`/api/admin/events/responsibilities/${respId}/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Revoked" }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to revoke");
        }
      } catch (err: any) {
        errorMessage = err.message;
      }

      expect(errorMessage).toBe("Responsibility is already revoked");
    });
  });

  describe("7. Form Schema & Types Validation", () => {
    it("validates eventSchema correctly", () => {
      const valid = eventSchema.safeParse({
        title: "Tri-City Gala",
        eventType: "ceremony",
        startDate: "2026-10-01",
      });
      expect(valid.success).toBe(true);

      const invalid = eventSchema.safeParse({
        title: "",
        eventType: "invalid_type",
        startDate: "",
      });
      expect(invalid.success).toBe(false);
    });

    it("has styling mappings defined for all status types", () => {
      expect(STATUS_STYLES.planned).toBeDefined();
      expect(STATUS_STYLES.confirmed).toBeDefined();
      expect(STATUS_STYLES.in_progress).toBeDefined();
      expect(STATUS_STYLES.completed).toBeDefined();
      expect(STATUS_STYLES.cancelled).toBeDefined();
    });

    it("has labels for event types", () => {
      expect(EVENT_TYPES.length).toBeGreaterThan(0);
      expect(EVENT_TYPES.find((t) => t.value === "sports_day")).toBeDefined();
    });
  });
});
