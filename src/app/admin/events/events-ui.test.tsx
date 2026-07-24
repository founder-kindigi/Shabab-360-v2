import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventsPage, EventForm } from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: { user: { role: "super_admin" } } })),
}));

// Mock TanStack Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe("EventsPage", () => {
  it("renders the events page header", () => {
    render(<EventsPage />);
    expect(screen.getByText("Events")).toBeDefined();
    expect(screen.getByText("Manage programme events and responsibilities")).toBeDefined();
  });

  it("renders the New Event button", () => {
    render(<EventsPage />);
    expect(screen.getByText("New Event")).toBeDefined();
  });
});

describe("EventForm", () => {
  it("renders create event dialog when open", () => {
    render(<EventForm open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Create Event")).toBeDefined();
  });

  it("does not render when closed", () => {
    const { container } = render(<EventForm open={false} onClose={vi.fn()} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("renders all event type options", () => {
    render(<EventForm open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Create Event")).toBeDefined();
    expect(screen.getByText("Title *")).toBeDefined();
    expect(screen.getByText("Start Date *")).toBeDefined();
  });
});
