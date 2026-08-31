import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));

import { MobileContentPlannerPage } from "./mobile-content-planner-page";

function queryConfig(calls: unknown[], key: string) {
  return calls.find((call) => {
    const config = call as { queryKey?: unknown };
    return Array.isArray(config.queryKey) && config.queryKey[0] === key;
  }) as { enabled?: boolean; queryKey?: unknown[] } | undefined;
}

describe("MobileContentPlannerPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires HQ to select a city before requesting plans", () => {
    const calls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      calls.push(options);
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, isHq: true }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-cities") {
        return { data: { data: [{ id: "city-1", name: "Lahore" }] }, isLoading: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    const html = renderToString(React.createElement(MobileContentPlannerPage));
    expect(html).toContain("Choose a city");
    expect(queryConfig(calls, "pwa-content-planner-plans")?.enabled).toBe(false);
  });

  it("uses server-derived scope for non-HQ users", () => {
    const calls: unknown[] = [];
    mocks.useQuery.mockImplementation((options: unknown) => {
      calls.push(options);
      const key = (options as { queryKey?: unknown[] }).queryKey?.[0];
      if (key === "pwa-content-planner-context") {
        return { data: { canView: true, isHq: false }, isLoading: false, isError: false };
      }
      if (key === "pwa-content-planner-plans") {
        return { data: { plans: [] }, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    renderToString(React.createElement(MobileContentPlannerPage));
    const plans = queryConfig(calls, "pwa-content-planner-plans");
    expect(plans?.enabled).toBe(true);
    expect(plans?.queryKey).toEqual(["pwa-content-planner-plans", "scoped"]);
  });
});
