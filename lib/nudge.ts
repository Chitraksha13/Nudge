export const DAY = 86_400_000;

export const FREQUENCIES = [
  { value: 0, label: "Off" },
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
];

/** When is the next reminder for a waiting share? null when reminders are off. */
export function nextNudge(lastRemindedAt: number | null, everyDays: number, now: number) {
  if (everyDays <= 0 || lastRemindedAt === null) return null;
  const remaining = lastRemindedAt + everyDays * DAY - now;
  return { due: remaining <= 0, inDays: Math.max(0, Math.ceil(remaining / DAY)) };
}

export function nextNudgeLabel(n: ReturnType<typeof nextNudge>): string {
  if (!n) return "Reminders off";
  if (n.due) return "Nudge due now";
  return `Next nudge in ${n.inDays} day${n.inDays === 1 ? "" : "s"}`;
}

export function agoLabel(t: number | null, now: number): string {
  if (!t) return "never";
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

// ---- One nudge per person: group unpaid shares by who owes whom ----
import type { Bill, BillShare } from "./types";

export const pairKey = (creditor: string, debtor: string) => `${creditor}>${debtor}`;

export type OweGroup = {
  key: string;
  creditor: string;
  debtor: string;
  shareIds: string[];
  billNames: string[];
  amount: number;
};

/** Everything each person still owes each other person. Only `waiting` shares count, so anyone who has
 *  marked paid (or been confirmed) drops out and is never nudged. The payer's own share is never owed. */
export function owedGroups(bills: Bill[], shares: BillShare[]): OweGroup[] {
  const billOf = new Map(bills.map((b) => [b.id, b]));
  const groups = new Map<string, OweGroup>();
  for (const s of shares) {
    const bill = billOf.get(s.bill_id);
    if (!bill || s.status !== "waiting" || s.profile_id === bill.paid_by) continue;
    const key = pairKey(bill.paid_by, s.profile_id);
    const g = groups.get(key) ?? {
      key,
      creditor: bill.paid_by,
      debtor: s.profile_id,
      shareIds: [],
      billNames: [],
      amount: 0,
    };
    g.shareIds.push(s.id);
    if (!g.billNames.includes(bill.name)) g.billNames.push(bill.name);
    g.amount += s.amount;
    groups.set(key, g);
  }
  return Array.from(groups.values());
}

export type PlanRow = {
  other: string; // the other person's profile id
  direction: "owesMe" | "iOwe" | "paid";
  amount: number;
  next: ReturnType<typeof nextNudge>;
};

/** What the Nudges card shows (only pairs involving `me`) and which pairs are due to be nudged right now. */
export function buildNudgePlan(
  me: string,
  bills: Bill[],
  shares: BillShare[],
  pairNudged: Record<string, number>,
  everyDays: number,
  now: number,
) {
  const groups = owedGroups(bills, shares).filter((g) => g.creditor === me || g.debtor === me);
  const timer = (g: OweGroup) => nextNudge(pairNudged[g.key] ?? now, everyDays, now);

  const rows: PlanRow[] = groups.map((g) => ({
    other: g.creditor === me ? g.debtor : g.creditor,
    direction: g.creditor === me ? "owesMe" : "iOwe",
    amount: g.amount,
    next: timer(g),
  }));

  // People on my bills who have paid everything they owe me: shown so it's clear they won't be nudged.
  const stillOwing = new Set(groups.filter((g) => g.creditor === me).map((g) => g.debtor));
  const myBills = new Set(bills.filter((b) => b.paid_by === me).map((b) => b.id));
  const paid = new Set<string>();
  for (const s of shares) {
    if (myBills.has(s.bill_id) && s.profile_id !== me && s.status !== "waiting" && !stillOwing.has(s.profile_id))
      paid.add(s.profile_id);
  }
  paid.forEach((other) => rows.push({ other, direction: "paid", amount: 0, next: null }));

  const due = everyDays > 0 ? groups.filter((g) => timer(g)?.due) : [];
  return { rows, due };
}
