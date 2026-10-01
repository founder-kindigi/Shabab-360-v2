/**
 * Shabab 360 - Performance Telemetry & Response Headers (V2-401)
 * Measures API execution timing, DB query duration, payload size, and pagination budgets.
 */

import { NextResponse } from 'next/server';

export interface PerformanceTelemetry {
  startTimeMs: number;
  dbDurationMs?: number;
  queryCount?: number;
  payloadSizeBytes?: number;
}

export function startPerformanceTimer(): PerformanceTelemetry {
  return {
    startTimeMs: performance.now(),
  };
}

export function applyPerformanceHeaders(
  response: NextResponse,
  telemetry: PerformanceTelemetry
): NextResponse {
  const durationMs = Math.round(performance.now() - telemetry.startTimeMs);

  // Set Server-Timing header (W3C standard)
  const serverTimingParts: string[] = [];
  serverTimingParts.push(`total;dur=${durationMs};desc="Total Response Time"`);

  if (telemetry.dbDurationMs !== undefined) {
    serverTimingParts.push(`db;dur=${Math.round(telemetry.dbDurationMs)};desc="Database Execution"`);
  }

  if (telemetry.queryCount !== undefined) {
    response.headers.set('X-Database-Query-Count', String(telemetry.queryCount));
  }

  response.headers.set('Server-Timing', serverTimingParts.join(', '));
  response.headers.set('X-Response-Time-Ms', String(durationMs));

  if (telemetry.payloadSizeBytes !== undefined) {
    response.headers.set('X-Payload-Size-Bytes', String(telemetry.payloadSizeBytes));
  }

  return response;
}

/**
 * Standard pagination budget helper to prevent heavy list waterfall endpoints.
 */
export function getSanitizedPaginationBudget(
  urlSearchParams: URLSearchParams,
  defaults: { defaultLimit?: number; maxLimit?: number } = {}
): { limit: number; offset: number; page: number } {
  const defaultLimit = defaults.defaultLimit || 50;
  const maxLimit = defaults.maxLimit || 100;

  const rawLimit = parseInt(urlSearchParams.get('limit') || String(defaultLimit), 10);
  const rawOffset = parseInt(urlSearchParams.get('offset') || '0', 10);
  const rawPage = parseInt(urlSearchParams.get('page') || '1', 10);

  const limit = Math.min(Math.max(isNaN(rawLimit) ? defaultLimit : rawLimit, 1), maxLimit);
  const page = Math.max(isNaN(rawPage) ? 1 : rawPage, 1);

  const hasExplicitOffset = urlSearchParams.has('offset');
  const offset = hasExplicitOffset && !isNaN(rawOffset) && rawOffset >= 0 ? rawOffset : (page - 1) * limit;

  return { limit, offset, page };
}
