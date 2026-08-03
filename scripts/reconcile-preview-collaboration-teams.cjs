/* eslint-disable @typescript-eslint/no-require-imports -- Guarded Preview-only collaboration-team reconciliation. */
const { PrismaClient } = require("@prisma/client");

const LAHORE_CODE = "LHR";
const SUPABASE_PROJECT_REF = "qbyvrqigbojkrjowfsru";
const DIRECT_HOST = `db.${SUPABASE_PROJECT_REF}.supabase.co`;
const REPAIR_CODES = ["MEDIA", "TADREEB"];

class TeamRepairError extends Error {}

function parseArgs(args) {
  const options = { execute: false, confirmed: false };
  for (const argument of args) {
    if (argument === "--execute") options.execute = true;
    else if (argument === "--confirm-preview-team-repair") options.confirmed = true;
    else throw new TeamRepairError(`Unexpected argument: ${argument}`);
  }
  if (options.confirmed && !options.execute) {
    throw new TeamRepairError("--confirm-preview-team-repair is valid only with --execute");
  }
  return options;
}

function requirePreviewTarget() {
  const value = process.env.DIRECT_URL;
  if (!value?.startsWith("postgres")) {
    throw new TeamRepairError("DIRECT_URL must be a PostgreSQL Preview connection URL");
  }
  const url = new URL(value);
  const approvedDirect = url.hostname === DIRECT_HOST && url.username === "postgres";
  const approvedPooler = url.hostname.endsWith("pooler.supabase.com")
    && url.username === `postgres.${SUPABASE_PROJECT_REF}`;
  if (!approvedDirect && !approvedPooler) {
    throw new TeamRepairError("Refusing non-Supabase Lahore Preview target");
  }
  return value;
}

function canonicalCode(team) {
  const value = (team.code || team.name || "").trim().toUpperCase();
  return REPAIR_CODES.includes(value) ? value : null;
}

async function dependencyCounts(client, teamId) {
  const [memberships, blocks, activities, decisions, actions, briefs] = await Promise.all([
    client.staffTeamMembership.count({ where: { teamId } }),
    client.contentPlanBlock.count({ where: { teamId } }),
    client.activityPlanItem.count({ where: { teamId } }),
    client.mashwaraDecision.count({ where: { targetTeamId: teamId } }),
    client.mashwaraActionItem.count({ where: { teamId } }),
    client.mediaBrief.count({ where: { teamId } }),
  ]);
  return { memberships, blocks, activities, decisions, actions, briefs };
}

async function membershipConflicts(client, sourceId, targetId) {
  const [source, target] = await Promise.all([
    client.staffTeamMembership.findMany({ where: { teamId: sourceId }, select: { staffMetaId: true, startedAt: true, isActive: true, endedAt: true } }),
    client.staffTeamMembership.findMany({ where: { teamId: targetId }, select: { staffMetaId: true, startedAt: true, isActive: true, endedAt: true } }),
  ]);
  const targetByStaff = new Map();
  const targetHistory = new Set();
  for (const membership of target) {
    const historyKey = `${membership.staffMetaId}:${membership.startedAt.toISOString()}`;
    targetHistory.add(historyKey);
    if (membership.isActive === true && membership.endedAt === null) targetByStaff.set(membership.staffMetaId, true);
  }
  const conflicts = [];
  for (const membership of source) {
    if (targetHistory.has(`${membership.staffMetaId}:${membership.startedAt.toISOString()}`)) {
      conflicts.push({ type: "duplicate_history_timestamp", staffMetaId: membership.staffMetaId });
    }
    if (membership.isActive === true && membership.endedAt === null && targetByStaff.has(membership.staffMetaId)) {
      conflicts.push({ type: "duplicate_active_membership", staffMetaId: membership.staffMetaId });
    }
  }
  return conflicts;
}

async function buildPlan(client) {
  const city = await client.city.findFirst({ where: { code: LAHORE_CODE, isActive: true }, select: { id: true, name: true } });
  if (!city) throw new TeamRepairError("Active Lahore city (LHR) was not found");
  const teams = await client.collaborationTeam.findMany({
    where: { cityId: city.id },
    select: { id: true, name: true, code: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const actions = [];
  const conflicts = [];
  for (const code of REPAIR_CODES) {
    const matches = teams.filter((team) => canonicalCode(team) === code);
    const canonical = matches.find((team) => team.code === code) ?? null;
    if (!canonical && matches.length === 1) {
      actions.push({ type: "normalize", code, source: matches[0], counts: await dependencyCounts(client, matches[0].id) });
      continue;
    }
    if (!canonical || matches.length <= 1) continue;
    for (const source of matches.filter((team) => team.id !== canonical.id)) {
      const membershipIssues = await membershipConflicts(client, source.id, canonical.id);
      const action = {
        type: "merge",
        code,
        source,
        target: canonical,
        counts: await dependencyCounts(client, source.id),
        membershipIssues,
      };
      actions.push(action);
      if (membershipIssues.length) conflicts.push({ code, sourceTeamId: source.id, targetTeamId: canonical.id, membershipIssues });
    }
  }
  return { city, actions, conflicts };
}

async function recheckMembershipConflicts(tx, sourceId, targetId) {
  const conflicts = await membershipConflicts(tx, sourceId, targetId);
  if (conflicts.length) throw new TeamRepairError("Membership state changed; rerun dry-run before execution");
}

async function executePlan(client, plan) {
  if (plan.conflicts.length) throw new TeamRepairError("Refusing execution while membership conflicts remain");
  return client.$transaction(async (tx) => {
    const applied = [];
    for (const action of plan.actions) {
      if (action.type === "normalize") {
        await tx.collaborationTeam.update({ where: { id: action.source.id }, data: { code: action.code } });
        applied.push({ action: "normalized", code: action.code, teamId: action.source.id });
        continue;
      }
      await recheckMembershipConflicts(tx, action.source.id, action.target.id);
      await tx.staffTeamMembership.updateMany({ where: { teamId: action.source.id }, data: { teamId: action.target.id } });
      await tx.contentPlanBlock.updateMany({ where: { teamId: action.source.id }, data: { teamId: action.target.id } });
      await tx.activityPlanItem.updateMany({ where: { teamId: action.source.id }, data: { teamId: action.target.id } });
      await tx.mashwaraDecision.updateMany({ where: { targetTeamId: action.source.id }, data: { targetTeamId: action.target.id } });
      await tx.mashwaraActionItem.updateMany({ where: { teamId: action.source.id }, data: { teamId: action.target.id } });
      await tx.mediaBrief.updateMany({ where: { teamId: action.source.id }, data: { teamId: action.target.id } });
      await tx.collaborationTeam.delete({ where: { id: action.source.id } });
      applied.push({ action: "merged", code: action.code, sourceTeamId: action.source.id, targetTeamId: action.target.id, moved: action.counts });
    }
    return applied;
  }, { isolationLevel: "Serializable", timeout: 30000, maxWait: 10000 });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const directUrl = requirePreviewTarget();
  const client = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    const plan = await buildPlan(client);
    const report = {
      mode: options.execute ? "execute" : "dry-run",
      writesPerformed: false,
      target: "Lahore Preview",
      city: plan.city,
      actions: plan.actions,
      conflicts: plan.conflicts,
    };
    if (!options.execute) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    if (process.env.SHABAB360_PREVIEW_TEAM_REPAIR !== "true") {
      throw new TeamRepairError("Set SHABAB360_PREVIEW_TEAM_REPAIR=true to acknowledge the Preview-only target");
    }
    if (!options.confirmed) throw new TeamRepairError("Refusing execution without --confirm-preview-team-repair");
    report.applied = await executePlan(client, plan);
    report.writesPerformed = report.applied.length > 0;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Lahore Preview team reconciliation aborted: ${error.message}`);
  process.exitCode = 1;
});
