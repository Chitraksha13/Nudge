import { describe, expect, it } from "vitest";
import { amountsSplit, equalSplit, percentSplit } from "./split";
import { balancesFor } from "./balances";
import { parseDollars } from "./money";
import type { Bill, BillShare } from "./types";

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
      { id: "n1", kind: "new_bill", to: "jay", note: "", at: 100 },
      { id: "n2", kind: "reminder", to: "jay", note: "Last nudge before this: 2 days ago", at: 200 },
    ] as never[];
    const ev = buildActivity(bills, shares, nudges, (id) => id);
    expect(ev.map((e) => e.kind)).toEqual(["confirmed", "marked_paid", "nudge", "bill"]);
  });
});
