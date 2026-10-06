import "server-only";
import { redirect } from "next/navigation";
import { getUserContext, type MembershipInfo, type UserContext } from "./context";

export type RoleKey = "platform-admin" | "university-admin" | "student" | "driver";

export const ROLE_LABEL: Record<RoleKey, string> = {
  "platform-admin": "Platform administrator",
  "university-admin": "University administrator",
  student: "Student",
  driver: "Driver",
};

export function rolesFor(ctx: UserContext): { key: RoleKey; label: string; href: string }[] {
  const roles: { key: RoleKey; label: string; href: string }[] = [];
  if (ctx.isPlatformAdmin) roles.push({ key: "platform-admin", label: ROLE_LABEL["platform-admin"], href: "/platform-admin/dashboard" });
  if (ctx.adminUniversities.length > 0) roles.push({ key: "university-admin", label: ROLE_LABEL["university-admin"], href: "/university-admin/dashboard" });
  if (ctx.memberships.some((m) => m.role === "STUDENT")) roles.push({ key: "student", label: ROLE_LABEL.student, href: "/student/dashboard" });
  if (ctx.memberships.some((m) => m.role === "DRIVER")) roles.push({ key: "driver", label: ROLE_LABEL.driver, href: "/driver/dashboard" });
  return roles;
}

export function homeFor(ctx: UserContext): string | null {
  return rolesFor(ctx)[0]?.href ?? null;
}

async function requireUser(): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");
  if (ctx.profile?.account_status === "DISABLED") redirect("/account");
  return ctx;
}

export async function requireMembership(role: "STUDENT" | "DRIVER"): Promise<{ ctx: UserContext; membership: MembershipInfo }> {
  const ctx = await requireUser();
  const membership = ctx.memberships.find((m) => m.role === role);
  if (!membership) redirect("/account");
  return { ctx, membership };
}

export async function requireUniversityAdmin(): Promise<{ ctx: UserContext; university: { id: string; name: string } }> {
  const ctx = await requireUser();
  const university = ctx.adminUniversities[0];
  if (!university) redirect("/account");
  return { ctx, university };
}

export async function requirePlatformAdmin(): Promise<UserContext> {
  const ctx = await requireUser();
  if (!ctx.isPlatformAdmin) redirect("/account");
  return ctx;
}
