"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth/guards";
import { getProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function scanUrl(code: string, error: string) {
  return `/student/scan?c=${encodeURIComponent(code)}&e=${error}`;
}

/** Starts a digital payment for the scanned shuttle. The fare, driver and university are decided by the database. */
export async function startPaymentAction(fd: FormData): Promise<void> {
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");
  const code = text(fd, "code");
  const key = text(fd, "key");
  if (!code || code.length > 300 || !isUuid(key)) redirect("/student/scan");

  const setup = getProvider();
  if (!("provider" in setup)) redirect(scanUrl(code, "disabled"));

  const supabase = await createClient();
  const created = await supabase.rpc("create_payment_intent", { p_input: code, p_idempotency_key: key });
  if (created.error || !created.data) {
    const m = created.error?.message ?? "";
    const reason = m.includes("not in service") ? "service" : m.includes("No driver") ? "driver" : m.includes("No fare") ? "fare" : created.error?.code === "P0002" ? "invalid" : "failed";
    redirect(scanUrl(code, reason));
  }
  const intentId = created.data as string;

  const { data: intent } = await supabase.from("payment_intents").select("status, amount_kobo, provider_reference").eq("id", intentId).maybeSingle();
  if (!intent || intent.status !== "INITIATED") redirect(`/student/payments/${intentId}`);

  let checkoutUrl: string;
  try {
    const started = await setup.provider.initiatePayment({
      intentId, amountKobo: intent.amount_kobo as number, currency: "NGN", description: "Shuttle fare", returnPath: `/student/payments/${intentId}`,
    });
    const db = createAdminClient();
    const marked = await db.rpc("mark_payment_pending", { p_intent_id: intentId, p_provider: setup.provider.id, p_environment: setup.provider.environment, p_reference: started.providerReference });
    if (marked.error) throw new Error("mark failed");
    checkoutUrl = started.checkoutUrl;
  } catch {
    await supabase.rpc("cancel_payment_intent", { p_intent_id: intentId });
    redirect(scanUrl(code, "failed"));
  }
  redirect(checkoutUrl);
}

export async function cancelPaymentAction(fd: FormData): Promise<void> {
  await requireMembership("STUDENT");
  const id = text(fd, "paymentId");
  if (!isUuid(id)) redirect("/student/payments");
  const supabase = await createClient();
  await supabase.rpc("cancel_payment_intent", { p_intent_id: id });
  redirect(`/student/payments/${id}`);
}
