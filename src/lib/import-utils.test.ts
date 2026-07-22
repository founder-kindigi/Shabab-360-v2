import { describe, expect, it } from "vitest";
import { validateImportFile, sanitizeImportError, IMPORT_MAX_SIZE } from "./import-utils";

describe("validateImportFile", () => {
  it("rejects null file", () => {
    const result = validateImportFile(null);
    expect(result!.status).toBe(400);
  });

  it("rejects oversized file", () => {
    const blob = new Blob(["x".repeat(IMPORT_MAX_SIZE + 1)]);
    const file = new File([blob], "test.csv", { type: "text/csv" });
    const result = validateImportFile(file);
    expect(result!.status).toBe(413);
  });

  it("rejects non-CSV extension", () => {
    const file = new File(["a,b\n1,2"], "data.txt", { type: "text/csv" });
    const result = validateImportFile(file);
    expect(result!.status).toBe(400);
  });

  it("accepts valid CSV under size limit", () => {
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    const result = validateImportFile(file);
    expect(result).toBeNull();
  });

  it("accepts CSV with uppercase extension", () => {
    const file = new File(["a,b\n1,2"], "DATA.CSV", { type: "text/csv" });
    const result = validateImportFile(file);
    expect(result).toBeNull();
  });

  it("accepts file exactly at size limit", () => {
    const blob = new Blob(["x".repeat(IMPORT_MAX_SIZE)]);
    const file = new File([blob], "exact.csv", { type: "text/csv" });
    const result = validateImportFile(file);
    expect(result).toBeNull();
  });
});

describe("sanitizeImportError", () => {
  it("returns a generic message for any error", () => {
    expect(sanitizeImportError(new Error("Prisma connection failed"))).toBe("Import processing failed");
    expect(sanitizeImportError("string error")).toBe("Import processing failed");
    expect(sanitizeImportError(null)).toBe("Import processing failed");
    expect(sanitizeImportError(undefined)).toBe("Import processing failed");
  });
});
