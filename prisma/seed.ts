import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Hash password
  const seedPassword = process.env.SEED_PASSWORD || "password123";
  const passwordHash = await bcrypt.hash(seedPassword, 12);

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

  // =====================================================================
  // ENHANCED SEED DATA — Historical events, audit logs, announcements, fees
  // =====================================================================

  // Helper: PKT "today at 00:00" as a Date string
  const pktToday = new Date(`${todayPKTStr}T00:00:00.000Z`);

  // ---- 1. Historical Attendance Events (last 30 days) ----
  const groups = [
    { group: groupAlpha, name: "Alpha" },
    { group: groupBeta, name: "Beta" },
    { group: groupGamma, name: "Gamma" },
    { group: groupDelta, name: "Delta" },
  ];

  const sessionTitles = [
    "Regular Session",
    "Quran Recitation",
    "Islamic Studies",
    "Group Discussion",
  ];

  // Pre-fetch all participants per group
  const participantsByGroup: Record<string, { id: string }[]> = {};
  for (const { group } of groups) {
    participantsByGroup[group.id] = await db.participant.findMany({
      where: { groupId: group.id, state: "active" },
      select: { id: true },
    });
  }

  // Marker IDs (rotate between murabbi and park admin)
  const markerIds = [murabbiMeta.id, parkAdminMeta.id];

  // Seeded random for determinism across re-runs (optional — using Math.random is fine)
  let totalHistoricalEvents = 0;
  let totalHistoricalRecords = 0;

  for (const { group, name } of groups) {
    const participants = participantsByGroup[group.id];
    if (participants.length === 0) continue;

    let eventCount = 0;
    for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
      // Skip ~30% of days randomly
      if (Math.random() < 0.30) continue;

      const eventDate = new Date(pktToday.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const title = `${sessionTitles[Math.floor(Math.random() * sessionTitles.length)]} - Group ${name}`;

      const isOlderThan2Days = daysAgo > 2;
      const closedAt = isOlderThan2Days
        ? new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // event date + 2 hours
        : null;

      const event = await db.attendanceEvent.create({
        data: {
          groupId: group.id,
          title,
          eventDate,
          isClosed: isOlderThan2Days,
          closedAt,
          closedBy: isOlderThan2Days ? markerIds[daysAgo % 2] : null,
        },
      });
      eventCount++;

      // ---- 2. Attendance Records for this event ----
      // Shuffle participants for variety
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const presentRate = 0.60 + Math.random() * 0.25; // 60-85%
      const lateRate = 0.05 + Math.random() * 0.05;     // 5-10%
      const absentRate = 0.05 + Math.random() * 0.05;    // 5-10%
      const excusedRate = 0.02 + Math.random() * 0.03;   // 2-5%

      const presentCount = Math.round(shuffled.length * presentRate);
      const lateCount = Math.round(shuffled.length * lateRate);
      const absentCount = Math.round(shuffled.length * absentRate);
      const excusedCount = Math.round(shuffled.length * excusedRate);

      let idx = 0;
      const records: {
        eventId: string;
        participantId: string;
        status: "present" | "absent" | "late" | "excused";
        markedBy: string;
        markedAt: Date;
      }[] = [];

      // Present
      for (let i = 0; i < presentCount && idx < shuffled.length; i++, idx++) {
        const markedAt = new Date(eventDate.getTime() + (17 * 60 + Math.floor(Math.random() * 30)) * 60000); // 5:00-5:30 PM
        records.push({ eventId: event.id, participantId: shuffled[idx].id, status: "present", markedBy: markerIds[idx % 2], markedAt });
      }
      // Late
      for (let i = 0; i < lateCount && idx < shuffled.length; i++, idx++) {
        const markedAt = new Date(eventDate.getTime() + (17 * 60 + 30 + Math.floor(Math.random() * 30)) * 60000); // 5:30-6:00 PM
        records.push({ eventId: event.id, participantId: shuffled[idx].id, status: "late", markedBy: markerIds[idx % 2], markedAt });
      }
      // Absent
      for (let i = 0; i < absentCount && idx < shuffled.length; i++, idx++) {
        const markedAt = new Date(eventDate.getTime() + (18 * 60 + Math.floor(Math.random() * 30)) * 60000); // 6:00-6:30 PM
        records.push({ eventId: event.id, participantId: shuffled[idx].id, status: "absent", markedBy: markerIds[idx % 2], markedAt });
      }
      // Excused
      for (let i = 0; i < excusedCount && idx < shuffled.length; i++, idx++) {
        const markedAt = new Date(eventDate.getTime() + (18 * 60 + Math.floor(Math.random() * 30)) * 60000);
        records.push({ eventId: event.id, participantId: shuffled[idx].id, status: "excused", markedBy: markerIds[idx % 2], markedAt });
      }

      if (records.length > 0) {
        await db.attendanceRecord.createMany({ data: records });
        totalHistoricalRecords += records.length;
      }
    }
    console.log(`Creating ${eventCount} historical events for Group ${name}...`);
    totalHistoricalEvents += eventCount;
  }
  console.log(`Total historical events: ${totalHistoricalEvents}`);
  console.log(`Total historical attendance records: ${totalHistoricalRecords}`);

  // ---- 3. Audit Log Entries (~20 entries spanning last 30 days) ----
  console.log("Creating audit log entries...");
  const auditEntries = [
    { daysAgo: 28, userId: superAdminUser.id, action: "create", entityType: "City", entityId: karachi.id, newValues: JSON.stringify({ name: "Karachi", code: "KHI" }) },
    { daysAgo: 27, userId: superAdminUser.id, action: "create", entityType: "City", entityId: lahore.id, newValues: JSON.stringify({ name: "Lahore", code: "LHR" }) },
    { daysAgo: 27, userId: superAdminUser.id, action: "create", entityType: "City", entityId: islamabad.id, newValues: JSON.stringify({ name: "Islamabad", code: "ISB" }) },
    { daysAgo: 26, userId: cityHeadUser.id, action: "create", entityType: "Park", entityId: northPark.id, newValues: JSON.stringify({ name: "North Park", cityId: karachi.id }) },
    { daysAgo: 25, userId: cityHeadUser.id, action: "create", entityType: "Park", entityId: southPark.id, newValues: JSON.stringify({ name: "South Park", cityId: karachi.id }) },
    { daysAgo: 24, userId: parkAdminUser.id, action: "create", entityType: "Batch", entityId: batch1.id, newValues: JSON.stringify({ name: "Batch 2024-A" }) },
    { daysAgo: 22, userId: parkAdminUser.id, action: "create", entityType: "Batch", entityId: batch2.id, newValues: JSON.stringify({ name: "Batch 2024-B" }) },
    { daysAgo: 20, userId: parkAdminUser.id, action: "create", entityType: "Batch", entityId: batch3.id, newValues: JSON.stringify({ name: "Batch 2024-C" }) },
    { daysAgo: 19, userId: parkLeadUser.id, action: "create", entityType: "Group", entityId: groupAlpha.id, newValues: JSON.stringify({ name: "Group Alpha" }) },
    { daysAgo: 18, userId: parkLeadUser.id, action: "create", entityType: "Group", entityId: groupBeta.id, newValues: JSON.stringify({ name: "Group Beta" }) },
    { daysAgo: 17, userId: parkLeadUser.id, action: "create", entityType: "Group", entityId: groupGamma.id, newValues: JSON.stringify({ name: "Group Gamma" }) },
    { daysAgo: 16, userId: parkLeadUser.id, action: "create", entityType: "Group", entityId: groupDelta.id, newValues: JSON.stringify({ name: "Group Delta" }) },
    { daysAgo: 15, userId: superAdminUser.id, action: "login", entityType: "User", entityId: superAdminUser.id, newValues: null },
    { daysAgo: 10, userId: parkAdminUser.id, action: "login", entityType: "User", entityId: parkAdminUser.id, newValues: null },
    { daysAgo: 7, userId: murabbiUser.id, action: "login", entityType: "User", entityId: murabbiUser.id, newValues: null },
    { daysAgo: 5, userId: programAdminUser.id, action: "login", entityType: "User", entityId: programAdminUser.id, newValues: null },
    { daysAgo: 3, userId: cityHeadUser.id, action: "login", entityType: "User", entityId: cityHeadUser.id, newValues: null },
    { daysAgo: 3, userId: murabbiUser.id, action: "create", entityType: "AttendanceEvent", entityId: null, newValues: JSON.stringify({ title: "Regular Session", group: "Group Alpha" }) },
    { daysAgo: 1, userId: parkAdminUser.id, action: "create", entityType: "AttendanceEvent", entityId: null, newValues: JSON.stringify({ title: "Regular Session", group: "Group Beta" }) },
    { daysAgo: 0, userId: murabbiUser.id, action: "create", entityType: "AttendanceEvent", entityId: null, newValues: JSON.stringify({ title: "Regular Session", group: "Group Alpha" }) },
  ];

  for (const entry of auditEntries) {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        newValues: entry.newValues,
        createdAt: new Date(Date.now() - entry.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`Created ${auditEntries.length} audit log entries`);

  // ---- 4. Sample Announcements ----
  console.log("Creating announcements...");
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.announcement.create({
    data: {
      title: "Eid Milad-un-Nabi Program Schedule",
      content: "All parks are requested to prepare for the special Eid Milad-un-Nabi (SAW) program. Detailed schedules have been shared with park admins. Ensure all participants arrive 30 minutes before the scheduled time. Naat and speech competitions will be held.",
      priority: "urgent",
      targetRoles: JSON.stringify(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]),
      authorId: programAdminUser.id,
      expiresAt: in7Days,
    },
  });

  await db.announcement.create({
    data: {
      title: "New Batch 2024-D Starting Next Month",
      content: "Registration for Batch 2024-D will open next month. Park admins should begin identifying potential candidates and preparing admission materials. The new batch will focus on advanced Islamic studies and leadership training.",
      priority: "normal",
      targetRoles: JSON.stringify(["park_admin", "park_lead", "murabbi"]),
      authorId: programAdminUser.id,
      expiresAt: in30Days,
    },
  });

  await db.announcement.create({
    data: {
      title: "System Maintenance Notice",
      content: "The Shabab360 system will undergo scheduled maintenance this weekend. The system may be unavailable for 2-3 hours. Please save any ongoing work before the maintenance window. All data will be preserved.",
      priority: "low",
      targetRoles: JSON.stringify(["super_admin", "program_admin"]),
      authorId: superAdminUser.id,
      expiresAt: in14Days,
    },
  });
  console.log("Created 3 announcements");

  // ---- 5. Sample Fee Event and Payments ----
  console.log("Creating fee event and payments...");
  const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  const feeEvent = await db.feeEvent.create({
    data: {
      batchId: batch1.id,
      title: "Monthly Tuition - January 2025",
      feeType: "tuition",
      amount: 2000,
      dueDate: in15Days,
      isActive: true,
    },
  });

  // Pick 4 random participants from Group Alpha for sample payments
  const alphaParticipantIds = participantsByGroup[groupAlpha.id].map(p => p.id);
  const paymentParticipants = alphaParticipantIds
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  const paymentMethods = ["cash", "bank_transfer", "jazzcash", "easypaisa"] as const;
  for (let i = 0; i < paymentParticipants.length; i++) {
    const paidDaysAgo = Math.floor(Math.random() * 10) + 1;
    await db.payment.create({
      data: {
        feeEventId: feeEvent.id,
        participantId: paymentParticipants[i],
        amount: 2000,
        method: paymentMethods[i % paymentMethods.length],
        receiptNo: `FEE-2025-${String(i + 1).padStart(4, "0")}`,
        recordedBy: parkAdminMeta.id,
        notes: i === 0 ? "Paid in full" : undefined,
        createdAt: new Date(Date.now() - paidDaysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`Created 1 fee event and ${paymentParticipants.length} sample payments`);

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
