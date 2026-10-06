import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import type { UserContext } from "@/lib/auth/context";
import { ROLE_LABEL, rolesFor, type RoleKey } from "@/lib/auth/guards";
import { logoutAction } from "@/app/(auth)/actions";
import { avatarUrl } from "@/lib/avatars";
import { Avatar } from "./Avatar";
import { NavTabs, type NavItem } from "./NavTabs";

export async function AppShell({ ctx, current, nav, children }: { ctx: UserContext; current: RoleKey; nav: NavItem[]; children: ReactNode }) {
  const others = rolesFor(ctx).filter((r) => r.key !== current);
  const photo = await avatarUrl(ctx.profile?.avatar_path);
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/account" aria-label="Shuttler home"><Logo /></Link>
          <div className="flex items-center gap-3">
            <Avatar url={photo} name={ctx.profile?.full_name ?? ""} size={36} />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{ctx.profile?.full_name}</p>
              <p className="text-xs text-slate-600">{ROLE_LABEL[current]}</p>
            </div>
            <form action={logoutAction}><Button type="submit" variant="secondary">Log out</Button></form>
          </div>
        </div>
        {others.length > 0 ? (
          <div className="border-t border-slate-100 bg-brand-50">
            <p className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-brand-900">
              <span className="font-semibold">Switch view:</span>
              {others.map((r) => (<Link key={r.key} href={r.href} className="font-medium underline">{r.label}</Link>))}
            </p>
          </div>
        ) : null}
      </header>
      <NavTabs items={nav} />
      <main id="content" className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}
