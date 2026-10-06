import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, DataTable, EmptyState, VerificationBadge } from "@/components/ui";
import { listMembers, STATUS_FILTERS } from "@/lib/admin/queries";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Students" };

const TABS = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["suspended", "Suspended"],
  ["all", "All"],
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { university } = await requireUniversityAdmin();
  const { status } = await searchParams;
  const filter = status && status in STATUS_FILTERS ? status : "pending";
  const rows = await listMembers(university.id, "STUDENT", filter);

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Students</h1>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/university-admin/students?status=${key}`}
            aria-current={filter === key ? "true" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", filter === key ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-brand-50")}
          >
            {label}
          </Link>
        ))}
      </nav>
      <DataTable
        caption="Students"
        rows={rows}
        rowKey={(r) => r.membershipId}
        empty={<EmptyState title={filter === "pending" ? "Nothing waiting for review" : "No students found"} description={filter === "pending" ? "New registrations will appear here for verification." : "Try another filter."} />}
        columns={[
          { key: "n", header: "Name", render: (r) => <span className="font-medium">{r.fullName}</span> },
          { key: "i", header: "Student ID", render: (r) => r.studentNumber ?? "" },
          { key: "d", header: "Submitted", render: (r) => formatDate(r.submittedAt) },
          { key: "s", header: "Status", render: (r) => <VerificationBadge status={r.status} /> },
          { key: "a", header: "Action", render: (r) => <ButtonLink href={`/university-admin/review/${r.membershipId}?from=students`} variant="secondary">Review</ButtonLink> },
        ]}
      />
    </>
  );
}
