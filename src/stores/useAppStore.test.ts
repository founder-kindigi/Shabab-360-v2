import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/stores/useAppStore";

function resetNavigation() {
  useAppStore.setState({
    currentPage: "login",
    previousPage: null,
    navigationHistory: [],
  });
}

describe("useAppStore navigation history", () => {
  beforeEach(resetNavigation);

  it("returns through every visited page instead of only one level", () => {
    const { navigateTo, goBack } = useAppStore.getState();

    navigateTo("admin-dashboard");
    navigateTo("admin-cities");
    navigateTo("admin-parks");

    goBack();
    expect(useAppStore.getState()).toMatchObject({
      currentPage: "admin-cities",
      previousPage: "admin-dashboard",
      navigationHistory: ["login", "admin-dashboard"],
    });

    goBack();
    goBack();
    expect(useAppStore.getState()).toMatchObject({
      currentPage: "login",
      previousPage: null,
      navigationHistory: [],
    });
  });

  it("does not add duplicate entries when navigating to the active page", () => {
    const { navigateTo } = useAppStore.getState();

    navigateTo("admin-dashboard");
    navigateTo("admin-dashboard");

    expect(useAppStore.getState().navigationHistory).toEqual(["login"]);
  });

  it("adds entries when navigating to an already visited page if it is not the immediate active page", () => {
    const { navigateTo } = useAppStore.getState();

    navigateTo("admin-dashboard");
    navigateTo("admin-cities");
    navigateTo("admin-dashboard");

    expect(useAppStore.getState().navigationHistory).toEqual([
      "login",
      "admin-dashboard",
      "admin-cities",
    ]);
    expect(useAppStore.getState().currentPage).toBe("admin-dashboard");
    expect(useAppStore.getState().previousPage).toBe("admin-cities");
  });

  it("keeps history bounded and falls back to login when exhausted", () => {
    const { navigateTo, goBack } = useAppStore.getState();
    const pages = ["admin-dashboard", "admin-cities", "admin-parks"] as const;

    for (let index = 0; index < 30; index++) {
      navigateTo(pages[index % pages.length]);
    }

    // Maximum history boundary is 25 entries
    expect(useAppStore.getState().navigationHistory).toHaveLength(25);

    for (let index = 0; index < 26; index++) {
      goBack();
    }

    expect(useAppStore.getState()).toMatchObject({
      currentPage: "login",
      previousPage: null,
      navigationHistory: [],
    });
  });

  it("checks intermediate step updates of currentPage, previousPage, and history", () => {
    const { navigateTo, goBack } = useAppStore.getState();

    navigateTo("admin-dashboard");
    expect(useAppStore.getState().currentPage).toBe("admin-dashboard");
    expect(useAppStore.getState().previousPage).toBe("login");
    expect(useAppStore.getState().navigationHistory).toEqual(["login"]);

    navigateTo("admin-cities");
    expect(useAppStore.getState().currentPage).toBe("admin-cities");
    expect(useAppStore.getState().previousPage).toBe("admin-dashboard");
    expect(useAppStore.getState().navigationHistory).toEqual(["login", "admin-dashboard"]);

    goBack();
    expect(useAppStore.getState().currentPage).toBe("admin-dashboard");
    expect(useAppStore.getState().previousPage).toBe("login");
    expect(useAppStore.getState().navigationHistory).toEqual(["login"]);

    goBack();
    expect(useAppStore.getState().currentPage).toBe("login");
    expect(useAppStore.getState().previousPage).toBe(null);
    expect(useAppStore.getState().navigationHistory).toEqual([]);

    // Call goBack when empty - should remain at login/null/[]
    goBack();
    expect(useAppStore.getState().currentPage).toBe("login");
    expect(useAppStore.getState().previousPage).toBe(null);
    expect(useAppStore.getState().navigationHistory).toEqual([]);
  });
});
