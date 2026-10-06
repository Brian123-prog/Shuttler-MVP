import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { ForgotPasswordForm } from "../forms";
import { NotConfigured } from "../NotConfigured";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Reset your password</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Enter your email and we will send you a reset link.</p>
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <NotConfigured />}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-medium text-brand-700 underline">Back to log in</Link></p>
    </>
  );
}
