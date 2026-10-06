import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { PrintButton } from "@/components/app/PrintButton";
import { QrImage } from "@/components/app/QrImage";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { getShuttle } from "@/lib/shuttles/queries";
import { getSiteOrigin } from "@/lib/site";
import { isUuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Print QR code" };

export default async function PrintQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { university } = await requireUniversityAdmin();
  if (!isUuid(id)) notFound();
  const shuttle = await getShuttle(university.id, id);
  if (!shuttle?.qr) notFound();
  const url = `${await getSiteOrigin()}/student/scan?c=${shuttle.qr.token}`;

  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <div className="flex justify-center gap-3 print:hidden">
        <PrintButton />
        <ButtonLink href={`/university-admin/shuttles/${id}`} variant="ghost">Back</ButtonLink>
      </div>
      <div className="rounded-2xl border-2 border-brand-800 bg-white p-6">
        <p className="text-sm font-semibold text-brand-800">{university.name}</p>
        <p className="mt-1 text-3xl font-bold text-brand-900">{shuttle.code}</p>
        <p className="text-sm text-slate-600">{shuttle.plate}</p>
        <div className="my-4 flex justify-center"><QrImage value={url} size={280} label={`QR code for shuttle ${shuttle.code}`} /></div>
        <p className="text-sm text-slate-700">Scan with Shuttler, or enter this code</p>
        <p className="font-mono text-2xl font-bold tracking-widest text-slate-900">{shuttle.qr.shortCode}</p>
      </div>
    </div>
  );
}
