import type { Metadata } from "next";
import { Badge, Button, DataTable, EmptyState } from "@/components/ui";
import { Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { listFares } from "@/lib/fares/queries";
import { fareState, nextFare, pickFare } from "@/lib/fares/resolve";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { listRoutes } from "@/lib/transport/queries";
import { FareForm } from "../FareForm";
import { endFareAction } from "../fare-actions";

export const metadata: Metadata = { title: "Fares" };

export default async function FaresPage() {
  const { university } = await requireUniversityAdmin();
  const [fares, routes] = await Promise.all([listFares(university.id), listRoutes(university.id)]);
  const now = new Date();
  const routeLabel = (id: string | null) => {
    if (id === null) return "All routes (default)";
    const r = routes.find((x) => x.id === id);
    return r ? `${r.code} - ${r.name}` : "Unknown route";
  };

  const scopes: { id: string | null; label: string }[] = [{ id: null, label: routeLabel(null) }, ...routes.map((r) => ({ id: r.id, label: routeLabel(r.id) }))];
  const rows = scopes.map((s) => {
    const inForce = pickFare(fares, s.id, now);
    const next = nextFare(fares, s.id, now);
    return { ...s, inForce, next, ownFare: inForce !== null && inForce.route_id === s.id };
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Fares</h1>

      <DataTable
        caption="Fares in force"
        rows={rows}
        rowKey={(r) => r.id ?? "default"}
        columns={[
          { key: "s", header: "Route", render: (r) => <span className="font-medium">{r.label}</span> },
          { key: "f", header: "Fare now", render: (r) => (r.inForce ? <>{formatKobo(r.inForce.amount_kobo)} <span className="text-slate-500">{r.id !== null && !r.ownFare ? "(default)" : ""}</span></> : <span className="text-slate-500">Not set</span>) },
          { key: "n", header: "Next change", render: (r) => (r.next ? `${formatKobo(r.next.amount_kobo)} from ${formatDateTime(r.next.effective_from)}` : "") },
          {
            key: "a", header: "Action",
            render: (r) => (r.inForce && r.ownFare ? (
              <form action={endFareAction}>
                <input type="hidden" name="routeId" value={r.id ?? ""} />
                <Button type="submit" variant="secondary" aria-label={`End the fare for ${r.label}`}>End fare</Button>
              </form>
            ) : null),
          },
        ]}
      />

      <Panel title="Set a fare"><FareForm routes={routes} /></Panel>

      <Panel title="Fare history" description="Past and scheduled fares are kept. A fare is never edited; setting a new one ends the previous one.">
        <DataTable
          caption="Fare history"
          rows={fares}
          rowKey={(f) => f.id}
          empty={<EmptyState title="No fares set yet" />}
          columns={[
            { key: "s", header: "Route", render: (f) => routeLabel(f.route_id) },
            { key: "a", header: "Fare", render: (f) => formatKobo(f.amount_kobo) },
            { key: "f", header: "From", render: (f) => formatDateTime(f.effective_from) },
            { key: "t", header: "Until", render: (f) => (f.effective_to ? formatDateTime(f.effective_to) : "") },
            {
              key: "st", header: "Status",
              render: (f) => {
                const s = fareState(f, now);
                return <Badge tone={s === "current" ? "success" : s === "scheduled" ? "info" : "neutral"}>{s === "current" ? "Current" : s === "scheduled" ? "Scheduled" : "Ended"}</Badge>;
              },
            },
          ]}
        />
      </Panel>
    </>
  );
}
