"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button, Header, useRequire } from "@/components/ui";
import { fmt } from "@/lib/money";
import { cashAppLink, venmoLink, venmoProfile } from "@/lib/payLinks";

const row = "flex w-full items-center justify-between rounded-[14px] border border-line px-4 py-3 text-left";

export default function Pay() {
  const s = useRequire();
  const router = useRouter();
  const { shareId } = useParams<{ shareId: string }>();
  const [method, setMethod] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!s) return null;

  const share = s.shares.find((x) => x.id === shareId);
  const bill = share && s.bills.find((b) => b.id === share.bill_id);
  const to = bill && s.profile(bill.paid_by);
  if (!share || !bill || !to) return <Header title="Payment not found" back="/home" />;

  const noHandles = !to.venmo_username && !to.cashtag && !to.zelle_handle;

  return (
    <main>
      <Header title={`Pay ${to.name}`} back={`/bills/${bill.id}`} />
      <div className="space-y-4 px-4 pb-10">
        <div>
          <div className="text-[30px] font-medium">{fmt(share.amount)}</div>
          <div className="text-ink2">{bill.name}</div>
        </div>

        <div className="space-y-2">
          {to.venmo_username && (
            <>
              <a
                href={venmoLink(to.venmo_username, share.amount, bill.name)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMethod("Venmo")}
                className={row}
              >
                <span className="font-medium">Venmo</span>
                <span className="flex items-center gap-1 text-sm text-ink2">Open Venmo <ExternalLink size={16} /></span>
              </a>
              <a
                href={venmoProfile(to.venmo_username)}
                target="_blank"
                rel="noreferrer"
                className="block px-1 text-xs text-muted underline"
              >
                Venmo didn&apos;t prefill? Open {to.name}&apos;s Venmo profile
              </a>
            </>
          )}
          {to.cashtag && (
            <a
              href={cashAppLink(to.cashtag, share.amount)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMethod("Cash App")}
              className={row}
            >
              <span className="font-medium">Cash App</span>
              <span className="flex items-center gap-1 text-sm text-ink2">Open Cash App <ExternalLink size={16} /></span>
            </a>
          )}
          {to.zelle_handle && (
            <button
              type="button"
              className={row}
              onClick={() => {
                setMethod("Zelle");
                navigator.clipboard?.writeText(to.zelle_handle).catch(() => {});
                setCopied(true);
              }}
            >
              <span>
                <span className="block font-medium">Zelle</span>
                <span className="block text-sm text-ink2">
                  Send {fmt(share.amount)} to {to.zelle_handle}
                </span>
              </span>
              <span className="flex items-center gap-1 text-sm text-ink2">
                {copied ? "Copied" : "Copy"} <Copy size={16} />
              </span>
            </button>
          )}
          {noHandles && (
            <p className="rounded-xl bg-field p-3 text-sm text-ink2">
              {to.name} hasn&apos;t added any payment methods yet. Pay them another way, then mark it paid.
            </p>
          )}
        </div>

        <Button
          onClick={() => {
            s.markPaid(share.id, method ?? "other");
            router.push(`/bills/${bill.id}`);
          }}
        >
          I&apos;ve paid
        </Button>
      </div>
    </main>
  );
}
