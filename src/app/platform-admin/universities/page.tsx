import type { Metadata } from "next";
import { Badge, ButtonLink, DataTable, EmptyState, type StatusTone } from "@/components/ui";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Universities" };

const UNI_STATUS: Record<string, [StatusTone, string]> = {
  ACTIVE: ["success", "Active"],
  ONBOARDING: ["info", "Onboarding"],
  SUSPENDED: ["danger", "Suspended"],
};

export default async function UniversitiesPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("id, name, short_name, slug, status, created_at").order("name");
  const rows = (data ?? []) as { id: string; name: string; short_name: string | null; slug: string; status: string; created_at: string }[];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Universities</h1>
        <ButtonLink href="/platform-admin/universities/new">Add university</ButtonLink>
      </div>
      <DataTable
        caption="Universities"
        rows={rows}
        rowKey={(r) => r.id}
        empty={<EmptyState title="No universities yet" description="Add the first university to begin onboarding." action={<ButtonLink href="/platform-admin/universities/new">Add university</ButtonLink>} />}
        columns={[
          { key: "n", header: "Name", render: (r) => <span className="font-medium">{r.name}{r.short_name ? ` (${r.short_name})` : ""}</span> },
          { key: "s", header: "Slug", render: (r) => r.slug },
          { key: "t", header: "Status", render: (r) => { const [tone, label] = UNI_STATUS[r.status] ?? ["neutral", r.status]; return <Badge tone={tone}>{label}</Badge>; } },
          { key: "c", header: "Created", render: (r) => formatDate(r.created_at) },
          { key: "a", header: "Action", render: (r) => <ButtonLink href={`/platform-admin/universities/${r.id}`} variant="secondary">Manage</ButtonLink> },
        ]}
      />
    </>
  );
}
