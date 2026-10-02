import { readState, validateState } from "../../scripts/delivery/check-workflow.mjs";

try {
  const state = readState(), errors = validateState(state);
  const task = state.tasks.find(t => t.id === state.activeTask);
  const message = errors.length ? `Delivery state needs correction: ${errors.join("; ")}` : task ? `Task ${task.id} remains ${task.status}. Record its checkpoint/evidence before claiming completion. Keep one task active.` : null;
  if (message) process.stdout.write(JSON.stringify({ systemMessage: message }));
} catch {
  process.stdout.write(JSON.stringify({ systemMessage: "Delivery state could not be read. Check docs/delivery/state.json before the next handoff." }));
}
