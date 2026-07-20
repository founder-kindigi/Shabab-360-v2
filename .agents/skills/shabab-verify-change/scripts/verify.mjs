#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const shouldRun = args.has("--run");
const includeBuild = args.has("--build");
const commands = [
  ["npm", ["run", "lint"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["test"]],
];

if (includeBuild) commands.push(["npm", ["run", "build:postgres"]]);

if (!shouldRun) {
  console.log(commands.map(([command, commandArgs]) => `${command} ${commandArgs.join(" ")}`).join("\n"));
  process.exit(0);
}
const executable = process.platform === "win32" ? "npm.cmd" : "npm";

for (const [, commandArgs] of commands) {
  console.log(`\n> npm ${commandArgs.join(" ")}`);
  const result = spawnSync(executable, commandArgs, { stdio: "inherit", shell: false });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
