/**
 * Shabab 360 - Security & Release Controls Audit Engine (V2-403)
 * Secret exposure detection, audit write failure fallbacks, and release readiness checks.
 */

export interface SecretAuditResult {
  hasExposedSecrets: boolean;
  detectedTypes: string[];
  findings: string[];
}

const SENSITIVE_PATTERNS = [
  { name: 'DATABASE_URL', regex: /postgres:\/\/[^:]+:[^@]+@/i },
  { name: 'PRIVATE_KEY', regex: /-----BEGIN (RSA|EC|PRIVATE) KEY-----/i },
  { name: 'JWT_SECRET', regex: /(secret|token)\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i },
  { name: 'PASSWORD_FIELD', regex: /"password"\s*:\s*"[^"]+"/i },
];

/**
 * Audits text payloads or configuration objects for accidental secret exposure.
 */
export function auditSecretExposure(payload: string | object): SecretAuditResult {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const detectedTypes: string[] = [];
  const findings: string[] = [];

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.regex.test(content)) {
      detectedTypes.push(pattern.name);
      findings.push(`SECURITY WARNING: Exposed ${pattern.name} pattern detected in payload.`);
    }
  }

  return {
    hasExposedSecrets: detectedTypes.length > 0,
    detectedTypes,
    findings,
  };
}

export interface AuditWriteResult {
  success: boolean;
  fallbackTriggered: boolean;
  error?: string;
}

/**
 * Handles audit log write errors safely so primary business mutations do not crash if audit storage is degraded.
 */
export async function auditWriteFailureGuard(
  logFn: () => Promise<void>
): Promise<AuditWriteResult> {
  try {
    await logFn();
    return { success: true, fallbackTriggered: false };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Fallback: log to stderr for monitoring tools
    console.error(`[AUDIT_WRITE_FAILED_FALLBACK] Audit write failed: ${errorMsg}`);

    return {
      success: false,
      fallbackTriggered: true,
      error: `audit_write_failed: ${errorMsg}`,
    };
  }
}

export interface ProductionReadinessChecklist {
  serverScopeEnforced: boolean;
  secretExposureChecked: boolean;
  boundedInputValidated: boolean;
  backupRestoreDrillCompleted: boolean;
}

export function verifyProductionReadinessChecklist(
  checklist: ProductionReadinessChecklist
): { isReady: boolean; missingSteps: string[] } {
  const missingSteps: string[] = [];

  if (!checklist.serverScopeEnforced) missingSteps.push('Server-side scope authorization enforcement');
  if (!checklist.secretExposureChecked) missingSteps.push('Secret exposure audit');
  if (!checklist.boundedInputValidated) missingSteps.push('Bounded input schema validation');
  if (!checklist.backupRestoreDrillCompleted) missingSteps.push('Database backup restore drill');

  return {
    isReady: missingSteps.length === 0,
    missingSteps,
  };
}
