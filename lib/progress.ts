import type { BillShare } from "./types";

/** How many non-payer shares of a bill are confirmed. The payer's own share doesn't count. */
export function billProgress(shares: BillShare[], payerId: string) {
  const owing = shares.filter((s) => s.profile_id !== payerId);
  return { paid: owing.filter((s) => s.status === "confirmed").length, total: owing.length };
}
