import { describe, it, expect } from "vitest";
import {
  createContentPlanSchema,
  updateContentPlanSchema,
  createSessionSchema,
  updateSessionSchema,
  createBlockSchema,
  updateBlockSchema,
  createResourceSchema,
  createActivitySchema,
  updateActivitySchema,
  contentCategorySchema,
  planKindSchema,
  planStatusSchema,
  sessionStatusSchema,
  blockStatusSchema,
  validateNotOffDay,
  validateCategoryTeamMapping,
  CONTENT_PLAN_LIMITS,
} from "./validation";

describe("Content Planner Validation", () => {
  describe("contentCategorySchema", () => {
    it("should accept approved categories", () => {
      expect(contentCategorySchema.parse("exercises")).toBe("exercises");
      expect(contentCategorySchema.parse("sports")).toBe("sports");
      expect(contentCategorySchema.parse("skills")).toBe("skills");
      expect(contentCategorySchema.parse("tadreeb")).toBe("tadreeb");
    });

    it("should reject unapproved categories", () => {
      expect(() => contentCategorySchema.parse("media")).toThrow();
      expect(() => contentCategorySchema.parse("muawin")).toThrow();
      expect(() => contentCategorySchema.parse("invalid")).toThrow();
    });
  });

  describe("planKindSchema", () => {
    it("should accept template and override", () => {
      expect(planKindSchema.parse("template")).toBe("template");
      expect(planKindSchema.parse("override")).toBe("override");
    });

    it("should reject invalid kinds", () => {
      expect(() => planKindSchema.parse("invalid")).toThrow();
    });
  });

  describe("planStatusSchema", () => {
    it("should accept valid statuses", () => {
      expect(planStatusSchema.parse("draft")).toBe("draft");
      expect(planStatusSchema.parse("published")).toBe("published");
      expect(planStatusSchema.parse("archived")).toBe("archived");
    });

    it("should reject invalid statuses", () => {
      expect(() => planStatusSchema.parse("invalid")).toThrow();
    });
  });

  describe("createContentPlanSchema", () => {
    it("should accept valid plan creation", () => {
      const validPlan = {
        cityId: "city1",
        name: "Lahore Batch 4 Template",
        kind: "template" as const,
      };

      const result = createContentPlanSchema.parse(validPlan);
      expect(result.cityId).toBe("city1");
      expect(result.name).toBe("Lahore Batch 4 Template");
      expect(result.kind).toBe("template");
    });

    it("should accept plan with optional fields", () => {
      const validPlan = {
        cityId: "city1",
        batchId: "batch1",
        parkId: "park1",
        basePlanId: "plan1",
        name: "State Life School Override",
        kind: "override" as const,
        sourceWorkbook: "B4_ Shabab Content Plan.xlsx",
        sourceSheet: "State Life School",
      };

      const result = createContentPlanSchema.parse(validPlan);
      expect(result.batchId).toBe("batch1");
      expect(result.parkId).toBe("park1");
      expect(result.basePlanId).toBe("plan1");
      expect(result.sourceWorkbook).toBe("B4_ Shabab Content Plan.xlsx");
    });

    it("should reject missing required fields", () => {
      expect(() => createContentPlanSchema.parse({})).toThrow();
      expect(() =>
        createContentPlanSchema.parse({ cityId: "city1" })
      ).toThrow();
    });

    it("should reject name exceeding limit", () => {
      const tooLongName = "x".repeat(CONTENT_PLAN_LIMITS.name + 1);
      expect(() =>
        createContentPlanSchema.parse({
          cityId: "city1",
          name: tooLongName,
        })
      ).toThrow();
    });

    it("should trim whitespace from fields", () => {
      const result = createContentPlanSchema.parse({
        cityId: "  city1  ",
        name: "  Test Plan  ",
      });
      expect(result.cityId).toBe("city1");
      expect(result.name).toBe("Test Plan");
    });
  });

  describe("updateContentPlanSchema", () => {
    it("should accept valid updates", () => {
      const update = {
        name: "Updated Plan Name",
        status: "published" as const,
      };

      const result = updateContentPlanSchema.parse(update);
      expect(result.name).toBe("Updated Plan Name");
      expect(result.status).toBe("published");
    });

    it("should accept partial updates", () => {
      const result = updateContentPlanSchema.parse({ name: "New Name" });
      expect(result.name).toBe("New Name");
      expect(result.status).toBeUndefined();
    });

    it("should reject name exceeding limit", () => {
      const tooLongName = "x".repeat(CONTENT_PLAN_LIMITS.name + 1);
      expect(() =>
        updateContentPlanSchema.parse({ name: tooLongName })
      ).toThrow();
    });
  });

  describe("createSessionSchema", () => {
    it("should accept valid session creation", () => {
      const validSession = {
        planId: "plan1",
        weekLabel: "Week 1",
        dayLabel: "Day 1",
        sessionDate: "2026-07-25",
        focusArea: "Character Building",
        isOffDay: false,
      };

      const result = createSessionSchema.parse(validSession);
      expect(result.planId).toBe("plan1");
      expect(result.sessionDate).toBe("2026-07-25");
      expect(result.focusArea).toBe("Character Building");
    });

    it("should accept off-day session without focusArea", () => {
      const offDaySession = {
        planId: "plan1",
        sessionDate: "2026-07-26",
        isOffDay: true,
      };

      const result = createSessionSchema.parse(offDaySession);
      expect(result.isOffDay).toBe(true);
      expect(result.focusArea).toBeUndefined();
    });

    it("should reject off-day session with focusArea", () => {
      const invalidSession = {
        planId: "plan1",
        sessionDate: "2026-07-26",
        isOffDay: true,
        focusArea: "Not allowed",
      };

      expect(() => createSessionSchema.parse(invalidSession)).toThrow(
        "Off-day sessions cannot have a focus area"
      );
    });

    it("should reject invalid date format", () => {
      expect(() =>
        createSessionSchema.parse({
          planId: "plan1",
          sessionDate: "2026/07/25",
        })
      ).toThrow();

      expect(() =>
        createSessionSchema.parse({
          planId: "plan1",
          sessionDate: "25-07-2026",
        })
      ).toThrow();
    });

    it("should accept optional sourceRow", () => {
      const result = createSessionSchema.parse({
        planId: "plan1",
        sessionDate: "2026-07-25",
        sourceRow: 42,
      });
      expect(result.sourceRow).toBe(42);
    });
  });

  describe("createBlockSchema", () => {
    it("should accept valid block creation", () => {
      const validBlock = {
        sessionId: "session1",
        teamId: "team1",
        category: "sports" as const,
        title: "Football Practice",
        content: "Basic football drills and teamwork",
        sortOrder: 0,
      };

      const result = createBlockSchema.parse(validBlock);
      expect(result.category).toBe("sports");
      expect(result.content).toBe("Basic football drills and teamwork");
    });

    it("should accept block without title", () => {
      const result = createBlockSchema.parse({
        sessionId: "session1",
        teamId: "team1",
        category: "skills",
        content: "Content without title",
      });
      expect(result.title).toBeUndefined();
    });

    it("should reject unapproved category", () => {
      expect(() =>
        createBlockSchema.parse({
          sessionId: "session1",
          teamId: "team1",
          category: "media",
          content: "Not allowed",
        })
      ).toThrow();
    });

    it("should reject empty content", () => {
      expect(() =>
        createBlockSchema.parse({
          sessionId: "session1",
          teamId: "team1",
          category: "sports",
          content: "",
        })
      ).toThrow();
    });

    it("should reject content exceeding limit", () => {
      const tooLongContent = "x".repeat(CONTENT_PLAN_LIMITS.content + 1);
      expect(() =>
        createBlockSchema.parse({
          sessionId: "session1",
          teamId: "team1",
          category: "sports",
          content: tooLongContent,
        })
      ).toThrow();
    });

    it("should default sortOrder to 0", () => {
      const result = createBlockSchema.parse({
        sessionId: "session1",
        teamId: "team1",
        category: "sports",
        content: "Test content",
      });
      expect(result.sortOrder).toBe(0);
    });
  });

  describe("createResourceSchema", () => {
    it("should accept valid external link", () => {
      const validResource = {
        blockId: "block1",
        label: "Video Tutorial",
        url: "https://www.youtube.com/watch?v=example",
        kind: "external_link" as const,
      };

      const result = createResourceSchema.parse(validResource);
      expect(result.url).toBe("https://www.youtube.com/watch?v=example");
      expect(result.kind).toBe("external_link");
    });

    it("should default kind to external_link", () => {
      const result = createResourceSchema.parse({
        blockId: "block1",
        label: "Resource",
        url: "https://example.com/resource",
      });
      expect(result.kind).toBe("external_link");
    });

    it("should reject invalid URL", () => {
      expect(() =>
        createResourceSchema.parse({
          blockId: "block1",
          label: "Invalid",
          url: "not-a-url",
        })
      ).toThrow();
    });

    it("should reject missing label", () => {
      expect(() =>
        createResourceSchema.parse({
          blockId: "block1",
          url: "https://example.com",
        })
      ).toThrow();
    });
  });

  describe("createActivitySchema", () => {
    it("should accept valid activity creation", () => {
      const validActivity = {
        teamId: "team1",
        contentBlockId: "block1",
        assignedStaffMetaId: "staff1",
        title: "Prepare football field",
        description: "Set up cones and goals",
        scheduledFor: "2026-07-25",
      };

      const result = createActivitySchema.parse(validActivity);
      expect(result.title).toBe("Prepare football field");
      expect(result.scheduledFor).toBe("2026-07-25");
    });

    it("should accept activity without optional fields", () => {
      const result = createActivitySchema.parse({
        teamId: "team1",
        title: "Simple Activity",
      });
      expect(result.contentBlockId).toBeUndefined();
      expect(result.assignedStaffMetaId).toBeUndefined();
    });

    it("should reject missing title", () => {
      expect(() =>
        createActivitySchema.parse({
          teamId: "team1",
        })
      ).toThrow();
    });
  });

  describe("validateNotOffDay", () => {
    it("should return true for non-off-day", () => {
      expect(validateNotOffDay(false)).toBe(true);
    });

    it("should throw error for off-day", () => {
      expect(() => validateNotOffDay(true)).toThrow(
        "Cannot create content blocks for off-day sessions"
      );
    });
  });

  describe("validateCategoryTeamMapping", () => {
    it("should validate exercises maps to sports team", () => {
      expect(validateCategoryTeamMapping("exercises", "sports")).toBe(true);
    });

    it("should validate sports maps to sports team", () => {
      expect(validateCategoryTeamMapping("sports", "sports")).toBe(true);
    });

    it("should validate skills maps to skills team", () => {
      expect(validateCategoryTeamMapping("skills", "skills")).toBe(true);
    });

    it("should validate tadreeb maps to tadreeb team", () => {
      expect(validateCategoryTeamMapping("tadreeb", "tadreeb")).toBe(true);
    });

    it("should reject invalid category", () => {
      expect(() => validateCategoryTeamMapping("media", "media")).toThrow(
        "Invalid category"
      );
    });

    it("should reject mismatched team code", () => {
      expect(() =>
        validateCategoryTeamMapping("sports", "skills")
      ).toThrow("Category 'sports' must use team 'sports', got 'skills'");
    });
  });
});
