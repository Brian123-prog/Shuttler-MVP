import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { EmptyNote, Panel } from "@/components/app/bits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { formatDays, formatTime } from "@/lib/transport/format";
import { getRoute, listRouteStops, listSchedules, listStops } from "@/lib/transport/queries";
import { isUuid } from "@/lib/validation";
import { RouteForm, ScheduleForm } from "../../TransportForms";
import { addRouteStopAction, deleteScheduleAction, moveRouteStopAction, removeRouteStopAction } from "../../transport-actions";

export const metadata: Metadata = { title: "Manage route" };

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { university } = await requireUniversityAdmin();
  if (!isUuid(id)) notFound();
  const route = await getRoute(university.id, id);
  if (!route) notFound();

  const [allStops, allRouteStops, allSchedules] = await Promise.all([listStops(university.id), listRouteStops(university.id), listSchedules(university.id)]);
  const stopById = new Map(allStops.map((s) => [s.id, s]));
  const onRoute = allRouteStops.filter((rs) => rs.route_id === id);
  const onRouteIds = new Set(onRoute.map((rs) => rs.stop_id));
  const available = allStops.filter((s) => s.status === "ACTIVE" && !onRouteIds.has(s.id));
  const schedules = allSchedules.filter((s) => s.route_id === id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-900">{route.name}</h1>
          <Badge tone="info">{route.code}</Badge>
        </div>
        <ButtonLink href="/university-admin/routes" variant="ghost">Back to routes</ButtonLink>
      </div>

      <Panel title="Route details"><RouteForm route={route} /></Panel>

      <Panel title="Stops" description="Stops are listed in the order the shuttle visits them.">
        {onRoute.length === 0 ? (
          <EmptyNote>No stops on this route yet.</EmptyNote>
        ) : (
          <ol className="divide-y divide-slate-100">
            {onRoute.map((rs, i) => {
              const name = stopById.get(rs.stop_id)?.name ?? "Unknown stop";
              return (
                <li key={rs.stop_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span className="text-sm text-slate-900"><span className="mr-2 text-slate-500">{i + 1}.</span>{name}</span>
                  <div className="flex gap-1">
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveRouteStopAction}>
                        <input type="hidden" name="routeId" value={id} />
                        <input type="hidden" name="stopId" value={rs.stop_id} />
                        <input type="hidden" name="direction" value={dir} />
                        <Button type="submit" variant="ghost" aria-label={`Move ${name} ${dir}`} disabled={(dir === "up" && i === 0) || (dir === "down" && i === onRoute.length - 1)}>
                          {dir === "up" ? "Up" : "Down"}
                        </Button>
                      </form>
                    ))}
                    <form action={removeRouteStopAction}>
                      <input type="hidden" name="routeId" value={id} />
                      <input type="hidden" name="stopId" value={rs.stop_id} />
                      <Button type="submit" variant="ghost" aria-label={`Remove ${name} from route`}>Remove</Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-5 border-t border-slate-100 pt-5">
          {available.length === 0 ? (
            <p className="text-sm text-slate-600">
              {allStops.length === 0 ? "Create stops first, then add them to this route." : "Every active stop is already on this route."}{" "}
              <ButtonLink href="/university-admin/stops" variant="ghost">Manage stops</ButtonLink>
            </p>
          ) : (
            <form action={addRouteStopAction} className="flex max-w-lg flex-wrap items-end gap-3">
              <input type="hidden" name="routeId" value={id} />
              <div className="min-w-48 flex-1">
                <label htmlFor="stopId" className="mb-1.5 block text-sm font-medium text-slate-800">Add a stop</label>
                <select id="stopId" name="stopId" required className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base">
                  {available.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <Button type="submit">Add to route</Button>
            </form>
          )}
        </div>
      </Panel>

      <Panel title="Departures">
        {schedules.length === 0 ? (
          <EmptyNote>No departures scheduled.</EmptyNote>
        ) : (
          <ul className="divide-y divide-slate-100">
            {schedules.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><span className="font-semibold">{formatTime(s.departure_time)}</span> <span className="text-slate-600">{formatDays(s.days_of_week)}</span></span>
                <form action={deleteScheduleAction}>
                  <input type="hidden" name="scheduleId" value={s.id} />
                  <Button type="submit" variant="ghost" aria-label={`Remove the ${formatTime(s.departure_time)} departure`}>Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-slate-100 pt-5"><ScheduleForm routeId={id} /></div>
      </Panel>
    </>
  );
}
