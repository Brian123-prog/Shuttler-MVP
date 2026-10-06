import { describe, it, expect } from "vitest";
import { parseNairaToKobo, formatKobo, calculateChange } from "./money";

describe("money", () => {
  it("parses naira text to integer kobo", () => {
    expect(parseNairaToKobo("150")).toBe(15000);
    expect(parseNairaToKobo("350.5")).toBe(35050);
    expect(parseNairaToKobo("0.07")).toBe(7);
  });
  it("rejects invalid input", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "1,000"]) expect(parseNairaToKobo(bad)).toBeNull();
  });
  it("formats kobo", () => {
    expect(formatKobo(15000)).toBe("\u20A6150.00");
    expect(formatKobo(123456789)).toBe("\u20A61,234,567.89");
    expect(formatKobo(-50)).toBe("-\u20A60.50");
  });
  it("refuses non-integer amounts", () => {
    expect(() => formatKobo(1.5)).toThrow();
  });
  it("calculates change: 500 cash, 150 fare -> 350", () => {
    expect(calculateChange(50000, 15000)).toBe(35000);
  });
  it("rejects insufficient cash", () => {
    expect(() => calculateChange(10000, 15000)).toThrow();
  });
});
