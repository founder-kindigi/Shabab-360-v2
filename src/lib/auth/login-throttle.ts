import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/** Shared by all application instances using the same database; no raw email/IP stored. */
export async function consumeLoginAttempt(normalizedEmail: string): Promise<boolean> {
  const key = createHash("sha256").update(normalizedEmail).digest("hex");
  const now = BigInt(Date.now());
  const resetAt = now + BigInt(15 * 60 * 1000);
  const rows = await db.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "login_attempt_windows" ("key", "attempts", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "login_attempt_windows"."resetAt" <= ${now} THEN 1 ELSE "login_attempt_windows"."attempts" + 1 END,
      "resetAt" = CASE WHEN "login_attempt_windows"."resetAt" <= ${now} THEN ${resetAt} ELSE "login_attempt_windows"."resetAt" END
    RETURNING "attempts"`;
  return rows.length === 1 && rows[0].attempts <= 5;
}
