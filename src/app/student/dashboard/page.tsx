import type { Metadata } from "next";
import { ButtonLink, VerificationBadge } from "@/components/ui";
import { Panel } from "@/components/app/bits";
import { RoutesView } from "@/components/app/RoutesView";
import { VerificationScreen } from "@/components/app/VerificationScreen";
import { requireMembership } from "@/lib/auth/guards";
import { firstName } from "@/lib/format";
import { getSupportContact } from "@/lib/transport/queries";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentDashboard() {
  const { ctx, membership } = await requireMembership("STUDENT");

  if (membership.verification_status !== "APPROVED") {
    return (
      <>
        <h1 className="text-2xl font-bold text-brand-900">Welcome, {firstName(ctx.profile?.full_name)}</h1>
        <VerificationScreen ctx={ctx} membership={membership} />
      </>
    );
  }
  const universityId = membership.university?.id;
  const contact = await getSupportContact(universityId);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Hello, {firstName(ctx.profile?.full_name)}</h1>
          <p className="text-sm text-slate-600">{membership.university?.name}</p>
        </div>
        <VerificationBadge status="APPROVED" />
      </div>
      <ButtonLink href="/student/scan" size="lg" className="w-full sm:w-auto">Scan shuttle QR</ButtonLink>
      {universityId ? <Panel title="Routes and stops"><RoutesView universityId={universityId} /></Panel> : null}
      {contact ? (
        <Panel title="Transport office">
          <p className="text-sm text-slate-700">{[contact.email, contact.phone].filter(Boolean).join("  |  ")}</p>
        </Panel>
      ) : null}
    </>
  );
}
