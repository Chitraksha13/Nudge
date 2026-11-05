import type { Bill, BillShare } from "./types";

/** Unconfirmed shares only. The payer's own share is never owed. */
export function balancesFor(me: string, bills: Bill[], shares: BillShare[]) {
  const payerOf = new Map(bills.map((b) => [b.id, b.paid_by]));
  let owedToMe = 0;
  let iOwe = 0;
  const perPerson: Record<string, number> = {}; // positive = they owe me
  for (const s of shares) {
    if (s.status === "confirmed") continue;
    const payer = payerOf.get(s.bill_id);
    if (!payer || payer === s.profile_id) continue;
    if (payer === me) {
      owedToMe += s.amount;
      perPerson[s.profile_id] = (perPerson[s.profile_id] ?? 0) + s.amount;
    } else if (s.profile_id === me) {
      iOwe += s.amount;
      perPerson[payer] = (perPerson[payer] ?? 0) - s.amount;
    }
  }
  return { owedToMe, iOwe, net: owedToMe - iOwe, perPerson };
}
