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
  buildPreviewReport,
};
