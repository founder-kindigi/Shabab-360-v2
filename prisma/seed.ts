import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Hash password
  const passwordHash = await bcrypt.hash("password123", 12);

  // 1. Create cities
  const karachi = await db.city.create({
    data: { name: "Karachi", code: "KHI", isActive: true },
  });
  const lahore = await db.city.create({
    data: { name: "Lahore", code: "LHR", isActive: true },
  });
  const islamabad = await db.city.create({
    data: { name: "Islamabad", code: "ISB", isActive: true },
  });
  console.log(`Created cities: ${karachi.name}, ${lahore.name}, ${islamabad.name}`);

  // 2. Create parks under Karachi
  const northPark = await db.park.create({
    data: { name: "North Park", cityId: karachi.id, address: "North Karachi", isActive: true },
  });
  const southPark = await db.park.create({
    data: { name: "South Park", cityId: karachi.id, address: "South Karachi", isActive: true },
  });
  console.log(`Created parks: ${northPark.name}, ${southPark.name}`);

  // 3. Create batch under North Park
  const batch1 = await db.batch.create({
    data: {
      name: "Batch 2024-A",
      parkId: northPark.id,
      startDate: new Date("2024-01-15"),
      isActive: true,
    },
  });
  console.log(`Created batch: ${batch1.name}`);

  // 4. Create group under the batch
  const group1 = await db.group.create({
    data: {
      name: "Group Alpha",
      batchId: batch1.id,
      isActive: true,
    },
  });
  console.log(`Created group: ${group1.name}`);

  // 5. Create users with staff_meta (one per role)

  // Super Admin
  const superAdminUser = await db.user.create({
    data: {
      email: "super_admin@shabab360.pk",
      passwordHash,
      name: "Super Admin",
      mustResetPwd: false,
      isActive: true,
    },
  });
  await db.staffMeta.create({
    data: {
      userId: superAdminUser.id,
      role: "super_admin",
      isActive: true,
    },
  });
  console.log(`Created user: ${superAdminUser.email} (super_admin)`);

  // Program Admin
  const programAdminUser = await db.user.create({
    data: {
      email: "program_admin@shabab360.pk",
      passwordHash,
      name: "Program Admin",
      mustResetPwd: false,
      isActive: true,
    },
  });
  await db.staffMeta.create({
    data: {
      userId: programAdminUser.id,
      role: "program_admin",
      isActive: true,
    },
  });
  console.log(`Created user: ${programAdminUser.email} (program_admin)`);

  // City Head (assigned to Karachi)
  const cityHeadUser = await db.user.create({
    data: {
      email: "city_head@shabab360.pk",
      passwordHash,
      name: "City Head",
      mustResetPwd: false,
      isActive: true,
    },
  });
  await db.staffMeta.create({
    data: {
      userId: cityHeadUser.id,
      role: "city_head",
      assignedCityId: karachi.id,
      isActive: true,
    },
  });
  console.log(`Created user: ${cityHeadUser.email} (city_head) -> ${karachi.name}`);

  // Park Admin (assigned to North Park)
  const parkAdminUser = await db.user.create({
    data: {
      email: "park_admin@shabab360.pk",
      passwordHash,
      name: "Park Admin",
      mustResetPwd: false,
      isActive: true,
    },
  });
  await db.staffMeta.create({
    data: {
      userId: parkAdminUser.id,
      role: "park_admin",
      assignedCityId: karachi.id,
      assignedParkId: northPark.id,
      isActive: true,
    },
  });
  console.log(`Created user: ${parkAdminUser.email} (park_admin) -> ${northPark.name}`);

  // Park Lead (assigned to North Park)
  const parkLeadUser = await db.user.create({
    data: {
      email: "park_lead@shabab360.pk",
      passwordHash,
      name: "Park Lead",
      mustResetPwd: false,
      isActive: true,
    },
  });
  await db.staffMeta.create({
    data: {
      userId: parkLeadUser.id,
      role: "park_lead",
      assignedCityId: karachi.id,
      assignedParkId: northPark.id,
      isActive: true,
    },
  });
  console.log(`Created user: ${parkLeadUser.email} (park_lead) -> ${northPark.name}`);

  // Murabbi (assigned to the group)
  const murabbiUser = await db.user.create({
    data: {
      email: "murabbi@shabab360.pk",
      passwordHash,
      name: "Murabbi Ahmad",
      mustResetPwd: false,
      isActive: true,
    },
  });
  await db.staffMeta.create({
    data: {
      userId: murabbiUser.id,
      role: "murabbi",
      assignedCityId: karachi.id,
      assignedParkId: northPark.id,
      assignedGroupId: group1.id,
      isActive: true,
    },
  });
  console.log(`Created user: ${murabbiUser.email} (murabbi) -> ${group1.name}`);

  // Guardian
  const guardianUser = await db.user.create({
    data: {
      email: "guardian@shabab360.pk",
      passwordHash,
      name: "Guardian Ali",
      mustResetPwd: false,
      isActive: true,
    },
  });
  const guardian = await db.guardian.create({
    data: {
      userId: guardianUser.id,
      name: "Guardian Ali",
      phone: "0300-1234567",
      address: "Karachi",
      isActive: true,
    },
  });
  console.log(`Created user: ${guardianUser.email} (guardian)`);

  // Student/Participant
  const studentUser = await db.user.create({
    data: {
      email: "student@shabab360.pk",
      passwordHash,
      name: "Student Ahmad",
      mustResetPwd: false,
      isActive: true,
    },
  });
  const participant = await db.participant.create({
    data: {
      userId: studentUser.id,
      name: "Student Ahmad",
      phone: "0312-9876543",
      gender: "male",
      groupId: group1.id,
      state: "active",
    },
  });

  // Create guardian-child link
  await db.guardianChild.create({
    data: {
      guardianId: guardian.id,
      participantId: participant.id,
      relation: "father",
    },
  });
  console.log(`Created user: ${studentUser.email} (student) -> ${group1.name}`);

  console.log("\nSeed completed successfully!");
  console.log("─".repeat(50));
  console.log("Demo accounts (all passwords: password123):");
  console.log("  super_admin@shabab360.pk   - Super Admin");
  console.log("  program_admin@shabab360.pk  - Program Admin");
  console.log("  city_head@shabab360.pk      - City Head (Karachi)");
  console.log("  park_admin@shabab360.pk     - Park Admin (North Park)");
  console.log("  park_lead@shabab360.pk      - Park Lead (North Park)");
  console.log("  murabbi@shabab360.pk        - Murabbi (Group Alpha)");
  console.log("  guardian@shabab360.pk       - Guardian");
  console.log("  student@shabab360.pk        - Student");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });