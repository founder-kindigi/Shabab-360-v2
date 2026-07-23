import crypto from "crypto";

const HMAC_SECRET = process.env.IMPORT_HMAC_SECRET || "calling_template_secret_key_fallback";

export function computeValuesHmac(values: Record<string, any>): string {
  const sortedKeys = Object.keys(values).sort();
  const canonicalString = sortedKeys.map((k) => `${k}:${String(values[k] ?? "")}`).join("|");
  return crypto.createHmac("sha256", HMAC_SECRET).update(canonicalString).digest("hex");
}
