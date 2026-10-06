import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/auth/context";

export type MemberRow = {
  membershipId: string;
  profileId: string;
  avatarPath: string | null;
  role: "STUDENT" | "DRIVER";
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  fullName: string;
  phone: string | null;
  studentNumber: string | null;
  licenseNumber: string | null;
  vehiclePlate: string | null;
  vehicleDescription: string | null;
};

export const STATUS_FILTERS: Record<string, VerificationStatus[] | null> = {
  pending: ["PENDING", "UNDER_REVIEW"],
  approved: ["APPROVED"],
  rejected: ["REJECTED"],
  suspended: ["SUSPENDED"],
  all: null,
};

type Base = { id: string; role: "STUDENT" | "DRIVER"; verification_status: VerificationStatus; created_at: string; reviewed_at: string | null; review_note: string | null; profile_id: string };
const BASE_COLUMNS = "id, role, verification_status, created_at, reviewed_at, review_note, profile_id";

async function hydrate(rows: Base[]): Promise<MemberRow[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const [profiles, students, drivers] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, avatar_path").in("id", rows.map((r) => r.profile_id)),
    supabase.from("students").select("membership_id, student_number").in("membership_id", ids),
    supabase.from("drivers").select("membership_id, license_number, vehicle_plate, vehicle_description").in("membership_id", ids),
  ]);
  const p = new Map<string, { full_name: string; phone: string | null; avatar_path: string | null }>((profiles.data ?? []).map((x) => [x.id, x]));
  const s = new Map<string, { student_number: string }>((students.data ?? []).map((x) => [x.membership_id, x]));
  const d = new Map<string, { license_number: string; vehicle_plate: string | null; vehicle_description: string | null }>((drivers.data ?? []).map((x) => [x.membership_id, x]));
  return rows.map((r) => ({
    membershipId: r.id,
    profileId: r.profile_id,
    avatarPath: p.get(r.profile_id)?.avatar_path ?? null,
    role: r.role,
    status: r.verification_status,
    submittedAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
    fullName: p.get(r.profile_id)?.full_name ?? "Unknown",
    phone: p.get(r.profile_id)?.phone ?? null,
    studentNumber: s.get(r.id)?.student_number ?? null,
    licenseNumber: d.get(r.id)?.license_number ?? null,
    vehiclePlate: d.get(r.id)?.vehicle_plate ?? null,
    vehicleDescription: d.get(r.id)?.vehicle_description ?? null,
  }));
}

export async function listMembers(universityId: string, role: "STUDENT" | "DRIVER", filter: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  let q = supabase.from("university_memberships").select(BASE_COLUMNS).eq("university_id", universityId).eq("role", role);
  const statuses = STATUS_FILTERS[filter] ?? STATUS_FILTERS.pending;
  if (statuses) q = q.in("verification_status", statuses);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  return hydrate((data ?? []) as Base[]);
}

export async function getMember(universityId: string, membershipId: string): Promise<MemberRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("university_memberships").select(BASE_COLUMNS).eq("university_id", universityId).eq("id", membershipId).maybeSingle();
  if (!data) return null;
  return (await hydrate([data as Base]))[0] ?? null;
}

export async function countMembers(universityId: string, role: "STUDENT" | "DRIVER", statuses?: VerificationStatus[]): Promise<number> {
  const supabase = await createClient();
  let q = supabase.from("university_memberships").select("id", { count: "exact", head: true }).eq("university_id", universityId).eq("role", role);
  if (statuses) q = q.in("verification_status", statuses);
  const { count } = await q;
  return count ?? 0;
}

const ACTION_LABEL: Record<string, string> = {
  MEMBERSHIP_REVIEWED: "Verification decision recorded",
  UNIVERSITY_CREATED: "University created",
  UNIVERSITY_UPDATED: "University updated",
  UNIVERSITY_ADMIN_GRANTED: "University administrator added",
  ADMIN_GRANTS_APPLIED: "Administrator access activated",
  ROUTES_CREATED: "Route created",
  ROUTES_UPDATED: "Route updated",
  STOPS_CREATED: "Stop created",
  STOPS_UPDATED: "Stop updated",
  ROUTE_STOPS_CREATED: "Stop added to route",
  ROUTE_STOPS_UPDATED: "Route stops reordered",
  ROUTE_STOPS_DELETED: "Stop removed from route",
  SCHEDULES_CREATED: "Departure added",
  SCHEDULES_UPDATED: "Departure updated",
  SCHEDULES_DELETED: "Departure removed",
  SHUTTLES_CREATED: "Shuttle added",
  SHUTTLES_UPDATED: "Shuttle updated",
  VEHICLES_CREATED: "Vehicle added",
  VEHICLES_UPDATED: "Vehicle updated",
  SHUTTLE_ASSIGNMENTS_CREATED: "Driver assigned to shuttle",
  SHUTTLE_ASSIGNMENTS_UPDATED: "Driver assignment ended",
  QR_CODES_CREATED: "QR code generated",
  QR_CODES_UPDATED: "QR code revoked",
  PAYMENT_INTENTS_CREATED: "Payment started",
  PAYMENT_INTENTS_UPDATED: "Payment status updated",
  PAYMENTS_CREATED: "Payment completed",
  RIDES_CREATED: "Ride recorded",
  CHANGE_CLAIMS_CREATED: "Change claim submitted",
  CHANGE_CLAIMS_UPDATED: "Change claim updated",
  DISPUTES_CREATED: "Dispute raised",
  DISPUTES_UPDATED: "Dispute decided",
  DRIVER_QR_CODES_CREATED: "Driver QR code issued",
  DRIVER_QR_CODES_UPDATED: "Driver QR code revoked",
  FARES_CREATED: "Fare set",
  FARES_UPDATED: "Fare ended",
  UNIVERSITY_SETTINGS_CREATED: "Contact details added",
  UNIVERSITY_SETTINGS_UPDATED: "Contact details updated",
};

export function describeAction(action: string, metadata?: { label?: string } | null): string {
  const base = ACTION_LABEL[action] ?? action.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return metadata?.label ? `${base}: ${metadata.label}` : base;
}
