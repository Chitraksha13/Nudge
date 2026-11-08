"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Header, Input, Label, useRequire } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PaymentMethods() {
  const s = useRequire(false);
  const router = useRouter();
  const [venmo, setVenmo] = useState(s?.me?.venmo_username ?? "");
  const [cash, setCash] = useState(s?.me?.cashtag ?? "");
  const [zelle, setZelle] = useState(s?.me?.zelle_handle ?? "");
  if (!s) return null;

  const ok = venmo.trim() || cash.trim() || zelle.trim();
  const save = () => {
    s.savePayment({
      venmo_username: venmo.trim().replace(/^@/, ""),
      cashtag: cash.trim().replace(/^\$/, ""),
      zelle_handle: zelle.trim(),
    });
    router.push("/groups");
  };

  return (
    <main>
      <Header title="How should friends pay you?" back={s.households.length ? "/groups" : undefined} />
      <div className="space-y-4 px-4 pb-8">
        <p className="text-ink2">Add at least one. Roommates only see the options you fill in.</p>
        <div>
          <Label>Venmo username</Label>
          <Input value={venmo} onChange={(e) => setVenmo(e.target.value)} placeholder="@username" />
        </div>
        <div>
          <Label>Cash App $cashtag</Label>
          <Input value={cash} onChange={(e) => setCash(e.target.value)} placeholder="$cashtag" />
        </div>
        <div>
          <Label>Zelle email or phone</Label>
          <Input value={zelle} onChange={(e) => setZelle(e.target.value)} placeholder="you@email.com" />
        </div>
        <Button disabled={!ok} onClick={save}>Save</Button>
        <div className="border-t border-line pt-4">
          <Label>Appearance</Label>
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
