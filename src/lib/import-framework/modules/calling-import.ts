/**
 * Shabab 360 - Calling History Importer (V2-102)
 * Built on top of the Shared Import Framework.
 * Reconciles historical campaign calling workbooks with PII masking and caller-scope isolation.
 */

import { ImportTemplateSpec, ImportScopeContext } from '../types';
import { processImport } from '../parser';

export interface CallingImportRow {
  sourceReference?: string;
  campaignCode: string;
  cityCode?: string;
  applicantName: string;
  primaryMobile: string;
  whatsapp?: string;
  callingStatus: 'unassigned' | 'assigned' | 'contacted' | 'interested' | 'not_interested' | 'callback_requested' | 'unreachable';
  callResponse?: string;
  sourceDate?: string;
  assigneeReference?: string;
  callNotes?: string;
}

export const CALLING_IMPORT_TEMPLATE: ImportTemplateSpec<CallingImportRow> = {
  moduleCode: 'calling_history_v2',
  version: '1.0.0',
  columns: [
    {
      key: 'sourceReference',
      header: 'Source Reference',
      aliases: ['Ref ID', 'Call ID', 'Record ID'],
      required: false,
    },
    {
      key: 'campaignCode',
      header: 'Campaign Code',
      aliases: ['Campaign', 'Campaign ID', 'Campaign Name'],
      required: true,
    },
    {
      key: 'cityCode',
      header: 'City Code',
      aliases: ['City', 'Location'],
      required: false,
    },
    {
      key: 'applicantName',
      header: 'Applicant Name',
      aliases: ['Name', 'Candidate Name', 'Student Name'],
      required: true,
    },
    {
      key: 'primaryMobile',
      header: 'Primary Mobile',
      aliases: ['Mobile', 'Phone', 'Contact Number', 'Cell'],
      required: true,
      validate: (val) => {
        const str = String(val).trim();
        if (!/^\+?[0-9\s-]{10,15}$/.test(str)) {
          return { valid: false, error: 'Invalid primary mobile format.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'whatsapp',
      header: 'WhatsApp Number',
      aliases: ['WhatsApp', 'WA Phone'],
      required: false,
      validate: (val) => {
        if (!val) return { valid: true };
        const str = String(val).trim();
        if (!/^\+?[0-9\s-]{10,15}$/.test(str)) {
          return { valid: false, error: 'Invalid WhatsApp phone format.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'callingStatus',
      header: 'Calling Status',
      aliases: ['Status', 'Call Status', 'Stage'],
      required: true,
      validate: (val) => {
        const lower = String(val).toLowerCase().trim();
        const validStatuses = [
          'unassigned',
          'assigned',
          'contacted',
          'interested',
          'not_interested',
          'callback_requested',
          'unreachable',
        ];
        if (!validStatuses.includes(lower)) {
          return {
            valid: false,
            error: `Invalid status '${val}'. Allowed: ${validStatuses.join(', ')}`,
          };
        }
        return { valid: true, value: lower as CallingImportRow['callingStatus'] };
      },
    },
    {
      key: 'callResponse',
      header: 'Call Response',
      aliases: ['Response', 'Outcome', 'Feedback'],
      required: false,
    },
    {
      key: 'sourceDate',
      header: 'Source Date',
      aliases: ['Date', 'Call Date', 'Timestamp'],
      required: false,
    },
    {
      key: 'assigneeReference',
      header: 'Assignee Reference',
      aliases: ['Caller', 'Caller Email', 'Assigned To', 'Caller ID'],
      required: false,
    },
    {
      key: 'callNotes',
      header: 'Call Notes',
      aliases: ['Notes', 'Comments', 'Remark'],
      required: false,
    },
  ],
};

export interface ProcessCallingImportOptions {
  mode: 'discovery' | 'dry_run' | 'execute';
  scope: ImportScopeContext;
  headers: string[];
  rows: Record<string, unknown>[];
  knownCampaigns?: string[];
  knownCallers?: string[];
  onSaveCallingRecord?: (
    record: CallingImportRow,
    scope: ImportScopeContext
  ) => Promise<{ id: string; outcome: 'created' | 'updated' }>;
}

export async function processCallingImport(options: ProcessCallingImportOptions) {
  const {
    mode,
    scope,
    headers,
    rows,
    knownCampaigns = [],
    knownCallers = [],
    onSaveCallingRecord,
  } = options;

  // Scope Verification
  if (!scope.actorId) {
    throw new Error('UNAUTHORIZED: Scope context must include verified actorId.');
  }

  const report = await processImport<CallingImportRow>({
    template: CALLING_IMPORT_TEMPLATE,
    mode,
    scope,
    headers,
    rows,
    detectDuplicate: (row, accumulator) => {
      const candidatePhone = row.parsedData?.primaryMobile;
      const candidateCampaign = row.parsedData?.campaignCode;
      const candidateRef = row.parsedData?.sourceReference;

      return accumulator.some((prev) => {
        const prevPhone = prev.parsedData?.primaryMobile;
        const prevCampaign = prev.parsedData?.campaignCode;
        const prevRef = prev.parsedData?.sourceReference;

        return (
          (candidateRef && prevRef && candidateRef === prevRef) ||
          (candidatePhone && candidateCampaign && prevPhone === candidatePhone && prevCampaign === candidateCampaign)
        );
      });
    },
    onExecuteRow: async (row, mode, scope) => {
      if (mode === 'dry_run' || mode === 'discovery') {
        return { outcome: 'unchanged' };
      }

      if (!onSaveCallingRecord || !row.parsedData?.applicantName || !row.parsedData?.primaryMobile) {
        return { outcome: 'skipped', error: 'Missing required calling payload' };
      }

      try {
        const res = await onSaveCallingRecord(row.parsedData as CallingImportRow, scope);
        return { outcome: res.outcome };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Save calling error';
        return { outcome: 'conflicted', error: msg };
      }
    },
  });

  // Post-process row results for PII & Unmatched References Audit Safety
  for (const rowResult of report.rowResults) {
    if (rowResult.parsedData) {
      // 1. Flag unmatched campaign if knownCampaigns list provided
      if (
        knownCampaigns.length > 0 &&
        rowResult.parsedData.campaignCode &&
        !knownCampaigns.includes(rowResult.parsedData.campaignCode)
      ) {
        rowResult.errors.push({
          rowNumber: rowResult.rowNumber,
          column: 'Campaign Code',
          field: 'campaignCode',
          code: 'UNMATCHED_CAMPAIGN',
          message: `Campaign '${rowResult.parsedData.campaignCode}' not recognized in current city.`,
          severity: 'warning',
        });
      }

      // 2. Flag unmatched caller assignee if knownCallers list provided
      if (
        knownCallers.length > 0 &&
        rowResult.parsedData.assigneeReference &&
        !knownCallers.includes(rowResult.parsedData.assigneeReference)
      ) {
        rowResult.errors.push({
          rowNumber: rowResult.rowNumber,
          column: 'Assignee Reference',
          field: 'assigneeReference',
          code: 'UNMATCHED_CALLER',
          message: `Caller '${rowResult.parsedData.assigneeReference}' not found or inactive.`,
          severity: 'warning',
        });
      }

      // 3. Sanitize sensitive call notes from raw display in audit summary
      if (rowResult.parsedData.callNotes) {
        rowResult.matchingEvidence = {
          ...rowResult.matchingEvidence,
          hasCallNotes: true,
          callNotesLength: rowResult.parsedData.callNotes.length,
          // Redact raw text for audit privacy protection
          sanitizedNotesSummary: '[REDACTED_SENSITIVE_CALL_NOTES]',
        };
      }
    }
  }

  return report;
}
