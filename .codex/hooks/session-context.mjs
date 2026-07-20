#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hookDirectory = dirname(fileURLToPath(import.meta.url));
const memoryPath = resolve(hookDirectory, "..", "..", ".agents", "memory", "current.md");

try {
  const memory = readFileSync(memoryPath, "utf8").trim();
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `Concise repository memory (verify changing facts before use):\n\n${memory}`,
    },
  }));
} catch {
  process.exit(0);
}
