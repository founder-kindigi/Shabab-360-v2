import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  startPerformanceTimer,
  applyPerformanceHeaders,
  getSanitizedPaginationBudget,
} from '../performance-headers';

describe('V2-401 Performance Telemetry & Response Headers', () => {
  it('applies Server-Timing and execution duration headers to NextResponse', () => {
    const timer = startPerformanceTimer();
    const res = NextResponse.json({ success: true });

    const updated = applyPerformanceHeaders(res, {
      ...timer,
      dbDurationMs: 15,
      queryCount: 3,
      payloadSizeBytes: 1024,
    });

    expect(updated.headers.has('Server-Timing')).toBe(true);
    expect(updated.headers.get('Server-Timing')).toContain('total;dur=');
    expect(updated.headers.get('Server-Timing')).toContain('db;dur=15');
    expect(updated.headers.get('X-Database-Query-Count')).toBe('3');
    expect(updated.headers.get('X-Payload-Size-Bytes')).toBe('1024');
  });

  it('enforces pagination budgets with default and max limits', () => {
    const params = new URLSearchParams('limit=500&page=2');
    const budget = getSanitizedPaginationBudget(params, { defaultLimit: 50, maxLimit: 100 });

    expect(budget.limit).toBe(100); // Clamped to maxLimit 100
    expect(budget.page).toBe(2);
    expect(budget.offset).toBe(100); // (2-1) * 100
  });

  it('falls back safely on invalid pagination parameters', () => {
    const params = new URLSearchParams('limit=-10&offset=-5&page=invalid');
    const budget = getSanitizedPaginationBudget(params, { defaultLimit: 50, maxLimit: 100 });

    expect(budget.limit).toBe(1); // Min limit 1
    expect(budget.page).toBe(1);
    expect(budget.offset).toBe(0);
  });
});
