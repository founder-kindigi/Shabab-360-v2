/* eslint-disable @typescript-eslint/no-require-imports -- Preview-only, explicitly scoped workbook reconciliation. */
const path = require("node:path");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");
const { parseBatch4Sheet } = require("./cp-import-preview.cjs");

const SUPABASE_PROJECT_REF = "qbyvrqigbojkrjowfsru";
const DIRECT_HOST = `db.${SUPABASE_PROJECT_REF}.supabase.co`;

class ReconciliationError extends Error {}

function parseArgs(args) {
  const options = { execute: false, confirmed: false, discover: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") options.execute = true;
    else if (argument === "--confirm-preview-content-plan-reconciliation") options.confirmed = true;
    else if (argument === "--discover") options.discover = true;
    else if (["--input", "--city-id", "--batch-id", "--state-life-park-id", "--template-plan-id", "--override-plan-id"].includes(argument)) {
      options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[++index];
    } else throw new ReconciliationError(`Unexpected argument: ${argument}`);
  }
  if (!options.discover) {
    if (!options.input) throw new ReconciliationError("Provide --input <workbook path>");
    for (const key of ["cityId", "batchId", "stateLifeParkId", "templatePlanId", "overridePlanId"]) {
      if (!options[key]) throw new ReconciliationError(`Provide --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    }
  }
  if (options.discover && (options.execute || options.confirmed)) throw new ReconciliationError("--discover is always zero-write");
  if (options.confirmed && !options.execute) throw new ReconciliationError("Confirmation is valid only with --execute");
  return options;
}

async function discoverTargets(client) {
  const city = await client.city.findFirst({ where: { code: "LHR", isActive: true }, select: { id: true, name: true } });
  if (!city) throw new ReconciliationError("Active Lahore city (LHR) was not found");
  const [batches, parks, plans] = await Promise.all([
    client.batch.findMany({ where: { isActive: true, park: { cityId: city.id } }, select: { id: true, name: true, park: { select: { name: true } } }, orderBy: { name: "asc" } }),
    client.park.findMany({ where: { isActive: true, cityId: city.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    client.contentPlan.findMany({ where: { cityId: city.id }, select: { id: true, name: true, kind: true, batchId: true, parkId: true, basePlanId: true, status: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
  ]);
  return { mode: "discover", writesPerformed: false, city, batches, parks, contentPlans: plans };
}

function requirePreviewTarget() {
  const value = process.env.DIRECT_URL;
  if (!value?.startsWith("postgres")) throw new ReconciliationError("DIRECT_URL must be a PostgreSQL Preview connection URL");
  const url = new URL(value);
  const approvedDirect = url.hostname === DIRECT_HOST && url.username === "postgres";
  const approvedPooler = url.hostname.endsWith("pooler.supabase.com") && url.username === `postgres.${SUPABASE_PROJECT_REF}`;
  if (!approvedDirect && !approvedPooler) throw new ReconciliationError("Refusing non-Supabase Lahore Preview target");
  return value;
}

async function parseWorkbook(input) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(input));
  const allParks = workbook.getWorksheet("All Parks");
  const stateLife = workbook.getWorksheet("State Life School");
  if (!allParks || !stateLife) throw new ReconciliationError("Workbook must contain All Parks and State Life School sheets");
  const template = parseBatch4Sheet(allParks, "All Parks", {});
  const override = parseBatch4Sheet(stateLife, "State Life School", {});
  if (template.errors.length || override.errors.length) throw new ReconciliationError("Workbook contains invalid session identities");
  return { template, override, blockedUrls: [...template.blockedUrls, ...override.blockedUrls] };
}

async function validateTargets(client, options) {
  const [city, batch, park, templatePlan, overridePlan, teams] = await Promise.all([
    client.city.findFirst({ where: { id: options.cityId, isActive: true }, select: { id: true } }),
    client.batch.findFirst({ where: { id: options.batchId, isActive: true, park: { cityId: options.cityId } }, select: { id: true } }),
    client.park.findFirst({ where: { id: options.stateLifeParkId, isActive: true, cityId: options.cityId }, select: { id: true } }),
    client.contentPlan.findFirst({ where: { id: options.templatePlanId, cityId: options.cityId, batchId: null, parkId: null, kind: "template" }, select: { id: true } }),
    client.contentPlan.findFirst({ where: { id: options.overridePlanId, cityId: options.cityId, batchId: options.batchId, parkId: options.stateLifeParkId, basePlanId: options.templatePlanId }, select: { id: true } }),
    client.collaborationTeam.findMany({ where: { cityId: options.cityId, isActive: true, code: { in: ["SPORTS", "SKILLS", "TADREEB"] } }, select: { id: true, code: true } }),
  ]);
  if (!city || !batch || !park || !templatePlan || !overridePlan) throw new ReconciliationError("Target context does not match active Lahore city, Batch 4, State Life park, and explicit plans");
  const teamByCode = new Map(teams.map((team) => [team.code, team.id]));
  for (const code of ["SPORTS", "SKILLS", "TADREEB"]) if (!teamByCode.has(code)) throw new ReconciliationError(`Active ${code} collaboration team is required`);
  return { teamByCode };
}

function teamCodeFor(category) {
  if (category === "skills") return "SKILLS";
  if (category === "tadreeb") return "TADREEB";
  return "SPORTS"; // Exercises and Sports are both delivered by the Sports team.
}

function planRows(parsed, planId) {
  const sessions = parsed.sessions.map((session) => ({ ...session, planId }));
  const blocks = parsed.blocks.map((block) => ({ ...block, planId }));
  return { sessions, blocks };
}

async function buildPlan(client, options, parsed) {
  const context = await validateTargets(client, options);
  const template = planRows(parsed.template, options.templatePlanId);
  const override = planRows(parsed.override, options.overridePlanId);
  const sessions = [...template.sessions, ...override.sessions];
  const blocks = [...template.blocks, ...override.blocks];
  const existingSessions = await client.contentPlanSession.findMany({
    where: { planId: { in: [options.templatePlanId, options.overridePlanId] }, sessionDate: { in: sessions.map((session) => new Date(`${session.sessionDate}T00:00:00.000Z`)) } },
    include: { blocks: { select: { category: true, sortOrder: true, content: true } } },
  });
  const existingByKey = new Map(existingSessions.map((session) => [`${session.planId}:${session.sessionDate.toISOString().slice(0, 10)}`, session]));
  const conflicts = [];
  let createSessions = 0;
  let createBlocks = 0;
  for (const session of sessions) {
    const existing = existingByKey.get(`${session.planId}:${session.sessionDate}`);
    if (!existing) createSessions += 1;
  }
  for (const block of blocks) {
    const existing = existingByKey.get(`${block.planId}:${block.sessionDate}`);
    const matching = existing?.blocks.find((item) => item.category === block.category && item.sortOrder === block.sortOrder);
    if (!matching) createBlocks += 1;
    else if (matching.content !== block.content) conflicts.push({ planId: block.planId, sessionDate: block.sessionDate, category: block.category, code: "existing_block_differs" });
  }
  return { context, sessions, blocks, existingByKey, conflicts, createSessions, createBlocks };
}

async function execute(client, plan) {
  if (plan.conflicts.length) throw new ReconciliationError("Refusing execution because existing content blocks differ from the workbook");
  return client.$transaction(async (tx) => {
    let createdSessions = 0;
    let createdBlocks = 0;
    const sessionIds = new Map();
    for (const session of plan.sessions) {
      const key = `${session.planId}:${session.sessionDate}`;
      const existing = plan.existingByKey.get(key);
      if (existing) sessionIds.set(key, existing.id);
      else {
        const created = await tx.contentPlanSession.create({ data: { planId: session.planId, weekLabel: session.weekLabel, dayLabel: session.dayLabel, sessionDate: new Date(`${session.sessionDate}T00:00:00.000Z`), focusArea: session.focusArea, sourceRow: session.sourceRow, isOffDay: session.isOffDay, status: "draft" } });
        sessionIds.set(key, created.id);
        createdSessions += 1;
      }
    }
    for (const block of plan.blocks) {
      const sessionId = sessionIds.get(`${block.planId}:${block.sessionDate}`);
      const existing = plan.existingByKey.get(`${block.planId}:${block.sessionDate}`)?.blocks.find((item) => item.category === block.category && item.sortOrder === block.sortOrder);
      if (!existing) {
        await tx.contentPlanBlock.create({ data: { sessionId, teamId: plan.context.teamByCode.get(teamCodeFor(block.category)), category: block.category, title: block.title, content: block.content, sortOrder: block.sortOrder, status: "draft" } });
        createdBlocks += 1;
      }
    }
    return { createdSessions, createdBlocks };
  }, { isolationLevel: "Serializable", timeout: 30000, maxWait: 10000 });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const directUrl = requirePreviewTarget();
  const client = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    if (options.discover) return console.log(JSON.stringify(await discoverTargets(client), null, 2));
    const parsed = await parseWorkbook(options.input);
    const plan = await buildPlan(client, options, parsed);
    const report = { mode: options.execute ? "execute" : "dry-run", writesPerformed: false, templateSessions: parsed.template.sessions.length, overrideSessions: parsed.override.sessions.length, proposedBlocks: parsed.template.blocks.length + parsed.override.blocks.length, blockedUrls: parsed.blockedUrls.length, createSessions: plan.createSessions, createBlocks: plan.createBlocks, conflicts: plan.conflicts };
    if (!options.execute) return console.log(JSON.stringify(report, null, 2));
    if (!options.confirmed) throw new ReconciliationError("Refusing execution without --confirm-preview-content-plan-reconciliation");
    const result = await execute(client, plan);
    console.log(JSON.stringify({ ...report, mode: "execute", writesPerformed: true, ...result }, null, 2));
  } finally { await client.$disconnect(); }
}

if (require.main === module) main().catch((error) => { console.error(`Content Planner reconciliation aborted: ${error.message}`); process.exitCode = 1; });

module.exports = { parseArgs, teamCodeFor };
