import { describe, it, expect } from 'vitest';
import {
  evaluateConsecutiveAbsences,
  isOffDate,
  canMarkAttendance,
  AttendanceStatusRecord,
  evaluateConsecutiveAbsenceWeeks,
} from '../dropout-policy';

describe('V2-304 Attendance Operations & Dropout Policy Engine', () => {
  it('identifies off weekends and exception dates correctly', () => {
    const settings = {
      warningAbsents: 3,
      dropoutAbsents: 6,
      offWeekdays: [0, 6], // Sunday = 0, Saturday = 6
      exceptionDates: ['2026-08-14'],
    };

    // Sunday Aug 9, 2026 -> Off
    expect(isOffDate(new Date('2026-08-09'), settings)).toBe(true);
    // Friday Aug 14, 2026 (Pakistan Independence Day) -> Off exception
    expect(isOffDate(new Date('2026-08-14'), settings)).toBe(true);
    // Wednesday Aug 12, 2026 -> Active Class Day
    expect(isOffDate(new Date('2026-08-12'), settings)).toBe(false);
  });

  it('triggers warning when consecutive absences reach warning limit', () => {
    const records: AttendanceStatusRecord[] = [
      { eventId: 'e3', eventDate: '2026-08-03', status: 'absent' },
      { eventId: 'e2', eventDate: '2026-08-02', status: 'absent' },
      { eventId: 'e1', eventDate: '2026-08-01', status: 'absent' },
    ];

    const result = evaluateConsecutiveAbsences(records, { warningAbsents: 3, dropoutAbsents: 6 });
    expect(result.consecutiveAbsences).toBe(3);
    expect(result.shouldTriggerWarning).toBe(true);
    expect(result.shouldTriggerDropout).toBe(false);
    expect(result.currentState).toBe('warning');
  });

  it('triggers automated dropout when consecutive absences reach dropout limit', () => {
    const records: AttendanceStatusRecord[] = [
      { eventId: 'e6', eventDate: '2026-08-06', status: 'absent' },
      { eventId: 'e5', eventDate: '2026-08-05', status: 'absent' },
      { eventId: 'e4', eventDate: '2026-08-04', status: 'absent' },
      { eventId: 'e3', eventDate: '2026-08-03', status: 'absent' },
      { eventId: 'e2', eventDate: '2026-08-02', status: 'absent' },
      { eventId: 'e1', eventDate: '2026-08-01', status: 'absent' },
    ];

    const result = evaluateConsecutiveAbsences(records, { warningAbsents: 3, dropoutAbsents: 6 });
    expect(result.consecutiveAbsences).toBe(6);
    expect(result.shouldTriggerDropout).toBe(true);
    expect(result.currentState).toBe('dropout');
  });

  it('resets absence streak when student attends a session', () => {
    const records: AttendanceStatusRecord[] = [
      { eventId: 'e4', eventDate: '2026-08-04', status: 'absent' },
      { eventId: 'e3', eventDate: '2026-08-03', status: 'present' }, // Streak broken here!
      { eventId: 'e2', eventDate: '2026-08-02', status: 'absent' },
      { eventId: 'e1', eventDate: '2026-08-01', status: 'absent' },
    ];

    const result = evaluateConsecutiveAbsences(records, { warningAbsents: 3, dropoutAbsents: 6 });
    expect(result.consecutiveAbsences).toBe(1);
    expect(result.currentState).toBe('active');
  });

  it('prevents attendance marking for dropout students', () => {
    const res = canMarkAttendance('dropout');
    expect(res.canMark).toBe(false);
    expect(res.reason).toContain('Reactivation required');
  });

  it('requires fully absent weeks instead of counting individual sessions', () => {
    const records: AttendanceStatusRecord[] = [
      { eventId: 'w3-sat', eventDate: '2026-08-15', status: 'absent' },
      { eventId: 'w3-sun', eventDate: '2026-08-16', status: 'absent' },
      { eventId: 'w2-sat', eventDate: '2026-08-08', status: 'absent' },
      { eventId: 'w2-sun', eventDate: '2026-08-09', status: 'absent' },
      { eventId: 'w1-sat', eventDate: '2026-08-01', status: 'absent' },
      { eventId: 'w1-sun', eventDate: '2026-08-02', status: 'absent' },
    ];
    expect(evaluateConsecutiveAbsenceWeeks(records, { warningConsecutiveWeeks: 2, dropoutConsecutiveWeeks: 3 }))
      .toMatchObject({ consecutiveAbsentWeeks: 3, shouldWarn: true, shouldDropout: true });
  });

  it('breaks the weekly streak when any session is present', () => {
    const records: AttendanceStatusRecord[] = [
      { eventId: 'new', eventDate: '2026-08-15', status: 'absent' },
      { eventId: 'break', eventDate: '2026-08-09', status: 'present' },
      { eventId: 'old', eventDate: '2026-08-01', status: 'absent' },
    ];
    expect(evaluateConsecutiveAbsenceWeeks(records, { warningConsecutiveWeeks: 2, dropoutConsecutiveWeeks: 3 }).consecutiveAbsentWeeks).toBe(1);
  });
});
