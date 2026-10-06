import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "../forms";
import { NotConfigured } from "../NotConfigured";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) return <NotConfigured />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Set a new password</h1>
      <div className="mt-5">
        {data.user ? (
          <ResetPasswordForm />
        ) : (
          <Alert tone="warning" title="Link expired">
            This reset link is invalid or has expired. <Link href="/forgot-password" className="font-medium underline">Request a new one</Link>.
          </Alert>
        )}
      </div>
    </>
  );
}
