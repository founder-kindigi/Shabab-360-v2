import { describe, it, expect, vi } from 'vitest';
import {
  auditSecretExposure,
  auditWriteFailureGuard,
  verifyProductionReadinessChecklist,
} from '../release-security-audit';

describe('V2-403 Security & Release Controls Engine', () => {
  it('detects exposed database connection strings in audit payload', () => {
    const leakedPayload = {
      dbUrl: 'postgres://admin:SecretPass123!@localhost:5432/shabab_db',
    };

    const res = auditSecretExposure(leakedPayload);
    expect(res.hasExposedSecrets).toBe(true);
    expect(res.detectedTypes).toContain('DATABASE_URL');
  });

  it('passes audit payload without exposed secrets', () => {
    const safePayload = {
      action: 'user.login',
      userId: 'usr_123',
      cityId: 'city_lahore',
    };

    const res = auditSecretExposure(safePayload);
    expect(res.hasExposedSecrets).toBe(false);
    expect(res.detectedTypes).toHaveLength(0);
  });

  it('handles audit write failures gracefully with fallback logging', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const failingLogFn = async () => {
      throw new Error('Database connection pool exhausted');
    };

    const res = await auditWriteFailureGuard(failingLogFn);
    expect(res.success).toBe(false);
    expect(res.fallbackTriggered).toBe(true);
    expect(res.error).toContain('audit_write_failed');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT_WRITE_FAILED_FALLBACK]'));

    consoleSpy.mockRestore();
  });

  it('verifies production readiness checklist completion', () => {
    const incomplete = verifyProductionReadinessChecklist({
      serverScopeEnforced: true,
      secretExposureChecked: true,
      boundedInputValidated: true,
      backupRestoreDrillCompleted: false,
    });
    expect(incomplete.isReady).toBe(false);
    expect(incomplete.missingSteps).toContain('Database backup restore drill');

    const complete = verifyProductionReadinessChecklist({
      serverScopeEnforced: true,
      secretExposureChecked: true,
      boundedInputValidated: true,
      backupRestoreDrillCompleted: true,
    });
    expect(complete.isReady).toBe(true);
    expect(complete.missingSteps).toHaveLength(0);
  });
});
