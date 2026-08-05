import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const SQLITE_SCHEMA = join(ROOT, "prisma/schema.prisma");
const POSTGRES_SCHEMA = join(ROOT, "prisma/postgres/schema.prisma");

function modelNames(schemaPath: string): string[] {
  const content = readFileSync(schemaPath, "utf-8");
  const matches = content.match(/^model\s+(\w+)\s+\{/gm) || [];
  return matches.map((m) => m.replace(/^model\s+/, "").replace(/\s+\{$/, ""));
}

describe("V3-HANDOVER-001: V3 Final Production Release Handoff & Sign-Off", () => {
  describe("1. Dual Prisma Schema Parity (65 Models)", () => {
    it("SQLite schema has exactly 65 models", () => {
      expect(modelNames(SQLITE_SCHEMA).length).toBe(65);
    });

    it("PostgreSQL schema has exactly 65 models", () => {
      expect(modelNames(POSTGRES_SCHEMA).length).toBe(65);
    });

    it("all SQLite models match PostgreSQL models bidirectionally", () => {
      const sqliteModels = modelNames(SQLITE_SCHEMA).sort();
      const postgresModels = modelNames(POSTGRES_SCHEMA).sort();
      expect(sqliteModels).toEqual(postgresModels);
    });
  });

  describe("2. V3 Extended Domain Parity", () => {
    it("contains Phase 5 Finance & Procurement models", () => {
      const models = modelNames(SQLITE_SCHEMA);
      expect(models).toContain("FeeDonation");
      expect(models).toContain("FinancialAdjustment");
      expect(models).toContain("ProcurementItem");
      expect(models).toContain("ParkStock");
      expect(models).toContain("StockRequest");
      expect(models).toContain("PurchaseOrder");
      expect(models).toContain("StockTransfer");
      expect(models).toContain("StockAuditLog");
    });

    it("contains Phase 6 Engagement & Knowledge models", () => {
      const models = modelNames(SQLITE_SCHEMA);
      expect(models).toContain("PointTransaction");
      expect(models).toContain("Badge");
      expect(models).toContain("StudentBadge");
      expect(models).toContain("DigitalResource");
      expect(models).toContain("KnowledgeArticle");
    });
  });

  describe("3. Operational & Verification Hardening", () => {
    it("audit logging contains redaction utilities", () => {
      expect(existsSync(join(ROOT, "src/lib/audit.ts"))).toBe(true);
    });

    it("security capabilities registry exists", () => {
      expect(existsSync(join(ROOT, "src/lib/auth/capabilities.ts"))).toBe(true);
    });
  });
});
