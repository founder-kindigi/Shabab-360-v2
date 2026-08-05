/**
 * Shabab 360 - Attendance Operations & Dropout Policy Engine (V2-304)
 * Handles automated consecutive absence evaluation, manual dropout, reactivation, and off-dates.
 */

export interface AttendanceStatusRecord {
  eventId: string;
  eventDate: Date | string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface DropoutPolicySettings {
  warningAbsents: number; // default 3
  dropoutAbsents: number; // default 6
  offWeekdays?: number[]; // e.g. [0, 6] for Sunday/Saturday off
  exceptionDates?: string[]; // e.g. ["2026-08-14"] for holiday
}

export interface ParticipantStateResult {
  currentState: 'active' | 'warning' | 'dropout' | 'inactive';
  consecutiveAbsences: number;
  shouldTriggerWarning: boolean;
  shouldTriggerDropout: boolean;
  reason?: string;
}

/**
 * Checks if a given date is a configured off weekend or exception date.
 */
export function isOffDate(date: Date | string, settings: DropoutPolicySettings): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

  if (settings.offWeekdays && settings.offWeekdays.includes(dayOfWeek)) {
    return true;
  }

  if (settings.exceptionDates) {
    const dateStr = d.toISOString().split('T')[0];
    if (settings.exceptionDates.includes(dateStr)) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates consecutive absences and determines if warning or automatic dropout is triggered.
 */
export function evaluateConsecutiveAbsences(
  records: AttendanceStatusRecord[],
  settings: DropoutPolicySettings = { warningAbsents: 3, dropoutAbsents: 6 }
): ParticipantStateResult {
  // Sort records descending by date (most recent first)
  const sorted = [...records].sort((a, b) => {
    const da = a.eventDate instanceof Date ? a.eventDate : new Date(a.eventDate);
    const db = b.eventDate instanceof Date ? b.eventDate : new Date(b.eventDate);
    return db.getTime() - da.getTime();
  });

  let consecutiveAbsences = 0;

  for (const r of sorted) {
    // Ignore off dates
    if (isOffDate(r.eventDate, settings)) continue;

    if (r.status === 'absent') {
      consecutiveAbsences++;
    } else if (r.status === 'present' || r.status === 'late') {
      // Streak broken by presence
      break;
    }
    // Excused absences do not increment consecutive absence counter nor break streak
  }

  const shouldTriggerDropout = consecutiveAbsences >= settings.dropoutAbsents;
  const shouldTriggerWarning = !shouldTriggerDropout && consecutiveAbsences >= settings.warningAbsents;

  let currentState: ParticipantStateResult['currentState'] = 'active';
  if (shouldTriggerDropout) currentState = 'dropout';
  else if (shouldTriggerWarning) currentState = 'warning';

  return {
    currentState,
    consecutiveAbsences,
    shouldTriggerWarning,
    shouldTriggerDropout,
    reason: shouldTriggerDropout
      ? `Automated dropout: ${consecutiveAbsences} consecutive unexcused absences reached limit (${settings.dropoutAbsents}).`
      : shouldTriggerWarning
      ? `Warning: ${consecutiveAbsences} consecutive absences reached warning limit (${settings.warningAbsents}).`
      : undefined,
  };
}

/**
 * Ensures attendance recording stops after dropout unless reactivated.
 */
export function canMarkAttendance(participantState: string): { canMark: boolean; reason?: string } {
  if (participantState === 'dropout') {
    return {
      canMark: false,
      reason: 'Attendance marking stopped: Student is marked as dropout. Reactivation required.',
    };
  }

  if (participantState === 'inactive') {
    return {
      canMark: false,
      reason: 'Attendance marking stopped: Student is inactive.',
    };
  }

  return { canMark: true };
}
