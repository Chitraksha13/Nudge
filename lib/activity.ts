import { fmt } from "./money";
import type { Bill, BillShare, Nudge } from "./types";

export type ActivityEvent = {
  id: string;
  kind: "bill" | "nudge" | "marked_paid" | "confirmed";
  text: string;
  at: number;
};

/** One time-sorted (newest first) event list built from existing bill, share and nudge data. */
export function buildActivity(
  bills: Bill[],
  shares: BillShare[],
  nudges: Nudge[],
  nameOf: (id: string) => string, // returns "You" for the signed-in user
  me: string,
): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const billOf = new Map(bills.map((b) => [b.id, b]));
  for (const b of bills) {
    out.push({
      id: `bill-${b.id}`,
      kind: "bill",
      text: `${nameOf(b.paid_by)} added ${b.name} · ${fmt(b.total_amount)}`,
      at: b.created_at,
    });
  }
  for (const s of shares) {
    const b = billOf.get(s.bill_id);
    if (!b || s.profile_id === b.paid_by) continue;
    if (s.marked_paid_at)
      out.push({
        id: `mp-${s.id}`,
        kind: "marked_paid",
        text: `${nameOf(s.profile_id)} marked ${fmt(s.amount)} paid · ${b.name}`,
        at: s.marked_paid_at,
      });
    if (s.confirmed_at)
      out.push({
        id: `cf-${s.id}`,
        kind: "confirmed",
        text: `${nameOf(b.paid_by)} confirmed ${nameOf(s.profile_id)}'s payment · ${b.name}`,
        at: s.confirmed_at,
      });
  }
  for (const n of nudges) {
    out.push({
      id: `n-${n.id}`,
      kind: "nudge",
      text: `${nameOf(n.from)} nudged ${n.to === me ? "you" : nameOf(n.to)} · ${fmt(n.amount)}`,
      at: n.at,
    });
  }
  return out.sort((a, z) => z.at - a.at);
}
