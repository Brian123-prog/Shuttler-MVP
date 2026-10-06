import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FinancialProvider } from "./provider";

export type ProcessOutcome = { status: string; duplicate?: boolean; ignored?: boolean };

/**
 * Asks the provider what really happened to a payment and applies the answer. The provider is always asked;
 * a webhook body or a browser request is never trusted on its own. Safe to call repeatedly.
 */
export async function reconcilePayment(provider: FinancialProvider, intentId: string): Promise<ProcessOutcome | null> {
  const db = createAdminClient();
  const { data: intent } = await db
    .from("payment_intents").select("id, status, amount_kobo, provider_reference, expires_at").eq("id", intentId).maybeSingle();
  if (!intent || !intent.provider_reference) return null;
  if (intent.status !== "PENDING" && intent.status !== "INITIATED") return { status: intent.status as string, duplicate: true };

  const result = await provider.verifyPayment(intent.provider_reference as string);
  if (result.status === "PENDING") {
    if (new Date(intent.expires_at as string) < new Date()) {
      const expired = await db.rpc("apply_payment_result", { p_intent_id: intentId, p_outcome: "FAILED", p_amount_kobo: null, p_provider_reference: intent.provider_reference, p_reason: "The payment expired before it was completed" });
      return expired.error ? null : (expired.data as ProcessOutcome);
    }
    return { status: "PENDING" };
  }
  const applied = await db.rpc("apply_payment_result", {
    p_intent_id: intentId,
    p_outcome: result.status,
    p_amount_kobo: result.amountKobo,
    p_provider_reference: intent.provider_reference,
    p_reason: result.reason ?? null,
  });
  if (applied.error) return null;
  return applied.data as ProcessOutcome;
}

/** Handles a provider webhook: dedupe by event id, then reconcile against the provider. Returns false for a bad signature. */
export async function handleProviderWebhook(provider: FinancialProvider, rawBody: string, signature: string | null): Promise<{ ok: boolean; duplicate?: boolean }> {
  const event = provider.verifyWebhook(rawBody, signature);
  const db = createAdminClient();
  if (!event) {
    await db.rpc("record_provider_event", { p_provider: provider.id, p_event_id: `invalid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, p_payload: { rejected: true }, p_valid: false });
    return { ok: false };
  }
  let payload: unknown = {};
  try { payload = JSON.parse(rawBody); } catch { /* verified events are always valid JSON */ }
  const recorded = await db.rpc("record_provider_event", { p_provider: provider.id, p_event_id: event.eventId, p_payload: payload, p_valid: true });
  if (recorded.error) throw new Error("Could not record the provider event");
  if (recorded.data === false) return { ok: true, duplicate: true };

  const { data: intent } = await db.from("payment_intents").select("id").eq("provider_reference", event.providerReference).maybeSingle();
  const outcome = intent ? await reconcilePayment(provider, intent.id as string) : null;
  await db.rpc("set_provider_event_outcome", { p_provider: provider.id, p_event_id: event.eventId, p_outcome: outcome?.status ?? "UNMATCHED" });
  return { ok: true };
}
