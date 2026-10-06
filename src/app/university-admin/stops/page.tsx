import type { Metadata } from "next";
import { Badge, ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { listStops } from "@/lib/transport/queries";
import { StopForm } from "../TransportForms";

export const metadata: Metadata = { title: "Stops" };

export default async function StopsPage() {
  const { university } = await requireUniversityAdmin();
  const stops = await listStops(university.id);
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Stops</h1>
      <Panel title="Add a stop"><StopForm /></Panel>
      <DataTable
        caption="Stops"
        rows={stops}
        rowKey={(s) => s.id}
        empty={<EmptyState title="No stops yet" />}
        columns={[
          { key: "n", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
          { key: "d", header: "Description", render: (s) => s.description ?? "" },
          { key: "l", header: "Location", render: (s) => (s.latitude !== null && s.longitude !== null ? `${s.latitude}, ${s.longitude}` : "") },
          { key: "t", header: "Status", render: (s) => <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "Active" : "Inactive"}</Badge> },
          { key: "a", header: "Action", render: (s) => <ButtonLink href={`/university-admin/stops/${s.id}`} variant="secondary">Edit</ButtonLink> },
        ]}
      />
    </>
  );
}
