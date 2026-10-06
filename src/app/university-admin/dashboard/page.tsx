import type { Metadata } from "next";
import Link from "next/link";
import { Alert, EmptyState, StatCard } from "@/components/ui";
import { Panel } from "@/components/app/bits";
import { countMembers, describeAction } from "@/lib/admin/queries";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "University dashboard" };
const PENDING = ["PENDING", "UNDER_REVIEW"] as const;

export default async function UniversityAdminDashboard() {
  const { university } = await requireUniversityAdmin();
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [students, pendingStudents, drivers, pendingDrivers, activity, activeRoutes, stops, shuttles] = await Promise.all([
    countMembers(university.id, "STUDENT"),
    countMembers(university.id, "STUDENT", [...PENDING]),
    countMembers(university.id, "DRIVER"),
    countMembers(university.id, "DRIVER", [...PENDING]),
    supabase.from("audit_logs").select("id, action, created_at, metadata").eq("university_id", university.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("routes").select("id", head).eq("university_id", university.id).eq("status", "ACTIVE"),
    supabase.from("stops").select("id", head).eq("university_id", university.id),
    supabase.from("shuttles").select("id", head).eq("university_id", university.id).eq("status", "ACTIVE"),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-brand-900">{university.name}</h1>
        <p className="text-sm text-slate-600">University administration</p>
      </div>

      {pendingStudents + pendingDrivers > 0 ? (
        <Alert tone="warning" title="Verifications waiting">
          {pendingStudents > 0 ? <><Link href="/university-admin/students" className="font-semibold underline">{pendingStudents} student{pendingStudents === 1 ? "" : "s"}</Link> </> : null}
          {pendingStudents > 0 && pendingDrivers > 0 ? "and " : ""}
          {pendingDrivers > 0 ? <><Link href="/university-admin/drivers" className="font-semibold underline">{pendingDrivers} driver{pendingDrivers === 1 ? "" : "s"}</Link> </> : null}
          need your review.
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Students" value={String(students)} />
        <StatCard label="Pending students" value={String(pendingStudents)} />
        <StatCard label="Drivers" value={String(drivers)} />
        <StatCard label="Pending drivers" value={String(pendingDrivers)} />
        <StatCard label="Active routes" value={String(activeRoutes.count ?? 0)} />
        <StatCard label="Stops" value={String(stops.count ?? 0)} />
        <StatCard label="Shuttles in service" value={String(shuttles.count ?? 0)} />
      </div>

      <Panel title="Recent activity">
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
