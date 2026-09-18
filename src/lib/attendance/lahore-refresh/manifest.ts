import { createHash } from "node:crypto";
import { LAHORE_REFRESH, REFRESH_DATE_PATTERN } from "./constants";
import { classifyStatus } from "./workbook";
import type {
  AttendanceStatus,
  DryRunSummary,
  ManifestEvent,
  ManifestEventRecord,
  ManifestParticipant,
  ManifestStaffPlaceholder,
  ParsedPark,
  ParsedStaff,
  ParsedStudent,
  ParsedStatus,
  RefreshManifest,
  RefreshManifestCounts,
} from "./types";

export function assertRefreshDate(value: string, label: string): string {
  if (!REFRESH_DATE_PATTERN.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  return value;
}

/** Earliest workbook `Dropout` cell on or before the completed-through date. */
export function earliestDropoutDate(statuses: readonly ParsedStatus[], attendanceThrough: string): string | null {
  const dates = statuses
    .filter((status) => {
      if (!status.date || status.date > attendanceThrough) return false;
      const classified = classifyStatus(status.value);
      return classified.kind === "review" && classified.code === "dropout";
    })
    .map((status) => status.date as string);
  return dates.length > 0 ? dates.sort()[0] : null;
}

/** Reserved placeholder identity; no real staff email exists to import. */
export function placeholderStaffEmail(sourceRef: string): string {
  const digest = createHash("sha256").update(sourceRef).digest("hex").slice(0, 20);
  return `staff-refresh+${digest}@${LAHORE_REFRESH.placeholderEmailDomain}`;
}

function toStaffPlaceholder(staff: ParsedStaff, parkName: string): ManifestStaffPlaceholder {
  return {
    sourceRef: staff.sourceRef,
    name: staff.name,
    phone: staff.phone || null,
    role: staff.canonicalRole ?? LAHORE_REFRESH.pendingStaffRole,
    isActive: false,
    mustResetPwd: true,
    email: placeholderStaffEmail(staff.sourceRef),
    parkName,
  };
}

interface ManifestOptions {
  readonly attendanceThrough?: string;
  readonly batchStartDate?: string;
  readonly batchEndDate?: string;
}

/**
 * Builds the write plan from parsed workbook sheets. Attendance is imported
 * only through `attendanceThrough`; later scheduled dates become calendar data
 * with no attendance records. A workbook `Dropout` cell becomes the manual
 * dropout date, prior marks are retained, later marks are omitted, and no
 * rejoin date is invented.
 */
export function buildRefreshManifest(parks: readonly ParsedPark[], options: ManifestOptions = {}): RefreshManifest {
  const attendanceThrough = assertRefreshDate(options.attendanceThrough ?? LAHORE_REFRESH.attendanceThrough, "attendanceThrough");
  const batchStartDate = assertRefreshDate(options.batchStartDate ?? LAHORE_REFRESH.batchStartDate, "batchStartDate");
  const batchEndDate = assertRefreshDate(options.batchEndDate ?? LAHORE_REFRESH.batchEndDate, "batchEndDate");
  if (batchStartDate > batchEndDate) throw new Error("batchStartDate must be on or before batchEndDate");

  const parkNames: string[] = [];
  const groupIndex: { parkName: string; name: string }[] = [];
  const participants: ManifestParticipant[] = [];
  const staff: ManifestStaffPlaceholder[] = [];
  const events = new Map<string, ManifestEvent>();
  const calendarDates = new Set<string>();
  const statusTotals: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  let participantsMissingPhone = 0;
  let participantsWithDropout = 0;

  for (const park of parks) {
    if (!parkNames.includes(park.parkName)) parkNames.push(park.parkName);
    for (const date of park.sessionDates) {
      if (date && date >= batchStartDate && date <= batchEndDate) calendarDates.add(date);
    }
    for (const member of park.staff) staff.push(toStaffPlaceholder(member, park.parkName));

    for (const group of park.groups) {
      if (!groupIndex.some((entry) => entry.parkName === park.parkName && entry.name === group.name)) {
        groupIndex.push({ parkName: park.parkName, name: group.name });
      }
      const candidates = park.unnumberedCandidates.filter((candidate) => candidate.group === group.name);
      const roster: ParsedStudent[] = [...group.students, ...candidates];

      for (const student of roster) {
        const dropoutAt = earliestDropoutDate(student.statuses, attendanceThrough);
        if (!student.hasPhone) participantsMissingPhone += 1;
        if (dropoutAt) participantsWithDropout += 1;
        participants.push({
          sourceRef: student.sourceRef,
          name: student.name,
          phone: student.phone || null,
          age: student.age,
          gradeClass: student.grade || null,
          parkName: park.parkName,
          groupName: group.name,
          state: dropoutAt ? "dropout" : "active",
          joinedAt: batchStartDate,
          dropoutAt,
          dropoutReason: dropoutAt ? LAHORE_REFRESH.workbookDropoutReason : null,
          dropoutSource: dropoutAt ? LAHORE_REFRESH.workbookDropoutSource : null,
          reactivatedAt: null,
        });

        for (const status of student.statuses) {
          if (!status.date || status.date > attendanceThrough) continue;
          if (status.date < batchStartDate || status.date > batchEndDate) continue;
          if (dropoutAt && status.date >= dropoutAt) continue;
          const classified = classifyStatus(status.value);
          if (classified.kind !== "record") continue;
          statusTotals[classified.target] += 1;
          const key = `${park.parkName}|${group.name}|${status.date}`;
          const event = events.get(key) ?? {
            parkName: park.parkName,
            groupName: group.name,
            date: status.date,
            title: LAHORE_REFRESH.eventTitle,
            isClosed: true as const,
            records: [] as ManifestEventRecord[],
          };
          (event.records as ManifestEventRecord[]).push({ participantSourceRef: student.sourceRef, status: classified.target });
          events.set(key, event);
        }
      }
    }
  }

  const sortedCalendarDates = [...calendarDates].sort();
  const historicalCalendarDates = sortedCalendarDates.filter((date) => date <= attendanceThrough).length;
  const eventList = [...events.values()].sort((a, b) => (a.date === b.date ? a.groupName.localeCompare(b.groupName) : a.date.localeCompare(b.date)));
  const counts: RefreshManifestCounts = {
    parks: parkNames.length,
    groups: groupIndex.length,
    participants: participants.length,
    staffPlaceholders: staff.length,
    attendanceEvents: eventList.length,
    attendanceRecords: eventList.reduce((total, event) => total + event.records.length, 0),
    calendarDates: sortedCalendarDates.length,
    historicalCalendarDates,
    futureCalendarDates: sortedCalendarDates.length - historicalCalendarDates,
    participantsMissingPhone,
    participantsWithDropout,
    statusTotals,
  };

  return {
    version: 1,
    city: { name: LAHORE_REFRESH.cityName, code: LAHORE_REFRESH.cityCode },
    batch: { name: LAHORE_REFRESH.batchName, startDate: batchStartDate, endDate: batchEndDate },
    attendanceThrough,
    parks: parkNames,
    groups: groupIndex,
    participants,
    staff,
    events: eventList,
    calendarDates: sortedCalendarDates,
    counts,
  };
}

/** Aggregate-only projection. Names, phones and source references never appear. */
export function buildDryRunSummary(manifest: RefreshManifest): DryRunSummary {
  return {
    mode: "dry-run",
    writesPerformed: false,
    cityCode: manifest.city.code,
    batch: { startDate: manifest.batch.startDate, endDate: manifest.batch.endDate },
    attendanceThrough: manifest.attendanceThrough,
    counts: manifest.counts,
  };
}
