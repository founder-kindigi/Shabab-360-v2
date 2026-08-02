import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import MashwaraPage from "./page";
import MashwaraDetailPage from "./[id]/page";

describe("MASH-005 direct navigation", () => {
  beforeEach(() => redirect.mockClear());

  it("redirects the dashboard route into the authenticated SPA shell", () => {
    MashwaraPage();

    expect(redirect).toHaveBeenCalledWith("/?page=admin-mashwara");
  });

  it("awaits Next 16 params and preserves the meeting identifier", async () => {
    await MashwaraDetailPage({
      params: Promise.resolve({ id: "meeting/lahore 001" }),
    });

    expect(redirect).toHaveBeenCalledWith(
      "/?page=admin-mashwara-detail&id=meeting%2Flahore%20001",
    );
  });

  it("requires a detail identifier instead of silently redirecting to an empty workspace", async () => {
    // @ts-expect-error The App Router always provides params; this verifies
    // the page contract does not accept an empty SPA-shell invocation.
    await expect(MashwaraDetailPage()).rejects.toThrow();
  });
});
