const CENTS_PER_RUPEE = 100;
const PRECISION_TOLERANCE = 0.000001;

type DecimalLike = { toString(): string };
export type MoneyValue = number | DecimalLike;

/** Converts Prisma Decimal values and legacy SQLite floats to a safe JS number at API boundaries. */
export function moneyToNumber(value: MoneyValue | null | undefined): number {
  if (value === null || value === undefined) return 0;

  const amount = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(amount)) {
    throw new TypeError("Database money value must be finite");
  }

  return amount;
}

/** Converts a user-entered rupee amount to paisa without accepting fractions of a paisa. */
export function toCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;

  const cents = Math.round(amount * CENTS_PER_RUPEE);
  if (!Number.isSafeInteger(cents)) return null;
  if (Math.abs(amount * CENTS_PER_RUPEE - cents) > PRECISION_TOLERANCE) return null;

  return cents;
}

/** Normalizes legacy Float values before comparing financial balances. */
export function roundToCents(amount: number): number {
  return Math.round(amount * CENTS_PER_RUPEE);
}

export function fromCents(cents: number): number {
  return cents / CENTS_PER_RUPEE;
}
