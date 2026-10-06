import { describe, it, expect } from "vitest";
import { formatDays, formatTime } from "./format";

describe("transport format", () => {
  it("compresses day ranges", () => {
    expect(formatDays([1, 2, 3, 4, 5])).toBe("Mon to Fri");
    expect(formatDays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(formatDays([1, 3])).toBe("Mon, Wed");
    expect(formatDays([1, 2, 3, 6])).toBe("Mon to Wed, Sat");
  });
  it("trims seconds", () => {
    expect(formatTime("07:30:00")).toBe("07:30");
  });
});
