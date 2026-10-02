import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("../../", import.meta.url));
const variant = process.env.C1_VARIANT;
if (!["main", "v2"].includes(variant)) throw new Error("Set C1_VARIANT to main or v2");
const source = resolve("D:/iBuild/Shabab-360-c0-20260911", variant === "main" ? "integration" : "restore-candidate", "src");
const registration = variant === "main" ? "app/api/admin/events/[id]/registrations/route.ts" : "app/api/events/[id]/registrations/route.ts";

export default defineConfig({
  root,
  resolve: { alias: {
    "@c1-registration": resolve(source, registration),
    "@c1-media": resolve(source, "app/api/admin/media/briefs/[id]/route.ts"),
    "@": source,
    "next/server": resolve(root, "node_modules/next/server.js"),
    "zod": resolve(root, "node_modules/zod/index.js"),
  } },
  test: {
    include: ["scripts/delivery/c1-events.test.mjs", ...(variant === "main" ? ["scripts/delivery/c1-media.test.mjs"] : [])],
    environment: "node",
    fileParallelism: false,
    testTimeout: 10000,
    env: { C1_VARIANT: variant },
  },
});
