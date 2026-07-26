import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";

const PRISMA_CORE = join(__dirname, "../../../prisma/schema.prisma");
const PRISMA_PG = join(__dirname, "../../../prisma/postgres/schema.prisma");
const NEXT_CONFIG = join(__dirname, "../../../next.config.ts");
const CI_WORKFLOW = join(__dirname, "../../../.github/workflows/ci.yml");

/* ── Helpers ────────────────────────────────────────────────────────── */
function countModels(schemaPath: string): number {
  const content = readFileSync(schemaPath, "utf-8");
  const matches = content.match(/^model\s+\w+/gm);
  return matches ? matches.length : 0;
}

function listModelNames(schemaPath: string): string[] {
  const content = readFileSync(schemaPath, "utf-8");
  const matches = content.match(/^model\s+(\w+)/gm);
  return matches ? matches.map((m) => m.replace("model ", "")) : [];
}

function hasHeaderValue(content: string, headerKey: string, headerValue: string): boolean {
  const keyMatch = content.match(new RegExp(`key:\\s*["']${headerKey}["']`));
  if (!keyMatch) return false;
  const valueMatch = content.match(new RegExp(`value:\\s*["'][^"']*${escapeRegex(headerValue)}[^"']*["']`));
  return !!valueMatch;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe("RELEASE-001: Production Build Validation", () => {
  /* ── 1. Schema Alignment ──────────────────────────────────────────── */
  describe("Prisma schema alignment (SQLite ↔ PostgreSQL)", () => {
    it("both schemas exist and are readable", () => {
      expect(existsSync(PRISMA_CORE)).toBe(true);
      expect(existsSync(PRISMA_PG)).toBe(true);
    });

    it("SQLite schema has 48 models", () => {
      expect(countModels(PRISMA_CORE)).toBe(48);
    });

    it("PostgreSQL schema has 48 models", () => {
      expect(countModels(PRISMA_PG)).toBe(48);
    });

    it("every SQLite model has a matching PostgreSQL model", () => {
      const sqliteModels = new Set(listModelNames(PRISMA_CORE));
      const pgModels = new Set(listModelNames(PRISMA_PG));

      for (const model of sqliteModels) {
        expect(pgModels.has(model)).toBe(true);
      }
    });

    it("every PostgreSQL model has a matching SQLite model", () => {
      const sqliteModels = new Set(listModelNames(PRISMA_CORE));
      const pgModels = listModelNames(PRISMA_PG);

      for (const model of pgModels) {
        expect(sqliteModels.has(model)).toBe(true);
      }
    });

    it("core domain models are present in both schemas", () => {
      const expected = [
        "User", "City", "Park", "Batch", "Group", "StaffMeta",
        "Participant", "Guardian", "AttendanceEvent", "AttendanceRecord",
        "FeeEvent", "Payment", "AdmissionApplication",
        "MashwaraMeeting", "MashwaraAttendee", "MashwaraDecision",
        "MashwaraActionItem", "MashwaraMeetingShare",
        "CallingCampaign", "CallingTemplate", "CallingAssignment", "CallInteraction",
        "Event", "CollaborationTeam",
      ];
      const sqliteModels = new Set(listModelNames(PRISMA_CORE));
      const pgModels = new Set(listModelNames(PRISMA_PG));

      for (const model of expected) {
        expect(sqliteModels.has(model)).toBe(true);
        expect(pgModels.has(model)).toBe(true);
      }
    });
  });

  /* ── 2. Security Headers ──────────────────────────────────────────── */
  describe("Security headers (next.config.ts)", () => {
    const config = readFileSync(NEXT_CONFIG, "utf-8");

    it("has X-Content-Type-Options: nosniff", () => {
      expect(hasHeaderValue(config, "X-Content-Type-Options", "nosniff")).toBe(true);
    });

    it("has X-Frame-Options: DENY", () => {
      expect(hasHeaderValue(config, "X-Frame-Options", "DENY")).toBe(true);
    });

    it("has Referrer-Policy: strict-origin-when-cross-origin", () => {
      expect(hasHeaderValue(config, "Referrer-Policy", "strict-origin-when-cross-origin")).toBe(true);
    });

    it("has Permissions-Policy restricting sensors", () => {
      expect(hasHeaderValue(config, "Permissions-Policy", "camera=")).toBe(true);
      expect(hasHeaderValue(config, "Permissions-Policy", "microphone=")).toBe(true);
      expect(hasHeaderValue(config, "Permissions-Policy", "geolocation=")).toBe(true);
    });

    it("has Strict-Transport-Security for production with 2-year max-age", () => {
      expect(hasHeaderValue(config, "Strict-Transport-Security", "max-age=63072000")).toBe(true);
      expect(hasHeaderValue(config, "Strict-Transport-Security", "includeSubDomains")).toBe(true);
      expect(hasHeaderValue(config, "Strict-Transport-Security", "preload")).toBe(true);
    });

    it("has Content-Security-Policy header defined", () => {
      expect(config).toContain("Content-Security-Policy");
      expect(config).toContain("default-src 'self'");
    });

    it("has upgrade-insecure-requests in production CSP", () => {
      expect(config).toContain("upgrade-insecure-requests");
    });

    it("has frame-ancestors 'none' in CSP config", () => {
      expect(config).toContain("frame-ancestors 'none'");
    });
  });

  /* ── 3. Environment Variables ─────────────────────────────────────── */
  describe("Environment variable configuration", () => {
    it(".env.example exists", () => {
      const envPath = join(__dirname, "../../../.env.example");
      expect(existsSync(envPath)).toBe(true);
    });

    it(".env.example declares DATABASE_URL", () => {
      const env = readFileSync(join(__dirname, "../../../.env.example"), "utf-8");
      expect(env).toContain("DATABASE_URL");
    });

    it(".env.example declares NEXTAUTH_URL", () => {
      const env = readFileSync(join(__dirname, "../../../.env.example"), "utf-8");
      expect(env).toContain("NEXTAUTH_URL");
    });

    it(".env.example declares NEXTAUTH_SECRET", () => {
      const env = readFileSync(join(__dirname, "../../../.env.example"), "utf-8");
      expect(env).toContain("NEXTAUTH_SECRET");
    });

    it("package.json prestart validates NEXTAUTH_SECRET", () => {
      const pkg = JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf-8"));
      expect(pkg.scripts.prestart).toContain("NEXTAUTH_SECRET");
    });
  });

  /* ── 4. Migration File Integrity ──────────────────────────────────── */
  describe("Migration file integrity", () => {
    it("SQLite migration directory exists with expected migrations", () => {
      const dir = join(__dirname, "../../../prisma/migrations");
      expect(existsSync(dir)).toBe(true);
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      expect(dirs.length).toBeGreaterThanOrEqual(3);
    });

    it("PostgreSQL migration directory exists with expected migrations", () => {
      const dir = join(__dirname, "../../../prisma/postgres/migrations");
      expect(existsSync(dir)).toBe(true);
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      expect(dirs.length).toBeGreaterThanOrEqual(11);
    });

    it("every Postgres migration directory contains a migration.sql file", () => {
      const dir = join(__dirname, "../../../prisma/postgres/migrations");
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      for (const d of dirs) {
        const sqlPath = join(dir, d, "migration.sql");
        expect(existsSync(sqlPath)).toBe(true);
        const content = readFileSync(sqlPath, "utf-8");
        expect(content.length).toBeGreaterThan(10);
      }
    });

    it("all migrations are additive (no DROP TABLE or DROP COLUMN)", () => {
      const dir = join(__dirname, "../../../prisma/postgres/migrations");
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      for (const d of dirs) {
        const sqlPath = join(dir, d, "migration.sql");
        const content = readFileSync(sqlPath, "utf-8");
        expect(content).not.toMatch(/^\s*DROP\s+(TABLE|COLUMN|INDEX|TYPE)\b/im);
      }
    });
  });

  /* ── 5. Audit Log Integrity ───────────────────────────────────────── */
  describe("Audit log integrity", () => {
    it("src/lib/audit.ts exists", () => {
      expect(existsSync(join(__dirname, "../../../src/lib/audit.ts"))).toBe(true);
    });

    it("audit.ts has PII redaction patterns", () => {
      const audit = readFileSync(join(__dirname, "../../../src/lib/audit.ts"), "utf-8");
      expect(audit).toContain("password");
      expect(audit).toContain("REDACTED");
    });

    it("audit.ts has error isolation (try/catch)", () => {
      const audit = readFileSync(join(__dirname, "../../../src/lib/audit.ts"), "utf-8");
      expect(audit).toContain("catch");
    });
  });

  /* ── 6. Package Scripts ───────────────────────────────────────────── */
  describe("Package build scripts", () => {
    it("package.json has build:postgres script", () => {
      const pkg = JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf-8"));
      expect(pkg.scripts["build:postgres"]).toBeDefined();
      expect(pkg.scripts["build:postgres"]).toContain("db:postgres:generate");
    });

    it("package.json has db:postgres:deploy script", () => {
      const pkg = JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf-8"));
      expect(pkg.scripts["db:postgres:deploy"]).toContain("prisma migrate deploy");
    });

    it("package.json has typecheck, lint, and test scripts", () => {
      const pkg = JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf-8"));
      expect(pkg.scripts.typecheck).toBeDefined();
      expect(pkg.scripts.lint).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });
  });

  /* ── 7. CI Runtime Parity ─────────────────────────────────────────── */
  describe("CI runtime parity", () => {
    it("builds with the PostgreSQL client used for deployment", () => {
      const workflow = readFileSync(CI_WORKFLOW, "utf-8");

      expect(workflow).toContain("npm run build:postgres");
    });
  });

  /* ── 8. Git Ignore Exclusions ──────────────────────────────────────── */
  describe("Git ignore exclusions", () => {
    it(".gitignore excludes .env files (except .env.example)", () => {
      const gitignore = readFileSync(join(__dirname, "../../../.gitignore"), "utf-8");
      expect(gitignore).toContain(".env");
    });

    it(".gitignore excludes .next build output", () => {
      const gitignore = readFileSync(join(__dirname, "../../../.gitignore"), "utf-8");
      expect(gitignore).toContain(".next");
    });

    it(".gitignore excludes node_modules", () => {
      const gitignore = readFileSync(join(__dirname, "../../../.gitignore"), "utf-8");
      expect(gitignore).toContain("node_modules");
    });

    it(".gitignore excludes database files", () => {
      const gitignore = readFileSync(join(__dirname, "../../../.gitignore"), "utf-8");
      expect(gitignore).toContain("*.db");
    });
  });

  /* ── 8. CI Workflow — Prisma Schema Validation ───────────────────── */
  describe("CI workflow validates both Prisma schemas", () => {
    const ci = readFileSync(join(__dirname, "../../../.github/workflows/ci.yml"), "utf-8");

    it("validates SQLite schema before client generation", () => {
      expect(ci).toContain("prisma validate --schema=prisma/schema.prisma");
    });

    it("validates PostgreSQL schema before client generation", () => {
      expect(ci).toContain("prisma validate --schema=prisma/postgres/schema.prisma");
    });

    it("uses placeholder datasource URLs for CI-only validation (no secrets)", () => {
      expect(ci).toContain("DATABASE_URL: \"file:../tmp-ci-validate/ci.db\"");
      expect(ci).toContain("DATABASE_URL: \"postgresql://ci:ci@localhost:5432/ci_shabab?pgbouncer=true\"");
      expect(ci).toContain("DIRECT_URL: \"postgresql://ci:ci@localhost:5432/ci_shabab\"");
    });

    it("SQLite validation runs before PostgreSQL validation", () => {
      const sqliteIdx = ci.indexOf("prisma validate --schema=prisma/schema.prisma");
      const pgIdx = ci.indexOf("prisma validate --schema=prisma/postgres/schema.prisma");
      expect(sqliteIdx).toBeGreaterThan(0);
      expect(pgIdx).toBeGreaterThan(sqliteIdx);
    });

    it("both validations run before Prisma Client generation", () => {
      const validateEnd = ci.lastIndexOf("prisma validate");
      const generateIdx = ci.indexOf("db:generate");
      expect(generateIdx).toBeGreaterThan(validateEnd);
    });

    it("no migration, db push, deploy, seed, or reset command is used", () => {
      expect(ci).not.toContain("migrate dev");
      expect(ci).not.toContain("migrate deploy");
      expect(ci).not.toContain("migrate reset");
      expect(ci).not.toContain("db push");
      expect(ci).not.toContain("db seed");
    });
  });
});
