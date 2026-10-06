"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  compactErrors, isUuid, safeNextPath, validateEmail, validateOptionalPhone, validatePassword, validateText,
} from "@/lib/validation";
import { storeRegistrationAvatar } from "@/lib/avatars-admin";
import { MAX_AVATAR_BYTES, sniffImage, type ImageInfo } from "@/lib/image";
import type { FormState } from "./state";

const NOT_CONFIGURED: FormState = { error: "Shuttler is not configured yet. Please try again later." };
const GENERIC: FormState = { error: "Something went wrong. Please try again." };

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`;
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      error: unconfirmed ? "Confirm your email address first. Check your inbox for the link." : "Invalid email or password.",
      values: { email },
    };
  }
  redirect(safeNextPath(text(formData, "next")));
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

type Role = "STUDENT" | "DRIVER";

async function registerMember(role: Role, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const v = {
    fullName: text(formData, "fullName").trim(),
    email: text(formData, "email").trim(),
    phone: text(formData, "phone").trim(),
    universityId: text(formData, "universityId"),
    studentNumber: text(formData, "studentNumber").trim(),
    licenseNumber: text(formData, "licenseNumber").trim(),
    vehiclePlate: text(formData, "vehiclePlate").trim(),
    vehicleDescription: text(formData, "vehicleDescription").trim(),
  };
  const password = text(formData, "password");
  const confirm = text(formData, "confirmPassword");

  const fieldErrors = compactErrors({
    fullName: validateText("Full name", v.fullName, 2, 100),
    email: validateEmail(v.email),
    phone: validateOptionalPhone(v.phone),
    universityId: isUuid(v.universityId) ? null : "Select your university.",
    password: validatePassword(password),
    confirmPassword: password === confirm ? null : "Passwords do not match.",
    ...(role === "STUDENT"
      ? { studentNumber: validateText("Student ID", v.studentNumber, 2, 40) }
      : {
          licenseNumber: validateText("Driver licence number", v.licenseNumber, 3, 40),
          vehiclePlate: v.vehiclePlate.length > 20 ? "Use at most 20 characters." : null,
          vehicleDescription: v.vehicleDescription.length > 200 ? "Use at most 200 characters." : null,
        }),
  });
  let photo: { bytes: Uint8Array; info: ImageInfo } | null = null;
  const chosen = role === "DRIVER" ? formData.get("photo") : null;
  if (chosen instanceof File && chosen.size > 0) {
    if (chosen.size > MAX_AVATAR_BYTES) {
      fieldErrors.photo = "That picture is too large. Choose one under 2 MB.";
    } else {
      const bytes = new Uint8Array(await chosen.arrayBuffer());
      const info = sniffImage(bytes);
      if (info) photo = { bytes, info };
      else fieldErrors.photo = "Use a JPEG, PNG or WebP picture.";
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: v };

  const supabase = await createClient();
  // RLS exposes only ACTIVE universities, so this also confirms the selection is valid.
  const { data: uni } = await supabase.from("universities").select("id").eq("id", v.universityId).maybeSingle();
  if (!uni) return { fieldErrors: { universityId: "Select your university." }, values: v };

  const metadata: Record<string, string> = {
    full_name: v.fullName,
    registration_role: role,
    university_id: v.universityId,
    ...(v.phone ? { phone: v.phone } : {}),
    ...(role === "STUDENT"
      ? { student_number: v.studentNumber }
      : {
          license_number: v.licenseNumber,
          ...(v.vehiclePlate ? { vehicle_plate: v.vehiclePlate } : {}),
          ...(v.vehicleDescription ? { vehicle_description: v.vehicleDescription } : {}),
        }),
  };

  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/account`, data: metadata },
  });

  if (error) {
    if (error.code === "weak_password") return { fieldErrors: { password: "Choose a stronger password." }, values: v };
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: "Too many attempts. Please wait a few minutes and try again.", values: v };
    }
    return {
      error:
        role === "STUDENT"
          ? "We could not complete registration. If you already registered with this email or student ID, log in or contact your university administrator."
          : "We could not complete registration. If you already registered with this email or licence number, log in or contact your university administrator.",
      values: v,
    };
  }
  const isNewAccount = (data.user?.identities?.length ?? 0) > 0;
  let photoSaved = true;
  if (photo && data.user && isNewAccount) photoSaved = await storeRegistrationAvatar(data.user.id, photo.bytes, photo.info);
  if (data.session) redirect("/account");
  return {
    message:
      "Account created. Check your email to confirm your address, then log in to see your verification status." +
      (photo && isNewAccount && !photoSaved ? " Your picture could not be saved; you can add it from your profile after signing in." : ""),
  };
}

export async function registerStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return registerMember("STUDENT", formData);
}
export async function registerDriverAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return registerMember("DRIVER", formData);
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const email = text(formData, "email").trim();
  const emailError = validateEmail(email);
  if (emailError) return { fieldErrors: { email: emailError }, values: { email } };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password` });
  // Same response whether or not the account exists.
  return { message: "If an account exists for that email, a password reset link has been sent." };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const password = text(formData, "password");
  const confirm = text(formData, "confirmPassword");
  const fieldErrors = compactErrors({
    password: validatePassword(password),
    confirmPassword: password === confirm ? null : "Passwords do not match.",
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return error.code === "weak_password" ? { fieldErrors: { password: "Choose a stronger password." } } : GENERIC;
  redirect("/account");
}
