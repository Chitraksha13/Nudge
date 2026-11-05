"use client";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar, Button, Card, useRequire } from "@/components/ui";
import { balancesFor } from "@/lib/balances";
import { fmt } from "@/lib/money";

export default function Groups() {
  const s = useRequire(false);
  const router = useRouter();
  if (!s || !s.me) return null;

  return (
    <main className="space-y-4 px-4 pb-24 pt-5">
      <h1 className="text-xl font-medium">Your groups</h1>

      {s.households.length === 0 ? (
        <p className="py-8 text-center text-ink2">
          No groups yet. Create one for your apartment, a trip, or anyone you split costs with.
        </p>
      ) : (
        <div className="space-y-2">
          {s.households.map((h) => {
            const ids = s.membersOf(h.id);
            const net = balancesFor(
              s.me!.id,
              s.allBills.filter((b) => b.household_id === h.id),
              s.shares,
            ).net;
            return (
              <button
                key={h.id}
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  s.enter(h.id);
                  router.push("/home");
                }}
              >
                <Card className="space-y-3 !p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-sm text-ink2">
                      {net === 0 ? "Settled up" : net > 0 ? `owed ${fmt(net)}` : `you owe ${fmt(-net)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ids.map((id) => (
                      <Avatar key={id} name={s.profile(id)?.name ?? "?"} />
                    ))}
                    <span className="ml-1 text-sm text-ink2">{ids.length} people</span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted">Got an invite link? Open /join/code to join a group.</p>

      <div className="fixed inset-x-0 bottom-14 mx-auto w-full max-w-[390px] bg-surface px-4 pb-5 pt-3">
        <Button href="/household">
          <span className="inline-flex items-center gap-1.5"><Plus size={18} /> New group</span>
        </Button>
      </div>
    </main>
  );
}
