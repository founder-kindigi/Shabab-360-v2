/* eslint-disable @typescript-eslint/no-require-imports -- Standalone zero-write workbook parser for Content Planner. */
const crypto = require("node:crypto");
const ExcelJS = require("exceljs");

class ContentPlannerImportError extends Error {}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;

/**
 * Text extractor helper
 */
function text(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "result" in value) return text(value.result);
  if (typeof value === "object" && "text" in value) return text(value.text);
  if (typeof value === "object" && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("").trim();
  }
  return String(value).trim();
}

/**
 * Detects any URLs embedded within text content.
 * Returns array of detected URLs.
 */
function detectUrls(content) {
  if (!content) return [];
  const matches = content.match(URL_PATTERN);
  return matches ? Array.from(matches) : [];
}

/**
 * Parses raw workbook rows into structured content blocks with explicit operator context.
 */
function parseContentSheet(sheet, sheetName, options) {
  const { cityId, targetPlanId, isStateLifeOverride = false } = options;
  const blocks = [];
  const blockedUrls = [];
  const errors = [];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum += 1) {
    const row = sheet.getRow(rowNum);
    const weekLabel = text(row.getCell(1).value);
    const sessionLabel = text(row.getCell(2).value);
    const blockType = text(row.getCell(3).value).toLowerCase(); // "sports" | "skills" | "tadreeb" | "off_day"
    const focusArea = text(row.getCell(4).value);
    const title = text(row.getCell(5).value);
    const description = text(row.getCell(6).value);
    const rawUrl = text(row.getCell(7).value);

    // Skip empty trailing rows
    if (!weekLabel && !sessionLabel && !title && !description) continue;

    if (!weekLabel || !sessionLabel) {
      errors.push({
        row: rowNum,
        sheet: sheetName,
        code: "missing_week_or_session",
        message: `Row ${rowNum} missing week or session label`,
      });
      continue;
    }

    const fullText = `${title} ${description} ${rawUrl}`;
    const detected = detectUrls(fullText);

    // Fail closed: URLs detected are stored as blocked proposed resources
    if (detected.length > 0) {
      detected.forEach((url) => {
        blockedUrls.push({
          row: rowNum,
          sheet: sheetName,
          url,
          status: "blocked_proposed_resource",
          reason: "URL auto-publishing disabled until allowlist verification",
        });
      });
    }

    const isOffDay = blockType === "off_day" || /off\s*day/i.test(title);

    blocks.push({
      sourceSheet: sheetName,
      sourceRow: rowNum,
      cityId,
      targetPlanId,
      isStateLifeOverride,
      weekLabel,
      sessionLabel,
      blockType: isOffDay ? "off_day" : blockType || "tadreeb",
      focusArea: focusArea || null,
      title: title || `${weekLabel} - ${sessionLabel}`,
      description: description || null,
      detectedUrls: detected,
      hasBlockedUrls: detected.length > 0,
      isOffDay,
    });
  }

  return { blocks, blockedUrls, errors };
}

/**
 * Parses the approved Batch 4 workbook layout. Each dated row becomes one
 * planned session with up to four independently owned delivery blocks.
 */
function parseBatch4Sheet(sheet, sheetName, options) {
  const isStateLifeOverride = sheetName === "State Life School";
  const blocks = [];
  const sessions = [];
  const blockedUrls = [];
  const errors = [];
  const lanes = [
    [4, "exercises"],
    [5, "sports"],
    [6, "skills"],
    [7, "tadreeb"],
  ];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum += 1) {
    const row = sheet.getRow(rowNum);
    const weekLabel = text(row.getCell(1).value);
    const dayLabel = text(row.getCell(2).value);
    const dateValue = row.getCell(3).value;
    const sessionDate = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : text(dateValue);
    const focusArea = text(row.getCell(8).value) || null;
    const laneValues = lanes.map(([column]) => text(row.getCell(column).value));
    if (!weekLabel && !dayLabel && !sessionDate && laneValues.every((value) => !value)) continue;
    if (!weekLabel || !dayLabel || !/^\d{4}-\d{2}-\d{2}/.test(sessionDate)) {
      errors.push({ sheet: sheetName, row: rowNum, code: "invalid_session_identity" });
      continue;
    }
    const isOffDay = laneValues.some((value) => /^off\s*day/i.test(value));
    sessions.push({ sourceSheet: sheetName, sourceRow: rowNum, weekLabel, dayLabel, sessionDate: sessionDate.slice(0, 10), focusArea: isOffDay ? null : focusArea, isOffDay, isStateLifeOverride });
    if (isOffDay) continue;
    lanes.forEach(([column, category], sortOrder) => {
      const raw = row.getCell(column).value;
      const content = text(raw);
      if (!content) return;
      const urls = detectUrls(content);
      if (raw && typeof raw === "object" && raw.hyperlink) urls.push(raw.hyperlink);
      for (const url of [...new Set(urls)]) blockedUrls.push({ sheet: sheetName, row: rowNum, category, url, status: "blocked_proposed_resource" });
      blocks.push({ sourceSheet: sheetName, sourceRow: rowNum, weekLabel, dayLabel, sessionDate: sessionDate.slice(0, 10), category, content, title: content.split("\n")[0].slice(0, 200) || null, focusArea, sortOrder, isStateLifeOverride, hasBlockedUrls: urls.length > 0 });
    });
  }
  return { sessions, blocks, blockedUrls, errors };
}

/**
 * Builds zero-write import preview report.
 */
function buildPreviewReport(parsedData, options) {
  const { cityId, targetPlanId, parkId, batchId } = options;

  if (!cityId || !targetPlanId) {
    throw new ContentPlannerImportError("Operator must explicitly provide cityId and targetPlanId");
  }

  const { blocks, blockedUrls, errors } = parsedData;

  const summary = {
    mode: "zero_write_preview",
    writesPerformed: false,
    operatorContext: {
      cityId,
      targetPlanId,
      parkId: parkId || null,
      batchId: batchId || null,
    },
    metrics: {
      totalRowsParsed: blocks.length + errors.length,
      proposedBlocks: blocks.length,
      sportsBlocks: blocks.filter((b) => b.blockType === "sports").length,
      skillsBlocks: blocks.filter((b) => b.blockType === "skills").length,
      tadreebBlocks: blocks.filter((b) => b.blockType === "tadreeb").length,
      offDays: blocks.filter((b) => b.isOffDay).length,
      stateLifeOverrides: blocks.filter((b) => b.isStateLifeOverride).length,
      blockedUrlsCount: blockedUrls.length,
      validationErrorsCount: errors.length,
    },
    blockedProposedResources: blockedUrls,
    validationErrors: errors,
    proposedBlocks: blocks,
  };

  return summary;
}

module.exports = {
  ContentPlannerImportError,
  text,
  detectUrls,
  parseContentSheet,
  parseBatch4Sheet,
  buildPreviewReport,
};
