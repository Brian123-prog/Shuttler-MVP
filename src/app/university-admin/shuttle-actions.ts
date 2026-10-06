"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { compactErrors, isUuid } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/state";

const CODE = /^[A-Z0-9-]{1,12}$/;
const PLATE = /^[A-Z0-9 -]{3,15}$/;

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function saveShuttleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { university } = await requireUniversityAdmin();
  const id = text(fd, "id");
  const v = {
    code: text(fd, "code").toUpperCase(), plate: text(fd, "plate").toUpperCase(), model: text(fd, "model"),
    capacity: text(fd, "capacity"), routeId: text(fd, "routeId"), status: text(fd, "status") || "ACTIVE",
  };
  const capacity = /^\d{1,3}$/.test(v.capacity) ? Number(v.capacity) : NaN;
  const fieldErrors = compactErrors({
    code: CODE.test(v.code) ? null : "Use up to 12 letters, numbers or hyphens.",
    plate: PLATE.test(v.plate) ? null : "Enter the registration plate (3 to 15 letters, numbers, spaces or hyphens).",
    model: v.model.length > 100 ? "Use at most 100 characters." : null,
    capacity: capacity >= 1 && capacity <= 100 ? null : "Enter a capacity between 1 and 100.",
    routeId: v.routeId === "" || isUuid(v.routeId) ? null : "Select a route.",
    status: v.status === "ACTIVE" || v.status === "INACTIVE" ? null : "Select a status.",
  });
  if (id && !isUuid(id)) return { error: "Invalid request." };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: v };

  const supabase = await createClient();
  const route = v.routeId || null;
  let error;
  let newId: string | null = null;
  if (id) {
    ({ error } = await supabase.rpc("update_shuttle", { p_shuttle_id: id, p_code: v.code, p_plate: v.plate, p_model: v.model || null, p_capacity: capacity, p_route_id: route, p_status: v.status }));
  } else {
    const res = await supabase.rpc("create_shuttle", { p_university_id: university.id, p_code: v.code, p_plate: v.plate, p_model: v.model || null, p_capacity: capacity, p_route_id: route });
    error = res.error;
    newId = (res.data as string | null) ?? null;
  }
  if (error) {
    if (error.code === "23505") {
      const plate = error.message.includes("plate_number");
      return { fieldErrors: plate ? { plate: "A shuttle with this plate already exists." } : { code: "A shuttle with this code already exists." }, values: v };
    }
    if (error.code === "23503") return { fieldErrors: { routeId: "Select a route from your university." }, values: v };
    return { error: "Could not save the shuttle. Please try again.", values: v };
  }
  revalidatePath("/university-admin", "layout");
  if (!id && newId) redirect(`/university-admin/shuttles/${newId}`);
  return { message: "Shuttle saved.", values: v };
}

function ids(fd: FormData, ...keys: string[]): string[] {
  const out = keys.map((k) => text(fd, k));
  if (!out.every(isUuid)) throw new Error("Invalid request");
  return out;
}

export async function assignDriverAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const [shuttleId, driverId] = ids(fd, "shuttleId", "driverId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_driver", { p_shuttle_id: shuttleId, p_driver_id: driverId });
  if (error) throw new Error("Could not assign the driver");
  revalidatePath("/university-admin", "layout");
}

export async function endAssignmentAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const [shuttleId] = ids(fd, "shuttleId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_assignment", { p_shuttle_id: shuttleId });
  if (error) throw new Error("Could not end the assignment");
  revalidatePath("/university-admin", "layout");
}

export async function replaceQrAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const [shuttleId] = ids(fd, "shuttleId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_shuttle_qr", { p_shuttle_id: shuttleId });
  if (error) throw new Error("Could not generate the QR code");
  revalidatePath("/university-admin", "layout");
}

export async function revokeQrAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const [shuttleId] = ids(fd, "shuttleId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_shuttle_qr", { p_shuttle_id: shuttleId });
  if (error) throw new Error("Could not revoke the QR code");
  revalidatePath("/university-admin", "layout");
}
