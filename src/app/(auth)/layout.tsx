import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <Link href="/" aria-label="Shuttler home" className="mb-6 self-start"><Logo /></Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
    </main>
  );
}
