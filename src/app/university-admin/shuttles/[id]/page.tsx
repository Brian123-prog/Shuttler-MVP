import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { EmptyNote, Panel } from "@/components/app/bits";
import { QrImage } from "@/components/app/QrImage";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { getShuttle, listApprovedDrivers } from "@/lib/shuttles/queries";
import { getSiteOrigin } from "@/lib/site";
import { listRoutes } from "@/lib/transport/queries";
import { isUuid } from "@/lib/validation";
import { ShuttleForm } from "../../ShuttleForm";
import { assignDriverAction, endAssignmentAction, replaceQrAction, revokeQrAction } from "../../shuttle-actions";

export const metadata: Metadata = { title: "Manage shuttle" };

export default async function ShuttleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { university } = await requireUniversityAdmin();
  if (!isUuid(id)) notFound();
  const shuttle = await getShuttle(university.id, id);
  if (!shuttle) notFound();

  const [routes, drivers, origin] = await Promise.all([listRoutes(university.id), listApprovedDrivers(university.id), getSiteOrigin()]);
  const qrUrl = shuttle.qr ? `${origin}/student/scan?c=${shuttle.qr.token}` : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-900">{shuttle.code}</h1>
          <Badge tone={shuttle.status === "ACTIVE" ? "success" : "neutral"}>{shuttle.status === "ACTIVE" ? "In service" : "Out of service"}</Badge>
        </div>
        <ButtonLink href="/university-admin/shuttles" variant="ghost">Back to shuttles</ButtonLink>
      </div>

      <Panel title="Shuttle and vehicle"><ShuttleForm shuttle={shuttle} routes={routes} /></Panel>

      <Panel title="Driver" description="Only approved drivers can be assigned. A driver who is suspended or rejected is removed automatically.">
        {shuttle.driver ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-900">Assigned to <span className="font-semibold">{shuttle.driver.name}</span></p>
            <form action={endAssignmentAction}>
              <input type="hidden" name="shuttleId" value={id} />
              <Button type="submit" variant="secondary">End assignment</Button>
            </form>
          </div>
        ) : null}
        {drivers.length === 0 ? (
          <EmptyNote>No approved drivers yet. Approve a driver application first.</EmptyNote>
        ) : (
          <form action={assignDriverAction} className="flex max-w-lg flex-wrap items-end gap-3">
            <input type="hidden" name="shuttleId" value={id} />
            <div className="min-w-48 flex-1">
              <label htmlFor="driverId" className="mb-1.5 block text-sm font-medium text-slate-800">{shuttle.driver ? "Change driver" : "Assign a driver"}</label>
              <select id="driverId" name="driverId" required className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base">
                {drivers.map((d) => (<option key={d.driverId} value={d.driverId}>{d.name} ({d.licence})</option>))}
              </select>
            </div>
            <Button type="submit">{shuttle.driver ? "Change" : "Assign"}</Button>
          </form>
        )}
      </Panel>

      <Panel title="QR code" description="Print this code and attach it to the shuttle. Replacing or revoking it stops the old code working immediately.">
        {shuttle.qr && qrUrl ? (
          <div className="flex flex-wrap items-start gap-6">
            <QrImage value={qrUrl} label={`QR code for shuttle ${shuttle.code}`} />
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Manual code: <span className="font-mono text-lg font-semibold tracking-widest text-slate-900">{shuttle.qr.shortCode}</span></p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={`/university-admin/shuttles/${id}/qr`} variant="secondary">Print view</ButtonLink>
                <form action={replaceQrAction}><input type="hidden" name="shuttleId" value={id} /><Button type="submit" variant="secondary">Replace code</Button></form>
                <form action={revokeQrAction}><input type="hidden" name="shuttleId" value={id} /><Button type="submit" variant="danger">Revoke code</Button></form>
              </div>
            </div>
          </div>
        ) : (
          <form action={replaceQrAction}><input type="hidden" name="shuttleId" value={id} /><Button type="submit">Generate QR code</Button></form>
        )}
      </Panel>
    </>
  );
}
