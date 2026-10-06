import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TransportStatus } from "@/lib/transport/queries";

export type ShuttleRow = {
  id: string;
  code: string;
  status: TransportStatus;
  routeId: string | null;
  routeLabel: string | null;
  vehicleId: string;
  plate: string;
  model: string | null;
  capacity: number;
  driver: { driverId: string; name: string } | null;
  qr: { id: string; token: string; shortCode: string } | null;
};

export type ApprovedDriver = { driverId: string; name: string; licence: string };

async function namesForDrivers(driverIds: string[]): Promise<Map<string, { name: string; licence: string }>> {
  const out = new Map<string, { name: string; licence: string }>();
  if (driverIds.length === 0) return out;
  const supabase = await createClient();
  const { data: drivers } = await supabase.from("drivers").select("id, profile_id, license_number").in("id", driverIds);
  const profileIds = (drivers ?? []).map((d) => d.profile_id as string);
  const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id, full_name").in("id", profileIds) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));
  for (const d of drivers ?? []) out.set(d.id as string, { name: names.get(d.profile_id as string) ?? "Unknown", licence: d.license_number as string });
  return out;
}

export async function listShuttles(universityId: string): Promise<ShuttleRow[]> {
  const supabase = await createClient();
  const [shuttles, vehicles, routes, assignments, qrs] = await Promise.all([
    supabase.from("shuttles").select("id, code, status, route_id, vehicle_id").eq("university_id", universityId).order("code"),
    supabase.from("vehicles").select("id, plate_number, model, capacity").eq("university_id", universityId),
    supabase.from("routes").select("id, code, name").eq("university_id", universityId),
    supabase.from("shuttle_assignments").select("shuttle_id, driver_id").eq("university_id", universityId).is("ended_at", null),
    supabase.from("qr_codes").select("id, shuttle_id, token, short_code").eq("university_id", universityId).eq("status", "ACTIVE"),
  ]);
  const vehicleById = new Map((vehicles.data ?? []).map((v) => [v.id as string, v]));
  const routeById = new Map((routes.data ?? []).map((r) => [r.id as string, r]));
  const assignment = new Map((assignments.data ?? []).map((a) => [a.shuttle_id as string, a.driver_id as string]));
  const qrByShuttle = new Map((qrs.data ?? []).map((q) => [q.shuttle_id as string, q]));
  const driverInfo = await namesForDrivers([...assignment.values()]);

  return (shuttles.data ?? []).map((s) => {
    const v = vehicleById.get(s.vehicle_id as string);
    const r = s.route_id ? routeById.get(s.route_id as string) : undefined;
    const driverId = assignment.get(s.id as string);
    const q = qrByShuttle.get(s.id as string);
    return {
      id: s.id as string,
      code: s.code as string,
      status: s.status as TransportStatus,
      routeId: (s.route_id as string | null) ?? null,
      routeLabel: r ? `${r.code} ${r.name}` : null,
      vehicleId: s.vehicle_id as string,
      plate: (v?.plate_number as string) ?? "",
      model: (v?.model as string | null) ?? null,
      capacity: (v?.capacity as number) ?? 0,
      driver: driverId ? { driverId, name: driverInfo.get(driverId)?.name ?? "Unknown" } : null,
      qr: q ? { id: q.id as string, token: q.token as string, shortCode: q.short_code as string } : null,
    };
  });
}

export async function getShuttle(universityId: string, id: string): Promise<ShuttleRow | null> {
  return (await listShuttles(universityId)).find((s) => s.id === id) ?? null;
}

export async function listApprovedDrivers(universityId: string): Promise<ApprovedDriver[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("university_memberships").select("id").eq("university_id", universityId).eq("role", "DRIVER").eq("verification_status", "APPROVED");
  const ids = (members ?? []).map((m) => m.id as string);
  if (ids.length === 0) return [];
  const { data: drivers } = await supabase.from("drivers").select("id").in("membership_id", ids);
  const info = await namesForDrivers((drivers ?? []).map((d) => d.id as string));
  return [...info.entries()].map(([driverId, v]) => ({ driverId, name: v.name, licence: v.licence })).sort((a, b) => a.name.localeCompare(b.name));
}

export type AssignedShuttle = { code: string; plate: string; model: string | null; capacity: number; routeLabel: string | null };

/** The shuttle the signed-in driver is currently assigned to (RLS limits this to their own assignment). */
export async function getAssignedShuttle(): Promise<AssignedShuttle | null> {
  const supabase = await createClient();
  const { data: a } = await supabase.from("shuttle_assignments").select("shuttle_id").is("ended_at", null).limit(1).maybeSingle();
  if (!a) return null;
  const { data: s } = await supabase.from("shuttles").select("code, vehicle_id, route_id").eq("id", a.shuttle_id).maybeSingle();
  if (!s) return null;
  const [{ data: v }, { data: r }] = await Promise.all([
    supabase.from("vehicles").select("plate_number, model, capacity").eq("id", s.vehicle_id).maybeSingle(),
    s.route_id ? supabase.from("routes").select("code, name").eq("id", s.route_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    code: s.code as string,
    plate: (v?.plate_number as string) ?? "",
    model: (v?.model as string | null) ?? null,
    capacity: (v?.capacity as number) ?? 0,
    routeLabel: r ? `${r.code} ${r.name}` : null,
  };
}

export type ResolvedShuttle = {
  via: "SHUTTLE" | "DRIVER"; shuttle_code: string | null; in_service: boolean; plate: string | null; route_code: string | null; route_name: string | null;
  origin: string | null; destination: string | null; driver_name: string | null; driver_avatar_path: string | null; university_name: string; fare_kobo: number | null;
};

/** Resolves a scanned or typed code. Returns null for any invalid, revoked or not-permitted code. */
export async function resolveShuttle(input: string): Promise<ResolvedShuttle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_qr", { p_input: input.slice(0, 300) });
  if (error || !data) return null;
  return data as ResolvedShuttle;
}
