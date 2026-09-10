import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../../src", import.meta.url)) } },
  test: { environment: "node", include: ["docs/reviews/v2-audit-2026-09-08/astra-corrections-db.test.mts"], maxWorkers: 1, fileParallelism: false, testTimeout: 30000, hookTimeout: 90000 },
});
