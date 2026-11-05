"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Header, Input, Label, Segmented, useRequire } from "@/components/ui";
import { FREQUENCIES } from "@/lib/nudge";

export default function Household() {
  const s = useRequire(false);
  const router = useRouter();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>(["jay", "rob", "leo"]);
  const [freq, setFreq] = useState(2);

  if (!s) return null;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <main>
      <Header title="New group" back={s.households.length ? "/groups" : undefined} />
      <div className="space-y-5 px-4 pb-8">
        <div>
          <Label>Group name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The flat, Ski trip, ..." />
        </div>
        <div>
          <Label>Add your friends</Label>
          <div className="space-y-2">
            {s.friends.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className="flex w-full items-center gap-3 rounded-[14px] border border-line px-3 py-2.5 text-left"
              >
                <Avatar name={f.name} />
                <span className="flex-1">{f.name}</span>
                <input type="checkbox" readOnly checked={picked.includes(f.id)} className="accent-[var(--accent)]" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Remind people who haven&apos;t paid every</Label>
          <Segmented
            options={FREQUENCIES.map((f) => ({ value: String(f.value), label: f.label }))}
            value={String(freq)}
            onChange={(v) => setFreq(Number(v))}
          />
        </div>
        <Button
          disabled={!name.trim()}
          onClick={() => {
            s.createHousehold(name, picked, freq);
            router.push("/home");
          }}
        >
          Create group
        </Button>
      </div>
    </main>
  );
}
