import { describe, expect, it, vi } from "vitest";

// Mock next-auth and react-related dependencies if they attempt to execute or render
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/stores/useAppStore", () => ({
  useAppStore: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { getNavItems } from "./sidebar";

describe("Sidebar Navigation Access Boundaries", () => {
  const tMock = (key: string) => key;

  it("permits super_admin access to the Cities page", () => {
    const items = getNavItems("super_admin", tMock);
    const hasCities = items.some((item) => item.id === "admin-cities");
    expect(hasCities).toBe(true);
  });

  it("permits program_admin access to the Cities page", () => {
    const items = getNavItems("program_admin", tMock);
    const hasCities = items.some((item) => item.id === "admin-cities");
    expect(hasCities).toBe(true);
  });

  it("denies city_head access to the Cities page", () => {
    const items = getNavItems("city_head", tMock);
    const hasCities = items.some((item) => item.id === "admin-cities");
    expect(hasCities).toBe(false);
  });

  it("denies park_admin, park_lead, and murabbi access to the Cities page", () => {
    const roles = ["park_admin", "park_lead", "murabbi"] as const;
    for (const role of roles) {
      const items = getNavItems(role, tMock);
      const hasCities = items.some((item) => item.id === "admin-cities");
      expect(hasCities).toBe(false);
    }
  });
});
