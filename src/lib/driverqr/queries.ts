import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DriverQrRow = {
  driverId: string; name: string; licence: string; avatarPath: string | null; shuttleCode: string | null;
  qr: { id: string; token: string; shortCode: string } | null;
};

/** Every approved driver of the university with their current personal QR code (if any). */
export async function listDriverQrs(universityId: string): Promise<DriverQrRow[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("university_memberships").select("id").eq("university_id", universityId).eq("role", "DRIVER").eq("verification_status", "APPROVED");
  const membershipIds = (members ?? []).map((m) => m.id as string);
  if (membershipIds.length === 0) return [];
  const { data: drivers } = await supabase.from("drivers").select("id, profile_id, license_number").in("membership_id", membershipIds);
  const driverIds = (drivers ?? []).map((d) => d.id as string);
  const profileIds = (drivers ?? []).map((d) => d.profile_id as string);
  if (driverIds.length === 0) return [];

  const [profiles, qrs, assignments] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_path").in("id", profileIds),
    supabase.from("driver_qr_codes").select("id, driver_id, token, short_code").in("driver_id", driverIds).eq("status", "ACTIVE"),
    supabase.from("shuttle_assignments").select("driver_id, shuttle_id").in("driver_id", driverIds).is("ended_at", null),
  ]);
  const shuttleIds = (assignments.data ?? []).map((a) => a.shuttle_id as string);
  const { data: shuttles } = shuttleIds.length ? await supabase.from("shuttles").select("id, code").in("id", shuttleIds) : { data: [] };

  const profile = new Map((profiles.data ?? []).map((p) => [p.id as string, p]));
  const qr = new Map((qrs.data ?? []).map((q) => [q.driver_id as string, q]));
  const shuttleOf = new Map((assignments.data ?? []).map((a) => [a.driver_id as string, a.shuttle_id as string]));
  const code = new Map((shuttles ?? []).map((s) => [s.id as string, s.code as string]));

  return (drivers ?? [])
    .map((d) => {
      const p = profile.get(d.profile_id as string);
      const q = qr.get(d.id as string);
      const shuttleId = shuttleOf.get(d.id as string);
      return {
        driverId: d.id as string,
        name: (p?.full_name as string) ?? "Unknown",
        licence: d.license_number as string,
        avatarPath: (p?.avatar_path as string | null) ?? null,
        shuttleCode: shuttleId ? code.get(shuttleId) ?? null : null,
        qr: q ? { id: q.id as string, token: q.token as string, shortCode: q.short_code as string } : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
