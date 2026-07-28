import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Keep tests isolated from developer, staging, and production credentials.
const TEST_DATABASE_URL = "postgresql://test:test@127.0.0.1:1/shabab360_test?connect_timeout=1";
const TEST_DIRECT_URL = "postgresql://test:test@127.0.0.1:1/shabab360_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DIRECT_URL,
      NEXTAUTH_SECRET: "vitest-test-secret-not-for-deployment",
    },
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
