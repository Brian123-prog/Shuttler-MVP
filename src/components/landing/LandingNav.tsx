import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  ["#top", "Home"],
  ["#how-it-works", "How it works"],
  ["#students", "For students"],
  ["#drivers", "For drivers"],
  ["#universities", "For universities"],
] as const;

const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800";

/** Public navigation. Section links stay on the page; Sign in and Get started use the existing authentication routes. */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="Shuttler home"><Logo /></Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-800">{label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 sm:inline-flex">Sign in</Link>
          <Link href="/register" className={primary}>Get started</Link>
          <details className="relative lg:hidden">
            <summary aria-label="Open menu" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 text-brand-800 [&::-webkit-details-marker]:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </summary>
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {LINKS.map(([href, label]) => (
                <a key={href} href={href} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-brand-50">{label}</a>
              ))}
              <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Sign in</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
