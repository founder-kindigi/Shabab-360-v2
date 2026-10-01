import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
export function receiptIdentity(operation: string, actorId: string, key: string, payload: unknown) {
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");
  return { id: hash(JSON.stringify([operation, actorId, key])), requestHash: hash(JSON.stringify(payload)) };
}
export async function readOperationReceipt(tx: Prisma.TransactionClient, identity: { id: string; requestHash: string }) {
  const rows = await tx.$queryRaw<Array<{ requestHash: string; resultJson: string }>>`SELECT "requestHash", "resultJson" FROM "operation_receipts" WHERE "id" = ${identity.id}`;
  if (!rows[0]) return null;
  if (rows[0].requestHash !== identity.requestHash) throw new Error("IDEMPOTENCY_CONFLICT");
  return JSON.parse(rows[0].resultJson);
}
export async function writeOperationReceipt(tx: Prisma.TransactionClient, identity: { id: string; requestHash: string }, result: unknown) {
  const json = JSON.stringify(result);
  await tx.$executeRaw`INSERT INTO "operation_receipts" ("id", "requestHash", "resultJson") VALUES (${identity.id}, ${identity.requestHash}, ${json})`;
}
