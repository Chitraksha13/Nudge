"use client";
// In-memory demo store. Everything lives in React state, so a page reload wipes it.
// Types mirror the Postgres data model so Supabase can replace this later.
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Bill, BillShare, Household, Profile, SplitMode } from "./types";

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
  createHousehold: (name: string, friendIds: string[]) => string;
  joinDemoHousehold: (code: string) => string;
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

  const addGroup = (name: string, code: string, ids: string[]) => {
    const h: Household = { id: uid("h"), name: name.trim(), invite_code: code };
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
    createHousehold: (name, friendIds) =>
      addGroup(name, Math.random().toString(36).slice(2, 8), ["me", ...friendIds]),
    joinDemoHousehold: (code) => addGroup("The flat", code, ["me", "jay", "rob", "leo"]),
    enter: (id) => setActiveId(id),
    addMember: (name) => {
      if (!activeId) return;
      const p: Profile = { id: uid("p"), name: name.trim(), venmo_username: "", cashtag: "", zelle_handle: "" };
      setExtra((e) => [...e, p]);
      setMembers((m) => ({ ...m, [activeId]: [...(m[activeId] ?? []), p.id] }));
    },
    createBill: (b) => {
      const now = Date.now();
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
      const n = rows.filter((r) => r.profile_id !== b.paidBy).length;
      flash(`Reminder sent to ${n} roommate${n === 1 ? "" : "s"} (demo: no email)`);
      return bill.id;
    },
    markPaid: (id, method) =>
      setShares((x) =>
        x.map((s) =>
          s.id === id ? { ...s, status: "marked_paid", paid_method: method, marked_paid_at: Date.now() } : s,
        ),
      ),
    confirm: (id) =>
      setShares((x) => x.map((s) => (s.id === id ? { ...s, status: "confirmed", confirmed_at: Date.now() } : s))),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
