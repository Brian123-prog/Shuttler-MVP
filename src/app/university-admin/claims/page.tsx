import type { Metadata } from "next";
import { ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { ClaimBadge } from "@/components/app/ClaimBits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import type { ClaimStatus } from "@/lib/claims/queries";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Change claims" };

type Row = { id: string; status: ClaimStatus; cash_kobo: number; change_kobo: number; created_at: string; student_id: string; driver_id: string };

export default async function AdminClaimsPage() {
  const { university } = await requireUniversityAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("change_claims").select("id, status, cash_kobo, change_kobo, created_at, student_id, driver_id")
    .eq("university_id", university.id).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as Row[];

  const driverIds = [...new Set(rows.map((r) => r.driver_id))];
  const { data: drivers } = driverIds.length ? await supabase.from("drivers").select("id, profile_id").in("id", driverIds) : { data: [] };
  const profileIds = [...new Set([...rows.map((r) => r.student_id), ...(drivers ?? []).map((d) => d.profile_id as string)])];
  const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id, full_name").in("id", profileIds) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));
  const driverName = new Map((drivers ?? []).map((d) => [d.id as string, names.get(d.profile_id as string) ?? "Unknown"]));
  const disputed = rows.filter((r) => r.status === "DISPUTED").length;

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Change claims</h1>
      {disputed > 0 ? <p className="text-sm font-medium text-brand-800">{disputed} dispute{disputed === 1 ? "" : "s"} waiting for a decision.</p> : null}
      <DataTable
        caption="Change claims"
        rows={rows}
        rowKey={(r) => r.id}
        empty={<EmptyState title="No claims yet" />}
        columns={[
          { key: "d", header: "Date", render: (r) => formatDateTime(r.created_at) },
          { key: "s", header: "Student", render: (r) => names.get(r.student_id) ?? "Unknown" },
          { key: "v", header: "Driver", render: (r) => driverName.get(r.driver_id) ?? "Unknown" },
          { key: "c", header: "Change", render: (r) => formatKobo(r.change_kobo) },
          { key: "t", header: "Status", render: (r) => <ClaimBadge status={r.status} /> },
          { key: "a", header: "Details", render: (r) => <ButtonLink href={`/university-admin/claims/${r.id}`} variant="secondary">{r.status === "DISPUTED" ? "Review" : "View"}</ButtonLink> },
        ]}
      />
    </>
  );
}
