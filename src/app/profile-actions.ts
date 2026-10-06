"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { MAX_AVATAR_BYTES, sniffImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/server";
import { compactErrors, validateOptionalPhone, validateText } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/state";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const fieldErrors = compactErrors({ fullName: validateText("Full name", fullName, 2, 100), phone: validateOptionalPhone(phone) });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: { fullName, phone } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Your session has expired. Please log in again." };
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", auth.user.id);
  if (error) return { error: "Could not save your changes. Please try again.", values: { fullName, phone } };
  revalidatePath("/", "layout");
  return { message: "Profile updated.", values: { fullName, phone } };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture first." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "That picture is too large. Choose one under 2 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = sniffImage(bytes);
  if (!info) return { error: "Use a JPEG, PNG or WebP picture." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Your session has expired. Please log in again." };
  const uid = auth.user.id;
  const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", uid).maybeSingle();

  const path = `${uid}/${randomUUID()}.${info.ext}`;
  const uploaded = await supabase.storage.from("avatars").upload(path, bytes, { contentType: info.contentType, upsert: false });
  if (uploaded.error) return { error: "The picture could not be uploaded. Please try again." };
  const updated = await supabase.from("profiles").update({ avatar_path: path }).eq("id", uid);
  if (updated.error) {
    await supabase.storage.from("avatars").remove([path]);
    return { error: "The picture could not be saved. Please try again." };
  }
  const previous = profile?.avatar_path as string | null | undefined;
  if (previous) await supabase.storage.from("avatars").remove([previous]);
  revalidatePath("/", "layout");
  return { message: "Picture updated." };
}

export async function removeAvatarAction(): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", auth.user.id).maybeSingle();
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", auth.user.id);
  if (profile?.avatar_path) await supabase.storage.from("avatars").remove([profile.avatar_path as string]);
  revalidatePath("/", "layout");
}
