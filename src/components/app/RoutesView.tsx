import { Badge, Card } from "@/components/ui";
import { listFares } from "@/lib/fares/queries";
import { pickFare } from "@/lib/fares/resolve";
import { formatKobo } from "@/lib/money";
import { formatDays, formatTime } from "@/lib/transport/format";
import { getTransportNetwork } from "@/lib/transport/queries";
import { EmptyNote } from "./bits";

/** Active routes, ordered stops and departures for a university. Visible to approved members. */
export async function RoutesView({ universityId }: { universityId: string }) {
  const [{ routes, stopsByRoute, schedulesByRoute }, fares] = await Promise.all([getTransportNetwork(universityId), listFares(universityId)]);
  const now = new Date();
  if (routes.length === 0) return <EmptyNote>No routes have been published yet.</EmptyNote>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {routes.map((r) => {
        const stops = stopsByRoute.get(r.id) ?? [];
        const departures = schedulesByRoute.get(r.id) ?? [];
        const fare = pickFare(fares, r.id, now);
        return (
          <Card key={r.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{r.name}</h3>
                <p className="text-sm text-slate-600">{r.origin} to {r.destination}</p>
              </div>
              <Badge tone="info">{r.code}</Badge>
            </div>
            <p className="text-sm text-slate-700">{formatDays(r.operating_days)}, {formatTime(r.operating_start)} to {formatTime(r.operating_end)}</p>
            {fare ? <p className="text-sm font-semibold text-brand-800">Fare {formatKobo(fare.amount_kobo)}</p> : null}
            {stops.length > 0 ? (
              <ol className="list-decimal space-y-0.5 pl-5 text-sm text-slate-800">
                {stops.map((s) => (<li key={s.id}>{s.name}</li>))}
              </ol>
            ) : null}
            {departures.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {departures.map((d) => (
                  <li key={d.id} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                    {formatTime(d.departure_time)} <span className="font-normal">{formatDays(d.days_of_week)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
