import { createHash } from "node:crypto";
import { db } from "@/lib/db";

// Shared across app instances. No raw address, phone or answer data enters the quota table.
// This is a coarse abuse ceiling; a trusted edge/IP quota can be added before a high-volume launch.
export async function consumeFormSubmissionQuota(formId: string): Promise<boolean> {
  const key = createHash("sha256").update(`form-submit:${formId}`).digest("hex");
  const now = BigInt(Date.now());
  const resetAt = now + BigInt(15 * 60 * 1000);
  const rows = await db.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "login_attempt_windows" ("key", "attempts", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "login_attempt_windows"."resetAt" <= ${now} THEN 1 ELSE "login_attempt_windows"."attempts" + 1 END,
      "resetAt" = CASE WHEN "login_attempt_windows"."resetAt" <= ${now} THEN ${resetAt} ELSE "login_attempt_windows"."resetAt" END
    RETURNING "attempts"`;
  return rows.length === 1 && rows[0].attempts <= 500;
}
