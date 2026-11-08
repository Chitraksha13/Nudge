"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Bell, Check, CheckCircle2, HandCoins, Plus, Receipt } from "lucide-react";
import { FREQUENCIES, agoLabel } from "@/lib/nudge";
import { Avatar, Button, Card, Input, Segmented, StatusPill, useRequire } from "@/components/ui";
import { Bar } from "@/components/Progress";
import { Tour } from "@/components/Tour";
import { balancesFor } from "@/lib/balances";
import { buildActivity } from "@/lib/activity";
import { billProgress } from "@/lib/progress";
import { fmt } from "@/lib/money";
import { useCountUp } from "@/lib/useCountUp";
import type { Nudge } from "@/lib/types";

function CountUp({ cents, signed = false }: { cents: number; signed?: boolean }) {
  const v = useCountUp(cents);
  return <>{signed ? `${v >= 0 ? "+" : "-"}$${(Math.abs(v) / 100).toFixed(2)}` : fmt(v)}</>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Home() {
  const s = useRequire();
  const [tab, setTab] = useState<"feed" | "balances" | "nudges" | "activity">("feed");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  if (!s || !s.me || !s.household) return null;

  const me = s.me.id;
  const nameOf = (id: string) => (id === me ? "You" : s.profile(id)?.name ?? "Someone");
  const b = balancesFor(me, s.bills, s.shares);
  const others = s.memberIds.filter((id) => id !== me);
  const owedByMe = s.shares.filter((x) => {
    const bill = s.bills.find((y) => y.id === x.bill_id);
    return bill && x.profile_id === me && bill.paid_by !== me && x.status !== "confirmed";
  });

  const days = s.household.nudge_every_days;
  const plan = s.nudgePlan;
  const activity = buildActivity(s.bills, s.shares, s.nudges, nameOf, me);
  const sent = s.nudges.filter((n) => n.from === me);
  const received = s.nudges.filter((n) => n.to === me);

  const whenText = (n: (typeof plan.rows)[number]["next"]) =>
    !n ? "nudges off" : n.due ? "nudge due now" : `nudge in ${plural(n.inDays, "day")}`;

  const NudgeList = ({ title, items, empty }: { title: string; items: Nudge[]; empty: string }) => (
    <section className="space-y-2">
      <h2 className="text-sm text-ink2">
        {title} <span className="text-muted">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl bg-field p-3 text-sm text-ink2">{empty}</p>
      ) : (
        items.map((n, i) => {
          const outgoing = n.from === me;
          const other = outgoing ? n.to : n.from;
          return (
            <Card key={n.id} className="item-in flex items-start gap-3 !p-3" >
              <Avatar name={s.profile(other)?.name ?? "?"} />
              <div className="min-w-0 flex-1" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center gap-1 font-medium">
                  {outgoing ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                  {outgoing ? `You nudged ${nameOf(other)}` : `${nameOf(other)} nudged you`}
                </div>
                <div className="text-sm text-ink2">
                  {fmt(n.amount)} · {n.bill_names.join(", ")}
                </div>
                <div className="text-xs text-muted">
                  {n.note} · {agoLabel(n.at, s.now())}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </section>
  );

  return (
    <main className="space-y-4 px-4 pb-24 pt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/groups" aria-label="All groups" className="-ml-1 p-1 text-ink2">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-2xl" aria-hidden>{s.household.emoji}</span>
          <h1 className="text-xl font-medium">{s.household.name}</h1>
        </div>
      </div>
      {!s.tourDone && <Tour onDone={s.finishTour} />}

      <div className="rounded-2xl bg-tint p-4 text-tinttext">
        <div className="text-sm">Net balance</div>
        <div className="text-[30px] font-medium leading-tight">
          <CountUp cents={b.net} signed />
        </div>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <div className="opacity-80">Owed to you</div>
            <div className="font-medium"><CountUp cents={b.owedToMe} /></div>
          </div>
          <div>
            <div className="opacity-80">You owe</div>
            <div className="font-medium"><CountUp cents={b.iOwe} /></div>
          </div>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-medium">
          <Bell size={18} /> Nudges
        </div>
        <div>
          <div className="mb-1 text-sm text-ink2">Nudge every</div>
          <Segmented
            options={FREQUENCIES.map((f) => ({ value: String(f.value), label: f.label }))}
            value={String(days)}
            onChange={(v) => s.setNudgeDays(Number(v))}
          />
          <p className="mt-2 text-sm text-ink2">
            {days === 0
              ? "Nudges are off."
              : `Anyone who owes you gets one nudge every ${plural(days, "day")} until they pay.`}
          </p>
        </div>

        {plan.rows.length === 0 ? (
          <p className="rounded-xl bg-field p-3 text-sm text-ink2">Nobody owes anything, so no nudges are scheduled.</p>
        ) : (
          <ul className="divide-y divide-line">
            {plan.rows.map((r) => (
              <li key={`${r.direction}-${r.other}`} className="flex items-center gap-3 py-2">
                <Avatar name={s.profile(r.other)?.name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{nameOf(r.other)}</div>
                  <div className="text-sm text-ink2">
                    {r.direction === "owesMe" && `Owes you · ${whenText(r.next)}`}
                    {r.direction === "iOwe" && `You owe · ${whenText(r.next)}`}
                    {r.direction === "paid" && (
                      <span className="inline-flex items-center gap-1">
                        <Check size={14} /> Paid · no more nudges
                      </span>
                    )}
                  </div>
                </div>
                {r.direction !== "paid" && <div className="font-medium">{fmt(r.amount)}</div>}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-xl bg-field p-3">
          <div className="text-xs text-muted">
            Demo only: time doesn&apos;t pass here, so fast-forward to see nudges go out.
          </div>
          <Button variant="secondary" onClick={s.advanceDay}>Fast-forward 1 day</Button>
          <Button
            disabled={plan.due.length === 0}
            onClick={() => {
              s.runReminders();
              setTab("nudges");
            }}
          >
            Send due nudges ({plan.due.length})
          </Button>
        </div>
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
          { value: "activity", label: "Activity" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "activity" ? (
        activity.length === 0 ? (
          <p className="py-8 text-center text-ink2">Nothing has happened yet. Add a bill to get started.</p>
        ) : (
          <ol className="space-y-1">
            {activity.map((e, i) => {
              const Icon = { bill: Receipt, nudge: Bell, marked_paid: HandCoins, confirmed: CheckCircle2 }[e.kind];
              return (
                <li
                  key={e.id}
                  className="item-in flex items-start gap-3 py-2"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint text-tinttext">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{e.text}</div>
                    <div className="text-xs text-muted">{agoLabel(e.at, s.now())}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )
      ) : tab === "nudges" ? (
        <div className="space-y-5">
          <NudgeList title="You sent" items={sent} empty="You haven't nudged anyone yet." />
          <NudgeList title="You received" items={received} empty="Nobody has nudged you." />
        </div>
      ) : tab === "feed" ? (
        s.bills.length === 0 ? (
          <p className="py-8 text-center text-ink2">No bills yet. Add the first one.</p>
        ) : (
          <div className="space-y-2">
            {s.bills.map((bill, i) => {
              const mine = s.shares.find((x) => x.bill_id === bill.id && x.profile_id === me);
              const prog = billProgress(
                s.shares.filter((x) => x.bill_id === bill.id),
                bill.paid_by,
              );
              return (
                <Link
                  key={bill.id}
                  href={`/bills/${bill.id}`}
                  className="item-in press block"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <Card className="mb-2 space-y-2 !p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.profile(bill.paid_by)?.name ?? "?"} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{bill.name}</div>
                        <div className="text-sm text-ink2">{nameOf(bill.paid_by)} paid</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{fmt(bill.total_amount)}</div>
                        {mine && bill.paid_by !== me && <StatusPill status={mine.status} />}
                      </div>
                    </div>
                    <Bar paid={prog.paid} total={prog.total} />
                    <div className="text-xs text-muted">
                      {prog.paid === prog.total ? "Everyone has paid" : `${prog.paid} of ${prog.total} paid`}
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
