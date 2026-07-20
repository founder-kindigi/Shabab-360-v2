import { moneyToNumber, type MoneyValue } from "@/lib/money";

export type FeeEventExpectedInput = {
  amount: MoneyValue;
  activeParticipantCount: number;
};

/** Calculates the total billed amount across fee events and their active participants. */
export function calculateTotalExpectedFees(events: FeeEventExpectedInput[]): number {
  return events.reduce(
    (total, event) => total + moneyToNumber(event.amount) * event.activeParticipantCount,
    0
  );
}
