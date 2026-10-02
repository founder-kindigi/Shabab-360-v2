// Vitest setup — runs before each test file
// Provides default environment variables for test isolation

import { vi } from "vitest";

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:../db/test.db";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-that-is-at-least-20-chars";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// Node's test workers may not expose localStorage even for jsdom test files.
if (typeof global.localStorage === "undefined") {
  Object.defineProperty(global, "localStorage", {
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
    writable: true,
  });
}
