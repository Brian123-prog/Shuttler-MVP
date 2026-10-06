import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { Avatar } from "@/components/app/Avatar";
import { PrintButton } from "@/components/app/PrintButton";
import { QrImage } from "@/components/app/QrImage";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { avatarUrl } from "@/lib/avatars";
import { listDriverQrs } from "@/lib/driverqr/queries";
import { getSiteOrigin } from "@/lib/site";
import { isUuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Driver QR code" };

export default async function DriverQrPrintPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const { university } = await requireUniversityAdmin();
  if (!isUuid(driverId)) notFound();
  const driver = (await listDriverQrs(university.id)).find((d) => d.driverId === driverId);
  if (!driver?.qr) notFound();
  const photo = await avatarUrl(driver.avatarPath);
  const url = `${await getSiteOrigin()}/student/scan?c=${driver.qr.token}`;

  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <div className="flex justify-center gap-3 print:hidden">
        <PrintButton />
        <ButtonLink href="/university-admin/driver-qr" variant="ghost">Back</ButtonLink>
      </div>
      <div className="rounded-2xl border-2 border-brand-800 bg-white p-6">
        <p className="text-sm font-semibold text-brand-800">{university.name}</p>
        <div className="my-3 flex justify-center"><Avatar url={photo} name={driver.name} size={96} /></div>
        <p className="text-2xl font-bold text-brand-900">{driver.name}</p>
        <p className="text-sm text-slate-600">Driver</p>
        <div className="my-4 flex justify-center"><QrImage value={url} size={260} label={`QR code for driver ${driver.name}`} /></div>
        <p className="text-sm text-slate-700">Scan with Shuttler, or enter this code</p>
        <p className="font-mono text-2xl font-bold tracking-widest text-slate-900">{driver.qr.shortCode}</p>
      </div>
    </div>
  );
}
