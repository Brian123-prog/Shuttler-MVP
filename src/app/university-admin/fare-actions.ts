"use server";

import { revalidatePath } from "next/cache";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { parseNairaToKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/state";

const MAX_KOBO = 100_000_000;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function setFareAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { university } = await requireUniversityAdmin();
  const v = { routeId: text(fd, "routeId"), amount: text(fd, "amount"), effectiveFrom: text(fd, "effectiveFrom") };
  const kobo = parseNairaToKobo(v.amount);
  const fieldErrors: Record<string, string> = {};
  if (kobo === null || kobo < 1 || kobo > MAX_KOBO) fieldErrors.amount = "Enter an amount such as 150 or 150.50 (up to 1,000,000).";
  if (v.routeId !== "" && !isUuid(v.routeId)) fieldErrors.routeId = "Select a route.";
  // The form time is West Africa Time (UTC+1, no daylight saving).
  let from: string | null = null;
  if (v.effectiveFrom !== "") {
    const parsed = LOCAL_DATETIME.test(v.effectiveFrom) ? new Date(`${v.effectiveFrom}:00+01:00`) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) fieldErrors.effectiveFrom = "Enter a valid date and time.";
    else from = parsed.toISOString();
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: v };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_fare", { p_university_id: university.id, p_route_id: v.routeId || null, p_amount_kobo: kobo, p_effective_from: from });
  if (error) {
    if (error.code === "42501") return { error: "You are not allowed to set fares.", values: v };
    if (error.code === "P0002") return { fieldErrors: { routeId: "Route not found." }, values: v };
    if (error.code === "P0001") return { error: error.message, values: v };
    return { error: "Could not save the fare. Please try again.", values: v };
  }
  revalidatePath("/", "layout");
  return { message: from ? "Fare scheduled." : "Fare saved." };
}

export async function endFareAction(fd: FormData): Promise<void> {
  const { university } = await requireUniversityAdmin();
  const routeId = text(fd, "routeId");
  if (routeId !== "" && !isUuid(routeId)) throw new Error("Invalid request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_fare", { p_university_id: university.id, p_route_id: routeId || null });
  if (error) throw new Error("Could not end the fare");
  revalidatePath("/", "layout");
}
