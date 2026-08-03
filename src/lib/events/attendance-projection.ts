export type EventCheckInStatus = "present" | "absent" | "late" | "excused";

export interface RegisteredEventParticipant {
  participantId: string;
  groupId: string | null;
  status: EventCheckInStatus;
}

export interface RegularAttendanceSession {
  id: string;
  groupId: string;
}

export interface AttendanceProjection {
  participantId: string;
  attendanceEventId: string;
  status: EventCheckInStatus;
}

export interface ProjectionIssue {
  participantId: string;
  code: "unassigned_participant" | "missing_regular_session" | "duplicate_registration";
}

/**
 * Plans, but never writes, event attendance into each participant's normal
 * group session. Callers must execute this plan transactionally with an
 * event-registration uniqueness constraint.
 */
export function buildEventAttendanceProjection(
  registrations: RegisteredEventParticipant[],
  regularSessions: RegularAttendanceSession[],
): { projections: AttendanceProjection[]; issues: ProjectionIssue[] } {
  const sessionByGroup = new Map(regularSessions.map((session) => [session.groupId, session]));
  const seenParticipants = new Set<string>();
  const projections: AttendanceProjection[] = [];
  const issues: ProjectionIssue[] = [];

  for (const registration of registrations) {
    if (seenParticipants.has(registration.participantId)) {
      issues.push({ participantId: registration.participantId, code: "duplicate_registration" });
      continue;
    }
    seenParticipants.add(registration.participantId);

    if (!registration.groupId) {
      issues.push({ participantId: registration.participantId, code: "unassigned_participant" });
      continue;
    }
    const session = sessionByGroup.get(registration.groupId);
    if (!session) {
      issues.push({ participantId: registration.participantId, code: "missing_regular_session" });
      continue;
    }
    projections.push({ participantId: registration.participantId, attendanceEventId: session.id, status: registration.status });
  }

  return { projections, issues };
}
