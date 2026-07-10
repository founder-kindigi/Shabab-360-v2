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

  // 3. Create batches
  const batch1 = await db.batch.create({
    data: {
      name: "Batch 2024-A",
      parkId: northPark.id,
      startDate: new Date("2024-01-15"),
      isActive: true,
    },
  });
  const batch2 = await db.batch.create({
    data: {
      name: "Batch 2024-B",
      parkId: northPark.id,
      startDate: new Date("2024-06-01"),
      isActive: true,
    },
  });
  const batch3 = await db.batch.create({
    data: {
      name: "Batch 2024-C",
      parkId: southPark.id,
      startDate: new Date("2024-03-01"),
      isActive: true,
    },
  });
  console.log(`Created batches: ${batch1.name}, ${batch2.name}, ${batch3.name}`);

  // 4. Create groups
  const groupAlpha = await db.group.create({
    data: { name: "Group Alpha", batchId: batch1.id, isActive: true },
  });
  const groupBeta = await db.group.create({
    data: { name: "Group Beta", batchId: batch1.id, isActive: true },
  });
  const groupGamma = await db.group.create({
    data: { name: "Group Gamma", batchId: batch2.id, isActive: true },
  });
  const groupDelta = await db.group.create({
    data: { name: "Group Delta", batchId: batch3.id, isActive: true },
  });
  console.log(`Created groups: ${groupAlpha.name}, ${groupBeta.name}, ${groupGamma.name}, ${groupDelta.name}`);

  // 5. Create users with staff_meta (one per role)
  const superAdminUser = await db.user.create({
    data: { email: "super_admin@shabab360.pk", passwordHash, name: "Super Admin", mustResetPwd: false, isActive: true },
  });
  await db.staffMeta.create({ data: { userId: superAdminUser.id, role: "super_admin", isActive: true } });
  console.log(`Created user: ${superAdminUser.email} (super_admin)`);

  const programAdminUser = await db.user.create({
    data: { email: "program_admin@shabab360.pk", passwordHash, name: "Program Admin", mustResetPwd: false, isActive: true },
  });
  await db.staffMeta.create({ data: { userId: programAdminUser.id, role: "program_admin", isActive: true } });
  console.log(`Created user: ${programAdminUser.email} (program_admin)`);

  const cityHeadUser = await db.user.create({
    data: { email: "city_head@shabab360.pk", passwordHash, name: "City Head", mustResetPwd: false, isActive: true },
  });
  await db.staffMeta.create({ data: { userId: cityHeadUser.id, role: "city_head", assignedCityId: karachi.id, isActive: true } });
  console.log(`Created user: ${cityHeadUser.email} (city_head) -> ${karachi.name}`);

  const parkAdminUser = await db.user.create({
    data: { email: "park_admin@shabab360.pk", passwordHash, name: "Park Admin", mustResetPwd: false, isActive: true },
  });
  const parkAdminMeta = await db.staffMeta.create({
    data: { userId: parkAdminUser.id, role: "park_admin", assignedCityId: karachi.id, assignedParkId: northPark.id, isActive: true },
  });
  console.log(`Created user: ${parkAdminUser.email} (park_admin) -> ${northPark.name}`);

  const parkLeadUser = await db.user.create({
    data: { email: "park_lead@shabab360.pk", passwordHash, name: "Park Lead", mustResetPwd: false, isActive: true },
  });
  const parkLeadMeta = await db.staffMeta.create({
    data: { userId: parkLeadUser.id, role: "park_lead", assignedCityId: karachi.id, assignedParkId: northPark.id, isActive: true },
  });
  console.log(`Created user: ${parkLeadUser.email} (park_lead) -> ${northPark.name}`);

  const murabbiUser = await db.user.create({
    data: { email: "murabbi@shabab360.pk", passwordHash, name: "Murabbi Ahmad", mustResetPwd: false, isActive: true },
  });
  const murabbiMeta = await db.staffMeta.create({
    data: { userId: murabbiUser.id, role: "murabbi", assignedCityId: karachi.id, assignedParkId: northPark.id, assignedGroupId: groupAlpha.id, isActive: true },
  });
  console.log(`Created user: ${murabbiUser.email} (murabbi) -> ${groupAlpha.name}`);

  // 6. Create Guardian
  const guardianUser = await db.user.create({
    data: { email: "guardian@shabab360.pk", passwordHash, name: "Guardian Ali", mustResetPwd: false, isActive: true },
  });
  const guardian = await db.guardian.create({
    data: { userId: guardianUser.id, name: "Guardian Ali", phone: "0300-1234567", address: "Karachi", isActive: true },
  });
  console.log(`Created user: ${guardianUser.email} (guardian)`);

  // 7. Create participants (18 in Group Alpha, 12 in Group Beta, 15 in Group Gamma, 10 in Group Delta)
  const participantNamesAlpha = [
    "Ahmed Ali", "Bilal Hassan", "Daniyal Khan", "Farhan Siddiqui", "Hamza Tariq",
    "Irfan Ahmed", "Junaid Raza", "Khizar Hussain", "Luqman Shah", "Muhammad Usman",
    "Nauman Ali", "Omar Farooq", "Pakistan Zindabad", "Qasim Raza", "Rizwan Ahmed",
    "Saad Malik", "Taha Hussain", "Usman Ali",
  ];
  const participantNamesBeta = [
    "Abdullah Shah", "Burhan Khan", "Fahad Raza", "Ghulam Mustafa", "Hassan Ali",
    "Imran Siddiqui", "Jawad Ahmed", "Kamran Yousuf", "Liaquat Hussain", "Majid Khan",
    "Naveed Akhtar", "Owais Raza",
  ];
  const participantNamesGamma = [
    "Adnan Ali", "Babar Khan", "Danish Raza", "Ehsan Ahmed", "Faisal Shah",
    "Ghulam Ali", "Hammad Khan", "Ibrahim Siddiqui", "Jamshed Ahmed", "Kashif Hussain",
    "Latif Malik", "Mehmood Raza", "Nasir Ali", "Pervez Khan", "Rashid Ahmed",
  ];
  const participantNamesDelta = [
    "Ali Asghar", "Baqar Hussain", "Hasnain Raza", "Jafar Ali", "Kazim Shah",
    "Murtaza Khan", "Naqi Ahmed", "Qamar Raza", "Sajjad Ali", "Taqi Hussain",
  ];

  const studentUser = await db.user.create({
    data: { email: "student@shabab360.pk", passwordHash, name: "Student Ahmad", mustResetPwd: false, isActive: true },
  });
  const studentParticipant = await db.participant.create({
    data: { userId: studentUser.id, name: "Student Ahmad", phone: "0312-9876543", gender: "male", groupId: groupAlpha.id, state: "active" },
  });

  // Create remaining participants for Group Alpha (skip first one which is the student)
  for (const name of participantNamesAlpha.slice(1)) {
    await db.participant.create({
      data: { name, phone: `03${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`, gender: "male", groupId: groupAlpha.id, state: "active" },
    });
  }

  // Group Beta participants
  for (const name of participantNamesBeta) {
    await db.participant.create({
      data: { name, phone: `03${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`, gender: "male", groupId: groupBeta.id, state: "active" },
    });
  }

  // Group Gamma participants
  for (const name of participantNamesGamma) {
    await db.participant.create({
      data: { name, phone: `03${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`, gender: "male", groupId: groupGamma.id, state: "active" },
    });
  }

  // Group Delta participants
  for (const name of participantNamesDelta) {
    await db.participant.create({
      data: { name, phone: `03${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`, gender: "male", groupId: groupDelta.id, state: "active" },
    });
  }

  // Guardian-child link
  await db.guardianChild.create({
    data: { guardianId: guardian.id, participantId: studentParticipant.id, relation: "father" },
  });

  // 8. Create a sample attendance event for Group Alpha (today PKT)
  const now = new Date();
  const pktOffset = 5 * 60; // PKT = UTC+5
  const pktNow = new Date(now.getTime() + pktOffset * 60000);
  const todayPKTStr = pktNow.toISOString().split("T")[0]; // YYYY-MM-DD

  const sampleEvent = await db.attendanceEvent.create({
    data: {
      groupId: groupAlpha.id,
      title: `Regular Session - Group Alpha`,
      eventDate: new Date(`${todayPKTStr}T00:00:00.000Z`), // Stored as UTC midnight of PKT date
      isClosed: false,
    },
  });

  // Create another event for Group Beta (today, already closed)
  const allGroupBetaParticipants = await db.participant.findMany({
    where: { groupId: groupBeta.id, state: "active" },
  });
  const closedEvent = await db.attendanceEvent.create({
    data: {
      groupId: groupBeta.id,
      title: `Regular Session - Group Beta`,
      eventDate: new Date(`${todayPKTStr}T00:00:00.000Z`),
      isClosed: true,
      closedAt: new Date(),
      closedBy: parkAdminMeta.id,
    },
  });

  // Mark all Group Beta participants as present in the closed event
  for (const p of allGroupBetaParticipants) {
    await db.attendanceRecord.create({
      data: {
        eventId: closedEvent.id,
        participantId: p.id,
        status: "present",
        markedBy: parkAdminMeta.id,
      },
    });
  }

  // Mark some Group Alpha participants in the open event
  const alphaParticipants = await db.participant.findMany({
    where: { groupId: groupAlpha.id, state: "active" },
  });
  for (let i = 0; i < Math.min(10, alphaParticipants.length); i++) {
    await db.attendanceRecord.create({
      data: {
        eventId: sampleEvent.id,
        participantId: alphaParticipants[i].id,
        status: i < 7 ? "present" : i < 9 ? "late" : "absent",
        markedBy: murabbiMeta.id,
      },
    });
  }

  console.log(`Created ${participantNamesAlpha.length} participants in Group Alpha`);
  console.log(`Created ${participantNamesBeta.length} participants in Group Beta`);
  console.log(`Created ${participantNamesGamma.length} participants in Group Gamma`);
  console.log(`Created ${participantNamesDelta.length} participants in Group Delta`);
  console.log(`Created 2 sample attendance events for today`);

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