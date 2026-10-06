import type { Metadata } from "next";
import { Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { RouteForm } from "../../TransportForms";

export const metadata: Metadata = { title: "Add route" };

export default async function NewRoutePage() {
  await requireUniversityAdmin();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Add route</h1>
      <Panel title="Route details"><RouteForm /></Panel>
    </>
  );
}
