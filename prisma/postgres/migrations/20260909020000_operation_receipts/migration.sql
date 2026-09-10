CREATE TABLE "operation_receipts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestHash" TEXT NOT NULL,
  "resultJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
