/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PublicRegistrationFormPage from "./page";

vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const form = {
  slug: "synthetic-test",
  title: "Synthetic Test",
  intro: "Test only",
  publishedVersion: 1,
  isOpen: true,
  fields: [{ key: "fullName", label: "Full Name", type: "short_text", required: true }],
  settings: { privacyNotice: "Test notice", contactConsentText: "I agree", successText: "Received" },
};

describe("public registration form state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => Response.json(form));
  });

  it("keeps entered answers on review when the published form is refetched", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      render(
        <QueryClientProvider client={client}>
          <PublicRegistrationFormPage params={Promise.resolve({ slug: "synthetic-test" })} />
        </QueryClientProvider>,
      );
    });

    fireEvent.click(await screen.findByRole("button", { name: /Let's get started/i }));
    fireEvent.change(await screen.findByRole("textbox", { name: /Full Name/ }), { target: { value: "Synthetic Applicant" } });
    fireEvent.click(screen.getByRole("button", { name: "Review & Continue" }));
    await screen.findByText("Review your application");
    expect(screen.getByText("Synthetic Applicant")).toBeDefined();

    await client.invalidateQueries({ queryKey: ["public-registration-form", "synthetic-test"] });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Review your application")).toBeDefined();
    expect(screen.getByText("Synthetic Applicant")).toBeDefined();
  });

  it("opens with a branded programme introduction before the questions", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      render(
        <QueryClientProvider client={client}>
          <PublicRegistrationFormPage params={Promise.resolve({ slug: "synthetic-test" })} />
        </QueryClientProvider>,
      );
    });

    expect(await screen.findByRole("heading", { name: /Join Synthetic Test/i })).toBeDefined();
    expect(screen.getByText("1 quick question · about 2 minutes · no account needed")).toBeDefined();
    expect(screen.queryByRole("textbox", { name: /Full Name/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Let's get started/i }));
    expect(await screen.findByRole("textbox", { name: /Full Name/ })).toBeDefined();
  });
});
