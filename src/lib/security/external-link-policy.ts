import { db } from "@/lib/db";

export const EXTERNAL_LINK_POLICY_ID = "global";
export const DEFAULT_EXTERNAL_LINK_DOMAINS = ["drive.google.com", "docs.google.com", "onedrive.live.com"];

export function normalizeAllowedDomains(domains: string[]) {
  return [...new Set(domains.map((domain) => domain.trim().toLowerCase()).filter((domain) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)))];
}

export function validateAllowedExternalUrl(value: string, allowedDomains: string[]) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = url.protocol === "https:" && allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    return { allowed, url: url.toString(), host };
  } catch {
    return { allowed: false, url: null, host: null };
  }
}

export async function getExternalLinkPolicy() {
  const stored = await db.externalLinkPolicy.findUnique({ where: { id: EXTERNAL_LINK_POLICY_ID } });
  if (!stored) return { allowedDomains: DEFAULT_EXTERNAL_LINK_DOMAINS, requireInterstitialWarning: true };
  try {
    const parsed = JSON.parse(stored.allowedDomains);
    return { allowedDomains: normalizeAllowedDomains(Array.isArray(parsed) ? parsed : []), requireInterstitialWarning: stored.requireInterstitialWarning };
  } catch {
    return { allowedDomains: DEFAULT_EXTERNAL_LINK_DOMAINS, requireInterstitialWarning: true };
  }
}
