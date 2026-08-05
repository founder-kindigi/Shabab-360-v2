import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

/* ── Helpers ────────────────────────────────────────────────────────── */
const ROOT = join(__dirname, "../../..");
const PG_SCHEMA = join(ROOT, "prisma/postgres/schema.prisma");
const SQLITE_SCHEMA = join(ROOT, "prisma/schema.prisma");
const PKG = join(ROOT, "package.json");

function modelNames(schemaPath: string): string[] {
  const content = readFileSync(schemaPath, "utf-8");
  const matches = content.match(/^model\s+(\w+)/gm);
  return matches ? matches.map((m) => m.replace("model ", "")) : [];
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe("STAGING-DEPLOY-001: Staging Smoke Tests", () => {
  /* ── 1. Build environment ─────────────────────────────────────────── */
  describe("Build environment", () => {
    it("package.json has build:postgres script", () => {
      const pkg = JSON.parse(readFileSync(PKG, "utf-8"));
      expect(pkg.scripts["build:postgres"]).toBeDefined();
      expect(pkg.scripts["build:postgres"]).toContain("next build");
    });

    it("package.json has db:postgres:deploy script", () => {
      const pkg = JSON.parse(readFileSync(PKG, "utf-8"));
      expect(pkg.scripts["db:postgres:deploy"]).toContain("prisma migrate deploy");
    });

    it("package.json has db:postgres:generate script", () => {
      const pkg = JSON.parse(readFileSync(PKG, "utf-8"));
      expect(pkg.scripts["db:postgres:generate"]).toContain("prisma generate --schema prisma/postgres");
    });

    it("package.json has prestart script validating NEXTAUTH_SECRET", () => {
      const pkg = JSON.parse(readFileSync(PKG, "utf-8"));
      expect(pkg.scripts.prestart).toContain("NEXTAUTH_SECRET");
    });

    it("package.json has bootstrap:super-admin script", () => {
      const pkg = JSON.parse(readFileSync(PKG, "utf-8"));
      expect(pkg.scripts["bootstrap:super-admin"]).toBeDefined();
    });

    it("POSTGRES schema has directUrl datasource field", () => {
      const content = readFileSync(PG_SCHEMA, "utf-8");
      expect(content).toContain("directUrl");
    });

    it("POSTGRES schema datasource provider is postgresql", () => {
      const content = readFileSync(PG_SCHEMA, "utf-8");
      expect(content).toMatch(/provider\s*=\s*"postgresql"/);
    });

    it("SQLITE schema datasource provider is sqlite", () => {
      const content = readFileSync(SQLITE_SCHEMA, "utf-8");
      expect(content).toContain('provider = "sqlite"');
    });
  });

  /* ── 2. Database connectivity readiness ────────────────────────────── */
  describe("Database connectivity readiness", () => {
    it("SQLITE migration lock file exists with sqlite provider", () => {
      const lock = join(ROOT, "prisma/migrations/migration_lock.toml");
      expect(existsSync(lock)).toBe(true);
      const content = readFileSync(lock, "utf-8");
      expect(content).toContain('provider = "sqlite"');
    });

    it("POSTGRES migration lock file exists with postgresql provider", () => {
      const lock = join(ROOT, "prisma/postgres/migrations/migration_lock.toml");
      expect(existsSync(lock)).toBe(true);
      const content = readFileSync(lock, "utf-8");
      expect(content).toContain('provider = "postgresql"');
    });

    it("POSTGRES migrations directory has 12 migration folders", () => {
      const dir = join(ROOT, "prisma/postgres/migrations");
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      expect(dirs.length).toBe(12);
    });

    it("every POSTGRES migration has a non-empty migration.sql file", () => {
      const dir = join(ROOT, "prisma/postgres/migrations");
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      for (const d of dirs) {
        const sqlPath = join(dir, d, "migration.sql");
        expect(existsSync(sqlPath)).toBe(true);
        const content = readFileSync(sqlPath, "utf-8");
        expect(content.length).toBeGreaterThan(50);
      }
    });

    it("no POSTGRES migration contains destructive operations", () => {
      const dir = join(ROOT, "prisma/postgres/migrations");
      const dirs = readdirSync(dir).filter((d) => d.startsWith("2026"));
      for (const d of dirs) {
        const sqlPath = join(dir, d, "migration.sql");
        const content = readFileSync(sqlPath, "utf-8");
        expect(content).not.toMatch(/^\s*DROP\s+(TABLE|COLUMN|INDEX|TYPE|VIEW)\b/im);
      }
    });
  });

  /* ── 3. Schema alignment ──────────────────────────────────────────── */
  describe("Schema alignment", () => {
    it("SQLITE has 65 models", () => {
      expect(modelNames(SQLITE_SCHEMA).length).toBe(65);
    });

    it("POSTGRES has 65 models", () => {
      expect(modelNames(PG_SCHEMA).length).toBe(65);
    });

    it("all SQLITE models have matching POSTGRES models", () => {
      const sqlite = new Set(modelNames(SQLITE_SCHEMA));
      const pg = new Set(modelNames(PG_SCHEMA));
      for (const m of sqlite) expect(pg.has(m)).toBe(true);
    });

    it("all POSTGRES models have matching SQLITE models", () => {
      const sqlite = new Set(modelNames(SQLITE_SCHEMA));
      const pg = modelNames(PG_SCHEMA);
      for (const m of pg) expect(sqlite.has(m)).toBe(true);
    });

    it("core deploy-critical models present in POSTGRES schema", () => {
      const pg = new Set(modelNames(PG_SCHEMA));
      const critical = [
        "User", "City", "Park", "Batch", "Group", "StaffMeta",
        "Participant", "Guardian", "AttendanceEvent", "AttendanceRecord",
        "FeeEvent", "Payment", "AdmissionApplication",
      ];
      for (const m of critical) expect(pg.has(m)).toBe(true);
    });
  });

  /* ── 4. Security headers production config ──────────────────────────── */
  describe("Security header production config", () => {
    const nextConfig = readFileSync(join(ROOT, "next.config.ts"), "utf-8");

    it("has Strict-Transport-Security with 2-year max-age", () => {
      expect(nextConfig).toContain("Strict-Transport-Security");
      expect(nextConfig).toContain("max-age=63072000");
    });

    it("has X-Frame-Options: DENY", () => {
      expect(nextConfig).toContain("X-Frame-Options");
      expect(nextConfig).toContain("DENY");
    });

    it("has X-Content-Type-Options: nosniff", () => {
      expect(nextConfig).toContain("X-Content-Type-Options");
      expect(nextConfig).toContain("nosniff");
    });

    it("has Referrer-Policy: strict-origin-when-cross-origin", () => {
      expect(nextConfig).toContain("Referrer-Policy");
      expect(nextConfig).toContain("strict-origin-when-cross-origin");
    });

    it("has Content-Security-Policy with frame-ancestors 'none'", () => {
      expect(nextConfig).toContain("frame-ancestors 'none'");
    });

    it("has upgrade-insecure-requests in production CSP", () => {
      expect(nextConfig).toContain("upgrade-insecure-requests");
    });

    it("has Permissions-Policy restricting all sensors", () => {
      expect(nextConfig).toContain("Permissions-Policy");
    });
  });

  /* ── 5. Auth readiness ──────────────────────────────────────────────── */
  describe("Auth readiness", () => {
    it("src/lib/auth.ts exists", () => {
      expect(existsSync(join(ROOT, "src/lib/auth.ts"))).toBe(true);
    });

    it("auth.ts references NEXTAUTH_SECRET", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("NEXTAUTH_SECRET");
    });

    it("auth.ts has JWT strategy", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("jwt");
    });

    it("auth.ts has CredentialsProvider", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("CredentialsProvider");
    });
  });

  /* ── 6. Audit log readiness ─────────────────────────────────────────── */
  describe("Audit log readiness", () => {
    it("src/lib/audit.ts exists", () => {
      expect(existsSync(join(ROOT, "src/lib/audit.ts"))).toBe(true);
    });

    it("audit.ts has PII redaction", () => {
      const audit = readFileSync(join(ROOT, "src/lib/audit.ts"), "utf-8");
      expect(audit).toContain("REDACTED");
    });

    it("audit.ts has error isolation (try/catch)", () => {
      const audit = readFileSync(join(ROOT, "src/lib/audit.ts"), "utf-8");
      expect(audit).toContain("catch");
    });
  });

  /* ── 7. Git ignore exclusions ───────────────────────────────────────── */
  describe("Git ignore exclusions", () => {
    it(".gitignore excludes .env files", () => {
      const gi = readFileSync(join(ROOT, ".gitignore"), "utf-8");
      expect(gi).toContain(".env");
    });

    it(".gitignore excludes .next build output", () => {
      const gi = readFileSync(join(ROOT, ".gitignore"), "utf-8");
      expect(gi).toContain(".next");
    });

    it(".gitignore excludes node_modules", () => {
      const gi = readFileSync(join(ROOT, ".gitignore"), "utf-8");
      expect(gi).toContain("node_modules");
    });

    it(".gitignore excludes database files", () => {
      const gi = readFileSync(join(ROOT, ".gitignore"), "utf-8");
      expect(gi).toContain("*.db");
    });
  });
});
