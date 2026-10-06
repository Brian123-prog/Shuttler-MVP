import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { getStop } from "@/lib/transport/queries";
import { isUuid } from "@/lib/validation";
import { StopForm } from "../../TransportForms";

export const metadata: Metadata = { title: "Edit stop" };

export default async function EditStopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { university } = await requireUniversityAdmin();
  if (!isUuid(id)) notFound();
  const stop = await getStop(university.id, id);
  if (!stop) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">{stop.name}</h1>
        <ButtonLink href="/university-admin/stops" variant="ghost">Back to stops</ButtonLink>
      </div>
      <Panel title="Stop details"><StopForm stop={stop} /></Panel>
    </>
  );
}
