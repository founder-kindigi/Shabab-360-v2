import { describe, expect, it } from "vitest";

const importer = await import("../../scripts/import-lahore-batch-4-staging.cjs");

describe("Lahore Batch 4 staging importer", () => {
  it("defaults to dry-run and requires an explicit staging confirmation to write", () => {
    expect(importer.parseArgs(["--input", "batch.xlsx", "--completed-through", "2026-07-19"])).toMatchObject({ execute: false });
    expect(() => importer.parseArgs(["--input", "batch.xlsx", "--completed-through", "2026-07-19", "--confirm-staging-lahore-import"])).toThrow("can only be used with --execute");
  });

  it("uses stable non-deliverable placeholder emails", () => {
    expect(importer.placeholderEmail("Gulberg!9")).toMatch(/^staff-import\+[a-f0-9]{20}@example\.invalid$/);
  });

  it("uses the earliest workbook dropout date and excludes records on or after it", () => {
    const manifest = importer.toImportManifest([{ parkName: "Gulberg", staff: [], groups: [{ name: "Group 1", students: [{ sourceRef: "Gulberg!6", name: "Student", phone: null, age: 15, grade: "10", statuses: [{ date: "2026-05-23", value: "Present" }, { date: "2026-05-30", value: "Dropout" }, { date: "2026-06-06", value: "Absent" }] }] }], unnumberedCandidates: [] }], "2026-07-19");
    expect(manifest.participants[0]).toMatchObject({ state: "dropout", dropoutDate: "2026-05-30" });
    expect(manifest.events).toHaveLength(1);
    expect(manifest.events[0].records).toHaveLength(1);
  });
});
