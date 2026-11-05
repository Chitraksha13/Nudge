"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bell, Plus } from "lucide-react";
import { FREQUENCIES, nextNudge, nextNudgeLabel } from "@/lib/nudge";
import { Avatar, Button, Card, Input, Pill, Segmented, StatusPill, useRequire } from "@/components/ui";
import { balancesFor } from "@/lib/balances";
import { fmt } from "@/lib/money";

export default function Home() {
  const s = useRequire();
  const [tab, setTab] = useState<"feed" | "balances" | "nudges">("feed");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  if (!s || !s.me || !s.household) return null;

  const me = s.me.id;
  const b = balancesFor(me, s.bills, s.shares);
  const others = s.memberIds.filter((id) => id !== me);
  const owedByMe = s.shares.filter((x) => {
    const bill = s.bills.find((y) => y.id === x.bill_id);
    return bill && x.profile_id === me && bill.paid_by !== me && x.status !== "confirmed";
  });

  const days = s.household.nudge_every_days;
  const billIds = new Set(s.bills.map((x) => x.id));
  const waiting = s.shares.filter((x) => {
    const bill = s.bills.find((y) => y.id === x.bill_id);
    return bill && billIds.has(x.bill_id) && x.status === "waiting" && bill.paid_by !== x.profile_id;
  });
  const upcoming = waiting
    .map((x) => ({ x, n: nextNudge(x.last_reminded_at, days, s.now()) }))
    .filter((r) => r.n)
    .sort((a, z) => a.n!.inDays - z.n!.inDays);
  const soonest = upcoming[0];

  return (
    <main className="space-y-4 px-4 pb-24 pt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/groups" aria-label="All groups" className="-ml-1 p-1 text-ink2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-medium">{s.household.name}</h1>
        </div>
      </div>

      <div className="rounded-2xl bg-tint p-4 text-tinttext">
        <div className="text-sm">Net balance</div>
        <div className="text-[30px] font-medium leading-tight">
          {b.net >= 0 ? "+" : "-"}${(Math.abs(b.net) / 100).toFixed(2)}
        </div>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <div className="opacity-80">Owed to you</div>
            <div className="font-medium">{fmt(b.owedToMe)}</div>
          </div>
          <div>
            <div className="opacity-80">You owe</div>
            <div className="font-medium">{fmt(b.iOwe)}</div>
          </div>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Bell size={18} /> Nudges
          </div>
          {s.dayOffset > 0 && <span className="text-xs text-muted">Demo: day +{s.dayOffset}</span>}
        </div>
        <div>
          <div className="mb-1 text-sm text-ink2">Remind roommates who haven&apos;t paid every</div>
          <Segmented
            options={FREQUENCIES.map((f) => ({ value: String(f.value), label: f.label }))}
            value={String(days)}
            onChange={(v) => s.setNudgeDays(Number(v))}
          />
        </div>
        <div className="rounded-xl bg-field p-3 text-sm text-ink2">
          {waiting.length === 0
            ? "Nobody owes anything in this group, so no nudges are scheduled."
            : days === 0
              ? `${waiting.length} unpaid share${waiting.length === 1 ? "" : "s"}. Reminders are off.`
              : `${waiting.length} unpaid share${waiting.length === 1 ? "" : "s"}. ${
                  soonest
                    ? `${s.profile(soonest.x.profile_id)?.name}: ${nextNudgeLabel(soonest.n).toLowerCase()}.`
                    : ""
                }`}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={s.advanceDay}>Skip a day</Button>
          <Button
            onClick={() => {
              s.runReminders();
              setTab("nudges");
            }}
          >
            Send due nudges
          </Button>
        </div>
        <p className="text-xs text-muted">
          In the real app this runs by itself once a day. Here, skip ahead and run it to see what roommates receive.
        </p>
      </Card>

      <div className="flex items-center gap-2">
        {s.memberIds.map((id) => (
          <Avatar key={id} name={s.profile(id)?.name ?? "?"} />
        ))}
        <button type="button" onClick={() => setAdding((a) => !a)} className="ml-1 text-sm text-ink2 underline">
          {adding ? "Cancel" : "Add roommate"}
        </button>
      </div>
      {adding && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            s.addMember(newName);
            setNewName("");
            setAdding(false);
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
          <button type="submit" className="rounded-full border border-line px-4 font-medium">Add</button>
        </form>
      )}
      <p className="text-xs text-muted">Invite link: /join/{s.household.invite_code}</p>

      <Segmented
        options={[
          { value: "feed", label: "Feed" },
          { value: "balances", label: "Balances" },
          { value: "nudges", label: "Nudges" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "nudges" ? (
        s.nudges.length === 0 ? (
          <p className="py-8 text-center text-ink2">No nudges sent yet. They appear here as roommates get emails.</p>
        ) : (
          <div className="space-y-2">
            {s.nudges.map((n) => (
              <Card key={n.id} className="space-y-1 !p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">To {n.to === me ? "you" : s.profile(n.to)?.name}</span>
                  <Pill tone={n.kind === "new_bill" ? "tint" : "warn"}>
                    {n.kind === "new_bill" ? "New bill" : n.kind === "manual" ? "Manual nudge" : "Reminder"}
                  </Pill>
                </div>
                <p className="text-sm text-ink2">{n.message}</p>
              </Card>
            ))}
          </div>
        )
      ) : tab === "feed" ? (
        s.bills.length === 0 ? (
          <p className="py-8 text-center text-ink2">No bills yet. Add the first one.</p>
        ) : (
          <div className="space-y-2">
            {s.bills.map((bill) => {
              const mine = s.shares.find((x) => x.bill_id === bill.id && x.profile_id === me);
              return (
                <Link key={bill.id} href={`/bills/${bill.id}`}>
                  <Card className="mb-2 flex items-center gap-3 !p-3">
                    <Avatar name={s.profile(bill.paid_by)?.name ?? "?"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{bill.name}</div>
                      <div className="text-sm text-ink2">
                        {bill.paid_by === me ? "You" : s.profile(bill.paid_by)?.name} paid
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{fmt(bill.total_amount)}</div>
                      {mine && bill.paid_by !== me && <StatusPill status={mine.status} />}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {others.map((id) => {
              const v = b.perPerson[id] ?? 0;
              const name = s.profile(id)?.name ?? "?";
              return (
                <Card key={id} className="flex items-center gap-3 !p-3">
                  <Avatar name={name} />
                  <div className="flex-1">{name}</div>
                  <div className="text-sm text-ink2">
                    {v === 0 ? "Settled up" : v > 0 ? `owes you ${fmt(v)}` : `you owe ${fmt(-v)}`}
                  </div>
                </Card>
              );
            })}
          </div>
          {owedByMe.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-ink2">Ready to pay</div>
              {owedByMe.map((x) => {
                const bill = s.bills.find((y) => y.id === x.bill_id)!;
                return (
                  <div key={x.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{bill.name}</div>
                      <div className="text-sm text-ink2">
                        {fmt(x.amount)} to {s.profile(bill.paid_by)?.name}
                      </div>
                    </div>
                    {x.status === "waiting" ? (
                      <Link href={`/pay/${x.id}`} className="rounded-full border border-line px-4 py-1.5 text-sm font-medium">
                        Pay
                      </Link>
                    ) : (
                      <StatusPill status={x.status} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-14 mx-auto w-full max-w-[390px] bg-surface px-4 pb-5 pt-3">
        <Button href="/bills/new">
          <span className="inline-flex items-center gap-1.5"><Plus size={18} /> New bill</span>
        </Button>
      </div>
    </main>
  );
}
