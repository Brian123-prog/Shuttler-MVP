import { describe, it, expect } from "vitest";
import { validateEmail, validatePassword, validateText, validateOptionalPhone, isUuid, safeNextPath, compactErrors } from "./validation";

describe("validation", () => {
  it("validates email", () => {
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validateEmail("")).not.toBeNull();
    expect(validateEmail("not-an-email")).not.toBeNull();
  });
  it("validates password strength", () => {
    expect(validatePassword("short1")).not.toBeNull();
    expect(validatePassword("onlyletterslong")).not.toBeNull();
    expect(validatePassword("1234567890123")).not.toBeNull();
    expect(validatePassword("goodpass1234")).toBeNull();
  });
  it("validates text length", () => {
    expect(validateText("Name", " a ", 2, 10)).not.toBeNull();
    expect(validateText("Name", "Ada", 2, 10)).toBeNull();
    expect(validateText("Name", "x".repeat(11), 2, 10)).not.toBeNull();
  });
  it("validates optional phone", () => {
    expect(validateOptionalPhone("")).toBeNull();
    expect(validateOptionalPhone("+234 801 234 5678")).toBeNull();
    expect(validateOptionalPhone("abc")).not.toBeNull();
  });
  it("detects uuids", () => {
    expect(isUuid("aaaaaaaa-0000-0000-0000-000000000001")).toBe(true);
    expect(isUuid("nope")).toBe(false);
  });
  it("blocks open redirects", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("//evil.com")).toBe("/account");
    expect(safeNextPath("https://evil.com")).toBe("/account");
    expect(safeNextPath(null)).toBe("/account");
  });
  it("drops null errors", () => {
    expect(compactErrors({ a: null, b: "bad" })).toEqual({ b: "bad" });
  });
});

import { isTime, parseDays, parseCoordinate } from "./validation";

describe("transport validation", () => {
  it("validates 24 hour times", () => {
    expect(isTime("07:30")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("7:30")).toBe(false);
  });
  it("parses weekdays", () => {
    expect(parseDays(["5", "1", "1"])).toEqual([1, 5]);
    expect(parseDays([])).toBeNull();
    expect(parseDays(["8"])).toBeNull();
    expect(parseDays(["x"])).toBeNull();
  });
  it("parses coordinates in range", () => {
    expect(parseCoordinate("7.3", -90, 90)).toBe(7.3);
    expect(parseCoordinate("95", -90, 90)).toBeNull();
    expect(parseCoordinate("abc", -90, 90)).toBeNull();
  });
});
