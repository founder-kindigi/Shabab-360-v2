/**
 * Shabab 360 - Shared Import Framework Types
 * Safe, versioned, scope-enforced import definitions.
 */

export type ImportMode = 'discovery' | 'dry_run' | 'execute';

export type RowSeverity = 'error' | 'warning' | 'info';

export interface ImportErrorDetail {
  rowNumber: number;
  column?: string;
  field?: string;
  code: string;
  message: string;
  severity: RowSeverity;
}

export interface ImportColumnSpec<T = Record<string, unknown>> {
  /** Canonical field key in target entity */
  key: keyof T & string;
  /** Primary column header name in workbook */
  header: string;
  /** Alternate recognized column header names */
  aliases?: string[];
  /** Is this column strictly required for row validity? */
  required?: boolean;
  /** Custom transformation/validation function for field value */
  validate?: (value: unknown, rowNumber: number) => { valid: boolean; value?: unknown; error?: string };
}

export interface ImportTemplateSpec<T = Record<string, unknown>> {
  /** Identifier of the import module (e.g. 'admissions', 'calling', 'batches') */
  moduleCode: string;
  /** Version string of the template specification (e.g. '1.0.0') */
  version: string;
  /** Column definitions */
  columns: ImportColumnSpec<T>[];
  /** Allowed raw file extensions */
  allowedExtensions?: string[];
}

export interface ImportScopeContext {
  /** Server-verified actor user ID */
  actorId: string;
  /** Explicit target city ID (required where applicable) */
  cityId?: string;
  /** Explicit target park ID (required where applicable) */
  parkId?: string;
  /** Explicit target batch ID (required where applicable) */
  batchId?: string;
  /** Explicit target group ID (required where applicable) */
  groupId?: string;
  /** Additional explicit campaign/event context */
  campaignId?: string;
}

export interface ProcessedRowResult<T = Record<string, unknown>> {
  rowNumber: number;
  rawInput: Record<string, unknown>;
  parsedData?: Partial<T>;
  status: 'valid' | 'invalid' | 'duplicate' | 'conflicted' | 'skipped';
  errors: ImportErrorDetail[];
  matchingEvidence?: Record<string, unknown>;
}

export interface ReconciliationReport<T = Record<string, unknown>> {
  moduleCode: string;
  templateVersion: string;
  mode: ImportMode;
  scope: ImportScopeContext;
  processedAt: string;
  totalRows: number;
  counts: {
    valid: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    conflicted: number;
    invalid: number;
  };
  errors: ImportErrorDetail[];
  rowResults: ProcessedRowResult<T>[];
  unsupportedColumnsFound: string[];
}
