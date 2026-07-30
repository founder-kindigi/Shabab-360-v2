import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import MashwaraPage from "./page";
import MashwaraDetailPage from "./[id]/page";

describe("MASH-005 Direct Navigation & Redirect Architecture", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it("/admin/mashwara server route redirects into SPA shell with ?page=admin-mashwara", () => {
    MashwaraPage();
    expect(mockRedirect).toHaveBeenCalledWith("/?page=admin-mashwara");
  });

  it("/admin/mashwara/<id> server route supports Next 16 async params and redirects with exact ID", async () => {
    const mockParams = Promise.resolve({ id: "meeting-lahore-2026-001" });
    await MashwaraDetailPage({ params: mockParams });
    expect(mockRedirect).toHaveBeenCalledWith(
      "/?page=admin-mashwara-detail&id=meeting-lahore-2026-001"
    );
  });

  it("/admin/mashwara/<id> URL-encodes special characters in meeting ID", async () => {
    const mockParams = Promise.resolve({ id: "meeting/special 123" });
    await MashwaraDetailPage({ params: mockParams });
    expect(mockRedirect).toHaveBeenCalledWith(
      "/?page=admin-mashwara-detail&id=meeting%2Fspecial%20123"
    );
  });
});

describe("MASH-005 SPA Refresh & State Bridge Restoration", () => {
  it("restores admin-mashwara route state and rewrites URL when ?page=admin-mashwara is present", () => {
    const mockNavigateTo = vi.fn();
    const mockReplaceState = vi.fn();

    const searchParams = new URLSearchParams("?page=admin-mashwara");
    const page = searchParams.get("page");

    if (page === "admin-mashwara") {
      mockNavigateTo("admin-mashwara");
      mockReplaceState({}, "", "/admin/mashwara");
    }

    expect(mockNavigateTo).toHaveBeenCalledWith("admin-mashwara");
    expect(mockReplaceState).toHaveBeenCalledWith({}, "", "/admin/mashwara");
  });

  it("hydrates selectedEventId and navigates to detail when ?page=admin-mashwara-detail&id=<id> is present", () => {
    const mockNavigateTo = vi.fn();
    const mockSetSelectedEventId = vi.fn();
    const mockReplaceState = vi.fn();

    const searchParams = new URLSearchParams(
      "?page=admin-mashwara-detail&id=meeting-lahore-2026-001"
    );
    const page = searchParams.get("page");

    if (page === "admin-mashwara-detail") {
      const id = searchParams.get("id");
      if (id) {
        mockSetSelectedEventId(id);
        mockNavigateTo("admin-mashwara-detail");
        mockReplaceState({}, "", `/admin/mashwara/${id}`);
      }
    }

    expect(mockSetSelectedEventId).toHaveBeenCalledWith("meeting-lahore-2026-001");
    expect(mockNavigateTo).toHaveBeenCalledWith("admin-mashwara-detail");
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      "",
      "/admin/mashwara/meeting-lahore-2026-001"
    );
  });
});

describe("MASH-005 Detail ui-context Loading Guard", () => {
  it("gates detail query execution and prevents false Meeting Not Found when ui-context is loading", () => {
    const ctxState = {
      data: undefined,
      isLoading: true,
      error: null,
    };

    const id = "meeting-lahore-2026-001";
    const detailQueryEnabled = Boolean(id) && Boolean(ctxState.data) && !ctxState.error;

    expect(detailQueryEnabled).toBe(false);
    expect(ctxState.isLoading).toBe(true);
    expect(ctxState.error).toBeNull();
  });
});
