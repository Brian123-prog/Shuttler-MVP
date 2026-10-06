import type { Metadata } from "next";
import { Badge, Button, ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/app/Avatar";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { avatarUrl } from "@/lib/avatars";
import { listDriverQrs } from "@/lib/driverqr/queries";
import { issueDriverQrAction, issueMissingDriverQrsAction, revokeDriverQrAction } from "./actions";

export const metadata: Metadata = { title: "Driver QR codes" };

export default async function DriverQrPage() {
  const { university } = await requireUniversityAdmin();
  const rows = await listDriverQrs(university.id);
  const photos = new Map<string, string | null>(await Promise.all(rows.map(async (r) => [r.driverId, await avatarUrl(r.avatarPath)] as const)));
  const missing = rows.filter((r) => !r.qr).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Driver QR codes</h1>
        {missing > 0 ? (
          <form action={issueMissingDriverQrsAction}><Button type="submit">Issue {missing} missing {missing === 1 ? "code" : "codes"}</Button></form>
        ) : null}
      </div>
      <DataTable
        caption="Driver QR codes"
        rows={rows}
        rowKey={(r) => r.driverId}
        empty={<EmptyState title="No approved drivers yet" description="Approve a driver application, then issue their personal QR code here." />}
        columns={[
          { key: "n", header: "Driver", render: (r) => (<span className="inline-flex items-center gap-3"><Avatar url={photos.get(r.driverId) ?? null} name={r.name} size={36} /><span><span className="font-medium">{r.name}</span><br /><span className="text-slate-600">{r.licence}</span></span></span>) },
          { key: "s", header: "Shuttle", render: (r) => r.shuttleCode ?? "Unassigned" },
          { key: "q", header: "QR code", render: (r) => (r.qr ? <span className="inline-flex items-center gap-2"><Badge tone="success">Active</Badge><span className="font-mono text-xs">{r.qr.shortCode}</span></span> : <Badge tone="neutral">None</Badge>) },
          {
            key: "a", header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap gap-2">
                <form action={issueDriverQrAction}><input type="hidden" name="driverId" value={r.driverId} /><Button type="submit" variant={r.qr ? "secondary" : "primary"}>{r.qr ? "Replace" : "Issue"}</Button></form>
                {r.qr ? <ButtonLink href={`/university-admin/driver-qr/${r.driverId}`} variant="secondary">Print</ButtonLink> : null}
                {r.qr ? <form action={revokeDriverQrAction}><input type="hidden" name="driverId" value={r.driverId} /><Button type="submit" variant="ghost">Revoke</Button></form> : null}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
