"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Only the responsible, approved driver can confirm or reject; the database enforces this. */
export async function decideClaimAction(fd: FormData): Promise<void> {
  await requireMembership("DRIVER");
  const id = text(fd, "claimId");
  const decision = text(fd, "decision");
  const note = text(fd, "note");
  if (!isUuid(id) || (decision !== "CONFIRM" && decision !== "REJECT") || note.length > 500) redirect("/driver/claims");

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_change_claim", { p_claim_id: id, p_decision: decision, p_note: note || null });
  revalidatePath("/driver", "layout");
  redirect(error ? "/driver/claims?e=failed" : "/driver/claims");
}
