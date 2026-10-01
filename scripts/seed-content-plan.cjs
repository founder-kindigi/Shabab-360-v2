const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const EXCEL_PATH = "D:\\iBuild\\Shabab-360-v2\\docs\\sheets\\B4_ Shabab Content Plan (1).xlsx";

function extractText(val) {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    if (val.text) {
      if (typeof val.text === "string") return val.text.trim();
      if (Array.isArray(val.text.richText)) {
        return val.text.richText.map((t) => t.text || "").join("").trim();
      }
    }
    if (Array.isArray(val.richText)) {
      return val.richText.map((t) => t.text || "").join("").trim();
    }
  }
  return String(val).trim();
}

async function seedContentPlan() {
  console.log("🌱 Seeding Batch 4 Content Plan from Excel into Prisma DB...");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.getWorksheet(1);

  // 1. Ensure Lahore City & Park & Batch 4 exist
  let city = await prisma.city.findFirst({ where: { name: { contains: "Lahore" } } });
  if (!city) {
    city = await prisma.city.create({
      data: { name: "Lahore", code: "LHR" },
    });
  }

  let park = await prisma.park.findFirst({ where: { cityId: city.id } });
  if (!park) {
    park = await prisma.park.create({
      data: { name: "Gulberg Park", cityId: city.id, address: "Gulberg Lahore" },
    });
  }

  let batch = await prisma.batch.findFirst({ where: { name: { contains: "Batch 4" } } });
  if (!batch) {
    batch = await prisma.batch.create({
      data: { name: "Lahore Batch 4", startDate: new Date("2026-05-23"), cityId: city.id, parkId: park.id },
    });
  }

  // 2. Ensure Collaboration Teams exist
  const sportsTeam = await prisma.collaborationTeam.upsert({
    where: { cityId_code: { cityId: city.id, code: "SPORTS" } },
    update: {},
    create: { cityId: city.id, name: "Sports Team", code: "SPORTS", description: "Sports & Agility Drills" },
  });

  const skillsTeam = await prisma.collaborationTeam.upsert({
    where: { cityId_code: { cityId: city.id, code: "SKILLS" } },
    update: {},
    create: { cityId: city.id, name: "Skills Team", code: "SKILLS", description: "Life Skills Module" },
  });

  const tadreebTeam = await prisma.collaborationTeam.upsert({
    where: { cityId_code: { cityId: city.id, code: "TADREEB" } },
    update: {},
    create: { cityId: city.id, name: "Tadreeb Team", code: "TADREEB", description: "Tadreeb & Tarbiyah Ethics" },
  });

  // 3. Create or update Base Content Plan
  let contentPlan = await prisma.contentPlan.findFirst({
    where: { name: "Lahore Batch 4 Base Curriculum Plan" },
  });

  if (!contentPlan) {
    contentPlan = await prisma.contentPlan.create({
      data: {
        name: "Lahore Batch 4 Base Curriculum Plan",
        kind: "base_template",
        status: "published",
        cityId: city.id,
        batchId: batch.id,
        sourceWorkbook: "B4_ Shabab Content Plan (1).xlsx",
      },
    });
  }

  console.log(`✅ Base ContentPlan ready: ID ${contentPlan.id}`);

  // 4. Collect rows sequentially
  let count = 0;
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values = row.values;
    if (!values || values.length < 5) continue;

    const weekStr = extractText(values[1]); // e.g. "Week 1"
    const dayStr = extractText(values[2]); // e.g. "Day 1"
    const dateVal = values[3];
    const exercisesText = extractText(values[4]);
    const sportsText = extractText(values[5]);
    const skillsText = extractText(values[6]);
    const tadreebText = extractText(values[7]);

    if (!weekStr || !dayStr) continue;

    const sessionDate = dateVal ? new Date(dateVal) : new Date();

    const session = await prisma.contentPlanSession.upsert({
      where: {
        planId_sessionDate: {
          planId: contentPlan.id,
          sessionDate,
        },
      },
      update: {
        weekLabel: weekStr,
        dayLabel: dayStr,
        focusArea: "Youth Development",
        status: "published",
      },
      create: {
        planId: contentPlan.id,
        weekLabel: weekStr,
        dayLabel: dayStr,
        sessionDate,
        focusArea: "Youth Development",
        status: "published",
      },
    });

    // Create or update blocks for 4 categories
    if (sportsText) {
      await prisma.contentPlanBlock.upsert({
        where: {
          sessionId_category_sortOrder: {
            sessionId: session.id,
            category: "sports",
            sortOrder: 1,
          },
        },
        update: { content: sportsText },
        create: {
          sessionId: session.id,
          teamId: sportsTeam.id,
          category: "sports",
          title: "Sports & Agility Drills",
          content: sportsText,
          sortOrder: 1,
        },
      });
    }

    if (skillsText) {
      await prisma.contentPlanBlock.upsert({
        where: {
          sessionId_category_sortOrder: {
            sessionId: session.id,
            category: "skills",
            sortOrder: 2,
          },
        },
        update: { content: skillsText },
        create: {
          sessionId: session.id,
          teamId: skillsTeam.id,
          category: "skills",
          title: "Life Skills Module",
          content: skillsText,
          sortOrder: 2,
        },
      });
    }

    if (tadreebText) {
      await prisma.contentPlanBlock.upsert({
        where: {
          sessionId_category_sortOrder: {
            sessionId: session.id,
            category: "tadreeb",
            sortOrder: 3,
          },
        },
        update: { content: tadreebText },
        create: {
          sessionId: session.id,
          teamId: tadreebTeam.id,
          category: "tadreeb",
          title: "Tadreeb & Tarbiyah Ethics",
          content: tadreebText,
          sortOrder: 3,
        },
      });
    }

    if (exercisesText) {
      await prisma.contentPlanBlock.upsert({
        where: {
          sessionId_category_sortOrder: {
            sessionId: session.id,
            category: "exercises",
            sortOrder: 4,
          },
        },
        update: { content: exercisesText },
        create: {
          sessionId: session.id,
          teamId: sportsTeam.id,
          category: "exercises",
          title: "Exercises & Martial Arts",
          content: exercisesText,
          sortOrder: 4,
        },
      });
    }

    count++;
  }

  console.log(`✨ Successfully seeded ${count} Batch 4 Content Plan sessions into Prisma DB!`);
}

seedContentPlan()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
