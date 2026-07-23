/**
 * Explicit audit sanitizer for Student Extended Profile wellbeing fields.
 * The generic SENSITIVE_AUDIT_FIELD regex in createAuditLogData does not
 * reliably catch all free-text wellbeing content. This helper explicitly
 * redacts every Support & Wellbeing field before audit logging.
 */

const PROFILE_SENSITIVE_FIELDS = [
  "financialStatus", "deenBackground", "badHabits",
  "disability", "specialNeed", "moralCharacter", "namaz",
];

export function redactProfileSensitiveValues(values?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!values) return undefined;
  const redacted = { ...values };
  for (const field of PROFILE_SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = "[REDACTED]";
    }
  }
  return redacted;
}
