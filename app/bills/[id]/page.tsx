"use client";
import { useParams } from "next/navigation";
import { Avatar, Button, Card, Header, StatusPill, useRequire } from "@/components/ui";
import { fmt } from "@/lib/money";
import { Ring } from "@/components/Progress";
import { billProgress } from "@/lib/progress";

export default function BillDetail() {
  const s = useRequire();
  const { id } = useParams<{ id: string }>();
  if (!s || !s.me) return null;
  const bill = s.bills.find((b) => b.id === id);
  if (!bill) return <Header title="Bill not found" back="/home" />;

  const me = s.me.id;
  const payerName = bill.paid_by === me ? "You" : s.profile(bill.paid_by)?.name;
  const rows = s.shares.filter((x) => x.bill_id === bill.id);
  const prog = billProgress(rows, bill.paid_by);
  const waitingOn = rows
    .filter((x) => x.status === "waiting" && x.profile_id !== bill.paid_by)
    .map((x) => (x.profile_id === me ? "you" : s.profile(x.profile_id)?.name ?? "someone"));

  return (
    <main>
      <Header title={bill.name} back="/home" />
      <div className="space-y-4 px-4 pb-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[28px] font-medium">{fmt(bill.total_amount)}</div>
            <div className="text-ink2">
              {payerName} paid · {bill.split_mode} split
            </div>
            <div className="mt-1 text-sm text-ink2">
              {prog.paid === prog.total ? "Everyone has paid" : `${prog.paid} of ${prog.total} paid`}
            </div>
          </div>
          <Ring paid={prog.paid} total={prog.total} size={72} />
        </div>
        {waitingOn.length > 0 && (
          <div className="space-y-2 rounded-xl bg-field p-3">
            <div className="text-sm text-ink2">
              Waiting on {waitingOn.join(", ")}
            </div>
            {bill.paid_by === me && (
              <Button variant="secondary" onClick={() => s.nudgeBill(bill.id)}>
                Nudge everyone who owes
              </Button>
            )}
          </div>
        )}
        <div className="space-y-2">
          {rows.map((x) => {
            const p = s.profile(x.profile_id);
            const isPayer = x.profile_id === bill.paid_by;
            return (
              <Card key={x.id} className="space-y-2 !p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p?.name ?? "?"} />
                  <div className="flex-1">
                    <div>{x.profile_id === me ? "You" : p?.name}</div>
                    <div className="text-sm text-ink2">{fmt(x.amount)}</div>
                  </div>
                  {isPayer ? <span className="text-sm text-muted">Paid the bill</span> : <StatusPill status={x.status} />}
                </div>
                {!isPayer && x.paid_method && x.paid_method !== "demo" && (
                  <div className="text-xs text-muted">Paid via {x.paid_method}</div>
                )}
                {!isPayer && x.profile_id === me && x.status === "waiting" && (
                  <Button href={`/pay/${x.id}`}>Pay {s.profile(bill.paid_by)?.name}</Button>
                )}
                {bill.paid_by === me && x.status === "marked_paid" && (
                  <Button onClick={() => s.confirm(x.id)}>Confirm payment</Button>
                )}
                {bill.paid_by === me && x.status === "waiting" && !isPayer && (
                  <Button variant="secondary" onClick={() => s.markPaid(x.id, "demo")}>
                    Demo: mark paid as {p?.name}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
