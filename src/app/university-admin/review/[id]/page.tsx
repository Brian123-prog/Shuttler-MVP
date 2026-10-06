import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, EmptyState, VerificationBadge } from "@/components/ui";
import { Avatar } from "@/components/app/Avatar";
import { Detail, DetailGrid, Panel } from "@/components/app/bits";
import { avatarUrl } from "@/lib/avatars";
import { getMember } from "@/lib/admin/queries";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { isUuid } from "@/lib/validation";
import { ReviewForm, type ReviewOption } from "./ReviewForm";

export const metadata: Metadata = { title: "Review" };

const OPTIONS: Record<string, ReviewOption[]> = {
  PENDING: [
    { decision: "APPROVED", label: "Approve", variant: "primary" },
    { decision: "UNDER_REVIEW", label: "Mark under review", variant: "secondary" },
    { decision: "REJECTED", label: "Reject", variant: "danger" },
  ],
  UNDER_REVIEW: [
    { decision: "APPROVED", label: "Approve", variant: "primary" },
    { decision: "REJECTED", label: "Reject", variant: "danger" },
  ],
  APPROVED: [{ decision: "SUSPENDED", label: "Suspend", variant: "danger" }],
  SUSPENDED: [{ decision: "APPROVED", label: "Reinstate", variant: "primary" }],
  REJECTED: [{ decision: "UNDER_REVIEW", label: "Reopen review", variant: "secondary" }],
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { university, ctx } = await requireUniversityAdmin();
  if (!isUuid(id)) notFound();
  const m = await getMember(university.id, id);
  if (!m) notFound();

  const photo = await avatarUrl(m.avatarPath);
  const isStudent = m.role === "STUDENT";
  const backTo = isStudent ? "/university-admin/students" : "/university-admin/drivers";
  const isSelf = m.profileId === ctx.userId;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar url={photo} name={m.fullName} size={64} />
          <div>
          <h1 className="text-2xl font-bold text-brand-900">{m.fullName}</h1>
          <p className="text-sm text-slate-600">{isStudent ? "Student" : "Driver"} application</p>
          </div>
        </div>
        <VerificationBadge status={m.status} />
      </div>

      <Panel title="Submitted information">
        <DetailGrid>
          <Detail label="Name" value={m.fullName} />
          <Detail label="Phone" value={m.phone ?? "Not provided"} />
          {isStudent ? <Detail label="Student ID" value={m.studentNumber ?? ""} /> : null}
          {!isStudent ? (
            <>
              <Detail label="Licence number" value={m.licenseNumber ?? ""} />
              <Detail label="Vehicle plate" value={m.vehiclePlate ?? "Not provided"} />
              <Detail label="Vehicle" value={m.vehicleDescription ?? "Not provided"} />
            </>
          ) : null}
          <Detail label="Submitted" value={formatDate(m.submittedAt)} />
          {m.reviewedAt ? <Detail label="Last reviewed" value={formatDate(m.reviewedAt)} /> : null}
          {m.reviewNote ? <Detail label="Previous note" value={m.reviewNote} /> : null}
        </DetailGrid>
      </Panel>

      <Panel title="Decision">
        {isSelf ? (
          <EmptyState title="You cannot review your own account" />
        ) : (
          <ReviewForm membershipId={m.membershipId} returnTo={backTo} options={OPTIONS[m.status] ?? []} />
        )}
      </Panel>
      <ButtonLink href={backTo} variant="ghost">Back to list</ButtonLink>
    </>
  );
}
