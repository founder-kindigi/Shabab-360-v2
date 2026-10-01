/**
 * Shabab 360 - Registrations & Admissions Importer (V2-101)
 * Built on top of the Shared Import Framework.
 * Reconciles historical admission workbooks without leaking sensitive data.
 */

import { ImportTemplateSpec, ProcessedRowResult, ImportScopeContext } from '../types';
import { processImport } from '../parser';

export interface AdmissionImportRow {
  applicantName: string;
  mobile: string;
  guardianName?: string;
  guardianPhone?: string;
  cnicBForm?: string;
  cityCode?: string;
  parkCode?: string;
  interviewStatus?: string;
  admissionStatus?: 'pending' | 'interviewed' | 'accepted' | 'rejected' | 'enrolled';
  sourceReference?: string;
}

export const ADMISSIONS_IMPORT_TEMPLATE: ImportTemplateSpec<AdmissionImportRow> = {
  moduleCode: 'admissions_v2',
  version: '1.0.0',
  columns: [
    {
      key: 'applicantName',
      header: 'Applicant Name',
      aliases: ['Student Name', 'Candidate Name', 'Full Name', 'Name'],
      required: true,
    },
    {
      key: 'mobile',
      header: 'Mobile Number',
      aliases: ['Phone', 'Applicant Mobile', 'Contact Number', 'Cell'],
      required: true,
      validate: (val) => {
        const str = String(val).trim();
        if (!/^\+?[0-9\s-]{10,15}$/.test(str)) {
          return { valid: false, error: 'Invalid Pakistani mobile number format.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'guardianName',
      header: 'Guardian Name',
      aliases: ['Father Name', 'Parent Name', 'Guardian'],
      required: false,
    },
    {
      key: 'guardianPhone',
      header: 'Guardian Mobile',
      aliases: ['Father Phone', 'Parent Phone', 'Guardian Contact'],
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
      key: 'cnicBForm',
      header: 'CNIC / B-Form',
      aliases: ['B-Form', 'CNIC', 'National ID'],
      required: false,
    },
    {
      key: 'cityCode',
      header: 'City Code',
      aliases: ['City', 'City Name'],
      required: false,
    },
    {
      key: 'parkCode',
      header: 'Park Code',
      aliases: ['Park', 'Park Name', 'Location'],
      required: false,
    },
    {
      key: 'interviewStatus',
      header: 'Interview Status',
      aliases: ['Interview Result', 'Interview Score'],
      required: false,
    },
    {
      key: 'admissionStatus',
      header: 'Admission Status',
      aliases: ['Status', 'Selection Status', 'Decision'],
      required: false,
      validate: (val) => {
        if (!val) return { valid: true, value: 'pending' };
        const lower = String(val).toLowerCase().trim();
        const validStatuses = ['pending', 'interviewed', 'accepted', 'rejected', 'enrolled'];
        if (!validStatuses.includes(lower)) {
          return { valid: false, error: `Invalid status '${val}'. Must be one of: ${validStatuses.join(', ')}` };
        }
        return { valid: true, value: lower as AdmissionImportRow['admissionStatus'] };
      },
    },
    {
      key: 'sourceReference',
      header: 'Source Reference',
      aliases: ['Ref ID', 'Form #', 'Registration ID'],
      required: false,
    },
  ],
};

export interface ProcessAdmissionsImportOptions {
  mode: 'discovery' | 'dry_run' | 'execute';
  scope: ImportScopeContext;
  headers: string[];
  rows: Record<string, unknown>[];
  existingApplicants?: Array<{ id: string; mobile: string; sourceReference?: string }>;
  onSaveApplicant?: (applicantData: AdmissionImportRow, scope: ImportScopeContext) => Promise<{ id: string; outcome: 'created' | 'updated' }>;
}

export async function processAdmissionsImport(options: ProcessAdmissionsImportOptions) {
  const { mode, scope, headers, rows, existingApplicants = [], onSaveApplicant } = options;

  // Scope Enforcement: Ensure actor has verified city scope if cityId is required
  if (!scope.actorId) {
    throw new Error('UNAUTHORIZED: Scope context must include verified actorId.');
  }

  return processImport<AdmissionImportRow>({
    template: ADMISSIONS_IMPORT_TEMPLATE,
    mode,
    scope,
    headers,
    rows,
    detectDuplicate: (row, accumulator) => {
      const candidatePhone = row.parsedData?.mobile;
      const candidateRef = row.parsedData?.sourceReference;

      // Check within current import batch
      const isBatchDup = accumulator.some((prev) => {
        const prevPhone = prev.parsedData?.mobile;
        const prevRef = prev.parsedData?.sourceReference;
        return (candidateRef && prevRef && candidateRef === prevRef) || (candidatePhone && prevPhone && candidatePhone === prevPhone);
      });

      if (isBatchDup) return true;

      // Check against existing system records
      return existingApplicants.some((existing) => {
        return (candidateRef && existing.sourceReference && candidateRef === existing.sourceReference) ||
               (candidatePhone && existing.mobile === candidatePhone);
      });
    },
    onExecuteRow: async (row, mode, scope) => {
      if (mode === 'dry_run' || mode === 'discovery') {
        return { outcome: 'unchanged' };
      }

      if (!onSaveApplicant || !row.parsedData?.applicantName || !row.parsedData?.mobile) {
        return { outcome: 'skipped', error: 'Missing required applicant payload' };
      }

      try {
        const saveRes = await onSaveApplicant(row.parsedData as AdmissionImportRow, scope);
        return { outcome: saveRes.outcome };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Save error';
        return { outcome: 'conflicted', error: msg };
      }
    },
  });
}
