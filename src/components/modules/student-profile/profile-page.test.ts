import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudentProfilePage, ProfileCapabilities } from "./profile-page";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
  keepPreviousData: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => React.createElement("div", null, children),
  TabsList: ({ children }: any) => React.createElement("div", null, children),
  TabsTrigger: ({ children }: any) => React.createElement("button", null, children),
  TabsContent: ({ children }: any) => React.createElement("div", null, children),
}));

let callCount = 0;

// We need to mock useState to force editMode=true for this test
vi.mock("react", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useState: vi.fn((init) => {
      callCount++;
      if (callCount === 1) return [true, vi.fn()]; // editMode = true
      if (callCount === 2) return [false, vi.fn()]; // showSensitive = false
      if (callCount === 3) return [{}, vi.fn()]; // draft = {}
      return [init, vi.fn()];
    }),
  };
});

describe("Extended StudentProfilePage Component UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    mocks.useQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    });
    mocks.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders Support & Wellbeing tab in edit mode when user has canManageSensitive but not canViewSensitive", () => {
    mocks.useQuery.mockReturnValue({
      data: {
        school: "Test School",
      },
      isLoading: false,
      error: null,
    });

    const capabilities: ProfileCapabilities = {
      canView: true,
      canManage: true,
      canViewSensitive: false,
      canManageSensitive: true,
    };

    const html = renderToString(
      React.createElement(StudentProfilePage, {
        participantId: "p-1",
        capabilities,
      })
    );

    // Support & Wellbeing tab should be rendered
    expect(html).toContain("Support &amp; Wellbeing");

    // The sensitive field (Financial Status) should be rendered because we are in edit mode and have manage capability
    expect(html).toContain("Financial Status (Sensitive)");
  });
});
