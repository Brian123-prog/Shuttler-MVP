import type { Metadata } from "next";
import { Alert, VerificationBadge } from "@/components/ui";
import Link from "next/link";
import { listMyClaims } from "@/lib/claims/queries";
import { Detail, DetailGrid, Panel } from "@/components/app/bits";
import { RoutesView } from "@/components/app/RoutesView";
import { VerificationScreen } from "@/components/app/VerificationScreen";
import { requireMembership } from "@/lib/auth/guards";
import { firstName } from "@/lib/format";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { getAssignedShuttle } from "@/lib/shuttles/queries";
import { createClient } from "@/lib/supabase/server";
import { QrImage } from "@/components/app/QrImage";
import { getSiteOrigin } from "@/lib/site";
import { getSupportContact } from "@/lib/transport/queries";

export const metadata: Metadata = { title: "Driver dashboard" };

export default async function DriverDashboard() {
  const { ctx, membership } = await requireMembership("DRIVER");

  if (membership.verification_status !== "APPROVED") {
    return (
      <>
        <h1 className="text-2xl font-bold text-brand-900">Welcome, {firstName(ctx.profile?.full_name)}</h1>
        <VerificationScreen ctx={ctx} membership={membership} />
      </>
    );
  }
  const universityId = membership.university?.id;
  const supabase = await createClient();
  const pendingClaims = (await listMyClaims("DRIVER", 100)).filter((c) => c.status === "DRIVER_PENDING").length;
  const [contact, shuttle, ridesResult] = await Promise.all([
    getSupportContact(universityId),
    getAssignedShuttle(),
    supabase.from("rides").select("id, ridden_at, fare_kobo, payment_method").order("ridden_at", { ascending: false }).limit(10),
  ]);
  const { data: myQr } = await supabase.from("driver_qr_codes").select("token, short_code").eq("status", "ACTIVE").limit(1).maybeSingle();
  const origin = await getSiteOrigin();
  const rides = (ridesResult.data ?? []) as { id: string; ridden_at: string; fare_kobo: number; payment_method: string }[];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Hello, {firstName(ctx.profile?.full_name)}</h1>
          <p className="text-sm text-slate-600">{membership.university?.name}</p>
        </div>
        <VerificationBadge status="APPROVED" />
      </div>
      {pendingClaims > 0 ? (
        <Alert tone="warning" title="Claims need your decision">
          <Link href="/driver/claims" className="font-semibold underline">{pendingClaims} change claim{pendingClaims === 1 ? "" : "s"}</Link> waiting for you to confirm or reject.
        </Alert>
      ) : null}
      <Panel title="Your details">
        <DetailGrid>
          <Detail label="Licence number" value={ctx.driver?.license_number ?? ""} />
          <Detail label="Vehicle" value={[ctx.driver?.vehicle_plate, ctx.driver?.vehicle_description].filter(Boolean).join(" - ") || "Not provided"} />
          {contact ? <Detail label="Transport office" value={[contact.email, contact.phone].filter(Boolean).join("  |  ")} /> : null}
        </DetailGrid>
      </Panel>
      {myQr ? (
        <Panel title="Your QR code" description="Students scan this code to pay you or record cash. It was issued by your university.">
          <div className="flex flex-wrap items-center gap-6">
            <QrImage value={`${origin}/student/scan?c=${myQr.token as string}`} size={200} label="Your personal QR code" />
            <p className="text-sm text-slate-700">Manual code <span className="font-mono text-lg font-semibold tracking-widest text-slate-900">{myQr.short_code as string}</span></p>
          </div>
        </Panel>
      ) : null}
      {shuttle ? (
        <Panel title="Your shuttle">
          <DetailGrid>
            <Detail label="Shuttle" value={shuttle.code} />
            <Detail label="Registration plate" value={shuttle.plate} />
            <Detail label="Vehicle" value={[shuttle.model, `${shuttle.capacity} seats`].filter(Boolean).join(", ")} />
            <Detail label="Route" value={shuttle.routeLabel ?? "No route assigned"} />
          </DetailGrid>
        </Panel>
      ) : null}
      {rides.length > 0 ? (
        <Panel title="Recent rides">
          <ul className="divide-y divide-slate-100 text-sm">
            {rides.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <span>{formatDateTime(r.ridden_at)}</span>
                <span className="font-medium">{formatKobo(r.fare_kobo)} <span className="font-normal text-slate-500">{r.payment_method === "CASH" ? "Cash" : "Digital"}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {universityId ? <Panel title="Routes and stops"><RoutesView universityId={universityId} /></Panel> : null}
    </>
  );
}
