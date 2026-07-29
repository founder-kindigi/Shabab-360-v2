import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock react's useState before importing components
let mockCityFilter = "";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  let stateIndex = 0;
  return {
    ...actual,
    useState: (initial: any) => {
      if (typeof initial === "boolean") return [false, vi.fn()];
      if (initial === "activity" || initial === "medium") return [initial, vi.fn()];
      stateIndex++;
      if (stateIndex % 2 === 0) {
        return [mockCityFilter, vi.fn()];
      }
      return ["", vi.fn()];
    },
  };
});

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockQueryClient = { invalidateQueries: vi.fn() };

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
  useQueryClient: () => mockQueryClient,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "evt_test_123" }),
}));

import { EventsPage } from "./_client";
import EventDetailPage from "./[id]/_client";

describe("Events UI Component-Level React Query Contract Tests", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockCityFilter = "";

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("1. EventsPage Actual Component List Query Gates", () => {
    it("actual EventsPage list query has enabled: false when ui-context is missing (pending/undefined)", () => {
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: undefined, isLoading: true, isError: false, error: null };
        }
        return { data: undefined };
      });

      EventsPage();

      const listQueryCall = mockUseQuery.mock.calls.find(
        (call) => Array.isArray(call[0]?.queryKey) && call[0].queryKey[0] === "admin-events"
      );

      expect(listQueryCall).toBeDefined();
      expect(listQueryCall[0].enabled).toBe(false);
    });

    it("actual EventsPage list query has enabled: false and renders context error state when ui-context fails", () => {
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: undefined, isLoading: false, isError: true, error: new Error("Access Verification Failed") };
        }
        return { data: undefined };
      });

      const jsx = EventsPage();

      const listQueryCall = mockUseQuery.mock.calls.find(
        (call) => Array.isArray(call[0]?.queryKey) && call[0].queryKey[0] === "admin-events"
      );

      expect(listQueryCall).toBeDefined();
      expect(listQueryCall[0].enabled).toBe(false);

      expect(jsx).toBeDefined();
      expect(JSON.stringify(jsx)).toContain("events-context-error");
    });

    it("actual EventsPage list query has enabled: false when HQ user has no city selected", () => {
      mockCityFilter = "";
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: { isHq: true, canManage: true }, isLoading: false, isError: false };
        }
        return { data: undefined };
      });

      EventsPage();

      const listQueryCall = mockUseQuery.mock.calls.find(
        (call) => Array.isArray(call[0]?.queryKey) && call[0].queryKey[0] === "admin-events"
      );

      expect(listQueryCall).toBeDefined();
      expect(listQueryCall[0].enabled).toBe(false);
    });

    it("actual EventsPage list query has enabled: true when scoped actor loads page without needing cityFilter", () => {
      mockCityFilter = "";
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: { isHq: false, canManage: true }, isLoading: false, isError: false };
        }
        return { data: [] };
      });

      EventsPage();

      const listQueryCall = mockUseQuery.mock.calls.find(
        (call) => Array.isArray(call[0]?.queryKey) && call[0].queryKey[0] === "admin-events"
      );

      expect(listQueryCall).toBeDefined();
      expect(listQueryCall[0].enabled).toBe(true);
    });

    it("actual EventsPage list query has enabled: true when HQ user selects a city", () => {
      mockCityFilter = "city_lahore_123";
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: { isHq: true, canManage: true }, isLoading: false, isError: false };
        }
        return { data: [] };
      });

      EventsPage();

      const listQueryCall = mockUseQuery.mock.calls.find(
        (call) => Array.isArray(call[0]?.queryKey) && call[0].queryKey[0] === "admin-events"
      );

      expect(listQueryCall).toBeDefined();
      expect(listQueryCall[0].enabled).toBe(true);
    });
  });

  describe("2. EventDetailPage Actual Component Detail Query Gates", () => {
    it("actual EventDetailPage detail query has enabled: false on context failure and renders safe access error state", () => {
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: undefined, isLoading: false, isError: true, error: new Error("Context Denial") };
        }
        return { data: undefined };
      });

      const jsx = EventDetailPage();

      const detailQueryCall = mockUseQuery.mock.calls.find(
        (call) => Array.isArray(call[0]?.queryKey) && call[0].queryKey[0] === "event-detail"
      );

      expect(detailQueryCall).toBeDefined();
      expect(detailQueryCall[0].enabled).toBe(false);

      expect(jsx).toBeDefined();
      expect(JSON.stringify(jsx)).toContain("event-detail-context-error");
    });
  });

  describe("3. Actual Component Planner Mutation Endpoints", () => {
    it("actual planner creation mutation calls POST /api/admin/events/[id]/planner-items", async () => {
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: { isHq: false, canManage: true }, isLoading: false, isError: false };
        }
        if (queryKey[0] === "event-detail") {
          return {
            data: {
              id: "evt_test_123",
              title: "Test Event",
              status: "in_progress",
              eventType: "sports_day",
              startDate: "2026-08-01T00:00:00.000Z",
              teams: [],
              responsibilities: [],
              plannerItems: [],
            },
            isLoading: false,
            isError: false,
          };
        }
        return { data: undefined };
      });

      EventDetailPage();

      const createMutationCall = mockUseMutation.mock.calls[2];
      expect(createMutationCall).toBeDefined();

      const mutationFn = createMutationCall[0].mutationFn;

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "item_new_1", title: "" }), { status: 201 })
      );

      await mutationFn();

      expect(mockFetch).toHaveBeenCalledWith("/api/admin/events/evt_test_123/planner-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", priority: "medium" }),
      });
    });

    it("actual planner status update mutation calls PATCH /api/admin/events/planner-items/[id]", async () => {
      mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === "events-ui-context") {
          return { data: { isHq: false, canManage: true }, isLoading: false, isError: false };
        }
        if (queryKey[0] === "event-detail") {
          return {
            data: {
              id: "evt_test_123",
              title: "Test Event",
              status: "in_progress",
              eventType: "sports_day",
              startDate: "2026-08-01T00:00:00.000Z",
              teams: [],
              responsibilities: [],
              plannerItems: [],
            },
            isLoading: false,
            isError: false,
          };
        }
        return { data: undefined };
      });

      EventDetailPage();

      const updateMutationCall = mockUseMutation.mock.calls[3];
      expect(updateMutationCall).toBeDefined();

      const mutationFn = updateMutationCall[0].mutationFn;

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "item_777", status: "completed" }), { status: 200 })
      );

      await mutationFn({ id: "item_777", status: "completed" });

      expect(mockFetch).toHaveBeenCalledWith("/api/admin/events/planner-items/item_777", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    });
  });
});
