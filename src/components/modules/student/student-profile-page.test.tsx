import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudentProfilePage } from "./student-profile-page";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StudentProfilePage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    });
    mocks.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders populated Age and Grade / Class values when profile data is returned", () => {
    mocks.useQuery.mockReturnValue({
      data: {
        id: "user-1",
        name: "Ali Ahmed",
        email: "ali@example.com",
        phone: "+923001234567",
        createdAt: "2026-01-01T00:00:00.000Z",
        participant: {
          id: "part-1",
          name: "Ali Ahmed",
          phone: "+923001234567",
          dateOfBirth: "15 May 2009",
          gender: "male",
          age: 17,
          gradeClass: "Grade 10",
          address: "Lahore",
          state: "active",
          joinedAt: "10 Jan 2026",
          group: "Group A",
          batch: "Batch 4",
          park: "State Life Park",
          city: "Lahore",
        },
        attendanceSummary: null,
      },
      isLoading: false,
      error: null,
    });

    const html = renderToString(<StudentProfilePage />);

    expect(html).toContain("Personal Information");
    expect(html).toContain("Age");
    expect(html).toContain("17");
    expect(html).toContain("Grade / Class");
    expect(html).toContain("Grade 10");
  });

  it("renders 'Not provided' fallback when Age and Grade / Class are null", () => {
    mocks.useQuery.mockReturnValue({
      data: {
        id: "user-2",
        name: "Usman Khan",
        email: "usman@example.com",
        phone: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        participant: {
          id: "part-2",
          name: "Usman Khan",
          phone: null,
          dateOfBirth: null,
          gender: null,
          age: null,
          gradeClass: null,
          address: null,
          state: "active",
          joinedAt: "10 Jan 2026",
          group: "Group B",
          batch: "Batch 4",
          park: "Iqbal Park",
          city: "Lahore",
        },
        attendanceSummary: null,
      },
      isLoading: false,
      error: null,
    });

    const html = renderToString(<StudentProfilePage />);

    expect(html).toContain("Personal Information");
    expect(html).toContain("Age");
    expect(html).toContain("Grade / Class");
    expect(html).toContain("Not provided");
  });

  it("renders 'Not provided' fallback when gradeClass is empty string", () => {
    mocks.useQuery.mockReturnValue({
      data: {
        id: "user-3",
        name: "Zainab Bibi",
        email: "zainab@example.com",
        phone: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        participant: {
          id: "part-3",
          name: "Zainab Bibi",
          phone: null,
          dateOfBirth: null,
          gender: null,
          age: null,
          gradeClass: "",
          address: null,
          state: "active",
          joinedAt: "10 Jan 2026",
          group: "Group C",
          batch: "Batch 4",
          park: "Iqbal Park",
          city: "Lahore",
        },
        attendanceSummary: null,
      },
      isLoading: false,
      error: null,
    });

    const html = renderToString(<StudentProfilePage />);

    expect(html).toContain("Personal Information");
    expect(html).toContain("Grade / Class");
    expect(html).toContain("Not provided");
  });
});
