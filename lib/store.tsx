"use client";
// In-memory demo store. Everything lives in React state, so a page reload wipes it.
// Types mirror the Postgres data model so Supabase can replace this later.
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Bill, BillShare, Household, Nudge, Profile, SplitMode } from "./types";
import { DAY, agoLabel, buildNudgePlan, owedGroups, pairKey, type OweGroup } from "./nudge";

const FRIENDS: Profile[] = [
  { id: "jay", name: "Jay", venmo_username: "jay-demo", cashtag: "jaydemo", zelle_handle: "jay@example.com" },
  { id: "rob", name: "Rob", venmo_username: "rob-demo", cashtag: "", zelle_handle: "555-010-2020" },
  { id: "leo", name: "Leo", venmo_username: "", cashtag: "leodemo", zelle_handle: "" },
];

type NewBill = {
  name: string;
  total: number;
  paidBy: string;
  mode: SplitMode;
  shares: Record<string, number>;
};

type Store = {
  me: Profile | null;
  profiles: Profile[];
  households: Household[]; // every group you are in
  household: Household | null; // the group you are currently inside
  memberIds: string[]; // members of the current group
  membersOf: (householdId: string) => string[];
  allBills: Bill[];
  bills: Bill[]; // bills of the current group
  shares: BillShare[];
  toast: string | null;
  signIn: (name: string) => void;
  savePayment: (v: { venmo_username: string; cashtag: string; zelle_handle: string }) => void;
  createHousehold: (name: string, friendIds: string[], nudgeDays?: number, emoji?: string) => string;
  loadDemo: () => void; // one-tap sample data for visitors
  tourDone: boolean;
  finishTour: () => void;
  joinDemoHousehold: (code: string) => string;
  // Nudges (reminders)
  now: () => number; // demo clock: real time plus any skipped days
  dayOffset: number;
  nudges: Nudge[]; // nudge log for the current group
  nudgePlan: ReturnType<typeof buildNudgePlan>; // who owes whom, and which nudges are due
  setNudgeDays: (days: number) => void;
  advanceDay: () => void;
  runReminders: () => number; // what the daily cron job does: one nudge per person who is due
  nudgeBill: (billId: string) => void; // manual: nudge everyone still waiting on this bill
  enter: (householdId: string) => void;
  addMember: (name: string) => void;
  createBill: (b: NewBill) => string;
  markPaid: (shareId: string, method: string) => void;
  confirm: (shareId: string) => void;
  profile: (id: string) => Profile | undefined;
  friends: Profile[];
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Profile | null>(null);
  const [extra, setExtra] = useState<Profile[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [allBills, setBills] = useState<Bill[]>([]);
  const [shares, setShares] = useState<BillShare[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [tourDone, setTourDone] = useState(false);
  const [nudgeLog, setNudgeLog] = useState<Nudge[]>([]);
  // When each "creditor>debtor" pair was last nudged (or started owing). One timer per person, not per bill.
  const [pairNudged, setPairNudged] = useState<Record<string, number>>({});
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const uid = (p: string) => `${p}${++counter.current}`;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const profiles = me ? [me, ...FRIENDS, ...extra] : [];
  const household = households.find((h) => h.id === activeId) ?? null;

  const nowMs = () => Date.now() + dayOffset * DAY;
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? "Someone";
  const groupBills = household ? allBills.filter((b) => b.household_id === household.id) : [];
  const nudgePlan =
    household && me
      ? buildNudgePlan(me.id, groupBills, shares, pairNudged, household.nudge_every_days, nowMs())
      : { rows: [], due: [] };

  // Sends ONE nudge per person, covering everything they owe in the group, and restarts that person's timer.
  const sendPairs = (groups: OweGroup[], kind: Nudge["kind"]) => {
    if (!household || groups.length === 0) return;
    const at = nowMs();
    const entries: Nudge[] = groups.map((g) => ({
      id: uid("n"),
      household_id: household.id,
      from: g.creditor,
      to: g.debtor,
      share_ids: g.shareIds,
      bill_names: g.billNames,
      amount: g.amount,
      kind,
      note: pairNudged[g.key] ? `Previous nudge: ${agoLabel(pairNudged[g.key], at)}` : "First nudge",
      at,
    }));
    setPairNudged((p) => ({ ...p, ...Object.fromEntries(groups.map((g) => [g.key, at])) }));
    const ids = new Set(groups.flatMap((g) => g.shareIds));
    setShares((x) => x.map((s) => (ids.has(s.id) ? { ...s, last_reminded_at: at } : s)));
    setNudgeLog((n) => [...entries.reverse(), ...n]);
  };

  const addGroup = (name: string, code: string, ids: string[], nudgeDays = 2, emoji = "🏠") => {
    const h: Household = {
      id: uid("h"),
      name: name.trim(),
      invite_code: code,
      nudge_every_days: nudgeDays,
      emoji,
    };
    setHouseholds((x) => [...x, h]);
    setMembers((m) => ({ ...m, [h.id]: ids }));
    setActiveId(h.id);
    return h.id;
  };

  const value: Store = {
    me,
    profiles,
    households,
    household,
    memberIds: household ? members[household.id] ?? [] : [],
    membersOf: (id) => members[id] ?? [],
    allBills,
    bills: household ? allBills.filter((b) => b.household_id === household.id) : [],
    shares,
    toast,
    friends: FRIENDS,
    profile: (id) => profiles.find((p) => p.id === id),
    signIn: (name) =>
      setMe({ id: "me", name: name.trim(), venmo_username: "", cashtag: "", zelle_handle: "" }),
    savePayment: (v) => setMe((m) => (m ? { ...m, ...v } : m)),
    createHousehold: (name, friendIds, nudgeDays, emoji) =>
      addGroup(name, Math.random().toString(36).slice(2, 8), ["me", ...friendIds], nudgeDays, emoji),
    tourDone,
    finishTour: () => setTourDone(true),
    loadDemo: () => {
      const base = Date.now();
      const t = (days: number) => base - days * DAY;
      const hid = uid("h");
      const mkShare = (bill: string, pid: string, amount: number, o: Partial<BillShare> = {}): BillShare => ({
        id: uid("s"),
        bill_id: bill,
        profile_id: pid,
        amount,
        status: "waiting",
        paid_method: null,
        marked_paid_at: null,
        confirmed_at: null,
        last_reminded_at: null,
        ...o,
      });
      const mkBill = (name: string, total: number, paidBy: string, at: number): Bill => ({
        id: uid("b"),
        household_id: hid,
        name,
        total_amount: total,
        paid_by: paidBy,
        split_mode: "equal",
        created_at: at,
      });
      // Rent: Alex paid. Jay and Rob confirmed, Leo is overdue for a nudge.
      const rent = mkBill("Rent", 240000, "me", t(4));
      const rentShares = [
        mkShare(rent.id, "me", 60000, { status: "confirmed", confirmed_at: t(4) }),
        mkShare(rent.id, "jay", 60000, { status: "confirmed", paid_method: "Venmo", marked_paid_at: t(3), confirmed_at: t(3), last_reminded_at: t(4) }),
        mkShare(rent.id, "rob", 60000, { status: "confirmed", paid_method: "Zelle", marked_paid_at: t(2), confirmed_at: t(2), last_reminded_at: t(4) }),
        mkShare(rent.id, "leo", 60000, { last_reminded_at: t(2) }),
      ];

      // Internet: Jay paid. Alex still owes, Rob marked paid and awaits confirmation.
      const net = mkBill("Internet", 8000, "jay", t(3));
      const netShares = [
        mkShare(net.id, "jay", 2000, { status: "confirmed", confirmed_at: t(3) }),
        mkShare(net.id, "me", 2000, { last_reminded_at: t(1) }),
        mkShare(net.id, "rob", 2000, { status: "marked_paid", paid_method: "Venmo", marked_paid_at: t(1), last_reminded_at: t(3) }),
        mkShare(net.id, "leo", 2000, { status: "confirmed", paid_method: "Cash App", marked_paid_at: t(2), confirmed_at: t(2), last_reminded_at: t(3) }),
      ];

      // Groceries: Alex paid yesterday, nobody has paid yet.
      const groc = mkBill("Groceries", 6440, "me", t(1));
      const grocShares = [
        mkShare(groc.id, "me", 1610, { status: "confirmed", confirmed_at: t(1) }),
        mkShare(groc.id, "jay", 1610, { last_reminded_at: t(1) }),
        mkShare(groc.id, "rob", 1610, { last_reminded_at: t(1) }),
        mkShare(groc.id, "leo", 1610, { last_reminded_at: t(1) }),
      ];

      setMe({ id: "me", name: "Alex", venmo_username: "alex-demo", cashtag: "alexdemo", zelle_handle: "alex@example.com" });
      setExtra([]);
      setDayOffset(0);
      setTourDone(false);
      setHouseholds([{ id: hid, name: "The flat", invite_code: "demo01", nudge_every_days: 2, emoji: "🏠" }]);
      setMembers({ [hid]: ["me", "jay", "rob", "leo"] });
      setActiveId(hid);
      setBills([groc, net, rent]);
      setShares([...rentShares, ...netShares, ...grocShares]);
      // One timer per person. Leo is due now (2 days since his last nudge); the rest are 1 day out.
      setPairNudged({ [pairKey("me", "leo")]: t(2), [pairKey("me", "jay")]: t(1), [pairKey("me", "rob")]: t(1), [pairKey("jay", "me")]: t(1) });
      setNudgeLog([
        {
          id: uid("n"),
          household_id: hid,
          from: "jay",
          to: "me",
          share_ids: [netShares[1].id],
          bill_names: ["Internet"],
          amount: 2000,
          kind: "reminder",
          note: "First nudge",
          at: t(1),
        },
        {
          id: uid("n"),
          household_id: hid,
          from: "me",
          to: "leo",
          share_ids: [rentShares[3].id],
          bill_names: ["Rent"],
          amount: 60000,
          kind: "reminder",
          note: "First nudge",
          at: t(2),
        },
      ]);
    },
    now: nowMs,
    dayOffset,
    nudgePlan,
    nudges: household ? nudgeLog.filter((n) => n.household_id === household.id) : [],
    setNudgeDays: (days) =>
      setHouseholds((hs) => hs.map((h) => (h.id === activeId ? { ...h, nudge_every_days: days } : h))),
    advanceDay: () => {
      setDayOffset((d) => d + 1);
      flash("Fast-forwarded one day (demo)");
    },
    runReminders: () => {
      if (!household || household.nudge_every_days <= 0) {
        flash("Nudges are off for this group");
        return 0;
      }
      const due = nudgePlan.due;
      sendPairs(due, "reminder");
      flash(
        due.length
          ? `Sent ${due.length} nudge${due.length === 1 ? "" : "s"}`
          : "No nudges are due yet",
      );
      return due.length;
    },
    nudgeBill: (billId) => {
      const bill = groupBills.find((b) => b.id === billId);
      if (!bill) return;
      const waitingHere = new Set(
        shares.filter((s) => s.bill_id === billId && s.status === "waiting").map((s) => s.id),
      );
      // One nudge per person still waiting on this bill, covering everything they owe the payer.
      const groups = owedGroups(groupBills, shares).filter(
        (g) => g.creditor === bill.paid_by && g.shareIds.some((id) => waitingHere.has(id)),
      );
      if (groups.length === 0) {
        flash("Nobody owes anything on this bill");
        return;
      }
      const names = groups.map((g) => nameOf(g.debtor));
      const prev = pairNudged[groups[0].key];
      sendPairs(groups, "manual");
      flash(
        `Nudged ${names.join(" and ")}${prev ? `. Previous nudge: ${agoLabel(prev, nowMs())}` : ""}`,
      );
    },
    joinDemoHousehold: (code) => addGroup("The flat", code, ["me", "jay", "rob", "leo"]),
    enter: (id) => setActiveId(id),
    addMember: (name) => {
      if (!activeId) return;
      const p: Profile = { id: uid("p"), name: name.trim(), venmo_username: "", cashtag: "", zelle_handle: "" };
      setExtra((e) => [...e, p]);
      setMembers((m) => ({ ...m, [activeId]: [...(m[activeId] ?? []), p.id] }));
    },
    createBill: (b) => {
      const now = nowMs();
      const bill: Bill = {
        id: uid("b"),
        household_id: activeId ?? "",
        name: b.name.trim(),
        total_amount: b.total,
        paid_by: b.paidBy,
        split_mode: b.mode,
        created_at: now,
      };
      const rows: BillShare[] = Object.entries(b.shares).map(([pid, amount]) => {
        const isPayer = pid === b.paidBy;
        return {
          id: uid("s"),
          bill_id: bill.id,
          profile_id: pid,
          amount,
          // The payer's own share is never owed.
          status: isPayer ? "confirmed" : "waiting",
          paid_method: null,
          marked_paid_at: null,
          confirmed_at: isPayer ? now : null,
          last_reminded_at: isPayer ? null : now,
        };
      });
      setBills((x) => [bill, ...x]);
      setShares((x) => [...x, ...rows]);
      // Start a nudge timer for anyone who didn't already owe this payer. People who already owe keep
      // their running timer, so adding a bill never delays or multiplies their nudges.
      const active = new Set(owedGroups(groupBills, shares).map((g) => g.key));
      const owing = rows.filter((r) => r.profile_id !== b.paidBy);
      setPairNudged((p) => {
        const next = { ...p };
        for (const r of owing) {
          const key = pairKey(b.paidBy, r.profile_id);
          if (!active.has(key)) next[key] = now;
        }
        return next;
      });
      flash(`Everyone who owes was told about ${bill.name} (demo)`);
      return bill.id;
    },
    markPaid: (id, method) =>
      setShares((x) =>
        x.map((s) =>
          s.id === id ? { ...s, status: "marked_paid", paid_method: method, marked_paid_at: nowMs() } : s,
        ),
      ),
    confirm: (id) =>
      setShares((x) => x.map((s) => (s.id === id ? { ...s, status: "confirmed", confirmed_at: nowMs() } : s))),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
