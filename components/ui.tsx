"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";

const primary =
  "block w-full rounded-full bg-accent py-2.5 text-center font-medium text-onaccent disabled:opacity-40";
const secondary =
  "block w-full rounded-full border border-line bg-transparent py-2.5 text-center font-medium text-ink disabled:opacity-40";

export function Button({
  variant = "primary",
  href,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; href?: string }) {
  const cls = `${variant === "primary" ? primary : secondary} ${className}`;
  if (href) return <Link href={href} className={cls}>{props.children}</Link>;
  return <button type="button" {...props} className={cls} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl bg-field px-3 py-2.5 text-ink outline-none ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm text-ink2">{children}</label>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</div>;
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-tint text-xs font-medium text-tinttext">
      {name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "tint"; children: React.ReactNode }) {
  const t = { ok: "bg-oktint text-oktext", warn: "bg-warntint text-warntext", tint: "bg-tint text-tinttext" }[tone];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-field p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-full border py-1.5 text-sm ${
            o.value === value ? "border-line bg-surface font-medium text-ink" : "border-transparent text-ink2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Header({ title, back }: { title: string; back?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-2 pt-5">
      {back && (
        <Link href={back} aria-label="Back" className="-ml-1 p-1 text-ink2">
          <ArrowLeft size={20} />
        </Link>
      )}
      <h1 className="text-xl font-medium">{title}</h1>
    </div>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-10 mx-auto w-[calc(100%-32px)] max-w-[358px] rounded-xl border border-line bg-surface px-4 py-3 text-center text-sm">
      {toast}
    </div>
  );
}

/** Redirects to sign-in when there is no demo session (e.g. after a reload) and to household setup if needed. */
export function useRequire(needHousehold = true) {
  const s = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!s.me) router.replace("/");
    else if (needHousehold && !s.household) router.replace("/groups");
  }, [s.me, s.household, needHousehold, router]);
  return s.me && (!needHousehold || s.household) ? s : null;
}

export function StatusPill({ status }: { status: "waiting" | "marked_paid" | "confirmed" }) {
  if (status === "confirmed") return <Pill tone="ok">Confirmed</Pill>;
  if (status === "marked_paid") return <Pill tone="tint">Marked paid</Pill>;
  return <Pill tone="warn">Waiting</Pill>;
}
