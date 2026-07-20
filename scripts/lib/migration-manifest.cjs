const IMPORT_MODELS = Object.freeze([
  "user",
  "city",
  "park",
  "batch",
  "group",
  "staffMeta",
  "guardian",
  "participant",
  "guardianChild",
  "batchSettings",
  "attendanceEvent",
  "attendanceRecord",
  "feeEvent",
  "payment",
  "receiptSequence",
  "admissionApplication",
  "admissionInterview",
  "announcement",
  "reportPreset",
]);

// Audit records are intentionally excluded by AUDIT_DATA_POLICY.md. Notifications
// are transient and may contain historical credential content, so they are not moved.
const EXCLUDED_MODELS = Object.freeze(["auditLog", "notification"]);
const ALL_MODELS = Object.freeze([...IMPORT_MODELS, ...EXCLUDED_MODELS]);

const MONEY_FIELDS = Object.freeze([
  ["feeEvent", "amount"],
  ["feeEvent", "discountAmount"],
  ["payment", "amount"],
  ["payment", "waivedAmount"],
]);

const FINGERPRINT_CHECKS = Object.freeze([
  ["user", ["id", "passwordHash", "name", "phone"]],
  ["guardian", ["id", "userId", "name", "phone", "cnic", "address"]],
  ["participant", ["id", "userId", "name", "phone", "dateOfBirth", "gender", "address", "groupId", "state"]],
  ["admissionApplication", ["id", "applicantName", "applicantDOB", "gender", "guardianName", "guardianPhone", "guardianRelation", "cityId", "preferredParkId", "status", "emergencyContact", "emergencyPhone", "previousEducation", "reference"]],
]);

const RELATION_CHECKS = Object.freeze([
  ["park", "cityId", "city"],
  ["batch", "parkId", "park"],
  ["group", "batchId", "batch"],
  ["staffMeta", "userId", "user"],
  ["staffMeta", "assignedCityId", "city"],
  ["staffMeta", "assignedParkId", "park"],
  ["staffMeta", "assignedGroupId", "group"],
  ["guardian", "userId", "user"],
  ["participant", "userId", "user"],
  ["participant", "groupId", "group"],
  ["guardianChild", "guardianId", "guardian"],
  ["guardianChild", "participantId", "participant"],
  ["batchSettings", "batchId", "batch"],
  ["attendanceEvent", "groupId", "group"],
  ["attendanceRecord", "eventId", "attendanceEvent"],
  ["attendanceRecord", "participantId", "participant"],
  ["feeEvent", "batchId", "batch"],
  ["payment", "feeEventId", "feeEvent"],
  ["payment", "participantId", "participant"],
  ["admissionApplication", "cityId", "city"],
  ["admissionApplication", "preferredParkId", "park"],
  ["admissionApplication", "convertedParticipantId", "participant"],
  ["admissionInterview", "applicationId", "admissionApplication"],
  ["announcement", "authorId", "user"],
]);

function chunk(items, size = 250) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function moneyToCents(value) {
  if (value === null || value === undefined) return 0n;

  const numeric = Number(typeof value === "object" && "toString" in value ? value.toString() : value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) > Number.MAX_SAFE_INTEGER / 100) {
    throw new Error("Money value is not a safe finite amount");
  }

  const fixed = numeric.toFixed(2);
  if (Math.abs(numeric - Number(fixed)) > 0.00000001) {
    throw new Error("Money value has more than two decimal places");
  }

  const negative = fixed.startsWith("-");
  const [whole, fraction] = fixed.replace("-", "").split(".");
  const cents = BigInt(`${whole}${fraction}`);
  return negative ? -cents : cents;
}

function formatCents(cents) {
  const negative = cents < 0n;
  const digits = (negative ? -cents : cents).toString().padStart(3, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

function compareCounts(sourceCounts, targetCounts) {
  return IMPORT_MODELS.filter((model) => sourceCounts[model] !== targetCounts[model]);
}

function nonEmptyModels(counts) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([model]) => model);
}

module.exports = {
  ALL_MODELS,
  EXCLUDED_MODELS,
  FINGERPRINT_CHECKS,
  IMPORT_MODELS,
  MONEY_FIELDS,
  RELATION_CHECKS,
  chunk,
  compareCounts,
  formatCents,
  moneyToCents,
  nonEmptyModels,
};
