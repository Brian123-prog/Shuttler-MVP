import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, DataTable } from "@/components/ui";
import { EmptyNote, Panel } from "@/components/app/bits";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import { AssignAdminForm, UniversityForm, type UniversityValues } from "../../UniversityForms";

export const metadata: Metadata = { title: "Manage university" };

export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePlatformAdmin();
  if (!isUuid(id)) notFound();
  const supabase = await createClient();

  const { data: uni } = await supabase.from("universities").select("id, name, short_name, slug, status").eq("id", id).maybeSingle();
  if (!uni) notFound();

  const [adminRows, grants] = await Promise.all([
    supabase.from("university_admins").select("profile_id, created_at").eq("university_id", id),
    supabase.from("admin_grants").select("id, email, created_at").eq("university_id", id).is("claimed_at", null),
  ]);
  const ids = (adminRows.data ?? []).map((a) => a.profile_id as string);
  const profiles = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = new Map<string, string>((profiles.data ?? []).map((p) => [p.id as string, p.full_name as string]));
  const admins = (adminRows.data ?? []).map((a) => ({ id: a.profile_id as string, name: names.get(a.profile_id as string) ?? "Unknown", since: a.created_at as string }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">{uni.name}</h1>
        <ButtonLink href="/platform-admin/universities" variant="ghost">Back to universities</ButtonLink>
      </div>

      <Panel title="University details"><UniversityForm university={uni as UniversityValues} /></Panel>

      <Panel title="University administrators" description="People who verify students and drivers and manage transport for this university.">
        <DataTable
          caption="University administrators"
          rows={admins}
          rowKey={(r) => r.id}
          empty={<EmptyNote>No administrators yet.</EmptyNote>}
          columns={[{ key: "n", header: "Name", render: (r) => r.name }, { key: "s", header: "Since", render: (r) => formatDate(r.since) }]}
        />
        {(grants.data ?? []).length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Invitations waiting for sign-in</h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {(grants.data ?? []).map((g) => (<li key={g.id as string}>{g.email as string} (invited {formatDate(g.created_at as string)})</li>))}
            </ul>
          </div>
        ) : null}
        <div className="mt-6 border-t border-slate-100 pt-5"><AssignAdminForm universityId={id} /></div>
      </Panel>
    </>
  );
}
