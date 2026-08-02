/* eslint-disable @typescript-eslint/no-require-imports -- Standalone zero-write workbook parser for Calling import. */
const crypto = require("node:crypto");

class CallingImportError extends Error {}

const CANONICAL_COLUMNS = [
  "sourceReference",
  "campaignCode",
  "cityCode",
  "applicantReference",
  "applicantName",
  "primaryMobile",
  "whatsappNumber",
  "status",
  "response",
  "historicalNote",
  "currentNote",
  "sourceDate",
  "assigneeReference",
];

function text(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "result" in value) return text(value.result);
  return String(value).trim();
}

/**
 * Redacts phone number PII for safe reporting.
 */
function redactPhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 6) return "***";
  return `${cleaned.slice(0, 4)}****${cleaned.slice(-3)}`;
}

/**
 * Validates header row against canonical schema.
 */
function validateHeaders(headers) {
  const missing = CANONICAL_COLUMNS.filter(
    (col) => !headers.map((h) => text(h).toLowerCase()).includes(col.toLowerCase())
  );
  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Parses raw workbook rows into structured calling import candidates.
 */
function parseCallingRows(rows, options = {}) {
  const { expectedCampaignCode, expectedCityCode, activeCallers = [], knownApplicantRefs = [] } = options;

  const records = [];
  const errors = [];
  const seenSourceRefs = new Set();
  const activeCallerSet = new Set(activeCallers);
  const knownAppSet = new Set(knownApplicantRefs);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNum = index + 2;

    const sourceRef = text(row.sourceReference);
    const campaign = text(row.campaignCode);
    const city = text(row.cityCode);
    const applicantRef = text(row.applicantReference);
    const applicantName = text(row.applicantName);
    const mobile = text(row.primaryMobile);
    const whatsapp = text(row.whatsappNumber); // Secondary contact, never guardian
    const status = text(row.status);
    const responseText = text(row.response);
    const historicalNote = text(row.historicalNote);
    const currentNote = text(row.currentNote);
    const sourceDate = text(row.sourceDate);
    const assigneeRef = text(row.assigneeReference);

    if (!sourceRef && !applicantRef && !mobile) continue; // Skip empty row

    // Checks
    if (!sourceRef) {
      errors.push({ row: rowNum, code: "missing_source_reference", message: `Row ${rowNum} missing sourceReference` });
      continue;
    }

    if (seenSourceRefs.has(sourceRef)) {
      errors.push({ row: rowNum, sourceRef, code: "duplicate_source_reference", message: `Duplicate sourceReference: ${sourceRef}` });
      continue;
    }
    seenSourceRefs.add(sourceRef);

    if (expectedCampaignCode && campaign.toLowerCase() !== expectedCampaignCode.toLowerCase()) {
      errors.push({ row: rowNum, sourceRef, code: "foreign_campaign_scope", message: `Campaign ${campaign} does not match target ${expectedCampaignCode}` });
      continue;
    }

    if (expectedCityCode && city.toLowerCase() !== expectedCityCode.toLowerCase()) {
      errors.push({ row: rowNum, sourceRef, code: "foreign_city_scope", message: `City ${city} does not match target ${expectedCityCode}` });
      continue;
    }

    // Applicant matching (deterministic & scoped - never creates an admission application)
    const isApplicantMatched = knownAppSet.has(applicantRef);
    if (!isApplicantMatched) {
      errors.push({ row: rowNum, sourceRef, applicantRef, code: "unmatched_applicant", message: `Applicant ${applicantRef} not found in scope` });
    }

    // Active caller mapping
    const isAssigneeActive = activeCallerSet.has(assigneeRef);
    if (assigneeRef && !isAssigneeActive) {
      errors.push({ row: rowNum, sourceRef, assigneeRef, code: "unrecognized_assignee", message: `Assignee ${assigneeRef} is not an active caller` });
    }

    records.push({
      sourceRow: rowNum,
      sourceReference: sourceRef,
      campaignCode: campaign,
      cityCode: city,
      applicantReference: applicantRef,
      applicantName: applicantName,
      primaryMobileRedacted: redactPhone(mobile),
      whatsappNumberRedacted: redactPhone(whatsapp), // Secondary contact only
      status: status || "pending",
      response: responseText || null,
      notesCount: (historicalNote ? 1 : 0) + (currentNote ? 1 : 0), // Notes stored in calling history, NEVER in audit logs
      sourceDate: sourceDate || null,
      assigneeReference: assigneeRef || null,
      isApplicantMatched,
      isAssigneeActive,
    });
  }

  return { records, errors };
}

/**
 * Builds zero-write calling preview report.
 */
function buildCallingPreviewReport(parsed, options = {}) {
  const { campaignCode, cityCode } = options;

  if (!campaignCode || !cityCode) {
    throw new CallingImportError("Campaign code and city code must be explicitly provided");
  }

  const { records, errors } = parsed;

  return {
    mode: "zero_write_preview",
    writesPerformed: false,
    target: { campaignCode, cityCode },
    metrics: {
      totalRowsParsed: records.length + errors.length,
      validRecords: records.filter((r) => r.isApplicantMatched && (!r.assigneeReference || r.isAssigneeActive)).length,
      unmatchedApplicants: errors.filter((e) => e.code === "unmatched_applicant").length,
      unrecognizedAssignees: errors.filter((e) => e.code === "unrecognized_assignee").length,
      duplicateSourceRefs: errors.filter((e) => e.code === "duplicate_source_reference").length,
      validationErrorsCount: errors.length,
    },
    validationErrors: errors,
    previewRecords: records,
  };
}

module.exports = {
  CallingImportError,
  CANONICAL_COLUMNS,
  text,
  redactPhone,
  validateHeaders,
  parseCallingRows,
  buildCallingPreviewReport,
};
