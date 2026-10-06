"use server";

import { revalidatePath } from "next/cache";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

function driverId(fd: FormData): string {
  const v = fd.get("driverId");
  if (typeof v !== "string" || !isUuid(v)) throw new Error("Invalid request");
  return v;
}

export async function issueDriverQrAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_driver_qr", { p_driver_id: driverId(fd) });
  if (error) throw new Error("Could not issue the QR code");
  revalidatePath("/university-admin", "layout");
}

export async function revokeDriverQrAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_driver_qr", { p_driver_id: driverId(fd) });
  if (error) throw new Error("Could not revoke the QR code");
  revalidatePath("/university-admin", "layout");
}

export async function issueMissingDriverQrsAction(): Promise<void> {
  const { university } = await requireUniversityAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_missing_driver_qrs", { p_university_id: university.id });
  if (error) throw new Error("Could not issue the QR codes");
  revalidatePath("/university-admin", "layout");
}
