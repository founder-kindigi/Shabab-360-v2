/**
 * Shared shapes for the guarded Lahore Batch 4 data-refresh tool.
 *
 * Nothing here opens a connection, reads an environment file or writes to a
 * database. Callers supply the sheet surface, the query port and the backup
 * port, so the whole planning path is testable with synthetic fixtures.
 */

/** One workbook cell as returned by the caller's sheet adapter (for example ExcelJS). */
export interface SheetCell {
  readonly value: unknown;
}

/** Minimal worksheet surface the parser needs, so tests can pass a plain matrix. */
export interface SheetLike {
  readonly rowCount: number;
  readonly columnCount: number;
  getCell(row: number, column: number): SheetCell;
}

/** One parsed attendance cell: the session date (or null) and the raw source value. */
export interface ParsedStatus {
  readonly date: string | null;
  readonly value: unknown;
}

export interface ParsedStudent {
  readonly sourceRef: string;
  readonly name: string;
  readonly phone: string;
  readonly fingerprint: string;
  readonly hasPhone: boolean;
  readonly age: number | null;
  readonly grade: string;
  readonly statuses: readonly ParsedStatus[];
}

export interface ParsedGroup {
  readonly name: string;
  readonly murabbiLabel: string;
  readonly sourceRef: string;
  readonly students: ParsedStudent[];
}

/** A name row without an integer serial, kept because its group is explicit. */
export interface ParsedUnnumberedCandidate extends ParsedStudent {
  readonly group: string;
}

export interface ParsedStaff {
  readonly sourceRef: string;
  readonly name: string;
  readonly phone: string;
  readonly roleLabel: string;
  readonly canonicalRole: string | null;
}

export interface ParsedPark {
  readonly sheetName: string;
  readonly parkName: string;
  readonly sessionDates: readonly (string | null)[];
  readonly groups: ParsedGroup[];
  readonly staff: ParsedStaff[];
  readonly unnumberedCandidates: ParsedUnnumberedCandidate[];
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface ManifestParticipant {
  readonly sourceRef: string;
  readonly name: string;
  readonly phone: string | null;
  readonly age: number | null;
  readonly gradeClass: string | null;
  readonly parkName: string;
  readonly groupName: string;
  readonly state: "active" | "dropout";
  readonly joinedAt: string;
  readonly dropoutAt: string | null;
  readonly dropoutReason: string | null;
  readonly dropoutSource: string | null;
  /** Always null: the workbook never supplies an approved rejoin date. */
  readonly reactivatedAt: string | null;
}

export interface ManifestStaffPlaceholder {
  readonly sourceRef: string;
  readonly name: string;
  readonly phone: string | null;
  readonly role: string;
  /** Inactive placeholder only; never an active login account. */
  readonly isActive: false;
  readonly mustResetPwd: true;
  readonly email: string;
  readonly parkName: string;
}

export interface ManifestEventRecord {
  readonly participantSourceRef: string;
  readonly status: AttendanceStatus;
}

export interface ManifestEvent {
  readonly parkName: string;
  readonly groupName: string;
  readonly date: string;
  readonly title: string;
  readonly isClosed: true;
  readonly records: readonly ManifestEventRecord[];
}

export interface RefreshManifestCounts {
  readonly parks: number;
  readonly groups: number;
  readonly participants: number;
  readonly staffPlaceholders: number;
  readonly attendanceEvents: number;
  readonly attendanceRecords: number;
  readonly calendarDates: number;
  readonly historicalCalendarDates: number;
  readonly futureCalendarDates: number;
  readonly participantsMissingPhone: number;
  readonly participantsWithDropout: number;
  readonly statusTotals: Readonly<Record<AttendanceStatus, number>>;
}

export interface RefreshManifest {
  readonly version: 1;
  readonly city: { readonly name: string; readonly code: string };
  readonly batch: { readonly name: string; readonly startDate: string; readonly endDate: string };
  readonly attendanceThrough: string;
  readonly parks: readonly string[];
  readonly groups: readonly { readonly parkName: string; readonly name: string }[];
  readonly participants: readonly ManifestParticipant[];
  readonly staff: readonly ManifestStaffPlaceholder[];
  readonly events: readonly ManifestEvent[];
  readonly calendarDates: readonly string[];
  readonly counts: RefreshManifestCounts;
}

/** Aggregate-only view. It must never carry names, phones or source references. */
export interface DryRunSummary {
  readonly mode: "dry-run";
  readonly writesPerformed: false;
  readonly cityCode: string;
  readonly batch: { readonly startDate: string; readonly endDate: string };
  readonly attendanceThrough: string;
  readonly counts: RefreshManifestCounts;
}

export type ExecutableTarget =
  | { readonly kind: "sqlite"; readonly path: string; readonly backupDir: string }
  | { readonly kind: "postgres"; readonly url: string; readonly backupDir: string };

export interface BackupArtifact {
  readonly kind: "sqlite-file-copy" | "postgres-full-dump";
  readonly path: string;
  readonly bytes: number;
}

/** Named aggregate reads the post-import verification needs. */
export interface RefreshReader {
  countTable(table: string): Promise<number>;
  countActiveUsersByRole(): Promise<{ readonly superAdmin: number; readonly other: number }>;
  countCitiesOtherThanLahore(): Promise<number>;
  countParksOutsideLahore(): Promise<number>;
  countParticipantsWithoutGroup(): Promise<number>;
  countGroupsWithoutBatch(): Promise<number>;
  countAttendanceRecordsAfter(date: string): Promise<number>;
}

export interface VerificationCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly expected?: number | string;
  readonly actual?: number | string;
}

export interface VerificationReport {
  readonly ok: boolean;
  readonly checks: readonly VerificationCheck[];
  readonly failures: readonly string[];
}

export interface ImportCounts {
  readonly parks: number;
  readonly groups: number;
  readonly participants: number;
  readonly staffPlaceholders: number;
  readonly attendanceEvents: number;
  readonly attendanceRecords: number;
  readonly calendarDates: number;
}

/** Ports the runner depends on. The CLI supplies real ones; tests supply fakes. */
export interface RefreshPorts {
  loadManifest(): Promise<RefreshManifest>;
  /**
   * Optional read-only gate that runs before the backup and any write. It must
   * throw when the target cannot support the required attendance schema, so a
   * refresh never changes schema during an import.
   */
  verifyTargetSchema?(target: ExecutableTarget): Promise<void>;
  createBackup(target: ExecutableTarget): Promise<BackupArtifact>;
  verifyBackup(artifact: BackupArtifact): Promise<void>;
  restoreBackup(artifact: BackupArtifact): Promise<void>;
  resetData(target: ExecutableTarget, manifest: RefreshManifest): Promise<void>;
  importManifest(target: ExecutableTarget, manifest: RefreshManifest): Promise<ImportCounts>;
  verifyRefresh(manifest: RefreshManifest): Promise<VerificationReport>;
}

export interface RunSummary {
  readonly mode: "dry-run" | "execute";
  readonly writesPerformed: boolean;
  readonly counts: RefreshManifestCounts | ImportCounts;
  readonly verification?: VerificationReport;
}
