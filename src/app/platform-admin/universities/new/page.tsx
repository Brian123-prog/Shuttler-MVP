import type { Metadata } from "next";
import { Panel } from "@/components/app/bits";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { UniversityForm } from "../../UniversityForms";

export const metadata: Metadata = { title: "Add university" };

export default async function NewUniversityPage() {
  await requirePlatformAdmin();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Add university</h1>
      <Panel title="University details"><UniversityForm /></Panel>
    </>
  );
}
