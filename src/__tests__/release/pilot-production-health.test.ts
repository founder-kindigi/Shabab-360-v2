import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../..");

const PG_SCHEMA = join(ROOT, "prisma/postgres/schema.prisma");
const SQLITE_SCHEMA = join(ROOT, "prisma/schema.prisma");
const PKG = join(ROOT, "package.json");
const NEXT_CONFIG = join(ROOT, "next.config.ts");

const PG_MIGRATIONS = join(ROOT, "prisma/postgres/migrations");
const SQLITE_MIGRATIONS = join(ROOT, "prisma/migrations");

const ENV_EXAMPLE = join(ROOT, ".env.example");
const GITIGNORE = join(ROOT, ".gitignore");

/* ── Helpers ────────────────────────────────────────────────────────── */

function modelNames(schemaPath: string): string[] {
  const content = readFileSync(schemaPath, "utf-8");
  const matches = content.match(/^model\s+(\w+)/gm);
  return matches ? matches.map((m) => m.replace("model ", "")) : [];
}

function allMigrations(base: string): string[] {
  return readdirSync(base).filter((d) => d.startsWith("2026")).sort();
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe("PILOT-PROD-001: Pilot Production Health", () => {
  /* ── 1. Schema health ────────────────────────────────────────────── */
  describe("Schema health", () => {
    it("SQLITE schema has 63 models", () => {
      expect(modelNames(SQLITE_SCHEMA).length).toBe(63);
    });

    it("POSTGRES schema has 63 models", () => {
      expect(modelNames(PG_SCHEMA).length).toBe(63);
    });

    it("all models present in both schemas", () => {
      const sqlite = new Set(modelNames(SQLITE_SCHEMA));
      const pg = modelNames(PG_SCHEMA);
      for (const m of pg) expect(sqlite.has(m)).toBe(true);
    });

    it("POSTGRES datasource declares postgresql provider", () => {
      const content = readFileSync(PG_SCHEMA, "utf-8");
      expect(content).toMatch(/provider\s*=\s*"postgresql"/);
    });

    it("POSTGRES datasource declares directUrl env var", () => {
      const content = readFileSync(PG_SCHEMA, "utf-8");
      expect(content).toContain("DIRECT_URL");
    });

    it("SQLITE datasource declares sqlite provider", () => {
      const content = readFileSync(SQLITE_SCHEMA, "utf-8");
      expect(content).toContain('provider = "sqlite"');
    });
  });

  /* ── 2. Migration health ─────────────────────────────────────────── */
  describe("Migration health", () => {
    it("POSTGRES has 12 migration folders", () => {
      expect(allMigrations(PG_MIGRATIONS)).toHaveLength(12);
    });

    it("SQLITE has 4 migration folders", () => {
      expect(allMigrations(SQLITE_MIGRATIONS)).toHaveLength(4);
    });

    it("both chains contain mashwara and login_attempts migrations", () => {
      const pg = allMigrations(PG_MIGRATIONS).join(",");
      const sqlite = allMigrations(SQLITE_MIGRATIONS).join(",");
      expect(pg).toContain("add_mashwara_module");
      expect(sqlite).toContain("add_mashwara_module");
      expect(pg).toContain("add_login_attempts");
      expect(sqlite).toContain("add_login_attempts");
    });

    it("no POSTGRES migration drops tables", () => {
      for (const dir of allMigrations(PG_MIGRATIONS)) {
        const sql = readFileSync(join(PG_MIGRATIONS, dir, "migration.sql"), "utf-8");
        expect(sql).not.toMatch(/^\s*DROP\s+(TABLE|COLUMN|INDEX|TYPE|VIEW)\b/im);
      }
    });

    it("no SQLITE migration drops tables", () => {
      for (const dir of allMigrations(SQLITE_MIGRATIONS)) {
        const sql = readFileSync(join(SQLITE_MIGRATIONS, dir, "migration.sql"), "utf-8");
        expect(sql).not.toMatch(/^\s*DROP\s+(TABLE|INDEX)\b/im);
      }
    });
  });

  /* ── 3. Security header production hardening ──────────────────────── */
  describe("Security header production hardening", () => {
    const config = readFileSync(NEXT_CONFIG, "utf-8");

    it("has Strict-Transport-Security with 2-year max-age + preload", () => {
      expect(config).toContain("max-age=63072000");
      expect(config).toContain("includeSubDomains");
      expect(config).toContain("preload");
    });

    it("has X-Frame-Options: DENY", () => {
      expect(config).toContain("X-Frame-Options");
      expect(config).toContain("DENY");
    });

    it("has X-Content-Type-Options: nosniff", () => {
      expect(config).toContain("X-Content-Type-Options");
      expect(config).toContain("nosniff");
    });

    it("has Referrer-Policy: strict-origin-when-cross-origin", () => {
      expect(config).toContain("Referrer-Policy");
      expect(config).toContain("strict-origin-when-cross-origin");
    });

    it("has CSP with frame-ancestors 'none'", () => {
      expect(config).toContain("frame-ancestors 'none'");
    });

    it("has CSP upgrade-insecure-requests for production", () => {
      expect(config).toContain("upgrade-insecure-requests");
    });

    it("has Permissions-Policy disabling sensors", () => {
      expect(config).toContain("Permissions-Policy");
      expect(config).toContain("camera=()");
      expect(config).toContain("microphone=()");
      expect(config).toContain("geolocation=()");
    });
  });

  /* ── 4. Package scripts health ────────────────────────────────────── */
  describe("Package scripts health", () => {
    const pkg = JSON.parse(readFileSync(PKG, "utf-8"));

    it("has build:postgres script", () => {
      expect(pkg.scripts["build:postgres"]).toBeDefined();
    });

    it("has db:postgres:deploy script", () => {
      expect(pkg.scripts["db:postgres:deploy"]).toContain("prisma migrate deploy");
    });

    it("has db:postgres:generate script", () => {
      expect(pkg.scripts["db:postgres:generate"]).toContain("prisma generate --schema");
    });

    it("has prestart script validating NEXTAUTH_SECRET", () => {
      expect(pkg.scripts.prestart).toContain("NEXTAUTH_SECRET");
    });

    it("has bootstrap:super-admin script", () => {
      expect(pkg.scripts["bootstrap:super-admin"]).toBeDefined();
    });

    it("has typecheck script", () => expect(pkg.scripts.typecheck).toBeDefined());
    it("has lint script", () => expect(pkg.scripts.lint).toBeDefined());
    it("has test script", () => expect(pkg.scripts.test).toBeDefined());
  });

  /* ── 5. Auth readiness ───────────────────────────────────────────── */
  describe("Auth readiness", () => {
    it("src/lib/auth.ts exists", () => {
      expect(existsSync(join(ROOT, "src/lib/auth.ts"))).toBe(true);
    });

    it("auth.ts uses NEXTAUTH_SECRET env var", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("NEXTAUTH_SECRET");
    });

    it("auth.ts has JWT session strategy", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("jwt");
    });

    it("auth.ts has CredentialsProvider", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("CredentialsProvider");
    });

    it("auth.ts has rate limiting", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toMatch(/max.*5|rate.*limit|attempts/i);
    });

    it("auth.ts has token version invalidation", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toContain("tokenVersion");
    });

    it("auth.ts has role resolution (StaffMeta, Guardian, Participant)", () => {
      const auth = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");
      expect(auth).toMatch(/staffMeta|StaffMeta/);
    });
  });

  /* ── 6. Audit log integrity ───────────────────────────────────────── */
  describe("Audit log integrity", () => {
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

    it("audit.ts has truncation for long values", () => {
      const audit = readFileSync(join(ROOT, "src/lib/audit.ts"), "utf-8");
      expect(audit).toContain("TRUNCATED");
    });

    it("audit.ts redacts passwords, tokens, secrets", () => {
      const audit = readFileSync(join(ROOT, "src/lib/audit.ts"), "utf-8");
      expect(audit).toMatch(/password|token|secret/i);
    });
  });

  /* ── 7. Environment config ───────────────────────────────────────── */
  describe("Environment config", () => {
    it(".env.example exists", () => {
      expect(existsSync(ENV_EXAMPLE)).toBe(true);
    });

    it(".env.example declares DATABASE_URL", () => {
      const env = readFileSync(ENV_EXAMPLE, "utf-8");
      expect(env).toContain("DATABASE_URL");
    });

    it(".env.example declares NEXTAUTH_URL", () => {
      const env = readFileSync(ENV_EXAMPLE, "utf-8");
      expect(env).toContain("NEXTAUTH_URL");
    });

    it(".env.example declares NEXTAUTH_SECRET", () => {
      const env = readFileSync(ENV_EXAMPLE, "utf-8");
      expect(env).toContain("NEXTAUTH_SECRET");
    });
  });

  /* ── 8. Gitignore security exclusions ──────────────────────────────── */
  describe("Gitignore security exclusions", () => {
    const gi = readFileSync(GITIGNORE, "utf-8");

    it("excludes .env files", () => expect(gi).toContain(".env"));
    it("excludes .next build output", () => expect(gi).toContain(".next"));
    it("excludes node_modules", () => expect(gi).toContain("node_modules"));
    it("excludes database files", () => expect(gi).toContain("*.db"));
    it("excludes .pem private keys", () => expect(gi).toContain("*.pem"));
    it("excludes .vercel directory", () => expect(gi).toContain(".vercel"));
    it("excludes log files", () => expect(gi).toContain("*.log"));
  });

  /* ── 9. Production build configuration ────────────────────────────── */
  describe("Production build configuration", () => {
    it("vercel.json exists", () => {
      expect(existsSync(join(ROOT, "vercel.json"))).toBe(true);
    });

    it("vercel.json uses build:postgres as build command", () => {
      const vc = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf-8"));
      expect(vc.buildCommand).toContain("build:postgres");
    });

    it("Caddyfile exists for reverse proxy", () => {
      expect(existsSync(join(ROOT, "Caddyfile"))).toBe(true);
    });
  });
});
