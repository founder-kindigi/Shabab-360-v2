/**
 * Shabab 360 - Previous Three Batches Importer (V2-103)
 * Built on top of the Shared Import Framework.
 * Reconciles historical cities, parks, batches, groups, Murabbi assignments, students, guardians, and attendance.
 */

import { ImportTemplateSpec, ImportScopeContext } from '../types';
import { processImport } from '../parser';

export interface BatchImportRow {
  cityName: string;
  parkName: string;
  batchName: string;
  groupName?: string;
  murabbiEmail?: string;
  murabbiName?: string;
  studentName: string;
  studentMobile: string;
  guardianName?: string;
  guardianMobile?: string;
  participantState?: 'active' | 'dropout' | 'inactive';
  dropoutDate?: string;
  dropoutReason?: string;
  attendancePresentCount?: number;
  attendanceTotalEvents?: number;
  sourceReference?: string;
}

export const BATCHES_IMPORT_TEMPLATE: ImportTemplateSpec<BatchImportRow> = {
  moduleCode: 'historical_batches_v2',
  version: '1.0.0',
  columns: [
    {
      key: 'cityName',
      header: 'City Name',
      aliases: ['City', 'City Code'],
      required: true,
    },
    {
      key: 'parkName',
      header: 'Park Name',
      aliases: ['Park', 'Park Location'],
      required: true,
    },
    {
      key: 'batchName',
      header: 'Batch Name',
      aliases: ['Batch', 'Batch Number', 'Cohort'],
      required: true,
    },
    {
      key: 'groupName',
      header: 'Group Name',
      aliases: ['Group', 'Sub-Group', 'Halqa'],
      required: false,
    },
    {
      key: 'murabbiEmail',
      header: 'Murabbi Email',
      aliases: ['Murabbi Contact', 'Murabbi Assigned'],
      required: false,
    },
    {
      key: 'murabbiName',
      header: 'Murabbi Name',
      aliases: ['Murabbi', 'Group Lead'],
      required: false,
    },
    {
      key: 'studentName',
      header: 'Student Name',
      aliases: ['Participant Name', 'Name', 'Full Name'],
      required: true,
    },
    {
      key: 'studentMobile',
      header: 'Student Mobile',
      aliases: ['Mobile', 'Phone', 'Student Contact'],
      required: true,
      validate: (val) => {
        const str = String(val).trim();
        if (!/^\+?[0-9\s-]{10,15}$/.test(str)) {
          return { valid: false, error: 'Invalid student mobile format.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'guardianName',
      header: 'Guardian Name',
      aliases: ['Father Name', 'Parent Name'],
      required: false,
    },
    {
      key: 'guardianMobile',
      header: 'Guardian Mobile',
      aliases: ['Father Phone', 'Parent Contact'],
      required: false,
      validate: (val) => {
        if (!val) return { valid: true };
        const str = String(val).trim();
        if (!/^\+?[0-9\s-]{10,15}$/.test(str)) {
          return { valid: false, error: 'Invalid guardian mobile format.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'participantState',
      header: 'Participant State',
      aliases: ['State', 'Status', 'Enrollment Status'],
      required: false,
      validate: (val) => {
        if (!val) return { valid: true, value: 'active' };
        const lower = String(val).toLowerCase().trim();
        const validStates = ['active', 'dropout', 'inactive'];
        if (!validStates.includes(lower)) {
          return { valid: false, error: `Invalid state '${val}'. Allowed: ${validStates.join(', ')}` };
        }
        return { valid: true, value: lower as BatchImportRow['participantState'] };
      },
    },
    {
      key: 'dropoutDate',
      header: 'Dropout Date',
      aliases: ['Dropout Date (Effective)'],
      required: false,
    },
    {
      key: 'dropoutReason',
      header: 'Dropout Reason',
      aliases: ['Reason for Dropout'],
      required: false,
    },
    {
      key: 'attendancePresentCount',
      header: 'Attendance Present Count',
      aliases: ['Present Events', 'Total Present'],
      required: false,
      validate: (val) => {
        if (val === undefined || val === null || val === '') return { valid: true, value: 0 };
        const num = Number(val);
        if (isNaN(num) || num < 0) return { valid: false, error: 'Attendance present count must be a non-negative number.' };
        return { valid: true, value: num };
      },
    },
    {
      key: 'attendanceTotalEvents',
      header: 'Attendance Total Events',
      aliases: ['Total Events', 'Session Count'],
      required: false,
      validate: (val) => {
        if (val === undefined || val === null || val === '') return { valid: true, value: 0 };
        const num = Number(val);
        if (isNaN(num) || num < 0) return { valid: false, error: 'Total events count must be a non-negative number.' };
        return { valid: true, value: num };
      },
    },
    {
      key: 'sourceReference',
      header: 'Source Reference',
      aliases: ['Roster Ref', 'Student ID'],
      required: false,
    },
  ],
};

export interface ProcessBatchesImportOptions {
  mode: 'discovery' | 'dry_run' | 'execute';
  scope: ImportScopeContext;
  headers: string[];
  rows: Record<string, unknown>[];
  existingStudents?: Array<{ id: string; mobile: string; sourceReference?: string }>;
  onSaveBatchParticipant?: (
    record: BatchImportRow,
    scope: ImportScopeContext
  ) => Promise<{ id: string; outcome: 'created' | 'updated' }>;
}

export async function processBatchesImport(options: ProcessBatchesImportOptions) {
  const {
    mode,
    scope,
    headers,
    rows,
    existingStudents = [],
    onSaveBatchParticipant,
  } = options;

  if (!scope.actorId) {
    throw new Error('UNAUTHORIZED: Scope context must include verified actorId.');
  }

  const report = await processImport<BatchImportRow>({
    template: BATCHES_IMPORT_TEMPLATE,
    mode,
    scope,
    headers,
    rows,
    detectDuplicate: (row, accumulator) => {
      const candidatePhone = row.parsedData?.studentMobile;
      const candidateBatch = row.parsedData?.batchName;
      const candidateRef = row.parsedData?.sourceReference;

      return accumulator.some((prev) => {
        const prevPhone = prev.parsedData?.studentMobile;
        const prevBatch = prev.parsedData?.batchName;
        const prevRef = prev.parsedData?.sourceReference;

        return (
          (candidateRef && prevRef && candidateRef === prevRef) ||
          (candidatePhone && candidateBatch && prevPhone === candidatePhone && prevBatch === candidateBatch)
        );
      });
    },
    onExecuteRow: async (row, mode, scope) => {
      if (mode === 'dry_run' || mode === 'discovery') {
        return { outcome: 'unchanged' };
      }

      if (!onSaveBatchParticipant || !row.parsedData?.studentName || !row.parsedData?.studentMobile) {
        return { outcome: 'skipped', error: 'Missing required participant payload' };
      }

      try {
        const res = await onSaveBatchParticipant(row.parsedData as BatchImportRow, scope);
        return { outcome: res.outcome };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Save batch record error';
        return { outcome: 'conflicted', error: msg };
      }
    },
  });

  // Post-process row results for Unassigned Group & Dropout Policy Audit Evidence
  for (const rowResult of report.rowResults) {
    if (rowResult.parsedData) {
      // 1. Preserve valid unassigned students and report them for operator assignment
      if (!rowResult.parsedData.groupName) {
        rowResult.errors.push({
          rowNumber: rowResult.rowNumber,
          column: 'Group Name',
          field: 'groupName',
          code: 'UNASSIGNED_GROUP_PRESERVED',
          message: `Student '${rowResult.parsedData.studentName}' has no assigned Group. Preserved as unassigned for manual placement.`,
          severity: 'info',
        });
      }

      // 2. Validate dropout state evidence requirement
      if (rowResult.parsedData.participantState === 'dropout' && !rowResult.parsedData.dropoutDate) {
        rowResult.errors.push({
          rowNumber: rowResult.rowNumber,
          column: 'Dropout Date',
          field: 'dropoutDate',
          code: 'DROPOUT_DATE_MISSING',
          message: `Student marked as 'dropout' without an effective dropout date. Defaulting to current import date.`,
          severity: 'warning',
        });
      }
    }
  }

  return report;
}
