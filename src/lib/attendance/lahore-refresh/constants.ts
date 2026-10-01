/**
 * Owner-approved Lahore Batch 4 refresh policy. These are policy constants, not
 * workbook values: no participant names, phones or emails live in source.
 */
export const LAHORE_REFRESH = Object.freeze({
  cityName: "Lahore",
  cityCode: "LHR",
  batchName: "Batch 4",
  /** Inclusive batch calendar range. */
  batchStartDate: "2026-05-23",
  batchEndDate: "2027-01-31",
  /** Attendance marks are imported only on or before this date. */
  attendanceThrough: "2026-09-13",
  /** Every refreshed batch is scheduled with the same class weekdays. */
  classWeekdays: "[0,6]",
  /** Expected workbook shape, asserted by the manifest reconciliation. */
  expectedParks: 6,
  expectedGroups: 18,
  /** Placeholder accounts use a reserved, non-routable domain. */
  placeholderEmailDomain: "example.invalid",
  /** Imported placeholder staff keep this role label until assigned. */
  pendingStaffRole: "pending_assignment",
  /** Reason/source recorded for a workbook `Dropout` cell. */
  workbookDropoutReason: "Workbook dropout",
  workbookDropoutSource: "import",
  eventTitle: "Regular Session - Batch 4",
} as const);

export const REFRESH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Reserved, non-routable email domain. No real identity is invented. */
export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(`@${LAHORE_REFRESH.placeholderEmailDomain}`);
}
