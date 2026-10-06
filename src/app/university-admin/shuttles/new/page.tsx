import type { Metadata } from "next";
import { Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { listRoutes } from "@/lib/transport/queries";
import { ShuttleForm } from "../../ShuttleForm";

export const metadata: Metadata = { title: "Add shuttle" };

export default async function NewShuttlePage() {
  const { university } = await requireUniversityAdmin();
  const routes = await listRoutes(university.id);
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Add shuttle</h1>
      <Panel title="Shuttle and vehicle"><ShuttleForm routes={routes} /></Panel>
    </>
  );
}
