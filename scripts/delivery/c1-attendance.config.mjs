import base from "./c1-events.config.mjs";
import { resolve } from "node:path";
const source = base.resolve.alias["@"];
const main = process.env.C1_VARIANT === "main";
const config = {
  ...base,
  resolve: { alias: {
    ...base.resolve.alias,
    "date-fns": resolve(base.root, "node_modules/date-fns/index.js"),
    "date-fns-tz": resolve(base.root, "node_modules/date-fns-tz/dist/esm/index.js"),
    "@c1-schedule": resolve(source, main ? "lib/attendance/scheduled-sessions.ts" : "lib/attendance/schedule.ts"),
    "@c1-policy": resolve(source, main ? "lib/attendance/policy-engine.ts" : "lib/attendance/dropout-policy.ts"),
    "@c1-summaries": resolve(source, "lib/attendance/summaries.ts"),
    "@c1-staff": resolve(source, "app/api/park/attendance/[eventId]/staff/route.ts"),
  } },
  test: { ...base.test, include: ["scripts/delivery/c1-attendance.test.mjs"] },
};
export default config;
