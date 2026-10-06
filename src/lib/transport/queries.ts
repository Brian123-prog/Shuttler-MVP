import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TransportStatus = "ACTIVE" | "INACTIVE";
export type RouteRow = {
  id: string; code: string; name: string; origin: string; destination: string; status: TransportStatus;
  operating_days: number[]; operating_start: string; operating_end: string;
};
export type StopRow = { id: string; name: string; description: string | null; latitude: number | null; longitude: number | null; status: TransportStatus };
export type ScheduleRow = { id: string; route_id: string; departure_time: string; days_of_week: number[]; status: TransportStatus };
export type RouteStopRow = { route_id: string; stop_id: string; stop_order: number };

const ROUTE_COLUMNS = "id, code, name, origin, destination, status, operating_days, operating_start, operating_end";
const STOP_COLUMNS = "id, name, description, latitude, longitude, status";

export async function listRoutes(universityId: string, activeOnly = false): Promise<RouteRow[]> {
  const supabase = await createClient();
  let q = supabase.from("routes").select(ROUTE_COLUMNS).eq("university_id", universityId);
  if (activeOnly) q = q.eq("status", "ACTIVE");
  const { data } = await q.order("code");
  return (data ?? []) as RouteRow[];
}

export async function getRoute(universityId: string, id: string): Promise<RouteRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("routes").select(ROUTE_COLUMNS).eq("university_id", universityId).eq("id", id).maybeSingle();
  return (data as RouteRow | null) ?? null;
}

export async function listStops(universityId: string): Promise<StopRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("stops").select(STOP_COLUMNS).eq("university_id", universityId).order("name");
  return (data ?? []) as StopRow[];
}

export async function getStop(universityId: string, id: string): Promise<StopRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("stops").select(STOP_COLUMNS).eq("university_id", universityId).eq("id", id).maybeSingle();
  return (data as StopRow | null) ?? null;
}

export async function listRouteStops(universityId: string): Promise<RouteStopRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("route_stops").select("route_id, stop_id, stop_order").eq("university_id", universityId).order("stop_order");
  return (data ?? []) as RouteStopRow[];
}

export async function listSchedules(universityId: string): Promise<ScheduleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("schedules").select("id, route_id, departure_time, days_of_week, status").eq("university_id", universityId).order("departure_time");
  return (data ?? []) as ScheduleRow[];
}

export type TransportNetwork = {
  routes: RouteRow[];
  stopsByRoute: Map<string, StopRow[]>;
  schedulesByRoute: Map<string, ScheduleRow[]>;
};

/** Active routes with their ordered stops and departures, for the people who ride. */
export async function getTransportNetwork(universityId: string): Promise<TransportNetwork> {
  const [routes, routeStops, stops, schedules] = await Promise.all([
    listRoutes(universityId, true), listRouteStops(universityId), listStops(universityId), listSchedules(universityId),
  ]);
  const stopById = new Map(stops.filter((s) => s.status === "ACTIVE").map((s) => [s.id, s]));
  const stopsByRoute = new Map<string, StopRow[]>();
  for (const rs of routeStops) {
    const stop = stopById.get(rs.stop_id);
    if (!stop) continue;
    stopsByRoute.set(rs.route_id, [...(stopsByRoute.get(rs.route_id) ?? []), stop]);
  }
  const schedulesByRoute = new Map<string, ScheduleRow[]>();
  for (const s of schedules) {
    if (s.status !== "ACTIVE") continue;
    schedulesByRoute.set(s.route_id, [...(schedulesByRoute.get(s.route_id) ?? []), s]);
  }
  return { routes, stopsByRoute, schedulesByRoute };
}

export async function getSupportContact(universityId: string | undefined): Promise<{ email: string | null; phone: string | null } | null> {
  if (!universityId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("university_settings").select("support_email, support_phone").eq("university_id", universityId).maybeSingle();
  if (!data || (!data.support_email && !data.support_phone)) return null;
  return { email: data.support_email as string | null, phone: data.support_phone as string | null };
}
