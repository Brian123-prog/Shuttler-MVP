import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/site";
import type { FinancialProvider, InitiatePaymentInput, InitiatePaymentResult, ProviderEvent, VerifyPaymentResult } from "./provider";

export const MOCK_SIGNATURE_HEADER = "x-shuttler-signature";

export function signMockPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * A test provider. It behaves like a hosted-checkout provider (reference, checkout page, verification, signed webhook)
 * but no real money moves. Everything it creates is labelled MOCK and shown as a test payment to the user.
 */
export class MockFinancialProvider implements FinancialProvider {
  readonly id = "mock";
  readonly environment = "MOCK" as const;

  constructor(private readonly webhookSecret: string) {}

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const reference = `MOCK-${randomUUID()}`;
    const db = createAdminClient();
    const { error } = await db.from("mock_provider_transactions").insert({ reference, amount_kobo: input.amountKobo, currency: input.currency, return_path: input.returnPath });
    if (error) throw new Error("The test provider could not create the payment");
    return { providerReference: reference, checkoutUrl: `${await getSiteOrigin()}/mock-checkout/${reference}` };
  }

  async verifyPayment(providerReference: string): Promise<VerifyPaymentResult> {
    const db = createAdminClient();
    const { data } = await db.from("mock_provider_transactions").select("status, amount_kobo").eq("reference", providerReference).maybeSingle();
    if (!data) return { status: "FAILED", amountKobo: null, reason: "The provider has no record of this payment" };
    return { status: data.status as VerifyPaymentResult["status"], amountKobo: data.amount_kobo as number };
  }

  verifyWebhook(rawBody: string, signature: string | null): ProviderEvent | null {
    if (!signature) return null;
    const expected = Buffer.from(signMockPayload(rawBody, this.webhookSecret), "hex");
    let given: Buffer;
    try { given = Buffer.from(signature, "hex"); } catch { return null; }
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    try {
      const body = JSON.parse(rawBody) as { id?: unknown; reference?: unknown };
      if (typeof body.id !== "string" || typeof body.reference !== "string") return null;
      return { eventId: body.id, providerReference: body.reference };
    } catch {
      return null;
    }
  }
}
