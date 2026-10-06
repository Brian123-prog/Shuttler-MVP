import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { Avatar } from "@/components/app/Avatar";
import { Detail, DetailGrid, Panel } from "@/components/app/bits";
import { avatarUrl } from "@/lib/avatars";
import { requireMembership } from "@/lib/auth/guards";
import { formatKobo } from "@/lib/money";
import { paymentsEnabled } from "@/lib/payments";
import { resolveShuttle } from "@/lib/shuttles/queries";
import { startPaymentAction } from "../payments/actions";
import { createClaimAction } from "../claims/actions";
import { QrScanner } from "./QrScanner";

export const metadata: Metadata = { title: "Scan shuttle QR" };

const PAY_ERRORS: Record<string, string> = {
  service: "This shuttle is not in service.",
  driver: "This shuttle has no driver assigned, so it cannot take payments.",
  fare: "No fare has been set for this route.",
  invalid: "This code is not valid.",
  disabled: "Digital payments are not available right now.",
  failed: "That could not be completed. Please try again.",
  amount: "Enter the cash you gave in naira, for example 500 or 500.50.",
  cash: "The cash you gave must be more than the fare.",
  limit: "You already have claims waiting for a driver.",
};

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ c?: string; e?: string }> }) {
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");

  const { c, e } = await searchParams;
  const code = typeof c === "string" ? c.trim() : "";
  const shuttle = code ? await resolveShuttle(code) : null;
  const driverPhoto = shuttle ? await avatarUrl(shuttle.driver_avatar_path) : null;

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Scan shuttle QR</h1>

      {e && PAY_ERRORS[e] ? <Alert tone="danger" title="Payment not started">{PAY_ERRORS[e]}</Alert> : null}
      {code && !shuttle ? <Alert tone="danger" title="Code not recognised">This code is not valid. Check that you are scanning a Shuttler code from your university.</Alert> : null}

      {shuttle ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">{shuttle.university_name}</p>
              <h2 className="text-2xl font-bold text-brand-900">{shuttle.shuttle_code ? `Shuttle ${shuttle.shuttle_code}` : `Driver ${shuttle.driver_name ?? ""}`}</h2>
            </div>
            <Badge tone={shuttle.in_service ? "success" : "danger"}>{shuttle.in_service ? "In service" : "Out of service"}</Badge>
          </div>
          {!shuttle.shuttle_code ? (
            <Alert tone="warning" title="No shuttle">This driver is not assigned to a shuttle right now.</Alert>
          ) : !shuttle.in_service ? (
            <Alert tone="warning" title="Not in service">This shuttle is not currently in service.</Alert>
          ) : null}
          <DetailGrid>
            <Detail label="Fare" value={shuttle.fare_kobo !== null ? formatKobo(shuttle.fare_kobo) : "Not set"} />
            {shuttle.plate ? <Detail label="Registration plate" value={shuttle.plate} /> : null}
            <Detail label="Driver" value={shuttle.driver_name ? <span className="inline-flex items-center gap-2"><Avatar url={driverPhoto} name={shuttle.driver_name} size={32} />{shuttle.driver_name}</span> : "No driver assigned"} />
            <Detail label="Route" value={shuttle.route_name ? `${shuttle.route_code} - ${shuttle.route_name}` : "No route assigned"} />
            {shuttle.origin && shuttle.destination ? <Detail label="Runs between" value={`${shuttle.origin} and ${shuttle.destination}`} /> : null}
          </DetailGrid>
          {shuttle.in_service && shuttle.driver_name && shuttle.fare_kobo !== null && paymentsEnabled() ? (
            <form action={startPaymentAction}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="key" value={randomUUID()} />
              <Button type="submit" size="lg" className="w-full sm:w-auto">Pay {formatKobo(shuttle.fare_kobo)}</Button>
            </form>
          ) : null}
          {shuttle.in_service && shuttle.driver_name && shuttle.fare_kobo !== null ? (
            <form action={createClaimAction} className="space-y-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="key" value={randomUUID()} />
              <h3 className="text-sm font-semibold text-slate-900">Paid cash and the driver owes you change?</h3>
              <div className="max-w-xs">
                <label htmlFor="cash" className="mb-1.5 block text-sm font-medium text-slate-800">Cash you gave (naira)</label>
                <input id="cash" name="cash" required inputMode="decimal" autoComplete="off" placeholder="500" className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base" />
              </div>
              <p className="text-xs text-slate-600">The driver must confirm before anything is recorded. The change is worked out from the fare.</p>
              <Button type="submit" variant="secondary">Record cash payment</Button>
            </form>
          ) : null}
          {shuttle.in_service && !shuttle.driver_name ? <Alert tone="warning" title="No driver">This shuttle has no driver assigned, so it cannot take payments.</Alert> : null}
          {shuttle.in_service && shuttle.fare_kobo === null ? <Alert tone="warning" title="No fare">No fare has been set for this route.</Alert> : null}
        </Card>
      ) : null}

      <Panel title={shuttle ? "Scan another shuttle" : "Scan the code on the shuttle"}>
        <QrScanner />
      </Panel>

      <Panel title="Enter the code instead" description="Use the 8 character code printed under the QR code.">
        <form action="/student/scan" method="get" className="flex max-w-sm flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label htmlFor="c" className="mb-1.5 block text-sm font-medium text-slate-800">Shuttle code</label>
            <input id="c" name="c" required minLength={6} maxLength={64} autoComplete="off" autoCapitalize="characters"
              className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-base uppercase tracking-widest" />
          </div>
          <Button type="submit">Look up</Button>
        </form>
      </Panel>
    </>
  );
}
