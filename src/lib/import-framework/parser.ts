/**
 * Shabab 360 - Shared Import Framework Parser & Processor
 * Implements discovery, dry-run, and execution reconciliation without data leaks.
 */

import {
  ImportMode,
  ImportScopeContext,
  ImportTemplateSpec,
  ImportErrorDetail,
  ProcessedRowResult,
  ReconciliationReport,
} from './types';

export interface ParseOptions<T = Record<string, unknown>> {
  template: ImportTemplateSpec<T>;
  mode: ImportMode;
  scope: ImportScopeContext;
  headers: string[];
  rows: Record<string, unknown>[];
  /** Optional custom duplicate checker function */
  detectDuplicate?: (
    row: ProcessedRowResult<T>,
    accumulator: ProcessedRowResult<T>[]
  ) => boolean;
  /** Optional custom execution handler for dry-run/execute */
  onExecuteRow?: (
    row: ProcessedRowResult<T>,
    mode: ImportMode,
    scope: ImportScopeContext
  ) => Promise<{ outcome: 'created' | 'updated' | 'unchanged' | 'skipped' | 'conflicted'; error?: string }>;
}

export async function processImport<T = Record<string, unknown>>(
  options: ParseOptions<T>
): Promise<ReconciliationReport<T>> {
  const { template, mode, scope, headers, rows, detectDuplicate, onExecuteRow } = options;

  // 1. Map workbook headers against template columns
  const normalizedHeaders = headers.map((h) => h.trim());
  const headerMap = new Map<string, string>(); // headerInFile -> canonicalFieldKey
  const recognizedHeaders = new Set<string>();

  for (const colSpec of template.columns) {
    const primaryHeader = colSpec.header.toLowerCase().trim();
    const aliasList = (colSpec.aliases || []).map((a) => a.toLowerCase().trim());

    for (const h of normalizedHeaders) {
      const lowerH = h.toLowerCase().trim();
      if (lowerH === primaryHeader || aliasList.includes(lowerH)) {
        headerMap.set(h, colSpec.key);
        recognizedHeaders.add(h);
      }
    }
  }

  // Identify unsupported columns
  const unsupportedColumnsFound = normalizedHeaders.filter((h) => !recognizedHeaders.has(h));

  // Verify all required template columns are present in headers
  const globalErrors: ImportErrorDetail[] = [];
  for (const colSpec of template.columns) {
    if (colSpec.required) {
      const isPresent = Array.from(headerMap.values()).includes(colSpec.key);
      if (!isPresent) {
        globalErrors.push({
          rowNumber: 0,
          column: colSpec.header,
          field: colSpec.key,
          code: 'MISSING_REQUIRED_COLUMN',
          message: `Required column '${colSpec.header}' is missing from the import headers.`,
          severity: 'error',
        });
      }
    }
  }

  const processedRows: ProcessedRowResult<T>[] = [];
  const counts = {
    valid: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    conflicted: 0,
    invalid: 0,
  };

  // If missing required columns at global level, fail early for row processing
  if (globalErrors.some((e) => e.severity === 'error')) {
    return {
      moduleCode: template.moduleCode,
      templateVersion: template.version,
      mode,
      scope,
      processedAt: new Date().toISOString(),
      totalRows: rows.length,
      counts: { ...counts, invalid: rows.length },
      errors: globalErrors,
      rowResults: [],
      unsupportedColumnsFound,
    };
  }

  // 2. Process individual rows
  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];
    const rowNumber = idx + 1;
    const rowErrors: ImportErrorDetail[] = [];
    const parsedData: Partial<T> = {};

    for (const colSpec of template.columns) {
      // Find matching header key in raw row
      const fileHeaderKey = Array.from(headerMap.entries()).find(
        ([, targetKey]) => targetKey === colSpec.key
      )?.[0];

      const rawVal = fileHeaderKey ? rawRow[fileHeaderKey] : undefined;

      // Check required condition
      if (colSpec.required && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
        rowErrors.push({
          rowNumber,
          column: colSpec.header,
          field: colSpec.key,
          code: 'REQUIRED_FIELD_EMPTY',
          message: `Field '${colSpec.header}' cannot be empty.`,
          severity: 'error',
        });
        continue;
      }

      // Custom validation if present
      if (rawVal !== undefined && rawVal !== null && colSpec.validate) {
        const validationResult = colSpec.validate(rawVal, rowNumber);
        if (!validationResult.valid) {
          rowErrors.push({
            rowNumber,
            column: colSpec.header,
            field: colSpec.key,
            code: 'INVALID_FIELD_VALUE',
            message: validationResult.error || `Invalid value for field '${colSpec.header}'.`,
            severity: 'error',
          });
        } else {
          (parsedData as Record<string, unknown>)[colSpec.key] =
            validationResult.value !== undefined ? validationResult.value : rawVal;
        }
      } else if (rawVal !== undefined && rawVal !== null) {
        (parsedData as Record<string, unknown>)[colSpec.key] = rawVal;
      }
    }

    const hasErrors = rowErrors.some((e) => e.severity === 'error');
    let rowStatus: ProcessedRowResult<T>['status'] = hasErrors ? 'invalid' : 'valid';

    const rowResult: ProcessedRowResult<T> = {
      rowNumber,
      rawInput: rawRow,
      parsedData,
      status: rowStatus,
      errors: rowErrors,
    };

    // Duplicate detection check
    if (rowStatus === 'valid' && detectDuplicate) {
      const isDup = detectDuplicate(rowResult, processedRows);
      if (isDup) {
        rowStatus = 'duplicate';
        rowResult.status = 'duplicate';
        rowErrors.push({
          rowNumber,
          column: undefined,
          code: 'DUPLICATE_ROW',
          message: `Row ${rowNumber} is a duplicate of a previously processed row or existing entity.`,
          severity: 'warning',
        });
      }
    }

    // Execution handling (only when mode is execute and handler is present)
    if (rowStatus === 'valid' && mode === 'execute' && onExecuteRow) {
      const execResult = await onExecuteRow(rowResult, mode, scope);
      if (execResult.outcome === 'conflicted') {
        rowStatus = 'conflicted';
        rowResult.status = 'conflicted';
        rowErrors.push({
          rowNumber,
          code: 'CONFLICTED_ENTITY',
          message: execResult.error || `Conflict executing row ${rowNumber}.`,
          severity: 'error',
        });
        counts.conflicted++;
      } else if (execResult.outcome === 'created') {
        counts.created++;
      } else if (execResult.outcome === 'updated') {
        counts.updated++;
      } else if (execResult.outcome === 'unchanged') {
        counts.unchanged++;
      } else if (execResult.outcome === 'skipped') {
        counts.skipped++;
      }
    } else if (rowStatus === 'valid') {
      counts.valid++;
    } else if (rowStatus === 'invalid') {
      counts.invalid++;
    }

    processedRows.push(rowResult);
    globalErrors.push(...rowErrors);
  }

  return {
    moduleCode: template.moduleCode,
    templateVersion: template.version,
    mode,
    scope,
    processedAt: new Date().toISOString(),
    totalRows: rows.length,
    counts,
    errors: globalErrors,
    rowResults: processedRows,
    unsupportedColumnsFound,
  };
}
