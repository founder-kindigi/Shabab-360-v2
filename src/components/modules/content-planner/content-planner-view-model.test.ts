import { describe, expect, it } from "vitest";
import {
  blocksForCategory,
  buildContentPlansUrl,
  choosePreferredPlan,
  choosePreferredSession,
} from "./content-planner-view-model";

describe("content planner live view model", () => {
  it("requires HQ selection before adding cityId and never sends an all sentinel", () => {
    expect(buildContentPlansUrl({ isHq: true, cityId: "", status: "all" }))
      .toBe("/api/admin/content-planner/plans?pageSize=50");
    expect(buildContentPlansUrl({ isHq: true, cityId: "city-1", status: "all" }))
      .toBe("/api/admin/content-planner/plans?cityId=city-1&pageSize=50");
  });

  it("omits cityId for scoped actors", () => {
    expect(buildContentPlansUrl({ isHq: false, cityId: "stale-city", status: "draft" }))
      .toBe("/api/admin/content-planner/plans?status=draft&pageSize=50");
  });

  it("opens a published plan before drafts", () => {
    const plans = [
      { id: "draft", status: "draft" },
      { id: "published", status: "published" },
    ];
    expect(choosePreferredPlan(plans)?.id).toBe("published");
  });

  it("opens an actionable session before off-days and cancellations", () => {
    const sessions = [
      { id: "off", isOffDay: true, status: "published" },
      { id: "cancelled", isOffDay: false, status: "cancelled" },
      { id: "active", isOffDay: false, status: "published" },
    ];
    expect(choosePreferredSession(sessions)?.id).toBe("active");
  });

  it("keeps four-pillar content isolated by category", () => {
    const blocks = [
      { id: "1", category: "tadreeb" },
      { id: "2", category: "sports" },
      { id: "3", category: "tadreeb" },
    ];
    expect(blocksForCategory(blocks, "tadreeb").map((block) => block.id))
      .toEqual(["1", "3"]);
  });
});
