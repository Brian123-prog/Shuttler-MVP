export type FareVersion = { id: string; route_id: string | null; amount_kobo: number; effective_from: string; effective_to: string | null };
export type FareState = "current" | "scheduled" | "ended";

export function fareState(f: FareVersion, at: Date): FareState {
  if (new Date(f.effective_from) > at) return "scheduled";
  if (f.effective_to === null || new Date(f.effective_to) > at) return "current";
  return "ended";
}

/** The fare in force at a moment: a route fare wins over the university default. Mirrors applicable_fare() in the database. */
export function pickFare(fares: FareVersion[], routeId: string | null, at: Date): FareVersion | null {
  const inForce = fares.filter((f) => fareState(f, at) === "current" && (f.route_id === routeId || f.route_id === null));
  inForce.sort((a, b) => Number(b.route_id !== null) - Number(a.route_id !== null) || b.effective_from.localeCompare(a.effective_from));
  return inForce[0] ?? null;
}

/** The next fare change that has been scheduled for a scope, if any. */
export function nextFare(fares: FareVersion[], routeId: string | null, at: Date): FareVersion | null {
  return fares.filter((f) => f.route_id === routeId && fareState(f, at) === "scheduled").sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0] ?? null;
}
