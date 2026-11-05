"use client";
import { useParams, useRouter } from "next/navigation";
import { Button, Header, useRequire } from "@/components/ui";

export default function Join() {
  const s = useRequire(false);
  const router = useRouter();
  const { code } = useParams<{ code: string }>();
  if (!s) return null;

  const existing = s.households.find((h) => h.invite_code === code);

  return (
    <main>
      <Header title="Join a group" back="/groups" />
      <div className="space-y-4 px-4">
        {existing ? (
          <>
            <p className="text-ink2">You are already in {existing.name}.</p>
            <Button
              onClick={() => {
                s.enter(existing.id);
                router.push("/home");
              }}
            >
              Open {existing.name}
            </Button>
          </>
        ) : (
          <>
            <p className="text-ink2">
              Invite code <span className="text-ink">{code}</span>. In demo mode this joins a sample group with Jay,
              Rob and Leo.
            </p>
            <Button
              onClick={() => {
                s.joinDemoHousehold(code);
                router.push("/home");
              }}
            >
              Join The flat
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
