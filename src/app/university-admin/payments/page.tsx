import type { Metadata } from "next";
import { Badge, DataTable, EmptyState, StatCard } from "@/components/ui";
import { PaymentBadge } from "@/components/app/PaymentBits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import type { PaymentStatus } from "@/lib/payments/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

type Row = { id: string; status: PaymentStatus; amount_kobo: number; provider_environment: string | null; created_at: string; student_id: string; shuttle_id: string };

export default async function AdminPaymentsPage() {
  const { university } = await requireUniversityAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_intents").select("id, status, amount_kobo, provider_environment, created_at, student_id, shuttle_id")
    .eq("university_id", university.id).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as Row[];

  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const shuttleIds = [...new Set(rows.map((r) => r.shuttle_id))];
  const [profiles, shuttles] = await Promise.all([
    studentIds.length ? supabase.from("profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] }),
    shuttleIds.length ? supabase.from("shuttles").select("id, code").in("id", shuttleIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((profiles.data ?? []).map((p) => [p.id as string, p.full_name as string]));
  const codes = new Map((shuttles.data ?? []).map((s) => [s.id as string, s.code as string]));

  const completed = rows.filter((r) => r.status === "SUCCESS");
  const collected = completed.filter((r) => r.provider_environment !== "MOCK").reduce((sum, r) => sum + r.amount_kobo, 0);
  const testCount = rows.filter((r) => r.provider_environment === "MOCK").length;

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Payments</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Completed payments" value={String(completed.length)} />
        <StatCard label="Collected" value={formatKobo(collected)} hint="Excludes test payments" />
        {testCount > 0 ? <StatCard label="Test payments" value={String(testCount)} hint="No real money moved" /> : null}
      </div>
      <DataTable
        caption="Payments"
        rows={rows}
        rowKey={(r) => r.id}
        empty={<EmptyState title="No payments yet" />}
        columns={[
          { key: "d", header: "Date", render: (r) => formatDateTime(r.created_at) },
          { key: "s", header: "Student", render: (r) => names.get(r.student_id) ?? "Unknown" },
          { key: "h", header: "Shuttle", render: (r) => codes.get(r.shuttle_id) ?? "" },
          { key: "a", header: "Amount", render: (r) => formatKobo(r.amount_kobo) },
          { key: "t", header: "Status", render: (r) => (<span className="inline-flex items-center gap-2"><PaymentBadge status={r.status} />{r.provider_environment === "MOCK" ? <Badge tone="neutral">Test</Badge> : null}</span>) },
        ]}
      />
    </>
  );
}
