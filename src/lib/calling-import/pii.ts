import { createHmac } from "node:crypto";

/**
 * Masks a name to protect PII.
 * Example: "Ali Khan" -> "Al* K**n"
 */
export function maskName(name?: string | null): string {
  if (!name || !name.trim()) {
    return "Un*****";
  }

  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 2) {
        return part[0] + "*";
      }
      return part.slice(0, 2) + "*".repeat(part.length - 2);
    })
    .join(" ");
}

/**
 * Masks a phone number to protect PII.
 * Example: "923001234567" -> "+92300*****67"
 * Example: "+923001234567" -> "+92300*****67"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || !phone.trim()) {
    return "N/A";
  }

  let clean = phone.trim();
  if (!clean.startsWith("+")) {
    clean = "+" + clean;
  }

  if (clean.length < 8) {
    return "***";
  }

  const prefix = clean.slice(0, 6); // e.g. "+92300"
  const suffix = clean.slice(-2);   // e.g. "67"
  const middleLen = Math.max(3, clean.length - 8);

  return `${prefix}${"*".repeat(middleLen)}${suffix}`;
}

/**
 * Computes an HMAC-SHA-256 fingerprint for a string using a mandatory secret key.
 * Requires secret to be non-empty string. Unkeyed fallback is not permitted.
 */
export function computeFingerprint(value: string | null | undefined, secret: string): string {
  if (!secret || !secret.trim()) {
    throw new Error("IMPORT_HMAC_SECRET is required for HMAC fingerprinting.");
  }

  if (!value) {
    return "empty_fingerprint";
  }

  const sanitized = value.trim().toLowerCase();
  const hmac = createHmac("sha256", secret.trim());
  hmac.update(sanitized);
  return `hmac_sha256_${hmac.digest("hex").slice(0, 16)}`;
}
