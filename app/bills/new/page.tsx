"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Avatar, Button, Header, Input, Label, Segmented, useRequire } from "@/components/ui";
import { fmt, parseDollars } from "@/lib/money";
import { amountsSplit, equalSplit, percentSplit } from "@/lib/split";
import type { SplitMode } from "@/lib/types";

export default function NewBill() {
  const s = useRequire();
  const router = useRouter();
  const [total, setTotal] = useState("");
  const [name, setName] = useState("");
  const [paidBy, setPaidBy] = useState("me");
  const [mode, setMode] = useState<SplitMode>("equal");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});

  const members = s?.memberIds ?? [];
  const selected = picked ?? members;
  const totalCents = parseDollars(total);

  const result = useMemo(() => {
    if (!totalCents || selected.length === 0) return { shares: null, msg: "Enter a total and pick who is splitting" };
    if (mode === "equal") return { shares: equalSplit(totalCents, selected, paidBy), msg: "" };
    if (mode === "amounts") {
      const a: Record<string, number> = {};
      let sum = 0;
      for (const id of selected) {
        const c = vals[id] ? parseDollars(vals[id]) : 0;
        a[id] = c ?? 0;
        sum += c ?? 0;
      }
      const shares = amountsSplit(totalCents, a);
      const diff = totalCents - sum;
      return { shares, msg: shares ? "" : diff > 0 ? `${fmt(diff)} left to assign` : `${fmt(-diff)} over the total` };
    }
    const p: Record<string, number> = {};
    let sum = 0;
    for (const id of selected) {
      const n = Number(vals[id] || 0);
      p[id] = Number.isFinite(n) ? n : 0;
      sum += p[id];
    }
    const shares = percentSplit(totalCents, p);
    return { shares, msg: shares ? "" : `Percentages add up to ${Math.round(sum * 100) / 100}%, need 100%` };
  }, [totalCents, selected, mode, vals, paidBy]);

  if (!s) return null;
  const canSave = !!result.shares && !!name.trim() && !!totalCents;

  const toggle = (id: string) =>
    setPicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <main>
      <Header title="New bill" back="/home" />
      <div className="space-y-4 px-4 pb-10">
        <div>
          <Label>Total amount</Label>
          <div className="flex items-center rounded-xl bg-field px-3">
            <span className="text-[28px] font-medium text-ink2">$</span>
            <input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-1 py-2 text-[28px] font-medium text-ink outline-none"
            />
          </div>
        </div>
        <div>
          <Label>Bill name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Internet" />
        </div>
        <div>
          <Label>Who paid</Label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-xl bg-field px-3 py-2.5 text-ink outline-none"
          >
            {members.map((id) => (
              <option key={id} value={id}>
                {id === "me" ? "You" : s.profile(id)?.name}
              </option>
            ))}
          </select>
        </div>
        <Segmented
          options={[
            { value: "equal", label: "Equal" },
            { value: "amounts", label: "Amounts" },
            { value: "percent", label: "Percent" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <div className="space-y-2">
          {members.map((id) => {
            const on = selected.includes(id);
            const share = result.shares?.[id];
            return (
              <div key={id} className="flex items-center gap-3">
                <button type="button" onClick={() => toggle(id)} className="flex flex-1 items-center gap-3 text-left">
                  <Avatar name={s.profile(id)?.name ?? "?"} />
                  <span className={on ? "" : "text-muted"}>{id === "me" ? "You" : s.profile(id)?.name}</span>
                </button>
                {on && mode !== "equal" && (
                  <input
                    inputMode="decimal"
                    value={vals[id] ?? ""}
                    onChange={(e) => setVals({ ...vals, [id]: e.target.value })}
                    placeholder={mode === "amounts" ? "$0.00" : "0%"}
                    className="w-20 rounded-xl bg-field px-2 py-1.5 text-right outline-none"
                  />
                )}
                <span className="w-20 text-right text-sm text-ink2">
                  {on && (mode === "equal" || mode === "percent") && share !== undefined ? fmt(share) : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
            result.shares ? "bg-oktint text-oktext" : "bg-field text-ink2"
          }`}
        >
          {result.shares ? <><Check size={16} /> Shares add up to {fmt(totalCents ?? 0)}</> : result.msg}
        </div>
        <Button
          disabled={!canSave}
          onClick={() => {
            const id = s.createBill({ name, total: totalCents!, paidBy, mode, shares: result.shares! });
            router.push(`/bills/${id}`);
          }}
        >
          Save bill
        </Button>
      </div>
    </main>
  );
}
