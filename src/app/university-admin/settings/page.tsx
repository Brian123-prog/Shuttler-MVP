import type { Metadata } from "next";
import { Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { getSupportContact } from "@/lib/transport/queries";
import { SettingsForm } from "../TransportForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { university } = await requireUniversityAdmin();
  const contact = await getSupportContact(university.id);
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Settings</h1>
      <Panel title="Transport office contact" description="Shown to students and drivers of this university.">
        <SettingsForm email={contact?.email ?? ""} phone={contact?.phone ?? ""} />
      </Panel>
    </>
  );
}
