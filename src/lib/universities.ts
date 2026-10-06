import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type UniversityOption = { id: string; name: string; short_name: string | null };
export type UniversityList = { state: "unconfigured" } | { state: "error" } | { state: "ok"; universities: UniversityOption[] };

export async function listActiveUniversities(): Promise<UniversityList> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("universities").select("id, name, short_name").eq("status", "ACTIVE").order("name");
  if (error) return { state: "error" };
  return { state: "ok", universities: data as UniversityOption[] };
}
