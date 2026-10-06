import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/validation";
import { LoginForm } from "../forms";
import { NotConfigured } from "../NotConfigured";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Log in</h1>
      <div className="mb-5" />
      {error === "link" ? <div className="mb-4"><Alert tone="warning" title="Link problem">That link is invalid or has expired. Log in, or request a new link.</Alert></div> : null}
      {isSupabaseConfigured() ? <LoginForm next={safeNextPath(next)} /> : <NotConfigured />}
      <p className="mt-6 text-center text-sm text-slate-700">
        New to Shuttler? <Link href="/register" className="font-medium text-brand-700 underline">Create an account</Link>
      </p>
    </>
  );
}
