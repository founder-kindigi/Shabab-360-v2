/**
 * Shabab 360 - Document Links & Safe Redirects Policy (V2-203)
 * Server-side domain allowlist validator and interstitial configuration.
 */

export interface DomainAllowlistConfig {
  allowedDomains: string[];
  requireInterstitialWarning: boolean;
  blockAllUnlisted: boolean;
}

// Default initial approved domains
export const DEFAULT_ALLOWED_DOMAINS = [
  'google.com',
  'drive.google.com',
  'docs.google.com',
  'sheets.google.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'shabab360.org',
];

let currentConfig: DomainAllowlistConfig = {
  allowedDomains: [...DEFAULT_ALLOWED_DOMAINS],
  requireInterstitialWarning: true,
  blockAllUnlisted: true,
};

export function getDomainAllowlistConfig(): DomainAllowlistConfig {
  return {
    allowedDomains: [...currentConfig.allowedDomains],
    requireInterstitialWarning: currentConfig.requireInterstitialWarning,
    blockAllUnlisted: currentConfig.blockAllUnlisted,
  };
}

export function updateDomainAllowlistConfig(newConfig: Partial<DomainAllowlistConfig>): DomainAllowlistConfig {
  if (newConfig.allowedDomains) {
    const cleaned = newConfig.allowedDomains
      .map((d) => d.toLowerCase().trim())
      .filter((d) => d.length > 0 && !d.includes('/') && !d.includes(':'));
    currentConfig.allowedDomains = Array.from(new Set(cleaned));
  }

  if (newConfig.requireInterstitialWarning !== undefined) {
    currentConfig.requireInterstitialWarning = newConfig.requireInterstitialWarning;
  }

  if (newConfig.blockAllUnlisted !== undefined) {
    currentConfig.blockAllUnlisted = newConfig.blockAllUnlisted;
  }

  return getDomainAllowlistConfig();
}

export interface URLValidationResult {
  isValid: boolean;
  isAllowed: boolean;
  requiresWarning: boolean;
  canonicalDomain?: string;
  error?: string;
}

export function validateExternalURL(rawUrl: string): URLValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, isAllowed: false, requiresWarning: false, error: 'URL string is required.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, isAllowed: false, requiresWarning: false, error: 'Invalid URL format.' };
  }

  // Require HTTPS protocol for safe external document links
  if (parsed.protocol !== 'https:') {
    return {
      isValid: false,
      isAllowed: false,
      requiresWarning: false,
      error: 'Only secure HTTPS links are allowed.',
    };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Match domain or parent subdomain against allowlist
  const isDomainAllowed = currentConfig.allowedDomains.some((domain) => {
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });

  if (!isDomainAllowed && currentConfig.blockAllUnlisted) {
    return {
      isValid: true,
      isAllowed: false,
      requiresWarning: true,
      canonicalDomain: hostname,
      error: `Domain '${hostname}' is not on the approved external domain allowlist.`,
    };
  }

  return {
    isValid: true,
    isAllowed: isDomainAllowed,
    requiresWarning: !isDomainAllowed || currentConfig.requireInterstitialWarning,
    canonicalDomain: hostname,
  };
}

/**
 * Reconciles Content Planner source URLs against current domain allowlist policy.
 */
export function reconcileContentPlannerURLs(urls: string[]): {
  approved: string[];
  blocked: string[];
  requiresWarningCount: number;
} {
  const approved: string[] = [];
  const blocked: string[] = [];
  let requiresWarningCount = 0;

  for (const u of urls) {
    const res = validateExternalURL(u);
    if (res.isAllowed) {
      approved.push(u);
      if (res.requiresWarning) requiresWarningCount++;
    } else {
      blocked.push(u);
    }
  }

  return { approved, blocked, requiresWarningCount };
}
