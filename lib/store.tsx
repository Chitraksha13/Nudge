"use client";
// In-memory demo store. Everything lives in React state, so a page reload wipes it.
// Types mirror the Postgres data model so Supabase can replace this later.
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Bill, BillShare, Household, Nudge, Profile, SplitMode } from "./types";
import { DAY, agoLabel } from "./nudge";
import { fmt } from "./money";

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
  nudges: Nudge[]; // reminder log for the current group
  setNudgeDays: (days: number) => void;
  advanceDay: () => void;
  runReminders: () => number; // what the daily cron job does
  sendNudge: (shareId: string) => void; // manual "nudge now"
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

  // Builds the message a roommate would get by email, and logs it.
  const makeNudge = (
    bill: Bill,
    share: BillShare,
    kind: Nudge["kind"],
    at: number,
    previous: number | null = null,
  ): Nudge => {
    const body =
      kind === "new_bill"
        ? `New bill: ${bill.name}. You owe ${nameOf(bill.paid_by)} ${fmt(share.amount)}.`
        : `Friendly nudge: you still owe ${nameOf(bill.paid_by)} ${fmt(share.amount)} for ${bill.name}.`;
    return {
      id: uid("n"),
      household_id: bill.household_id,
      share_id: share.id,
      to: share.profile_id,
      kind,
      message: `Hi ${nameOf(share.profile_id)}, ${body[0].toLowerCase()}${body.slice(1)} Tap to pay.`,
      note:
        kind === "new_bill"
          ? "First message about this bill"
          : `Last nudge before this: ${agoLabel(previous, at)}`,
      at,
    };
  };

  const sendTo = (list: BillShare[], kind: Nudge["kind"]) => {
    const at = nowMs();
    const entries = list.flatMap((s) => {
      const bill = allBills.find((b) => b.id === s.bill_id);
      return bill ? [makeNudge(bill, s, kind, at, s.last_reminded_at)] : [];
    });
    const ids = new Set(list.map((s) => s.id));
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
      const names: Record<string, string> = { me: "Alex", jay: "Jay", rob: "Rob", leo: "Leo" };
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
      const log: Nudge[] = [];
      const note = (b: Bill, s: BillShare, kind: Nudge["kind"], at: number, prev: string) => {
        const body =
          kind === "new_bill"
            ? `new bill: ${b.name}. You owe ${names[b.paid_by]} ${fmt(s.amount)}.`
            : `friendly nudge: you still owe ${names[b.paid_by]} ${fmt(s.amount)} for ${b.name}.`;
        log.push({
          id: uid("n"),
          household_id: hid,
          share_id: s.id,
          to: s.profile_id,
          kind,
          message: `Hi ${names[s.profile_id]}, ${body} Tap to pay.`,
          note: kind === "new_bill" ? "First message about this bill" : `Last nudge before this: ${prev}`,
          at,
        });
      };

      // Rent: Alex paid. Jay and Rob confirmed, Leo is overdue for a nudge.
      const rent = mkBill("Rent", 240000, "me", t(4));
      const rentShares = [
        mkShare(rent.id, "me", 60000, { status: "confirmed", confirmed_at: t(4) }),
        mkShare(rent.id, "jay", 60000, { status: "confirmed", paid_method: "Venmo", marked_paid_at: t(3), confirmed_at: t(3), last_reminded_at: t(4) }),
        mkShare(rent.id, "rob", 60000, { status: "confirmed", paid_method: "Zelle", marked_paid_at: t(2), confirmed_at: t(2), last_reminded_at: t(4) }),
        mkShare(rent.id, "leo", 60000, { last_reminded_at: t(2) }),
      ];
      rentShares.filter((s) => s.profile_id !== "me").forEach((s) => note(rent, s, "new_bill", t(4), ""));
      note(rent, rentShares[3], "reminder", t(2), "2 days ago");

      // Internet: Jay paid. Alex still owes, Rob marked paid and awaits confirmation.
      const net = mkBill("Internet", 8000, "jay", t(3));
      const netShares = [
        mkShare(net.id, "jay", 2000, { status: "confirmed", confirmed_at: t(3) }),
        mkShare(net.id, "me", 2000, { last_reminded_at: t(1) }),
        mkShare(net.id, "rob", 2000, { status: "marked_paid", paid_method: "Venmo", marked_paid_at: t(1), last_reminded_at: t(3) }),
        mkShare(net.id, "leo", 2000, { status: "confirmed", paid_method: "Cash App", marked_paid_at: t(2), confirmed_at: t(2), last_reminded_at: t(3) }),
      ];
      netShares.filter((s) => s.profile_id !== "jay").forEach((s) => note(net, s, "new_bill", t(3), ""));
      note(net, netShares[1], "reminder", t(1), "2 days ago");

      // Groceries: Alex paid yesterday, nobody has paid yet.
      const groc = mkBill("Groceries", 6440, "me", t(1));
      const grocShares = [
        mkShare(groc.id, "me", 1610, { status: "confirmed", confirmed_at: t(1) }),
        mkShare(groc.id, "jay", 1610, { last_reminded_at: t(1) }),
        mkShare(groc.id, "rob", 1610, { last_reminded_at: t(1) }),
        mkShare(groc.id, "leo", 1610, { last_reminded_at: t(1) }),
      ];
      grocShares.filter((s) => s.profile_id !== "me").forEach((s) => note(groc, s, "new_bill", t(1), ""));

      setMe({ id: "me", name: "Alex", venmo_username: "alex-demo", cashtag: "alexdemo", zelle_handle: "alex@example.com" });
      setExtra([]);
      setDayOffset(0);
      setTourDone(false);
      setHouseholds([{ id: hid, name: "The flat", invite_code: "demo01", nudge_every_days: 2, emoji: "🏠" }]);
      setMembers({ [hid]: ["me", "jay", "rob", "leo"] });
      setActiveId(hid);
      setBills([groc, net, rent]);
      setShares([...rentShares, ...netShares, ...grocShares]);
      setNudgeLog(log.sort((a, z) => z.at - a.at));
    },
    now: nowMs,
    dayOffset,
    nudges: household ? nudgeLog.filter((n) => n.household_id === household.id) : [],
    setNudgeDays: (days) =>
      setHouseholds((hs) => hs.map((h) => (h.id === activeId ? { ...h, nudge_every_days: days } : h))),
    advanceDay: () => {
      setDayOffset((d) => d + 1);
      flash("Skipped ahead one day (demo)");
    },
    runReminders: () => {
      if (!household || household.nudge_every_days <= 0) {
        flash("Reminders are off for this group");
        return 0;
      }
      const ids = new Set(allBills.filter((b) => b.household_id === household.id).map((b) => b.id));
      const due = shares.filter(
        (s) =>
          ids.has(s.bill_id) &&
          s.status === "waiting" &&
          s.last_reminded_at !== null &&
          nowMs() - s.last_reminded_at >= household.nudge_every_days * DAY,
      );
      if (due.length) sendTo(due, "reminder");
      flash(due.length ? `Sent ${due.length} reminder${due.length === 1 ? "" : "s"}` : "No reminders due yet");
      return due.length;
    },
    sendNudge: (shareId) => {
      const s = shares.find((x) => x.id === shareId);
      if (!s || s.status !== "waiting") return;
      sendTo([s], "manual");
      flash(`Nudge sent to ${nameOf(s.profile_id)}. Last nudge before this: ${agoLabel(s.last_reminded_at, nowMs())}`);
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
      const owing = rows.filter((r) => r.profile_id !== b.paidBy);
      setNudgeLog((l) => [...owing.map((r) => makeNudge(bill, r, "new_bill", now)).reverse(), ...l]);
      flash(`Emailed ${owing.length} roommate${owing.length === 1 ? "" : "s"} about this bill (demo)`);
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
