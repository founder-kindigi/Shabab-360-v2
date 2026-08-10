const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function updatePlans() {
  console.log("Updating Content Plans to Lahore Batch 4...");

  // Find Lahore city
  const lahore = await db.city.findFirst({
    where: { name: "Lahore" },
  });

  const batch4 = await db.batch.findFirst({
    where: { name: "Lahore Batch 4" },
  });

  if (!lahore) {
    console.error("Lahore city not found in DB");
    return;
  }

  // Update existing content plans to Lahore Batch 4
  const updatedCount = await db.contentPlan.updateMany({
    data: {
      cityId: lahore.id,
      batchId: batch4 ? batch4.id : undefined,
      name: "Lahore Batch 4 Shabab Content & Activity Syllabus 2026",
    },
  });

  console.log(`Updated ${updatedCount.count} content plans to Lahore Batch 4!`);
}

updatePlans()
  .catch((e) => console.error(e))
  .finally(() => db.$disconnect());
