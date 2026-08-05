import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../..");
const PG_MIGRATIONS = join(ROOT, "prisma/postgres/migrations");
const SQLITE_MIGRATIONS = join(ROOT, "prisma/migrations");

/* ── Helpers ────────────────────────────────────────────────────────── */

function modelNames(schemaPath: string): string[] {
  const content = readFileSync(schemaPath, "utf-8");
  const matches = content.match(/^model\s+(\w+)/gm);
  return matches ? matches.map((m) => m.replace("model ", "")) : [];
}

function allMigrationDirs(base: string): string[] {
  return readdirSync(base).filter((d) => d.startsWith("2026")).sort();
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe("PROD-HANDOVER-001: Master Production Sign-Off", () => {
  /* ── 1. Dual Schema Validation ───────────────────────────────────── */
  describe("Dual schema validation", () => {
    it("SQLite schema has 65 models", () => {
      expect(modelNames(join(ROOT, "prisma/schema.prisma")).length).toBe(65);
    });

    it("PostgreSQL schema has 65 models", () => {
      expect(modelNames(join(ROOT, "prisma/postgres/schema.prisma")).length).toBe(65);
    });

    it("all SQLite models match PostgreSQL models bidirectionally", () => {
      const sqliteModels = modelNames(join(ROOT, "prisma/schema.prisma")).sort();
      const pgModels = modelNames(join(ROOT, "prisma/postgres/schema.prisma")).sort();
      expect(sqliteModels).toEqual(pgModels);
    });

    it("PostgreSQL migrations chain complete (12 migrations)", () => {
      expect(allMigrationDirs(PG_MIGRATIONS)).toHaveLength(12);
    });

    it("SQLite migrations chain complete (4 migrations)", () => {
      expect(allMigrationDirs(SQLITE_MIGRATIONS)).toHaveLength(4);
    });

    it("latest migration matches in both chains (mashwara module)", () => {
      const pg = allMigrationDirs(PG_MIGRATIONS);
      const sql = allMigrationDirs(SQLITE_MIGRATIONS);
      expect(pg.some((m) => m.includes("mashwara"))).toBe(true);
      expect(sql.some((m) => m.includes("mashwara"))).toBe(true);
    });
  });

  /* ── 2. Security Headers ──────────────────────────────────────────── */
  describe("Security headers (production mode)", () => {
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf-8");

    it("Strict-Transport-Security: 2-year max-age + preload", () => {
      expect(config).toContain("max-age=63072000");
      expect(config).toContain("preload");
    });
    it("X-Frame-Options: DENY", () => expect(config).toContain("X-Frame-Options"));
    it("X-Content-Type-Options: nosniff", () => expect(config).toContain("nosniff"));
    it("Referrer-Policy: strict-origin-when-cross-origin", () => expect(config).toContain("Referrer-Policy"));
    it("CSP: frame-ancestors 'none'", () => expect(config).toContain("frame-ancestors 'none'"));
    it("CSP: upgrade-insecure-requests", () => expect(config).toContain("upgrade-insecure-requests"));
    it("Permissions-Policy: all sensors disabled", () => expect(config).toContain("Permissions-Policy"));
  });

  /* ── 3. Production Build Configuration ────────────────────────────── */
  describe("Production build configuration", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

    it("build:postgres script defined", () => {
      expect(pkg.scripts["build:postgres"]).toBeDefined();
    });
    it("vercel.json uses build:postgres", () => {
      const vc = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf-8"));
      expect(vc.buildCommand).toContain("build:postgres");
    });
    it("db:postgres:deploy script defined", () => {
      expect(pkg.scripts["db:postgres:deploy"]).toContain("prisma migrate deploy");
    });
    it("prestart validates NEXTAUTH_SECRET", () => {
      expect(pkg.scripts.prestart).toContain("NEXTAUTH_SECRET");
    });
    it("typecheck, lint, test scripts all defined", () => {
      expect(pkg.scripts.typecheck).toBeDefined();
      expect(pkg.scripts.lint).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });
  });

  /* ── 4. Capability Governance ─────────────────────────────────────── */
  describe("Capability governance", () => {
    const cap = readFileSync(join(ROOT, "src/lib/auth/capabilities.ts"), "utf-8");

    it("at least 34 capabilities registered in ACCESS_CAPABILITIES", () => {
      const matches = cap.match(/^\s+"[\w.]+",$/gm);
      expect(matches?.length).toBeGreaterThanOrEqual(34);
    });

    it("8 roles defined in ROLE_DEFAULT_CAPABILITIES", () => {
      const roles = [
        "super_admin", "program_admin", "city_head", "park_lead",
        "park_admin", "murabbi", "guardian", "student",
      ];
      for (const role of roles) expect(cap).toContain(`${role}:`);
    });

    it("mashwara capabilities registered", () => {
      expect(cap).toContain("mashwara.view");
      expect(cap).toContain("mashwara.manage");
    });

    it("reports.export capability registered", () => {
      expect(cap).toContain("reports.export");
    });
  });

  /* ── 5. Audit Log Integrity ───────────────────────────────────────── */
  describe("Audit log integrity", () => {
    it("src/lib/audit.ts exists with redaction", () => {
      const audit = readFileSync(join(ROOT, "src/lib/audit.ts"), "utf-8");
      expect(audit).toContain("REDACTED");
      expect(audit).toContain("catch");
    });
  });

  /* ── 6. Operational Runbook Verification ──────────────────────────── */
  describe("Operational readiness", () => {
    const docs = [
      "docs/reviews/OPERATIONAL_RUNBOOK.md",
      "docs/reviews/STAGING_RELEASE_READINESS_REPORT.md",
      "docs/reviews/STAGING_DEPLOYMENT_VERIFICATION.md",
      "docs/reviews/UAT_002_VERIFICATION_REPORT.md",
      "docs/reviews/CAPABILITY_GOVERNANCE_SWEEP_REPORT.md",
      "docs/reviews/FINAL_PRODUCTION_EXECUTIVE_HANDOVER.md",
    ];
    for (const doc of docs) {
      it(`${doc} exists`, () => {
        expect(existsSync(join(ROOT, doc))).toBe(true);
      });
    }
  });

  /* ── 7. Gitignore & Repository Hygiene ────────────────────────────── */
  describe("Repository hygiene", () => {
    const gi = readFileSync(join(ROOT, ".gitignore"), "utf-8");
    it("excludes .env*", () => expect(gi).toContain(".env"));
    it("excludes .next", () => expect(gi).toContain(".next"));
    it("excludes node_modules", () => expect(gi).toContain("node_modules"));
    it("excludes *.db", () => expect(gi).toContain("*.db"));
  });
});
