import { describe, it, expect } from "vitest";
import { fareState, nextFare, pickFare, type FareVersion } from "./resolve";

const at = new Date("2026-10-01T12:00:00Z");
const fares: FareVersion[] = [
  { id: "d1", route_id: null, amount_kobo: 15000, effective_from: "2026-09-01T00:00:00Z", effective_to: "2026-10-05T00:00:00Z" },
  { id: "d2", route_id: null, amount_kobo: 25000, effective_from: "2026-10-05T00:00:00Z", effective_to: null },
  { id: "r1", route_id: "route-1", amount_kobo: 20000, effective_from: "2026-09-15T00:00:00Z", effective_to: null },
];

describe("fare resolution", () => {
  it("classifies versions", () => {
    expect(fareState(fares[0]!, at)).toBe("current");
    expect(fareState(fares[1]!, at)).toBe("scheduled");
    expect(fareState(fares[0]!, new Date("2026-10-06T00:00:00Z"))).toBe("ended");
  });
  it("uses the default when a route has no fare", () => {
    expect(pickFare(fares, "route-2", at)?.amount_kobo).toBe(15000);
    expect(pickFare(fares, null, at)?.amount_kobo).toBe(15000);
  });
  it("prefers a route fare over the default", () => {
    expect(pickFare(fares, "route-1", at)?.amount_kobo).toBe(20000);
  });
  it("applies a scheduled fare from its start", () => {
    expect(pickFare(fares, "route-2", new Date("2026-10-06T00:00:00Z"))?.amount_kobo).toBe(25000);
  });
  it("finds the next scheduled change", () => {
    expect(nextFare(fares, null, at)?.amount_kobo).toBe(25000);
    expect(nextFare(fares, "route-1", at)).toBeNull();
  });
  it("returns null when nothing is in force", () => {
    expect(pickFare([], null, at)).toBeNull();
  });
});
