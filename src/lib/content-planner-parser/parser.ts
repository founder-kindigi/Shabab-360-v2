import { z } from "zod";
import {
  COLUMN_TO_TEAM,
  REQUIRED_COLUMNS,
  workbookContextSchema,
  type DryRunReport,
  type ParsedBlock,
  type ParsedSession,
  type ParsedSheet,
  type WorkbookContext,
} from "./types";

const OFF_DAY_MARKERS = ["off day", "cancelled", "no session", "holiday"];
const COLUMN_ALIASES: Record<string, string> = {
  week: "week", day: "day", date: "date",
  exercises: "exercises", sports: "sports", skills: "skills", tadreeb: "tadreeb",
  areas_to_focus: "areas_to_focus", "areas to focus": "areas_to_focus",
  "focus area": "areas_to_focus", focus_area: "areas_to_focus",
};
const CONTENT_COLUMNS = ["exercises", "sports", "skills", "tadreeb"] as const;
type ContentColumn = (typeof CONTENT_COLUMNS)[number];

function normCol(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return COLUMN_ALIASES[key] ?? null;
}

function isOffDay(v: string | null | undefined): boolean {
  if (!v) return false;
  const t = v.trim().toLowerCase();
  return OFF_DAY_MARKERS.some((m) => t === m || t.startsWith(m + " "));
}

/** Reject impossible calendar dates like 2026-99-99 or 2026-02-30. */
function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` === s;
}

export function parseSheet(
  sheetName: string,
  rawRows: Record<string, unknown>[],
  contextInput: WorkbookContext
): { sheet: ParsedSheet | null; errors: { row: number; column: string; message: string }[] } {
  const errors: { row: number; column: string; message: string }[] = [];

  // Validate context at runtime through the existing Zod schema
  const ctxResult = workbookContextSchema.safeParse(contextInput);
  if (!ctxResult.success) {
    errors.push({ row: 0, column: "context", message: `Invalid workbook context: ${JSON.stringify(ctxResult.error.flatten().fieldErrors)}` });
    return { sheet: null, errors };
  }
  const context = ctxResult.data;

  if (rawRows.length === 0) {
    errors.push({ row: 0, column: "", message: `Sheet "${sheetName}" has no data rows` });
    return { sheet: null, errors };
  }

  const firstKeys = Object.keys(rawRows[0] ?? {});
  const normalizedAvailable = new Set(firstKeys.map((k) => normCol(k)).filter((v): v is string => v !== null));
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !normalizedAvailable.has(c));
  if (missingColumns.length > 0) {
    errors.push({ row: 0, column: "", message: `Missing required columns: ${missingColumns.join(", ")}` });
    return { sheet: null, errors };
  }

  const sessions: ParsedSession[] = [];
  let skipped = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (!raw || typeof raw !== "object") {
      errors.push({ row: i + 1, column: "", message: "Row is not a valid object" });
      continue;
    }

    const m: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      const n = normCol(k);
      if (n) m[n] = v;
    }

    const w = m["week"], d = m["day"], dt = m["date"];
    if (w === undefined || d === undefined || dt === undefined) {
      errors.push({ row: i + 1, column: "week/day/date", message: "Missing week, day, or date" });
      continue;
    }

    const vals: Record<ContentColumn, string | null> = { exercises: null, sports: null, skills: null, tadreeb: null };
    let anyContent = false, rowOff = false;

    for (const col of CONTENT_COLUMNS) {
      const rv = m[col];
      const sv = rv != null && typeof rv === "string" && rv.trim().length > 0 ? rv.trim() : null;
      vals[col] = sv;
      if (sv) { anyContent = true; if (isOffDay(sv)) rowOff = true; }
    }

    if (!anyContent && !rowOff) { skipped++; continue; }

    const weekNum = Number(w), dayNum = Number(d);
    const dateStr = typeof dt === "string" ? dt.trim() : "";
    const focus = typeof m["areas_to_focus"] === "string" ? (m["areas_to_focus"] as string).trim() : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      errors.push({ row: i + 1, column: "date", message: `Invalid date format: "${dateStr}". Expected YYYY-MM-DD.` });
      continue;
    }
    if (!isValidDateStr(dateStr)) {
      errors.push({ row: i + 1, column: "date", message: `Impossible calendar date: "${dateStr}".` });
      continue;
    }
    if (isNaN(weekNum) || !Number.isFinite(weekNum) || weekNum < 1 || !Number.isInteger(weekNum)) {
      errors.push({ row: i + 1, column: "week", message: `Invalid week: "${w}". Must be a positive integer.` });
      continue;
    }
    if (isNaN(dayNum) || !Number.isFinite(dayNum) || dayNum < 0 || dayNum > 7 || !Number.isInteger(dayNum)) {
      errors.push({ row: i + 1, column: "day", message: `Invalid day: "${d}". Must be an integer 0-7.` });
      continue;
    }

    // Off-day rows produce zero blocks regardless of content column values
    const blocks: ParsedBlock[] = [];
    if (!rowOff) {
      for (const col of CONTENT_COLUMNS) {
        const v = vals[col];
        if (!v) continue;
        blocks.push({ teamCode: COLUMN_TO_TEAM[col], category: col, content: v, sortOrder: blocks.length, sourceSheetName: sheetName, sourceRow: i + 1, sourceColumn: col });
      }
    }

    sessions.push({ weekLabel: String(weekNum), dayLabel: String(dayNum), sessionDate: dateStr, sourceSheetName: sheetName, sourceRow: i + 1, focusArea: focus, isOffDay: rowOff, blocks });
  }

  return { sheet: { sheetName, context, sessions, skippedPlaceholderRows: skipped, hasContent: sessions.length > 0 }, errors };
}

export function computeSummary(sheets: ParsedSheet[]): DryRunReport["summary"] {
  let swc = 0, sph = 0, tb = 0, el = 0, od = 0;
  const bpt: Record<string, number> = {};
  for (const s of sheets) {
    sph += s.skippedPlaceholderRows;
    for (const ses of s.sessions) {
      if (ses.isOffDay) { od++; swc++; } else if (ses.blocks.length > 0) swc++; else sph++;
      tb += ses.blocks.length;
      for (const b of ses.blocks) {
        bpt[b.teamCode] = (bpt[b.teamCode] || 0) + 1;
        if (/https?:\/\//.test(b.content)) el++;
      }
    }
  }
  return { sheetsParsed: sheets.length, sessionsWithContent: swc, sessionsPlaceholder: sph, totalBlocks: tb, blocksPerTeam: bpt, externalLinksFound: el, offDays: od };
}
