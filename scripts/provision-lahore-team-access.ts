/** Local-only Team Access provisioning. Dry run is default. PostgreSQL is deliberately unsupported. */
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) { try { return nextResolve(`${specifier}.ts`, context); } catch { /* report original below */ } } return nextResolve(specifier, context); } });
const tool = await import("../src/lib/attendance/team-access/provision");
function option(name: string): string | undefined { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
const decrypt = option("--decrypt-handoff");
const preflight = process.argv.includes("--preflight");
if (decrypt) {
  if (!process.argv.includes("--confirm-decrypt-team-access-handoff") || process.argv.length !== 5) throw new Error("Refusing decryption without exactly --decrypt-handoff <file> --confirm-decrypt-team-access-handoff");
  const program = "Add-Type -AssemblyName System.Security -ErrorAction Stop;$e=[Convert]::FromBase64String((Get-Content -LiteralPath $env:TEAM_ACCESS_HANDOFF_PATH -Raw).Trim());$b=[Security.Cryptography.ProtectedData]::Unprotect($e,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Text.Encoding]::UTF8.GetString($b)";
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", program], { encoding: "utf8", env: { ...process.env, TEAM_ACCESS_HANDOFF_PATH: decrypt } });
  if (result.status !== 0 || !result.stdout.trim()) {
    const detail = result.stderr.trim().replace(/\s+/g, " ").slice(0, 400);
    throw new Error(`DPAPI handoff cannot be decrypted by this Windows user${detail ? `: ${detail}` : ""}`);
  }
  process.stdout.write(result.stdout); // Explicit owner command only; normal commands never print credentials.
} else {
  const recoverPasswords = process.argv.includes("--reissue-team-access-passwords"); const execute = process.argv.includes("--execute"); const acknowledged = process.argv.includes("--confirm-team-access-provision"); const workbook = option("--input"); const sqlitePath = option("--sqlite-path");
  if (!workbook) throw new Error("Usage: --input <Shabab360_Team_Access.xlsx> [--preflight --sqlite-path <file>] [--execute --confirm-team-access-provision --target sqlite --sqlite-path <file> --backup-dir <dir> --handoff <file>]");
  if (recoverPasswords) {
    const backupDir = option("--backup-dir"); const handoff = option("--handoff");
    if (!execute || !process.argv.includes("--confirm-reissue-team-access-passwords") || option("--target") !== "sqlite" || !sqlitePath || !backupDir || !handoff) throw new Error("Password recovery requires --execute --confirm-reissue-team-access-passwords --target sqlite --sqlite-path <file> --backup-dir <dir> --handoff <file>");
    tool.readTeamAccessWorkbook(workbook).then((rows) => tool.reissueSqliteTeamAccessPasswords({ dbPath: sqlitePath, rows, backupDir, handoffPath: handoff })).then((result) => console.log(JSON.stringify({ mode: "password-recovery", writesPerformed: true, ...result }, null, 2))).catch((error: unknown) => { console.error(`Team access password recovery aborted: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
  } else if (preflight) {
    if (execute || !sqlitePath || process.argv.includes("--target")) throw new Error("Read-only preflight requires only --input, --preflight and --sqlite-path");
    tool.readTeamAccessWorkbook(workbook).then((rows) => console.log(JSON.stringify({ mode: "preflight", writesPerformed: false, diagnostics: tool.preflightSqliteTeamAccess(sqlitePath, rows) }, null, 2))).catch((error: unknown) => { console.error(`Team access provisioning aborted: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
  } else {
    const target = option("--target"); if (execute && target !== "sqlite") throw new Error("Refusing execution without --target sqlite"); if (!execute && (target || sqlitePath || option("--backup-dir") || option("--handoff"))) throw new Error("Dry run accepts no database or handoff target");
    tool.runTeamAccessProvision({ workbook, execute, acknowledged, dbPath: sqlitePath, backupDir: option("--backup-dir"), handoffPath: option("--handoff") }).then((summary) => console.log(JSON.stringify(summary, null, 2))).catch((error: unknown) => { console.error(`Team access provisioning aborted: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
  }
}
