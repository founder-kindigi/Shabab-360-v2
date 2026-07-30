/* eslint-disable @typescript-eslint/no-require-imports -- This is a standalone, non-writing workbook parser. */
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const ExcelJS = require("exceljs");

const PARK_SHEETS = [
  ["Gulberg", "Gulberg"],
  ["Gulshan_Iqbal", "Gulshan Iqbal"],
  ["Griffin", "Griffin"],
  ["Johar_Town", "Johar Town"],
  ["Gulshan_Ravi", "Gulshan Ravi"],
  ["State_Life", "State Life"],
];

const STATUS_MAP = new Map([
  ["present", "present"],
  ["absent", "absent"],
  ["late", "late"],
  ["leave", "excused"],
]);
const IGNORED_STATUSES = new Set(["", "off", "sat off", "n/a"]);
const GROUP_SUMMARY_LABELS = new Set([
  "strength",
  "absent",
  "leave",
  "present",
  "late",
  "total present",
  "attendance percentage",
]);

function text(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "result" in value) return text(value.result);
  return String(value).trim();
}

function sourceFingerprint(name, phone, park, group) {
  return crypto.createHash("sha256").update(`${name.toLowerCase()}|${phone.replace(/\s+/g, "")}|${park}|${group}`).digest("hex").slice(0, 16);
}

function parseSessionDates(labels, startYear) {
  let year = startYear;
  let previousMonth = 0;
  return labels.map((label) => {
    const match = /^(\d{1,2})\/(\d{1,2})$/.exec(text(label));
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    if (previousMonth && month < previousMonth) year += 1;
    previousMonth = month;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

function classifyStatus(value) {
  if (value && typeof value === "object" && "formula" in value) {
    // ExcelJS does not always expose a cached formula result. These formulas
    // are the workbook's explicit weekend OFF markers, not attendance values.
    if (/OFF Weekends/.test(value.formula) && /"OFF"/.test(value.formula)) return { kind: "ignored" };
    return { kind: "review", code: "malformed_attendance_value" };
  }
  const source = text(value);
  const normalized = source.toLowerCase();
  if (STATUS_MAP.has(normalized)) return { kind: "record", target: STATUS_MAP.get(normalized) };
  if (IGNORED_STATUSES.has(normalized)) return { kind: "ignored" };
  if (normalized === "dropout") return { kind: "review", code: "dropout_requires_owner_decision" };
  return { kind: "review", code: "malformed_attendance_value" };
}

function canonicalStaffRole(roleLabel) {
  const normalized = roleLabel.toLowerCase();
  if (normalized.includes("park lead")) return "park_lead";
  if (normalized.includes("park admin")) return "park_admin";
  if (normalized.includes("murabbi")) return "murabbi";
  return null;
}

function isSourceDataRow(value) {
  return typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value.trim()));
}

function isGroupSummaryLabel(value) {
  return GROUP_SUMMARY_LABELS.has(text(value).toLowerCase());
}

function readParkSheet(sheet, sheetName, parkName, startYear) {
  const attendanceColumns = [];
  for (let column = 9; column <= sheet.columnCount; column += 1) {
    if (/^C\d+$/i.test(text(sheet.getCell(3, column).value))) attendanceColumns.push(column);
  }
  const sessionDates = parseSessionDates(attendanceColumns.map((column) => sheet.getCell(4, column).value), startYear);
  const groups = [];
  const staff = [];
  const unnumberedCandidates = [];
  let currentGroup = null;

  for (let row = 5; row <= sheet.rowCount; row += 1) {
    const firstCell = text(sheet.getCell(row, 1).value);
    const groupMatch = /^Group\s+(.+?)\s*\|\s*Murabbi:\s*(.*)$/i.exec(firstCell);
    if (groupMatch) {
      currentGroup = { name: `Group ${groupMatch[1].trim()}`, murabbiLabel: groupMatch[2].trim(), sourceRef: `${sheetName}!A${row}`, students: [] };
      groups.push(currentGroup);
      continue;
    }

    const nameValue = sheet.getCell(row, 2).value;
    if (!isSourceDataRow(sheet.getCell(row, 1).value)) {
      if (currentGroup && typeof nameValue === "string" && text(nameValue) && !nameValue.trim().startsWith("=") && !isGroupSummaryLabel(nameValue)) {
        const name = text(nameValue);
        const phone = text(sheet.getCell(row, 3).value).replace(/^'/, "");
        const hasPhone = Boolean(text(sheet.getCell(row, 3).value));
        const age = text(sheet.getCell(row, 7).value);
        const grade = text(sheet.getCell(row, 8).value);
        const hasAttendance = attendanceColumns.some((column) => classifyStatus(sheet.getCell(row, column).value).kind !== "ignored");
        if (hasPhone || age || grade || hasAttendance) {
          unnumberedCandidates.push({
            sourceRef: `${sheetName}!${row}`,
            name,
            phone,
            fingerprint: sourceFingerprint(name, phone, parkName, currentGroup.name),
            group: currentGroup.name,
            hasPhone,
            age: /^\d+$/.test(age) ? Number(age) : null,
            grade: grade || null,
            statuses: attendanceColumns.map((column, index) => ({ date: sessionDates[index], value: sheet.getCell(row, column).value })),
          });
        }
      }
      continue;
    }
    const name = text(nameValue);
    if (!name) continue;
    const roleOrGrade = text(sheet.getCell(row, 8).value);
    const sourceRef = `${sheetName}!${row}`;
    if (!currentGroup) {
      staff.push({
        sourceRef,
        name,
        phone: text(sheet.getCell(row, 3).value).replace(/^'/, ""),
        roleLabel: roleOrGrade,
        canonicalRole: canonicalStaffRole(roleOrGrade),
      });
      continue;
    }

    const phone = text(sheet.getCell(row, 3).value).replace(/^'/, "");
    currentGroup.students.push({
      sourceRef,
      name,
      phone,
      fingerprint: sourceFingerprint(name, phone, parkName, currentGroup.name),
      hasPhone: Boolean(phone),
      age: /^\d+$/.test(text(sheet.getCell(row, 7).value)) ? Number(text(sheet.getCell(row, 7).value)) : null,
      hasAge: Boolean(text(sheet.getCell(row, 7).value)),
      grade: roleOrGrade,
      statuses: attendanceColumns.map((column, index) => ({ date: sessionDates[index], value: sheet.getCell(row, column).value })),
    });
  }

  return { sheetName, parkName, sessionDates, groups, staff, unnumberedCandidates };
}

function isDateOnOrBefore(value, limit) {
  return Boolean(limit && value && value <= limit);
}

function buildDryRunReport({ parks, completedThrough, generatedAt = new Date().toISOString() }) {
  const issues = [];
  const identityRefs = new Map();
  const events = new Map();
  const statusTotals = { present: 0, absent: 0, late: 0, excused: 0, ignored: 0, review: 0, withheld: 0 };
  const roster = { students: 0, unnumberedCandidates: 0, missingPhone: 0, agePresent: 0, gradePresent: 0, staffRows: 0 };

  if (!completedThrough) issues.push({ severity: "blocking", code: "completed_through_required", message: "Owner-confirmed completed-through date is required before attendance can be proposed." });
  if (completedThrough && !/^\d{4}-\d{2}-\d{2}$/.test(completedThrough)) throw new Error("--completed-through must use YYYY-MM-DD");

  for (const park of parks) {
    for (const candidate of park.unnumberedCandidates ?? []) {
      roster.unnumberedCandidates += 1;
      issues.push({ severity: "blocking", code: "unnumbered_student_candidate", sourceRef: candidate.sourceRef, park: park.parkName, group: candidate.group, hasPhone: candidate.hasPhone, grade: candidate.grade });
    }
    for (const staff of park.staff) {
      roster.staffRows += 1;
      issues.push({ severity: "review", code: "staff_assignment_requires_nomination", sourceRef: staff.sourceRef, canonicalRole: staff.canonicalRole, roleLabel: staff.roleLabel || null });
    }
    for (const group of park.groups) {
      if (!group.murabbiLabel) issues.push({ severity: "blocking", code: "group_murabbi_missing", sourceRef: group.sourceRef, park: park.parkName, group: group.name });
      for (const student of group.students) {
        roster.students += 1;
        if (!student.hasPhone) {
          roster.missingPhone += 1;
          issues.push({ severity: "review", code: "student_phone_missing", sourceRef: student.sourceRef, fingerprint: student.fingerprint });
        }
        if (student.hasAge) roster.agePresent += 1;
        if (student.grade) roster.gradePresent += 1;
        const duplicateRefs = identityRefs.get(student.fingerprint) ?? [];
        duplicateRefs.push(student.sourceRef);
        identityRefs.set(student.fingerprint, duplicateRefs);

        let dropoutReported = false;
        for (const status of student.statuses) {
          const classification = classifyStatus(status.value);
          if (classification.kind === "ignored") {
            statusTotals.ignored += 1;
            continue;
          }
          if (!isDateOnOrBefore(status.date, completedThrough)) {
            statusTotals.withheld += 1;
            continue;
          }
          if (classification.kind === "review") {
            if (classification.code === "dropout_requires_owner_decision" && dropoutReported) continue;
            if (classification.code === "dropout_requires_owner_decision") dropoutReported = true;
            statusTotals.review += 1;
            issues.push({ severity: "blocking", code: classification.code, sourceRef: student.sourceRef, date: status.date });
            continue;
          }
          statusTotals[classification.target] += 1;
          const eventKey = `${park.parkName}|${group.name}|${status.date}`;
          const event = events.get(eventKey) ?? { park: park.parkName, group: group.name, date: status.date, records: { present: 0, absent: 0, late: 0, excused: 0 } };
          event.records[classification.target] += 1;
          events.set(eventKey, event);
        }
      }
    }
  }

  for (const [fingerprint, refs] of identityRefs) {
    if (refs.length > 1) issues.push({ severity: "blocking", code: "duplicate_student_candidate", fingerprint, sourceRefs: refs });
  }
  if (roster.agePresent || roster.gradePresent) {
    issues.push({ severity: "blocking", code: "profile_schema_deployment_required", ageRows: roster.agePresent, gradeRows: roster.gradePresent, message: "Age and grade/class mapping is approved, but the required schema deployment must complete before staging import." });
  }

  const blockingIssues = issues.filter((issue) => issue.severity === "blocking").length;
  return {
    version: 1,
    mode: "dry-run-only",
    generatedAt,
    target: { city: { name: "Lahore", code: "LHR" }, batchName: "Shabab Batch 4", writesPerformed: false },
    attendanceEligibility: { completedThrough: completedThrough ?? null, proposedEvents: events.size, proposedRecords: statusTotals.present + statusTotals.absent + statusTotals.late + statusTotals.excused },
    source: { parks: parks.map((park) => ({ sheet: park.sheetName, park: park.parkName, groups: park.groups.map((group) => ({ name: group.name, sourceRef: group.sourceRef, students: group.students.length })), unnumberedCandidates: (park.unnumberedCandidates ?? []).length })), scheduledSessionDatesPerPark: parks[0]?.sessionDates.filter(Boolean).length ?? 0 },
    roster,
    attendance: { statusTotals, events: [...events.values()] },
    issues,
    reconciliation: { passed: blockingIssues === 0, blockingIssues, checks: { rosterCountMatchesParsedRows: roster.students === parks.flatMap((park) => park.groups).reduce((total, group) => total + group.students.length, 0), recordsMatchStatusTotals: statusTotals.present + statusTotals.absent + statusTotals.late + statusTotals.excused === [...events.values()].reduce((total, event) => total + Object.values(event.records).reduce((sum, count) => sum + count, 0), 0) } },
  };
}

function renderMarkdown(report) {
  const totals = report.attendance.statusTotals;
  return [
    "# Lahore Batch 4 Dry-Run Reconciliation",
    "",
    `- Mode: ${report.mode}`,
    `- Writes performed: ${report.target.writesPerformed}`,
    `- Parsed students: ${report.roster.students}`,
    `- Proposed attendance events: ${report.attendanceEligibility.proposedEvents}`,
    `- Proposed attendance records: ${report.attendanceEligibility.proposedRecords}`,
    `- Blocking issues: ${report.reconciliation.blockingIssues}`,
    "",
    "## Attendance Totals",
    "",
    `| Present | Absent | Late | Excused | Ignored | Review | Withheld |`,
    `| ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    `| ${totals.present} | ${totals.absent} | ${totals.late} | ${totals.excused} | ${totals.ignored} | ${totals.review} | ${totals.withheld} |`,
    "",
    "This report is redacted: it contains no student names, phone numbers, credentials, or database writes.",
  ].join("\n");
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    values[argument.slice(2)] = value;
    index += 1;
  }
  if (!values.input || !values.output) throw new Error("Usage: node scripts/lahore-batch-4-dry-run.cjs --input <workbook.xlsx> --output <ignored-directory> [--completed-through YYYY-MM-DD]");
  return values;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(options.input));
  const parks = PARK_SHEETS.map(([sheetName, parkName]) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Required sheet is missing: ${sheetName}`);
    return readParkSheet(sheet, sheetName, parkName, 2026);
  });
  const report = buildDryRunReport({ parks, completedThrough: options["completed-through"] });
  const output = path.resolve(options.output);
  await fs.mkdir(output, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(output, "lahore-batch-4-dry-run.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(output, "lahore-batch-4-dry-run.md"), `${renderMarkdown(report)}\n`, "utf8"),
  ]);
  console.log(JSON.stringify({ mode: report.mode, writesPerformed: false, students: report.roster.students, proposedEvents: report.attendanceEligibility.proposedEvents, proposedRecords: report.attendanceEligibility.proposedRecords, blockingIssues: report.reconciliation.blockingIssues }, null, 2));
}

module.exports = { PARK_SHEETS, STATUS_MAP, buildDryRunReport, classifyStatus, isGroupSummaryLabel, isSourceDataRow, parseSessionDates, readParkSheet, renderMarkdown, text };

if (require.main === module) {
  main().catch((error) => {
    console.error(`Lahore dry-run aborted: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  });
}
