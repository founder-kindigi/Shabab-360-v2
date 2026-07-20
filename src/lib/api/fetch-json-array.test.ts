import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonArray } from "./fetch-json-array";

describe("fetchJsonArray", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a successful array payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "city-1" }]), { status: 200 })
    ));

    await expect(fetchJsonArray<{ id: string }>("/api/admin/cities")).resolves.toEqual([
      { id: "city-1" },
    ]);
  });

  it("rejects API error objects before components treat them as arrays", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    ));

    await expect(fetchJsonArray("/api/admin/cities")).rejects.toThrow(
      "Request failed with status 403"
    );
  });

  it("rejects a non-array success payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    ));

    await expect(fetchJsonArray("/api/admin/cities")).rejects.toThrow(
      "Expected an array response"
    );
  });
});
