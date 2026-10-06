"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; match?: string[] };

export function NavTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="overflow-x-auto border-b border-slate-200 bg-white print:hidden">
      <ul className="mx-auto flex max-w-5xl gap-1 px-4">
        {items.map((item) => {
          const prefixes = [item.href, ...(item.match ?? [])];
          const active = prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold",
                  active ? "border-brand-700 text-brand-800" : "border-transparent text-slate-600 hover:text-brand-700",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
