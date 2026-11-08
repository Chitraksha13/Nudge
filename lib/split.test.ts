import { describe, expect, it } from "vitest";
import { amountsSplit, equalSplit, percentSplit } from "./split";
import { balancesFor } from "./balances";
import { parseDollars } from "./money";
import type { Bill, BillShare, Nudge } from "./types";

const sum = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);

describe("split", () => {
  it("equal gives leftover cent to the payer", () => {
    expect(equalSplit(1000, ["a", "b", "c"], "b")).toEqual({ a: 333, b: 334, c: 333 });
  });
  it("percent sums exactly", () => {
    const s = percentSplit(1001, { a: 33.33, b: 33.33, c: 33.34 })!;
    expect(sum(s)).toBe(1001);
  });
  it("percent rejects non-100", () => {
    expect(percentSplit(1000, { a: 50, b: 40 })).toBeNull();
  });
  it("amounts must match total", () => {
    expect(amountsSplit(1000, { a: 600, b: 400 })).not.toBeNull();
    expect(amountsSplit(1000, { a: 600, b: 300 })).toBeNull();
  });
  it("parses dollars", () => {
    expect(parseDollars("12.5")).toBe(1250);
    expect(parseDollars("abc")).toBeNull();
  });
});

describe("balances", () => {
  it("ignores payer share and confirmed shares", () => {
    const bills = [{ id: "1", paid_by: "me" }, { id: "2", paid_by: "jay" }] as Bill[];
    const shares = [
      { bill_id: "1", profile_id: "me", amount: 500, status: "confirmed" },
      { bill_id: "1", profile_id: "jay", amount: 500, status: "waiting" },
      { bill_id: "2", profile_id: "me", amount: 200, status: "waiting" },
      { bill_id: "2", profile_id: "rob", amount: 200, status: "confirmed" },
    ] as BillShare[];
    expect(balancesFor("me", bills, shares)).toMatchObject({ owedToMe: 500, iOwe: 200, net: 300 });
  });
});

import { DAY, nextNudge } from "./nudge";

describe("nudge schedule", () => {
  it("counts down and becomes due", () => {
    expect(nextNudge(0, 2, 0)).toEqual({ due: false, inDays: 2 });
    expect(nextNudge(0, 2, DAY + 1000)).toEqual({ due: false, inDays: 1 });
    expect(nextNudge(0, 2, 2 * DAY)).toEqual({ due: true, inDays: 0 });
  });
  it("is null when off", () => {
    expect(nextNudge(0, 0, 0)).toBeNull();
  });
});

import { billProgress } from "./progress";
import { buildActivity } from "./activity";

describe("progress and activity", () => {
  it("counts only confirmed non-payer shares", () => {
    const shares = [
      { profile_id: "me", status: "confirmed" },
      { profile_id: "jay", status: "confirmed" },
      { profile_id: "rob", status: "marked_paid" },
      { profile_id: "leo", status: "waiting" },
    ] as BillShare[];
    expect(billProgress(shares, "me")).toEqual({ paid: 1, total: 3 });
  });
  it("sorts activity newest first and skips the new-bill nudge", () => {
    const bills = [{ id: "b", name: "Rent", paid_by: "me", total_amount: 1000, created_at: 100 }] as Bill[];
    const shares = [
      { id: "s", bill_id: "b", profile_id: "jay", amount: 500, marked_paid_at: 300, confirmed_at: 400 },
    ] as BillShare[];
    const nudges = [
      { id: "n2", kind: "reminder", from: "me", to: "jay", amount: 500, bill_names: ["Rent"], note: "First nudge", at: 200 },
    ] as Nudge[];
    const ev = buildActivity(bills, shares, nudges, (id) => id, "me");
    expect(ev.map((e) => e.kind)).toEqual(["confirmed", "marked_paid", "nudge", "bill"]);
  });
});

import { buildNudgePlan, owedGroups, pairKey } from "./nudge";

describe("one nudge per person", () => {
  const bills = [
    { id: "b1", name: "Rent", paid_by: "me" },
    { id: "b2", name: "Internet", paid_by: "me" },
    { id: "b3", name: "Gas", paid_by: "jay" },
  ] as Bill[];
  const sh = (id: string, bill: string, who: string, amount: number, status = "waiting") =>
    ({ id, bill_id: bill, profile_id: who, amount, status }) as BillShare;
  const shares = [
    sh("1", "b1", "me", 500, "confirmed"),
    sh("2", "b1", "leo", 500),
    sh("3", "b2", "leo", 300),
    sh("4", "b1", "rob", 500, "marked_paid"),
    sh("5", "b3", "me", 200),
  ];

  it("combines every unpaid bill into one group per person", () => {
    const leo = owedGroups(bills, shares).find((g) => g.debtor === "leo")!;
    expect(leo.amount).toBe(800);
    expect(leo.billNames).toEqual(["Rent", "Internet"]);
    expect(leo.shareIds).toEqual(["2", "3"]);
  });
  it("skips anyone who already paid and never includes the payer's own share", () => {
    const debtors = owedGroups(bills, shares).map((g) => g.debtor);
    expect(debtors).not.toContain("rob");
    expect(owedGroups(bills, shares).some((g) => g.debtor === "me" && g.creditor === "me")).toBe(false);
  });
  it("plan: due vs not due, and paid people are listed as paid", () => {
    const now = 10 * DAY;
    const timers = { [pairKey("me", "leo")]: now - 2 * DAY, [pairKey("jay", "me")]: now - DAY };
    const plan = buildNudgePlan("me", bills, shares, timers, 2, now);
    expect(plan.due.map((g) => g.debtor)).toEqual(["leo"]);
    expect(plan.rows.find((r) => r.other === "jay")).toMatchObject({ direction: "iOwe" });
    expect(plan.rows.find((r) => r.other === "rob")).toMatchObject({ direction: "paid" });
    expect(buildNudgePlan("me", bills, shares, timers, 0, now).due).toEqual([]);
  });
});
