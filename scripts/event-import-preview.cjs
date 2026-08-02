/* eslint-disable @typescript-eslint/no-require-imports -- Standalone zero-write workbook parser for Event import. */

class EventImportError extends Error {}

function text(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "result" in value) return text(value.result);
  return String(value).trim();
}

function redactPhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 6) return "***";
  return `${cleaned.slice(0, 4)}****${cleaned.slice(-3)}`;
}

function parseEventRows(rows, options = {}) {
  const { expectedEventCode, expectedCityCode, knownParticipants = [] } = options;

  const records = [];
  const errors = [];
  const seenSourceRefs = new Set();
  const knownParticipantSet = new Set(knownParticipants);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNum = index + 2;

    const sourceRef = text(row.sourceReference);
    const eventCode = text(row.eventCode);
    const cityCode = text(row.cityCode);
    const partRef = text(row.participantReference);
    const partName = text(row.participantName);
    const mobile = text(row.primaryMobile);
    const fee = Number(row.registrationFee || 0);
    const feeStatus = text(row.paymentStatus).toLowerCase() || "pending";
    const consent = Boolean(row.consentReceived);

    if (!sourceRef && !partName && !mobile) continue;

    if (!sourceRef) {
      errors.push({ row: rowNum, code: "missing_source_reference", message: `Row ${rowNum} missing sourceReference` });
      continue;
    }

    if (seenSourceRefs.has(sourceRef)) {
      errors.push({ row: rowNum, sourceRef, code: "duplicate_registration", message: `Duplicate sourceReference: ${sourceRef}` });
      continue;
    }
    seenSourceRefs.add(sourceRef);

    if (expectedEventCode && eventCode.toLowerCase() !== expectedEventCode.toLowerCase()) {
      errors.push({ row: rowNum, sourceRef, code: "foreign_event_scope", message: `Event ${eventCode} does not match target ${expectedEventCode}` });
      continue;
    }

    if (expectedCityCode && cityCode.toLowerCase() !== expectedCityCode.toLowerCase()) {
      errors.push({ row: rowNum, sourceRef, code: "foreign_city_scope", message: `City ${cityCode} does not match target ${expectedCityCode}` });
      continue;
    }

    const isMatched = partRef ? knownParticipantSet.has(partRef) : false;
    if (partRef && !isMatched) {
      errors.push({ row: rowNum, sourceRef, partRef, code: "unmatched_participant_candidate", message: `Participant ${partRef} not found in scope` });
    }

    records.push({
      sourceRow: rowNum,
      sourceReference: sourceRef,
      eventCode,
      cityCode,
      participantReference: partRef || null,
      participantName: partName,
      primaryMobileRedacted: redactPhone(mobile),
      registrationFee: fee,
      paymentStatus: feeStatus,
      consentReceived: consent,
      isMatched,
    });
  }

  return { records, errors };
}

function buildEventPreviewReport(parsed, options = {}) {
  const { eventCode, cityCode } = options;

  if (!eventCode || !cityCode) {
    throw new EventImportError("Event code and city code must be explicitly provided");
  }

  const { records, errors } = parsed;

  return {
    mode: "zero_write_preview",
    writesPerformed: false,
    target: { eventCode, cityCode },
    metrics: {
      totalRowsParsed: records.length + errors.length,
      validRegistrations: records.length,
      unmatchedParticipants: errors.filter((e) => e.code === "unmatched_participant_candidate").length,
      duplicateRegistrations: errors.filter((e) => e.code === "duplicate_registration").length,
      validationErrorsCount: errors.length,
    },
    validationErrors: errors,
    previewRecords: records,
  };
}

module.exports = {
  EventImportError,
  text,
  redactPhone,
  parseEventRows,
  buildEventPreviewReport,
};
