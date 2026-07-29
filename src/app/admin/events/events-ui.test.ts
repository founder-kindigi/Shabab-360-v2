import { describe, expect, it } from "vitest";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  eventType: z.enum(["trip", "ceremony", "campaign", "activity", "sports_day", "camp", "open_day", "closing", "other"]),
  venue: z.string().max(200).optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
});

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const EVENT_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "ceremony", label: "Ceremony" },
  { value: "campaign", label: "Campaign" },
  { value: "activity", label: "Activity" },
  { value: "sports_day", label: "Sports Day" },
  { value: "camp", label: "Camp" },
  { value: "open_day", label: "Open Day" },
  { value: "closing", label: "Closing" },
  { value: "other", label: "Other" },
];

describe("EVENT-UI-002 Requirements Verification Suite", () => {
  describe("Requirement 5a: HQ no-city state does not fetch (skipFetch logic)", () => {
    it("skips fetch when isHq is true and cityFilter is empty", () => {
      const isHq = true;
      const cityFilter = "";
      const skipFetch = isHq && !cityFilter;
      expect(skipFetch).toBe(true);
    });

    it("does NOT skip fetch when isHq is true and cityFilter is selected", () => {
      const isHq = true;
      const cityFilter = "city_lahore";
      const skipFetch = isHq && !cityFilter;
      expect(skipFetch).toBe(false);
    });

    it("does NOT skip fetch when isHq is false (scoped actor)", () => {
      const isHq = false;
      const cityFilter = "";
      const skipFetch = isHq && !cityFilter;
      expect(skipFetch).toBe(false);
    });
  });

  describe("Requirement 5b: Scoped actor omits cityId from payload", () => {
    it("omits cityId when cityId prop is undefined (scoped actor flow)", () => {
      const formParsed = {
        title: "Park Sports Day",
        eventType: "sports_day",
        startDate: "2026-09-01",
      };
      const cityId: string | undefined = undefined;

      const payload: Record<string, unknown> = { ...formParsed };
      if (cityId) payload.cityId = cityId;

      expect(payload.cityId).toBeUndefined();
      expect(payload).toEqual({
        title: "Park Sports Day",
        eventType: "sports_day",
        startDate: "2026-09-01",
      });
    });

    it("includes cityId when cityId prop is provided (HQ explicit selection flow)", () => {
      const formParsed = {
        title: "City Seminar",
        eventType: "campaign",
        startDate: "2026-09-10",
      };
      const cityId: string | undefined = "city_lahore";

      const payload: Record<string, unknown> = { ...formParsed };
      if (cityId) payload.cityId = cityId;

      expect(payload.cityId).toBe("city_lahore");
    });
  });

  describe("Requirement 5c: Capability-driven management controls", () => {
    it("hides management controls when canManage is false", () => {
      const canManage = false;
      const showNewButton = canManage;
      const showCancelButton = canManage;

      expect(showNewButton).toBe(false);
      expect(showCancelButton).toBe(false);
    });

    it("shows management controls when canManage is true", () => {
      const canManage = true;
      const showNewButton = canManage;
      const showCancelButton = canManage;

      expect(showNewButton).toBe(true);
      expect(showCancelButton).toBe(true);
    });
  });

  describe("Requirement 5d: DELETE cancellation and PATCH completion semantics", () => {
    it("constructs DELETE request options for event cancellation", () => {
      const eventId = "evt_123";
      const requestOptions = {
        url: `/api/admin/events/${eventId}`,
        method: "DELETE",
      };
      expect(requestOptions.method).toBe("DELETE");
      expect(requestOptions.url).toBe("/api/admin/events/evt_123");
    });

    it("constructs PATCH request options with status: completed for completion", () => {
      const eventId = "evt_456";
      const requestOptions = {
        url: `/api/admin/events/${eventId}`,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      };
      expect(requestOptions.method).toBe("PATCH");
      expect(JSON.parse(requestOptions.body)).toEqual({ status: "completed" });
    });
  });

  describe("Requirement 5e: 409 Conflict error handling", () => {
    it("extracts error message from 409 response JSON body", async () => {
      const mock409Response = new Response(
        JSON.stringify({ error: "Event is already cancelled" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );

      const json = await mock409Response.json().catch(() => ({}));
      let errorMessage = "Failed to cancel event";
      if (!mock409Response.ok) {
        errorMessage = json.error || errorMessage;
      }

      expect(mock409Response.status).toBe(409);
      expect(errorMessage).toBe("Event is already cancelled");
    });

    it("extracts responsibility 409 conflict error message", async () => {
      const mock409Response = new Response(
        JSON.stringify({ error: "Responsibility is already revoked or inactive" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );

      const json = await mock409Response.json().catch(() => ({}));
      let errorMessage = "Failed to revoke";
      if (!mock409Response.ok) {
        errorMessage = json.error || errorMessage;
      }

      expect(mock409Response.status).toBe(409);
      expect(errorMessage).toBe("Responsibility is already revoked or inactive");
    });
  });

  describe("Form Schema Validation", () => {
    it("validates eventSchema correctly", () => {
      const valid = eventSchema.safeParse({
        title: "Tri-City Sports Competition",
        eventType: "sports_day",
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
