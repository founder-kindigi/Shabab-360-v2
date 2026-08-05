import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDomainAllowlistConfig,
  updateDomainAllowlistConfig,
  validateExternalURL,
  reconcileContentPlannerURLs,
  DEFAULT_ALLOWED_DOMAINS,
} from '../domain-allowlist';

describe('V2-203 Document Links & Safe Redirects Policy', () => {
  beforeEach(() => {
    // Reset config
    updateDomainAllowlistConfig({
      allowedDomains: [...DEFAULT_ALLOWED_DOMAINS],
      requireInterstitialWarning: true,
      blockAllUnlisted: true,
    });
  });

  it('validates HTTPS URLs against default approved domains', () => {
    const res = validateExternalURL('https://docs.google.com/spreadsheets/d/123');
    expect(res.isValid).toBe(true);
    expect(res.isAllowed).toBe(true);
    expect(res.canonicalDomain).toBe('docs.google.com');
  });

  it('blocks insecure HTTP URLs', () => {
    const res = validateExternalURL('http://docs.google.com/spreadsheets/d/123');
    expect(res.isValid).toBe(false);
    expect(res.isAllowed).toBe(false);
    expect(res.error).toBe('Only secure HTTPS links are allowed.');
  });

  it('blocks unlisted domains when blockAllUnlisted is enabled', () => {
    const res = validateExternalURL('https://malicious-external-site.com/phishing');
    expect(res.isValid).toBe(true);
    expect(res.isAllowed).toBe(false);
    expect(res.error).toContain('is not on the approved external domain allowlist');
  });

  it('allows Super Admin / City Head to add new domains to the allowlist', () => {
    updateDomainAllowlistConfig({
      allowedDomains: [...DEFAULT_ALLOWED_DOMAINS, 'custom-partner.org'],
    });

    const res = validateExternalURL('https://custom-partner.org/document.pdf');
    expect(res.isAllowed).toBe(true);
    expect(res.canonicalDomain).toBe('custom-partner.org');
  });

  it('reconciles Content Planner source URLs correctly', () => {
    const testUrls = [
      'https://sheets.google.com/d/sheet1',
      'https://drive.google.com/file/d/file1',
      'https://unapproved-site.com/doc',
    ];

    const report = reconcileContentPlannerURLs(testUrls);
    expect(report.approved).toHaveLength(2);
    expect(report.blocked).toHaveLength(1);
    expect(report.blocked[0]).toBe('https://unapproved-site.com/doc');
  });
});
