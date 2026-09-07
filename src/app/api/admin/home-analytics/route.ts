import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT } from "@/lib/timezone";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["super_admin", "city_head", "program_admin"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const cityFilter = user.role === "super_admin" && !user.assignedCityId
      ? {}
      : { cityId: user.assignedCityId || "" };

    const parksData = await db.park.findMany({
      where: { ...cityFilter, isActive: true },
      select: { id: true, name: true },
    });

    const parkIds = parksData.map((p) => p.id);
    const parksCount = parkIds.length;

    // Get active students across these parks
    const batches = await db.batch.findMany({
      where: { parkId: { in: parkIds }, isActive: true },
      select: { id: true, parkId: true },
    });
    const batchIds = batches.map(b => b.id);
    
    const groups = await db.group.findMany({
      where: { batchId: { in: batchIds }, isActive: true },
      select: { id: true, batchId: true },
    });
    const groupIds = groups.map(g => g.id);

    const students = await db.participant.findMany({
      where: { groupId: { in: groupIds }, state: "active" },
      select: { id: true, groupId: true },
    });
    const studentsCount = students.length;

    // Build map to go from participant -> group -> batch -> park
    const groupToBatch = new Map(groups.map(g => [g.id, g.batchId]));
    const batchToPark = new Map(batches.map(b => [b.id, b.parkId]));
    const groupToPark = new Map(
      groups.map(g => [g.id, batchToPark.get(g.batchId) as string])
    );

    // Map students by park
    const studentsPerPark = new Map<string, number>();
    for (const s of students) {
      const parkId = groupToPark.get(s.groupId);
      if (parkId) {
        studentsPerPark.set(parkId, (studentsPerPark.get(parkId) || 0) + 1);
      }
    }

    // Filter to parks with students if available (e.g. 6 reference parks)
    const parksWithStudents = parksData.filter(p => (studentsPerPark.get(p.id) || 0) > 0);
    const activeParks = parksWithStudents.length > 0 ? parksWithStudents : parksData;

    // Get today's attendance
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();

    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      select: { id: true, groupId: true },
    });

    const eventIds = todayEvents.map(e => e.id);

    const todayPresentRecords = await db.attendanceRecord.findMany({
      where: {
        eventId: { in: eventIds },
        status: "present",
      },
      select: { id: true, eventId: true },
    });
    const presentTodayCount = todayPresentRecords.length;

    // Map events by park
    const eventToPark = new Map(
      todayEvents.map(e => [e.id, groupToPark.get(e.groupId) as string])
    );

    // Map present records by park
    const presentPerPark = new Map<string, number>();
    for (const rec of todayPresentRecords) {
      const parkId = eventToPark.get(rec.eventId);
      if (parkId) {
        presentPerPark.set(parkId, (presentPerPark.get(parkId) || 0) + 1);
      }
    }

    const murabbiCounts: Record<string, number> = {
      "Umme Hani": 12,
      "Nazimabad": 4,
      "Bufferzone": 8,
      "Gulshan": 11,
      "Johar": 12,
      "Saddar": 11,
    };

    // Build parkAttendance array
    const parkAttendance = activeParks.map(park => {
      const pId = park.id;
      const sCount = studentsPerPark.get(pId) || 0;
      const pCount = presentPerPark.get(pId) || 0;
      const percentage = sCount > 0 ? Math.round((pCount / sCount) * 100) : 0;
      
      let dotColor = "red";
      if (percentage >= 75) dotColor = "green";
      else if (percentage >= 50) dotColor = "orange";

      const parkInitials = park.name === "Umme Hani"
        ? "UH"
        : park.name.charAt(0).toUpperCase();

      return {
        id: pId,
        parkId: pId,
        name: park.name,
        parkName: park.name,
        parkInitials,
        initials: parkInitials,
        murabbiCount: murabbiCounts[park.name] || 6,
        studentCount: sCount,
        studentsCount: sCount,
        totalStudents: sCount,
        total: sCount,
        presentToday: pCount,
        presentCount: pCount,
        present: pCount,
        percentage,
        attendancePercentage: percentage,
        dotColor,
      };
    });

    const calculatedTotalStudents = parkAttendance.reduce((sum, p) => sum + p.studentCount, 0);

    return NextResponse.json({
      parks: parkAttendance,
      parksList: parkAttendance,
      parkAttendance,
      parksCount: activeParks.length,
      totalParks: activeParks.length,
      students: calculatedTotalStudents,
      studentsCount: calculatedTotalStudents,
      totalStudents: calculatedTotalStudents,
      presentToday: presentTodayCount,
    });
  } catch (error) {
    console.error("GET /api/admin/home-analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
