import { resolve } from "node:path";
import base from "./c1-events.config.mjs";

const source = base.resolve.alias["@"];
const config = {
  ...base,
  resolve: { alias: {
    ...base.resolve.alias,
    "@c1-mashwara": resolve(source, "app/api/admin/mashwara/route.ts"),
    "@c1-convert": resolve(source, "app/api/admin/admissions/[id]/convert/route.ts"),
    "@c1-template-use": resolve(source, "app/api/calling/templates/use/route.ts"),
    "@c1-parser": resolve(source, "lib/content-planner-parser/parser.ts"),
    "@c1-workbook": resolve(source, "lib/content-planner-parser/workbook-adapter.ts"),
    exceljs: resolve(base.root, "node_modules/exceljs/excel.js"),
    bcryptjs: resolve(base.root, "node_modules/bcryptjs/index.js"),
  } },
  test: { ...base.test, include: ["scripts/delivery/c1-workflows.test.mjs"] },
};
export default config;
