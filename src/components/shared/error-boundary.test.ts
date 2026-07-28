import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./error-boundary";

describe("isChunkLoadError", () => {
  it.each([
    "ChunkLoadError: Loading chunk 42 failed",
    "Failed to load chunk /_next/static/chunks/example.js",
    "Failed to fetch dynamically imported module",
  ])("identifies stale deployment errors: %s", (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it("does not identify unrelated render failures as chunk errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
