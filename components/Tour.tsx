"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

const STEPS = [
  { title: "Your balance", body: "See what you're owed and what you owe in this group, updated as bills get paid." },
  { title: "Nudges", body: "Pick how often roommates get reminded. Nudge sends them for you, so you never have to ask." },
  { title: "New bill", body: "Add a bill, split it equally, by amount or by percent, and everyone is told right away." },
  { title: "Move around", body: "Use the bar at the bottom to switch between groups, this group, your payment info and About." },
];

export function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 fade-in">
      <div className="sheet-in mb-20 w-[calc(100%-32px)] max-w-[358px] space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Step {i + 1} of {STEPS.length}
          </span>
          <button type="button" onClick={onDone} className="underline">
            Skip tour
          </button>
        </div>
        <div className="text-lg font-medium">{STEPS[i].title}</div>
        <p className="text-ink2">{STEPS[i].body}</p>
        <div className="flex gap-1.5">
          {STEPS.map((_, n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-accent" : "bg-field"}`} />
          ))}
        </div>
        <Button onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "Got it" : "Next"}</Button>
      </div>
    </div>
  );
}
