#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readState, validateState } from "../../scripts/delivery/check-workflow.mjs";

const hookDirectory = dirname(fileURLToPath(import.meta.url));
const memoryPath = resolve(hookDirectory, "..", "..", ".agents", "memory", "current.md");

try {
  const memory = readFileSync(memoryPath, "utf8").trim();
  let delivery = "Delivery state unavailable; read docs/delivery/state.json before module work.";
  try {
    const state = readState(), errors = validateState(state);
    const task = state.tasks.find(t => t.id === (state.activeTask ?? state.nextTask));
    delivery = errors.length ? `Delivery state invalid: ${errors.join("; ")}` : `One task at a time. Active: ${state.activeTask ?? "none"}. Next: ${state.nextTask ?? "none"}. Read ${task?.packet ?? "docs/delivery/PLAN.md"}. Astra leads/API/DB/review; Gemini frontend; DeepSeek scoped backend/cleanup. Do not load full plans unless needed.`;
  } catch { /* Keep baseline context even if delivery metadata is unavailable. */ }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `${delivery}\n\nConcise repository memory (verify changing facts before use):\n\n${memory}`,
    },
  }));
} catch {
  process.exit(0);
}
