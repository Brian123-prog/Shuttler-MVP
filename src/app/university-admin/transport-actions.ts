"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { compactErrors, isTime, isUuid, parseCoordinate, parseDays, validateEmail, validateOptionalPhone, validateText } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/state";

const STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const CODE = /^[A-Z0-9-]{1,12}$/;

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function saveRouteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { university } = await requireUniversityAdmin();
  const id = text(fd, "id");
  const days = parseDays(fd.getAll("days"));
  const v = {
    code: text(fd, "code").toUpperCase(), name: text(fd, "name"), origin: text(fd, "origin"), destination: text(fd, "destination"),
    start: text(fd, "start"), end: text(fd, "end"), status: text(fd, "status"), days: (days ?? []).join(","),
  };
  const fieldErrors = compactErrors({
    code: CODE.test(v.code) ? null : "Use up to 12 letters, numbers or hyphens.",
    name: validateText("Name", v.name, 2, 100),
    origin: validateText("Origin", v.origin, 1, 100),
    destination: validateText("Destination", v.destination, 1, 100),
    start: isTime(v.start) ? null : "Enter a start time.",
    end: isTime(v.end) ? (v.end > v.start ? null : "End time must be after the start time.") : "Enter an end time.",
    days: days ? null : "Select at least one day.",
    status: STATUSES.has(v.status) ? null : "Select a status.",
  });
  if (id && !isUuid(id)) return { error: "Invalid request." };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: v };

  const supabase = await createClient();
  const row = { code: v.code, name: v.name, origin: v.origin, destination: v.destination, status: v.status, operating_days: days, operating_start: v.start, operating_end: v.end };
  const result = id
    ? await supabase.from("routes").update(row).eq("id", id).eq("university_id", university.id).select("id").maybeSingle()
    : await supabase.from("routes").insert({ ...row, university_id: university.id }).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") return { fieldErrors: { code: "A route with this code already exists." }, values: v };
    return { error: "Could not save the route. Please try again.", values: v };
  }
  if (!result.data) return { error: "Route not found.", values: v };
  revalidatePath("/university-admin", "layout");
  if (!id) redirect(`/university-admin/routes/${result.data.id}`);
  return { message: "Route saved.", values: v };
}

export async function saveStopAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { university } = await requireUniversityAdmin();
  const id = text(fd, "id");
  const v = { name: text(fd, "name"), description: text(fd, "description"), latitude: text(fd, "latitude"), longitude: text(fd, "longitude"), status: text(fd, "status") || "ACTIVE" };
  const hasCoords = v.latitude !== "" || v.longitude !== "";
  const lat = hasCoords ? parseCoordinate(v.latitude, -90, 90) : null;
  const lng = hasCoords ? parseCoordinate(v.longitude, -180, 180) : null;
  const fieldErrors = compactErrors({
    name: validateText("Name", v.name, 2, 100),
    description: v.description.length > 300 ? "Use at most 300 characters." : null,
    latitude: hasCoords && lat === null ? "Enter a latitude between -90 and 90." : null,
    longitude: hasCoords && lng === null ? "Enter a longitude between -180 and 180." : null,
    status: STATUSES.has(v.status) ? null : "Select a status.",
  });
  if (id && !isUuid(id)) return { error: "Invalid request." };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: v };

  const supabase = await createClient();
  const row = { name: v.name, description: v.description || null, latitude: lat, longitude: lng, status: v.status };
  const result = id
    ? await supabase.from("stops").update(row).eq("id", id).eq("university_id", university.id).select("id").maybeSingle()
    : await supabase.from("stops").insert({ ...row, university_id: university.id }).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") return { fieldErrors: { name: "A stop with this name already exists." }, values: v };
    return { error: "Could not save the stop. Please try again.", values: v };
  }
  if (!result.data) return { error: "Stop not found.", values: v };
  revalidatePath("/university-admin", "layout");
  if (!id) return { message: "Stop added." };
  return { message: "Stop saved.", values: v };
}

export async function saveScheduleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { university } = await requireUniversityAdmin();
  const routeId = text(fd, "routeId");
  const time = text(fd, "time");
  const days = parseDays(fd.getAll("days"));
  const values = { time, days: (days ?? []).join(",") };
  const fieldErrors = compactErrors({ time: isTime(time) ? null : "Enter a departure time.", days: days ? null : "Select at least one day." });
  if (!isUuid(routeId)) return { error: "Invalid request." };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("schedules").insert({ university_id: university.id, route_id: routeId, departure_time: time, days_of_week: days });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { time: "A departure at this time already exists." }, values };
    return { error: "Could not add the departure. Please try again.", values };
  }
  revalidatePath("/university-admin", "layout");
  return { message: "Departure added." };
}

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { university } = await requireUniversityAdmin();
  const email = text(fd, "email");
  const phone = text(fd, "phone");
  const fieldErrors = compactErrors({ email: email ? validateEmail(email) : null, phone: validateOptionalPhone(phone) });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: { email, phone } };

  const supabase = await createClient();
  const { error } = await supabase.from("university_settings").upsert({ university_id: university.id, support_email: email || null, support_phone: phone || null }, { onConflict: "university_id" });
  if (error) return { error: "Could not save your changes. Please try again.", values: { email, phone } };
  revalidatePath("/", "layout");
  return { message: "Contact details saved.", values: { email, phone } };
}

function ids(fd: FormData, ...keys: string[]): string[] {
  const out = keys.map((k) => text(fd, k));
  if (!out.every(isUuid)) throw new Error("Invalid request");
  return out;
}

export async function addRouteStopAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const [routeId, stopId] = ids(fd, "routeId", "stopId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("append_route_stop", { p_route_id: routeId, p_stop_id: stopId });
  if (error && error.code !== "23505") throw new Error("Could not add the stop");
  revalidatePath("/university-admin", "layout");
}

export async function moveRouteStopAction(fd: FormData): Promise<void> {
  await requireUniversityAdmin();
  const [routeId, stopId] = ids(fd, "routeId", "stopId");
  const direction = text(fd, "direction");
  if (direction !== "up" && direction !== "down") throw new Error("Invalid request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_route_stop", { p_route_id: routeId, p_stop_id: stopId, p_direction: direction });
  if (error) throw new Error("Could not reorder the stop");
  revalidatePath("/university-admin", "layout");
}

export async function removeRouteStopAction(fd: FormData): Promise<void> {
  const { university } = await requireUniversityAdmin();
  const [routeId, stopId] = ids(fd, "routeId", "stopId");
  const supabase = await createClient();
  const { error } = await supabase.from("route_stops").delete().eq("route_id", routeId).eq("stop_id", stopId).eq("university_id", university.id);
  if (error) throw new Error("Could not remove the stop");
  revalidatePath("/university-admin", "layout");
}

export async function deleteScheduleAction(fd: FormData): Promise<void> {
  const { university } = await requireUniversityAdmin();
  const [scheduleId] = ids(fd, "scheduleId");
  const supabase = await createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId).eq("university_id", university.id);
  if (error) throw new Error("Could not remove the departure");
  revalidatePath("/university-admin", "layout");
}
