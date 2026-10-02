import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowedStatus = new Set(["queued", "ready", "active", "review", "blocked", "done"]);
const allowedOwners = new Set(["Astra", "Gemini", "DeepSeek"]);

export function validateState(state, root = repositoryRoot) {
  const errors = [];
  if (state?.version !== 1 || !Array.isArray(state.tasks)) return ["Unsupported or missing delivery state"];
  const ids = new Set();
  function localFile(file) {
    if (typeof file !== "string" || isAbsolute(file)) return false;
    const location = resolve(root, file), rel = relative(root, location);
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel) || !existsSync(location) || !statSync(location).isFile()) return false;
    const realRelative = relative(realpathSync(root), realpathSync(location));
    return !realRelative.startsWith("..") && !isAbsolute(realRelative);
  }
  for (const task of state.tasks) {
    if (!/^[A-Z][A-Z0-9-]{1,63}$/.test(task.id ?? "") || ids.has(task.id)) errors.push("Invalid or duplicate task ID");
    ids.add(task.id);
    if (!allowedStatus.has(task.status) || !allowedOwners.has(task.owner)) errors.push(`${task.id}: invalid status/owner`);
    if (typeof task.module !== "string" || !task.module.trim()) errors.push(`${task.id}: module missing`);
    if (!localFile(task.packet)) errors.push(`${task.id}: task packet missing or outside repository`);
    if (task.status === "done" && (task.reviewOutcome !== "accepted" || !Array.isArray(task.evidence) || !task.evidence.length || !task.evidence.every(localFile))) errors.push(`${task.id}: completion requires accepted review and existing evidence`);
  }
  const active = state.tasks.filter(t => ["active", "review"].includes(t.status));
  if (active.length > 1) errors.push("Only one task may be active or under review");
  if ((active[0]?.id ?? null) !== state.activeTask) errors.push("activeTask must match the single active/review task, or null");
  const next = state.tasks.find(t => t.id === state.nextTask);
  if (state.nextTask !== null && (!next || !["queued", "ready"].includes(next.status))) errors.push("nextTask must name a queued/ready task, or null");
  for (const task of state.tasks) {
    if (task.dependsOn !== undefined && !Array.isArray(task.dependsOn)) { errors.push(`${task.id}: invalid dependencies`); continue; }
    for (const id of task.dependsOn ?? []) {
      const dependency = state.tasks.find(t => t.id === id);
      if (!dependency || dependency.id === task.id) errors.push(`${task.id}: unknown/self dependency`);
      else if (["active", "review", "done"].includes(task.status) && dependency.status !== "done") errors.push(`${task.id}: dependency ${id} unfinished`);
    }
  }
  return errors;
}

export function readState(root = repositoryRoot) {
  return JSON.parse(readFileSync(resolve(root, "docs/delivery/state.json"), "utf8"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const state = readState(), errors = validateState(state);
    console.log(JSON.stringify({ passed: errors.length === 0, activeTask: state.activeTask, nextTask: state.nextTask, errors }));
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) { console.error(`Delivery state could not be checked: ${error.message}`); process.exitCode = 1; }
}
