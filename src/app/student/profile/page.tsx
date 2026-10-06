import type { Metadata } from "next";
import { Detail, DetailGrid, Panel } from "@/components/app/bits";
import { AvatarUploader } from "@/components/app/AvatarUploader";
import { ProfileForm } from "@/components/app/ProfilePanel";
import { avatarUrl } from "@/lib/avatars";
import { VerificationBadge } from "@/components/ui";
import { requireMembership } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Profile" };

export default async function StudentProfile() {
  const { ctx, membership } = await requireMembership("STUDENT");
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Profile</h1>
      <Panel title="Account status" action={<VerificationBadge status={membership.verification_status} />}>
        <DetailGrid>
          <Detail label="University" value={membership.university?.name ?? ""} />
          <Detail label="Student ID" value={ctx.student?.student_number ?? ""} />
        </DetailGrid>
      </Panel>
      <Panel title="Profile picture">
        <AvatarUploader currentUrl={await avatarUrl(ctx.profile?.avatar_path)} name={ctx.profile?.full_name ?? ""} hasPhoto={Boolean(ctx.profile?.avatar_path)} />
      </Panel>
      <Panel title="Your details">
        <ProfileForm fullName={ctx.profile?.full_name ?? ""} phone={ctx.profile?.phone ?? ""} email={ctx.email ?? ""} />
      </Panel>
    </>
  );
}
