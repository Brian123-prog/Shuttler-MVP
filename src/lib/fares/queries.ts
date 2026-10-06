import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FareVersion } from "./resolve";

export async function listFares(universityId: string): Promise<FareVersion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fares").select("id, route_id, amount_kobo, effective_from, effective_to")
    .eq("university_id", universityId).order("effective_from", { ascending: false });
  return (data ?? []) as FareVersion[];
}
