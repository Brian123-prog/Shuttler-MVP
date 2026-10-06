"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { compactErrors, isUuid, validateEmail, validateText } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/state";

const STATUSES = new Set(["ONBOARDING", "ACTIVE", "SUSPENDED"]);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export async function saveUniversityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  const v = { name: text(formData, "name").trim(), shortName: text(formData, "shortName").trim(), slug: text(formData, "slug").trim().toLowerCase(), status: text(formData, "status") };

  const fieldErrors = compactErrors({
    name: validateText("Name", v.name, 2, 200),
    shortName: v.shortName.length > 20 ? "Use at most 20 characters." : null,
    slug: v.slug.length >= 2 && v.slug.length <= 60 && SLUG.test(v.slug) ? null : "Use 2 to 60 lowercase letters, numbers and single hyphens.",
    status: STATUSES.has(v.status) ? null : "Select a status.",
  });
  if (id && !isUuid(id)) return { error: "Invalid request." };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: v };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_save_university", {
    p_id: id || null, p_name: v.name, p_short_name: v.shortName || null, p_slug: v.slug, p_status: v.status,
  });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "That slug is already used by another university." }, values: v };
    if (error.code === "42501") return { error: "You are not allowed to do this." , values: v };
    return { error: "Could not save the university. Please try again.", values: v };
  }
  revalidatePath("/platform-admin", "layout");
  if (!id) redirect("/platform-admin/universities");
  return { message: "University saved.", values: v };
}

export async function assignAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const universityId = text(formData, "universityId");
  const email = text(formData, "email").trim();
  const emailError = validateEmail(email);
  if (!isUuid(universityId)) return { error: "Invalid request." };
  if (emailError) return { fieldErrors: { email: emailError }, values: { email } };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_assign_university_admin", { p_university_id: universityId, p_email: email });
  if (error) {
    if (error.code === "42501") return { error: "You are not allowed to do this.", values: { email } };
    return { error: "Could not add the administrator. Please try again.", values: { email } };
  }
  revalidatePath("/platform-admin", "layout");
  return {
    message: data === "ASSIGNED" ? "Administrator added. They already have an account and now have access." : "Invitation saved. Access activates when this person signs in with this email address.",
  };
}
