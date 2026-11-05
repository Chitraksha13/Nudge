"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function SignIn() {
  const { me, signIn } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");

  // Only skip sign-in if a session already exists on arrival (not right after submitting).
  useEffect(() => {
    if (me) router.replace("/groups");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = () => {
    if (!name.trim()) return;
    signIn(name);
    router.push("/payment-methods");
  };

  return (
    <main className="flex min-h-screen flex-col justify-center gap-6 px-6">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-2xl font-medium text-onaccent">
          N
        </div>
        <h1 className="text-2xl font-medium">Nudge</h1>
        <p className="mt-1 text-ink2">Split bills with roommates. Get paid back without chasing anyone.</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <div>
          <Label>Your name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" autoFocus />
        </div>
        <Button type="submit" disabled={!name.trim()}>Continue</Button>
      </form>
      <p className="rounded-xl bg-field p-3 text-sm text-ink2">
        Demo mode: no account or email needed. Jay, Rob and Leo are already here as your friends. Everything resets
        when you reload the page.
      </p>
    </main>
  );
}
