"use client";
import { useParams } from "next/navigation";
import { Avatar, Button, Card, Header, StatusPill, useRequire } from "@/components/ui";
import { fmt } from "@/lib/money";

function ago(t: number | null) {
  if (!t) return "never";
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
}

export default function BillDetail() {
  const s = useRequire();
  const { id } = useParams<{ id: string }>();
  if (!s || !s.me) return null;
  const bill = s.bills.find((b) => b.id === id);
  if (!bill) return <Header title="Bill not found" back="/home" />;

  const me = s.me.id;
  const payerName = bill.paid_by === me ? "You" : s.profile(bill.paid_by)?.name;
  const rows = s.shares.filter((x) => x.bill_id === bill.id);

  return (
    <main>
      <Header title={bill.name} back="/home" />
      <div className="space-y-4 px-4 pb-10">
        <div>
          <div className="text-[28px] font-medium">{fmt(bill.total_amount)}</div>
          <div className="text-ink2">
            {payerName} paid · {bill.split_mode} split
          </div>
        </div>
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
                {!isPayer && (
                  <div className="text-xs text-muted">
                    Last reminder: {x.status === "confirmed" ? "n/a" : ago(x.last_reminded_at)}
                    {x.paid_method ? ` · paid via ${x.paid_method}` : ""}
                  </div>
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
