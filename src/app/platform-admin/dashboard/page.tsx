import type { Metadata } from "next";
import Link from "next/link";
import { Alert, EmptyState, StatCard } from "@/components/ui";
import { Panel } from "@/components/app/bits";
import { describeAction } from "@/lib/admin/queries";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Platform dashboard" };

export default async function PlatformDashboard() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [all, active, onboarding, admins, users, pending, activity] = await Promise.all([
    supabase.from("universities").select("id", head),
    supabase.from("universities").select("id", head).eq("status", "ACTIVE"),
    supabase.from("universities").select("id", head).eq("status", "ONBOARDING"),
    supabase.from("university_admins").select("id", head),
    supabase.from("profiles").select("id", head),
    supabase.from("university_memberships").select("id", head).in("verification_status", ["PENDING", "UNDER_REVIEW"]),
    supabase.from("audit_logs").select("id, action, created_at, metadata").order("created_at", { ascending: false }).limit(8),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Platform overview</h1>
        <p className="text-sm text-slate-600">All universities on Shuttler</p>
      </div>

      {(onboarding.count ?? 0) > 0 ? (
        <Alert tone="info" title="Universities onboarding">
          {onboarding.count} {onboarding.count === 1 ? "university is" : "universities are"} still being onboarded. <Link href="/platform-admin/universities" className="font-semibold underline">View universities</Link>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Universities" value={String(all.count ?? 0)} />
        <StatCard label="Active universities" value={String(active.count ?? 0)} />
        <StatCard label="University administrators" value={String(admins.count ?? 0)} />
        <StatCard label="Platform users" value={String(users.count ?? 0)} />
        <StatCard label="Verifications pending" value={String(pending.count ?? 0)} hint="Across all universities" />
      </div>

      <Panel title="Recent platform activity">
        {(activity.data ?? []).length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(activity.data ?? []).map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>{describeAction(a.action as string, a.metadata as { label?: string } | null)}</span>
                <span className="text-slate-500">{formatDate(a.created_at as string)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
