/**
 * Mashwara UI Validation Schemas
 */
import { describe, expect, it } from "vitest";
import { createMashwaraSchema, STATUS_STYLES } from "./_client";
import { decisionFormSchema } from "@/components/mashwara/MashwaraDecisionModal";
import { shareFormSchema } from "@/components/mashwara/MashwaraShareModal";

describe("Mashwara UI Validation Schemas", () => {
  describe("createMashwaraSchema", () => {
    it("accepts a valid mashwara creation payload", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "Lahore Weekly Mashwara #1",
        scheduledAt: "2026-08-01T10:00:00.000Z",
        location: "GULBERG_PARK",
        minutesSummary: "Discussion on upcoming youth event",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal payload without optional location or summary", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "Weekly Sync",
        scheduledAt: "2026-08-01T10:00:00",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "  ",
        scheduledAt: "2026-08-01T10:00:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing cityId", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "",
        title: "Weekly Sync",
        scheduledAt: "2026-08-01T10:00:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing scheduledAt", () => {
      const result = createMashwaraSchema.safeParse({
        cityId: "city-lahore-123",
        title: "Weekly Sync",
        scheduledAt: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("decisionFormSchema", () => {
    it("accepts valid decision without action item", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Approve event budget for sports day",
        category: "Budget",
        targetTeamId: "team-sports-1",
        assignedToId: "staff-123",
        hasActionItem: false,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid decision with action item", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Organize park welcome banner",
        category: "Logistics",
        targetTeamId: "team-media-1",
        assignedToId: "staff-123",
        hasActionItem: true,
        actionItemDescription: "Design and print 10 foot banner",
        actionItemTeamId: "team-media-1",
        actionItemAssignedToId: "staff-123",
        actionItemDueDate: "2026-08-10",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty decision text", () => {
      const result = decisionFormSchema.safeParse({
        decision: "",
        hasActionItem: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects action item when description is missing", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Setup welcome desk",
        hasActionItem: true,
        actionItemDescription: "",
        actionItemTeamId: "team-media-1",
        actionItemAssignedToId: "staff-123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects action item when team or assignee is missing", () => {
      const result = decisionFormSchema.safeParse({
        decision: "Setup welcome desk",
        hasActionItem: true,
        actionItemDescription: "Prepare welcome counter",
        actionItemTeamId: "",
        actionItemAssignedToId: "staff-123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("shareFormSchema", () => {
    it("accepts a valid staffMetaId", () => {
      const result = shareFormSchema.safeParse({
        staffMetaId: "sm-staff-999",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty staffMetaId", () => {
      const result = shareFormSchema.safeParse({
        staffMetaId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("STATUS_STYLES", () => {
    it("has styling classes defined for all meeting statuses", () => {
      expect(STATUS_STYLES.scheduled).toBeDefined();
      expect(STATUS_STYLES.in_progress).toBeDefined();
      expect(STATUS_STYLES.completed).toBeDefined();
      expect(STATUS_STYLES.cancelled).toBeDefined();
    });
  });
});
