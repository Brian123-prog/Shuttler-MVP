import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ClaimStatus = "DRAFT" | "SUBMITTED" | "DRIVER_PENDING" | "CONFIRMED" | "REJECTED" | "DISPUTED" | "SETTLED" | "CANCELLED";
export type ClaimView = {
  id: string; status: ClaimStatus; fare_kobo: number; cash_kobo: number; change_kobo: number;
  driver_note: string | null; created_at: string; decided_at: string | null;
  shuttle_code: string; plate: string; route_code: string | null; route_name: string | null;
  driver_name: string; student_name: string; university_name: string;
  dispute_reason: string | null; dispute_status: "OPEN" | "RESOLVED" | null; dispute_outcome: string | null; dispute_note: string | null;
};

export async function getClaim(id: string): Promise<ClaimView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_details", { p_claim_id: id });
  return error || !data ? null : (data as ClaimView);
}

export async function listMyClaims(role: "STUDENT" | "DRIVER", limit = 50): Promise<ClaimView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_claims", { p_role: role, p_limit: limit });
  return error || !data ? [] : (data as ClaimView[]);
}
