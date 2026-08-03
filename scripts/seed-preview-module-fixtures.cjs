/* eslint-disable @typescript-eslint/no-require-imports -- Guarded Preview-only operational fixture script. */
const { PrismaClient } = require("@prisma/client");

const FIXTURE_PREFIX = "Preview UAT - ";
const LAHORE_CODE = "LHR";
const SUPABASE_PROJECT_REF = "qbyvrqigbojkrjowfsru";
const STAGING_POOLER_USERNAME = `postgres.${SUPABASE_PROJECT_REF}`;
const STAGING_DIRECT_HOST = `db.${SUPABASE_PROJECT_REF}.supabase.co`;

class PreviewSeedError extends Error {}

function parseArgs(args) {
  const options = { execute: false, confirmPreviewModuleSeed: false };
  for (const argument of args) {
    if (argument === "--execute") options.execute = true;
    else if (argument === "--confirm-preview-module-seed") options.confirmPreviewModuleSeed = true;
    else throw new PreviewSeedError(`Unexpected argument: ${argument}`);
  }

  if (options.confirmPreviewModuleSeed && !options.execute) {
    throw new PreviewSeedError("--confirm-preview-module-seed can only be used with --execute");
  }
  return options;
}

function requirePreviewTarget() {
  if (process.env.SHABAB360_PREVIEW_MODULE_SEED !== "true") {
    throw new PreviewSeedError("Set SHABAB360_PREVIEW_MODULE_SEED=true to acknowledge the Preview-only target");
  }

  const value = process.env.DIRECT_URL;
  if (!value?.startsWith("postgres")) {
    throw new PreviewSeedError("DIRECT_URL must be a PostgreSQL connection URL");
  }

  const url = new URL(value);
  const isApprovedPooler = url.username === STAGING_POOLER_USERNAME
    && url.hostname.endsWith("pooler.supabase.com");
  const isApprovedDirectHost = url.username === "postgres"
    && url.hostname === STAGING_DIRECT_HOST;
  if (!isApprovedPooler && !isApprovedDirectHost) {
    throw new PreviewSeedError("Refusing to seed: DIRECT_URL is not the approved Lahore Preview database target");
  }
  return value;
}

function fixtureDate(daysFromToday) {
  const date = new Date();
  date.setUTCHours(9, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date;
}

async function findLahoreContext(tx) {
  const city = await tx.city.findUnique({ where: { code: LAHORE_CODE } });
  if (!city?.isActive) throw new PreviewSeedError("Active Lahore city (LHR) was not found");

  const staff = await tx.staffMeta.findFirst({
    where: {
      isActive: true,
      user: { isActive: true },
      OR: [
        { assignedCityId: city.id },
        { assignedPark: { cityId: city.id, isActive: true } },
        { assignedGroup: { park: { cityId: city.id, isActive: true } } },
      ],
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  if (!staff) throw new PreviewSeedError("No active Lahore staff member is available for module fixtures");

  const group = await tx.group.findFirst({
    where: { isActive: true, park: { cityId: city.id, isActive: true }, batch: { isActive: true } },
    include: { park: true, batch: true },
    orderBy: { createdAt: "asc" },
  });
  if (!group?.parkId) throw new PreviewSeedError("No active Lahore group with a park is available for module fixtures");

  return { city, staff, group };
}

async function ensureTeam(tx, cityId, code, name) {
  // Legacy Lahore teams used display names/casing rather than canonical codes.
  // Reuse that record before creating a new canonical-code team.
  const existing = await tx.collaborationTeam.findFirst({
    where: { cityId, OR: [{ code }, { name }] },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return { record: existing, created: false };
  return {
    record: await tx.collaborationTeam.create({ data: { cityId, code, name, description: "Preview UAT fixture team" } }),
    created: true,
  };
}

async function ensurePreviewFixtures(client) {
  return client.$transaction(async (tx) => {
    const summary = { created: [], existing: [] };
    const { city, staff, group } = await findLahoreContext(tx);

    const mediaTeam = await ensureTeam(tx, city.id, "MEDIA", "Media");
    summary[mediaTeam.created ? "created" : "existing"].push("media team");
    const sportsTeam = await ensureTeam(tx, city.id, "SPORTS", "Sports");
    summary[sportsTeam.created ? "created" : "existing"].push("sports team");
    const skillsTeam = await ensureTeam(tx, city.id, "SKILLS", "Skills");
    summary[skillsTeam.created ? "created" : "existing"].push("skills team");
    const activityTeam = await ensureTeam(tx, city.id, "TADREEB", "Tadreeb");
    summary[activityTeam.created ? "created" : "existing"].push("activity team");

    const membership = await tx.staffTeamMembership.findFirst({
      where: { staffMetaId: staff.id, teamId: mediaTeam.record.id, isActive: true, endedAt: null },
    });
    if (membership) summary.existing.push("media team membership");
    else {
      await tx.staffTeamMembership.create({ data: { staffMetaId: staff.id, teamId: mediaTeam.record.id, title: "Preview UAT contributor" } });
      summary.created.push("media team membership");
    }

    const planName = `${FIXTURE_PREFIX}Content Plan`;
    let plan = await tx.contentPlan.findFirst({ where: { cityId: city.id, name: planName, kind: "template" } });
    if (plan) summary.existing.push("content plan");
    else {
      plan = await tx.contentPlan.create({
        data: { cityId: city.id, parkId: group.parkId, batchId: group.batchId, name: planName, kind: "template", status: "published", sourceWorkbook: "preview-fixtures" },
      });
      summary.created.push("content plan");
    }

    const sessionDate = fixtureDate(7);
    let session = await tx.contentPlanSession.findUnique({ where: { planId_sessionDate: { planId: plan.id, sessionDate } } });
    if (session) summary.existing.push("content plan session");
    else {
      session = await tx.contentPlanSession.create({
        data: { planId: plan.id, sessionDate, weekLabel: "Preview week", dayLabel: "Saturday", focusArea: "Team readiness", status: "published" },
      });
      summary.created.push("content plan session");
    }

    let block = await tx.contentPlanBlock.findFirst({ where: { sessionId: session.id, category: "activity", sortOrder: 1 } });
    if (block) summary.existing.push("content plan block");
    else {
      block = await tx.contentPlanBlock.create({
        data: { sessionId: session.id, teamId: activityTeam.record.id, category: "activity", title: `${FIXTURE_PREFIX}Team Activity`, content: "Safe, non-production fixture for workspace testing.", sortOrder: 1, status: "published" },
      });
      summary.created.push("content plan block");
    }

    const activityTitle = `${FIXTURE_PREFIX}Team Activity`;
    const activity = await tx.activityPlanItem.findFirst({ where: { teamId: activityTeam.record.id, title: activityTitle } });
    if (activity) summary.existing.push("team activity");
    else {
      await tx.activityPlanItem.create({ data: { teamId: activityTeam.record.id, contentBlockId: block.id, assignedStaffMetaId: staff.id, title: activityTitle, description: "Review the published content block.", scheduledFor: sessionDate } });
      summary.created.push("team activity");
    }

    const eventTitle = `${FIXTURE_PREFIX}Community Service Day`;
    let event = await tx.event.findFirst({ where: { cityId: city.id, title: eventTitle } });
    if (event) summary.existing.push("event");
    else {
      event = await tx.event.create({ data: { cityId: city.id, title: eventTitle, description: "Safe, non-production fixture for workspace testing.", eventType: "community_service", status: "planned", venue: "Preview fixture venue", startDate: fixtureDate(14), createdBy: staff.userId } });
      summary.created.push("event");
    }

    const eventTeam = await tx.temporaryEventTeam.findFirst({ where: { eventId: event.id, title: "Preview UAT Operations" } });
    const resolvedEventTeam = eventTeam ?? await tx.temporaryEventTeam.create({ data: { eventId: event.id, title: "Preview UAT Operations", description: "Fixture team" } });
    summary[eventTeam ? "existing" : "created"].push("event team");
    const eventMember = await tx.eventTeamMembership.findUnique({ where: { teamId_staffMetaId: { teamId: resolvedEventTeam.id, staffMetaId: staff.id } } });
    if (eventMember) summary.existing.push("event team membership");
    else {
      await tx.eventTeamMembership.create({ data: { teamId: resolvedEventTeam.id, staffMetaId: staff.id, title: "Fixture coordinator" } });
      summary.created.push("event team membership");
    }

    const eventTaskTitle = `${FIXTURE_PREFIX}Confirm venue`;
    const eventTask = await tx.eventPlannerItem.findFirst({ where: { eventId: event.id, title: eventTaskTitle } });
    if (eventTask) summary.existing.push("event planner item");
    else {
      await tx.eventPlannerItem.create({ data: { eventId: event.id, teamId: resolvedEventTeam.id, assignedToStaffMetaId: staff.id, title: eventTaskTitle, description: "Verify the fixture workflow.", dueDate: fixtureDate(10), priority: "medium" } });
      summary.created.push("event planner item");
    }

    const campaignName = `${FIXTURE_PREFIX}Admissions Follow-up`;
    let campaign = await tx.callingCampaign.findUnique({ where: { cityId_name: { cityId: city.id, name: campaignName } } });
    if (campaign) summary.existing.push("calling campaign");
    else {
      campaign = await tx.callingCampaign.create({
        data: { cityId: city.id, name: campaignName, description: "Safe, non-production fixture for Calling workspace testing.", status: "active", startDate: fixtureDate(-1), endDate: fixtureDate(30) },
      });
      summary.created.push("calling campaign");
    }

    const template = await tx.callingTemplate.findFirst({ where: { cityId: city.id, title: `${FIXTURE_PREFIX}Welcome`, version: 1 } });
    if (template) summary.existing.push("calling template");
    else {
      await tx.callingTemplate.create({ data: { cityId: city.id, campaignId: campaign.id, title: `${FIXTURE_PREFIX}Welcome`, body: "Assalam-o-Alaikum {{applicantName}}, this is a Preview UAT calling fixture.", status: "approved", version: 1 } });
      summary.created.push("calling template");
    }

    let application = await tx.admissionApplication.findUnique({ where: { trackingCode: "PREVIEW-UAT-CALL-001" } });
    if (application) summary.existing.push("calling application");
    else {
      application = await tx.admissionApplication.create({
        data: { trackingCode: "PREVIEW-UAT-CALL-001", applicantName: "Preview UAT Applicant", guardianName: "Preview UAT Guardian", guardianPhone: "03000000000", cityId: city.id, preferredParkId: group.parkId, status: "submitted", notes: "Safe, non-production Calling fixture." },
      });
      summary.created.push("calling application");
    }
    const assignment = await tx.callingAssignment.findFirst({ where: { campaignId: campaign.id, applicationId: application.id, isActive: true } });
    if (assignment) summary.existing.push("calling assignment");
    else {
      await tx.callingAssignment.create({ data: { campaignId: campaign.id, applicationId: application.id, callerStaffMetaId: staff.id, status: "pending" } });
      summary.created.push("calling assignment");
    }

    const meetingTitle = `${FIXTURE_PREFIX}Weekly Coordination`;
    let meeting = await tx.mashwaraMeeting.findFirst({ where: { cityId: city.id, title: meetingTitle } });
    if (meeting) summary.existing.push("mashwara meeting");
    else {
      meeting = await tx.mashwaraMeeting.create({ data: { cityId: city.id, title: meetingTitle, scheduledAt: fixtureDate(5), location: "Preview fixture room", createdById: staff.userId } });
      summary.created.push("mashwara meeting");
    }

    const decision = await tx.mashwaraDecision.findFirst({ where: { meetingId: meeting.id, decision: `${FIXTURE_PREFIX}Publish activity plan` } });
    if (decision) summary.existing.push("mashwara decision");
    else {
      await tx.mashwaraDecision.create({ data: { meetingId: meeting.id, decision: `${FIXTURE_PREFIX}Publish activity plan`, category: "planning", targetTeamId: activityTeam.record.id, assignedToId: staff.id } });
      summary.created.push("mashwara decision");
    }
    const action = await tx.mashwaraActionItem.findFirst({ where: { meetingId: meeting.id, description: `${FIXTURE_PREFIX}Review deliverables` } });
    if (action) summary.existing.push("mashwara action item");
    else {
      await tx.mashwaraActionItem.create({ data: { meetingId: meeting.id, description: `${FIXTURE_PREFIX}Review deliverables`, teamId: activityTeam.record.id, assignedToId: staff.id, dueDate: fixtureDate(9) } });
      summary.created.push("mashwara action item");
    }

    const briefTitle = `${FIXTURE_PREFIX}Activity Graphic`;
    const brief = await tx.mediaBrief.findFirst({ where: { cityId: city.id, title: briefTitle } });
    if (brief) summary.existing.push("media brief");
    else {
      await tx.mediaBrief.create({ data: { cityId: city.id, teamId: mediaTeam.record.id, title: briefTitle, description: "Safe, non-production fixture with no external URL.", mediaType: "graphic", format: "social_post", status: "open", priority: "medium", dueAt: fixtureDate(8), contentBlockId: block.id, assignedToStaffMetaId: staff.id, createdById: staff.userId } });
      summary.created.push("media brief");
    }

    return summary;
  }, { isolationLevel: "Serializable", timeout: 30000, maxWait: 10000 });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const directUrl = requirePreviewTarget();
  const client = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    if (!options.execute) {
      console.log(JSON.stringify({ mode: "dry-run", writesPerformed: false, target: "Lahore Preview", fixturePrefix: FIXTURE_PREFIX }, null, 2));
      return;
    }
    if (!options.confirmPreviewModuleSeed) {
      throw new PreviewSeedError("Refusing to seed without --confirm-preview-module-seed");
    }

    const summary = await ensurePreviewFixtures(client);
    console.log(JSON.stringify({ mode: "execute", writesPerformed: true, target: "Lahore Preview", ...summary }, null, 2));
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Preview seed failed");
  process.exitCode = 1;
});
