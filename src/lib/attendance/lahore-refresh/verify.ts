import { LAHORE_REFRESH } from "./constants";
import type { RefreshManifest, RefreshReader, VerificationCheck, VerificationReport } from "./types";

function check(name: string, ok: boolean, expected?: number | string, actual?: number | string): VerificationCheck {
  return { name, ok, expected, actual };
}

function countCheck(name: string, expected: number, actual: number): VerificationCheck {
  return check(name, expected === actual, expected, actual);
}

/**
 * Post-import aggregate verification. Every read is an aggregate; no names,
 * phones or row values are ever returned or logged.
 */
export async function verifyRefresh(reader: RefreshReader, manifest: RefreshManifest): Promise<VerificationReport> {
  const expected = manifest.counts;
  const [
    cities,
    parks,
    groups,
    participants,
    events,
    records,
    calendarDates,
    users,
    activeUsers,
    foreignCities,
    foreignParks,
    participantsWithoutGroup,
    groupsWithoutBatch,
    recordsAfterCutoff,
  ] = await Promise.all([
    reader.countTable("cities"),
    reader.countTable("parks"),
    reader.countTable("groups"),
    reader.countTable("participants"),
    reader.countTable("attendance_events"),
    reader.countTable("attendance_records"),
    reader.countTable("batch_class_dates"),
    reader.countTable("users"),
    reader.countActiveUsersByRole(),
    reader.countCitiesOtherThanLahore(),
    reader.countParksOutsideLahore(),
    reader.countParticipantsWithoutGroup(),
    reader.countGroupsWithoutBatch(),
    reader.countAttendanceRecordsAfter(manifest.attendanceThrough),
  ]);

  const checks: VerificationCheck[] = [
    countCheck("parks", expected.parks, parks),
    countCheck("groups", expected.groups, groups),
    countCheck("participants", expected.participants, participants),
    countCheck("attendanceEvents", expected.attendanceEvents, events),
    countCheck("attendanceRecords", expected.attendanceRecords, records),
    countCheck("calendarDates", expected.calendarDates, calendarDates),
    check("cityIsLahoreOnly", cities === 1 && foreignCities === 0, 1, cities),
    check("noForeignParks", foreignParks === 0, 0, foreignParks),
    check("participantsAllGrouped", participantsWithoutGroup === 0, 0, participantsWithoutGroup),
    check("groupsAllBatched", groupsWithoutBatch === 0, 0, groupsWithoutBatch),
    check("onlySuperAdminsActive", activeUsers.other === 0 && activeUsers.superAdmin > 0, "super_admin only", `${activeUsers.superAdmin} super_admin / ${activeUsers.other} other`),
    countCheck("userTotal", activeUsers.superAdmin + manifest.staff.length, users),
    check("noRecordsAfterCutoff", recordsAfterCutoff === 0, 0, recordsAfterCutoff),
    countCheck("expectedParks", LAHORE_REFRESH.expectedParks, parks),
    countCheck("expectedGroups", LAHORE_REFRESH.expectedGroups, groups),
  ];

  const failures = checks.filter((entry) => !entry.ok).map((entry) => entry.name);
  return { ok: failures.length === 0, checks, failures };
}
