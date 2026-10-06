"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getProvider } from "@/lib/payments";
import { signMockPayload } from "@/lib/payments/mock";
import { handleProviderWebhook } from "@/lib/payments/process";
import { createAdminClient } from "@/lib/supabase/admin";

/** The test provider's customer step: record the outcome in the provider's ledger, then send the signed webhook the way a real provider would. */
async function finish(fd: FormData, outcome: "SUCCESS" | "FAILED"): Promise<void> {
  const setup = getProvider();
  const reference = String(fd.get("reference") ?? "");
  if (!("provider" in setup) || setup.provider.id !== "mock" || !/^MOCK-[0-9a-f-]{36}$/.test(reference)) redirect("/");

  const db = createAdminClient();
  const { data: tx } = await db.from("mock_provider_transactions").select("status, return_path").eq("reference", reference).maybeSingle();
  if (!tx) redirect("/");
  if (tx.status === "PENDING") {
    await db.from("mock_provider_transactions").update({ status: outcome, completed_at: new Date().toISOString() }).eq("reference", reference).eq("status", "PENDING");
    const body = JSON.stringify({ id: `evt_${randomUUID()}`, reference, type: outcome === "SUCCESS" ? "payment.succeeded" : "payment.failed" });
    await handleProviderWebhook(setup.provider, body, signMockPayload(body, setup.webhookSecret));
  }
  const back = (tx.return_path as string | null) ?? "/";
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}

export async function completeMockPaymentAction(fd: FormData): Promise<void> {
  await finish(fd, "SUCCESS");
}
export async function declineMockPaymentAction(fd: FormData): Promise<void> {
  await finish(fd, "FAILED");
}
