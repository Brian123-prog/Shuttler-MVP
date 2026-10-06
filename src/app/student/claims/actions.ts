"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth/guards";
import { parseNairaToKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
const scanUrl = (code: string, error: string) => `/student/scan?c=${encodeURIComponent(code)}&e=${error}`;

/** Records cash handed to the driver. The fare, the driver and the change owed are decided by the database. */
export async function createClaimAction(fd: FormData): Promise<void> {
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");
  const code = text(fd, "code");
  const key = text(fd, "key");
  if (!code || code.length > 300 || !isUuid(key)) redirect("/student/scan");

  const cash = parseNairaToKobo(text(fd, "cash"));
  if (cash === null || cash < 1 || cash > 10_000_000) redirect(scanUrl(code, "amount"));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_change_claim", { p_input: code, p_cash_kobo: cash, p_idempotency_key: key });
  if (error || !data) {
    const m = error?.message ?? "";
    const reason = m.includes("not in service") ? "service" : m.includes("No driver") ? "driver" : m.includes("No fare") ? "fare"
      : m.includes("more than the fare") ? "cash" : m.includes("already have claims") ? "limit" : m.includes("too large") ? "amount"
      : error?.code === "P0002" ? "invalid" : "failed";
    redirect(scanUrl(code, reason));
  }
  revalidatePath("/student/claims");
  redirect(`/student/claims/${data as string}`);
}

export async function cancelClaimAction(fd: FormData): Promise<void> {
  await requireMembership("STUDENT");
  const id = text(fd, "claimId");
  if (!isUuid(id)) redirect("/student/claims");
  const supabase = await createClient();
  await supabase.rpc("cancel_change_claim", { p_claim_id: id });
  revalidatePath("/student/claims");
  redirect(`/student/claims/${id}`);
}

export async function disputeClaimAction(fd: FormData): Promise<void> {
  await requireMembership("STUDENT");
  const id = text(fd, "claimId");
  const reason = text(fd, "reason");
  if (!isUuid(id)) redirect("/student/claims");
  if (reason.length < 5 || reason.length > 1000) redirect(`/student/claims/${id}?e=reason`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispute_change_claim", { p_claim_id: id, p_reason: reason });
  if (error) redirect(`/student/claims/${id}?e=failed`);
  revalidatePath("/student/claims");
  redirect(`/student/claims/${id}`);
}
