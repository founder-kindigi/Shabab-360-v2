import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../");
const SQLITE_SCHEMA = join(ROOT, "prisma/schema.prisma");
const POSTGRES_SCHEMA = join(ROOT, "prisma/postgres/schema.prisma");
const SQLITE_MIGRATIONS = join(ROOT, "prisma/migrations");
const POSTGRES_MIGRATIONS = join(ROOT, "prisma/postgres/migrations");

describe("ATT-001 Attendance Data Foundation Schema & Migration Parity", () => {
  it("SQLite and PostgreSQL schemas exist and define required Attendance models", () => {
    expect(existsSync(SQLITE_SCHEMA)).toBe(true);
    expect(existsSync(POSTGRES_SCHEMA)).toBe(true);

    const sqliteContent = readFileSync(SQLITE_SCHEMA, "utf-8");
    const postgresContent = readFileSync(POSTGRES_SCHEMA, "utf-8");

    // Participant nullable groupId & dropout fields
    for (const content of [sqliteContent, postgresContent]) {
      expect(content).toContain("groupId       String?");
      expect(content).toContain("dropoutAt     DateTime?");
      expect(content).toContain("dropoutReason String?");
      expect(content).toContain("dropoutSource String?");

      // BatchSettings automatic dropout & off-days
      expect(content).toContain("automaticDropoutEnabled Boolean  @default(false)");
      expect(content).toContain("dropoutConsecutiveWeeks Int      @default(3)");
      expect(content).toContain("model BatchOffWeekday");
      expect(content).toContain("model BatchOffDate");

      // StaffAttendanceRecord & AttendanceRosterSnapshot
      expect(content).toContain("model StaffAttendanceRecord");
      expect(content).toContain("model AttendanceRosterSnapshot");
      expect(content).toContain("@@unique([eventId, staffId])");
      expect(content).toContain("@@unique([eventId, participantId])");
    }
  });

  it("SQLite and PostgreSQL migration directories contain matching 20260730060714_add_attendance_foundation folder", () => {
    const sqliteMigrationDir = join(SQLITE_MIGRATIONS, "20260730060714_add_attendance_foundation");
    const postgresMigrationDir = join(POSTGRES_MIGRATIONS, "20260730060714_add_attendance_foundation");

    expect(existsSync(sqliteMigrationDir)).toBe(true);
    expect(existsSync(postgresMigrationDir)).toBe(true);

    const sqliteSql = readFileSync(join(sqliteMigrationDir, "migration.sql"), "utf-8");
    const postgresSql = readFileSync(join(postgresMigrationDir, "migration.sql"), "utf-8");

    expect(sqliteSql).toContain("staff_attendance_records");
    expect(sqliteSql).toContain("attendance_roster_snapshots");
    expect(sqliteSql).toContain("batch_off_weekdays");
    expect(sqliteSql).toContain("batch_off_dates");

    expect(postgresSql).toContain("staff_attendance_records");
    expect(postgresSql).toContain("attendance_roster_snapshots");
    expect(postgresSql).toContain("batch_off_weekdays");
    expect(postgresSql).toContain("batch_off_dates");
  });

  it("Migrations in both chains are forward-only without DROP TABLE statements for core tables", () => {
    const sqliteSql = readFileSync(
      join(SQLITE_MIGRATIONS, "20260730060714_add_attendance_foundation/migration.sql"),
      "utf-8"
    );
    const postgresSql = readFileSync(
      join(POSTGRES_MIGRATIONS, "20260730060714_add_attendance_foundation/migration.sql"),
      "utf-8"
    );

    // PostgreSQL should be additive and not drop tables
    expect(postgresSql.toUpperCase()).not.toContain("DROP TABLE");

    // SQLite redefines participants safely via new_participants
    expect(sqliteSql).toContain("CREATE TABLE \"new_participants\"");
    expect(sqliteSql).toContain("INSERT INTO \"new_participants\"");
  });
});
