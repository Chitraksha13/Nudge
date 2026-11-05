"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Users, Home, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";

export function TabBar() {
  const path = usePathname();
  const { me, household } = useStore();
  if (!me || path === "/") return null;

  const inGroup = path.startsWith("/home") || path.startsWith("/bills") || path.startsWith("/pay");
  const tabs = [
    { href: "/groups", label: "Groups", Icon: Users, active: path.startsWith("/groups") || path.startsWith("/household") || path.startsWith("/join") },
    { href: household ? "/home" : "/groups", label: "Group", Icon: Home, active: inGroup, dim: !household },
    { href: "/payment-methods", label: "Payments", Icon: Wallet, active: path.startsWith("/payment-methods") },
    { href: "/about", label: "About", Icon: CircleHelp, active: path.startsWith("/about") },
  ];

  return (
    <>
      <div className="h-14" />
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-14 w-full max-w-[390px] border-t border-line bg-surface">
        {tabs.map(({ href, label, Icon, active, dim }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              active ? "font-medium text-accent" : dim ? "text-muted" : "text-ink2"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
