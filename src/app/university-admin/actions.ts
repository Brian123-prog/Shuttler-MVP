"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/state";

const DECISIONS = new Set(["UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]);
const RETURN_TARGETS = new Set(["/university-admin/students", "/university-admin/drivers"]);

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export async function reviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "membershipId");
  const decision = text(formData, "decision");
  const note = text(formData, "note").trim();
  const returnTo = text(formData, "returnTo");

  if (!isUuid(id) || !DECISIONS.has(decision)) return { error: "Invalid request." };
  if ((decision === "REJECTED" || decision === "SUSPENDED") && !note) {
    return { fieldErrors: { note: "Add a note explaining this decision." }, values: { note } };
  }
  if (note.length > 1000) return { fieldErrors: { note: "Use at most 1000 characters." }, values: { note } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_membership", { p_membership_id: id, p_decision: decision, p_note: note || null });
  if (error) {
    if (error.code === "42501") return { error: "You are not allowed to review this account.", values: { note } };
    if (error.code === "P0001") return { error: error.message, values: { note } };
    return { error: "Could not save the decision. Please try again.", values: { note } };
  }
  revalidatePath("/university-admin", "layout");
  redirect(RETURN_TARGETS.has(returnTo) ? returnTo : "/university-admin/dashboard");
}
