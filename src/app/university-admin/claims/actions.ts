"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function resolveDisputeAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const id = text(fd, "claimId");
  const outcome = text(fd, "outcome");
  const note = text(fd, "note");
  if (!isUuid(id) || (outcome !== "CLAIM_CONFIRMED" && outcome !== "REJECTION_UPHELD")) redirect("/university-admin/claims");
  if (note.length < 3 || note.length > 1000) redirect(`/university-admin/claims/${id}?e=note`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_dispute", { p_claim_id: id, p_outcome: outcome, p_note: note });
  if (error) redirect(`/university-admin/claims/${id}?e=failed`);
  revalidatePath("/university-admin", "layout");
  redirect(`/university-admin/claims/${id}`);
}
