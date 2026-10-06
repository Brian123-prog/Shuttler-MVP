import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PaymentStatus = "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REVERSED" | "REFUNDED";
export type PaymentView = {
  id: string; status: PaymentStatus; amount_kobo: number; currency: string;
  provider_environment: "MOCK" | "SANDBOX" | "PRODUCTION" | null; provider_reference: string | null;
  failure_reason: string | null; created_at: string; expires_at: string;
  shuttle_code: string; plate: string; route_code: string | null; route_name: string | null;
  university_name: string; receipt_number: string | null; paid_at: string | null;
};

export async function getPayment(id: string): Promise<PaymentView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("payment_view", { p_intent_id: id });
  return error || !data ? null : (data as PaymentView);
}

export async function listMyPayments(limit = 30): Promise<PaymentView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_payments", { p_limit: limit });
  return error || !data ? [] : (data as PaymentView[]);
}
