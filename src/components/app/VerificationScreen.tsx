import { Alert, Badge, VerificationBadge } from "@/components/ui";
import type { MembershipInfo, UserContext } from "@/lib/auth/context";
import { formatDate } from "@/lib/format";
import { getSupportContact } from "@/lib/transport/queries";
import { Detail, DetailGrid, Panel } from "./bits";

const COPY: Record<Exclude<MembershipInfo["verification_status"], "APPROVED">, { tone: "warning" | "info" | "danger"; title: string; body: (role: string) => string }> = {
  PENDING: {
    tone: "warning",
    title: "Verification pending",
    body: () => "Your account has been created successfully. A university administrator needs to verify your information before you can access all Shuttler features.",
  },
  UNDER_REVIEW: { tone: "info", title: "Under review", body: () => "An administrator is reviewing your information. You may be contacted if more details are needed." },
  REJECTED: { tone: "danger", title: "Verification not approved", body: () => "Your verification was not approved. Read the note below, then contact your university administrator if you need help." },
  SUSPENDED: { tone: "danger", title: "Access suspended", body: () => "Your access has been suspended by your university administrator." },
};

const NEXT_STEPS: Record<string, string[]> = {
  PENDING: ["Your university administrator reviews the information you submitted.", "You receive a decision. Sign in again to see your updated status.", "Once approved, your dashboard unlocks automatically."],
  UNDER_REVIEW: ["The administrator completes the review.", "Sign in again to see the outcome."],
  REJECTED: ["Contact your university transport office about the decision."],
  SUSPENDED: ["Contact your university transport office to discuss reinstatement."],
};

export async function VerificationScreen({ ctx, membership }: { ctx: UserContext; membership: MembershipInfo }) {
  const status = membership.verification_status;
  if (status === "APPROVED") return null;
  const c = COPY[status];
  const isStudent = membership.role === "STUDENT";
  const contact = await getSupportContact(membership.university?.id);
  return (
    <div className="space-y-5">
      <Alert tone={c.tone} title={c.title}>{c.body(membership.role)}</Alert>
      {membership.review_note ? (
        <Alert tone="info" title="Note from your administrator">{membership.review_note}</Alert>
      ) : null}
      <Panel title="Your application" description={membership.university?.name ?? undefined} action={<VerificationBadge status={status} />}>
        <DetailGrid>
          <Detail label="Account type" value={<Badge tone="neutral">{isStudent ? "Student" : "Driver"}</Badge>} />
          <Detail label="Name" value={ctx.profile?.full_name ?? ""} />
          <Detail label="Email" value={ctx.email ?? ""} />
          {isStudent && ctx.student ? <Detail label="Student ID" value={ctx.student.student_number} /> : null}
          {!isStudent && ctx.driver ? (
            <>
              <Detail label="Licence number" value={ctx.driver.license_number} />
              <Detail label="Vehicle plate" value={ctx.driver.vehicle_plate ?? "Not provided"} />
              <Detail label="Vehicle" value={ctx.driver.vehicle_description ?? "Not provided"} />
            </>
          ) : null}
          {membership.reviewed_at ? <Detail label="Last reviewed" value={formatDate(membership.reviewed_at)} /> : null}
        </DetailGrid>
      </Panel>
      <Panel title="What happens next">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          {(NEXT_STEPS[status] ?? []).map((s) => (<li key={s}>{s}</li>))}
        </ol>
        {contact ? <p className="mt-3 text-sm text-slate-700">Questions? {[contact.email, contact.phone].filter(Boolean).join("  |  ")}</p> : null}
      </Panel>
    </div>
  );
}
