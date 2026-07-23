/**
 * Normalizes a Pakistani phone number into a canonical 12-digit string starting with '923'.
 * Handles formats like:
 * - "+92-300-1234567" -> "923001234567"
 * - "0300 1234567" -> "923001234567"
 * - "00923001234567" -> "923001234567"
 * - "923001234567" -> "923001234567"
 * - "3001234567" -> "923001234567"
 * 
 * Returns `null` if the input is empty or does not match a valid Pakistani phone format.
 */
export function normalizePakistanPhone(phoneInput?: string | null): string | null {
  if (!phoneInput) {
    return null;
  }

  // Remove non-digit characters
  let digits = phoneInput.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  // Handle leading 0092
  if (digits.startsWith("0092")) {
    digits = digits.slice(2);
  }

  // Handle leading 03XX (11 digits total)
  if (digits.startsWith("03") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  }

  // Handle 3XX (10 digits total)
  if (digits.startsWith("3") && digits.length === 10) {
    digits = "92" + digits;
  }

  // Validate canonical format: 12 digits starting with 923
  if (/^923\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

/**
 * Checks if a phone number string is valid after normalization.
 */
export function isValidPakistanPhone(phoneInput?: string | null): boolean {
  return normalizePakistanPhone(phoneInput) !== null;
}
