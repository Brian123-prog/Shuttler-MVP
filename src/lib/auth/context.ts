import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type VerificationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type MembershipInfo = {
  id: string;
  role: "STUDENT" | "DRIVER";
  verification_status: VerificationStatus;
  review_note: string | null;
  reviewed_at: string | null;
  university: { id: string; name: string; short_name: string | null } | null;
};

export type UserContext = {
  userId: string;
  email: string | null;
  profile: { full_name: string; phone: string | null; account_status: "ACTIVE" | "DISABLED"; avatar_path: string | null } | null;
  memberships: MembershipInfo[];
  student: { student_number: string } | null;
  driver: { license_number: string; vehicle_plate: string | null; vehicle_description: string | null } | null;
  isPlatformAdmin: boolean;
  adminUniversities: { id: string; name: string }[];
};

/** Loads identity and database-backed roles. All reads go through RLS as the signed-in user. */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [profile, memberships, student, driver, platform, admins] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, account_status, avatar_path").eq("id", user.id).maybeSingle(),
    supabase
      .from("university_memberships")
      .select("id, role, verification_status, review_note, reviewed_at, university:universities(id, name, short_name)")
      .eq("profile_id", user.id),
    supabase.from("students").select("student_number").eq("profile_id", user.id).maybeSingle(),
    supabase.from("drivers").select("license_number, vehicle_plate, vehicle_description").eq("profile_id", user.id).maybeSingle(),
    supabase.from("platform_admins").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("university_admins").select("university:universities(id, name)").eq("profile_id", user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile.data as UserContext["profile"]) ?? null,
    memberships: ((memberships.data ?? []) as unknown as MembershipInfo[]),
    student: (student.data as UserContext["student"]) ?? null,
    driver: (driver.data as UserContext["driver"]) ?? null,
    isPlatformAdmin: platform.data !== null,
    adminUniversities: ((admins.data ?? []) as unknown as { university: { id: string; name: string } | null }[])
      .map((a) => a.university)
      .filter((u): u is { id: string; name: string } => u !== null),
  };
});
