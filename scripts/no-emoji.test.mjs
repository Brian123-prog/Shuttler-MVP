import { describe, it, expect } from "vitest";
import { containsEmoji, findEmojiLines } from "./no-emoji.mjs";

describe("no-emoji guard", () => {
  it("flags emoji code points", () => {
    expect(containsEmoji(`hello ${String.fromCodePoint(0x1f680)}`)).toBe(true);
    expect(containsEmoji(`ok ${String.fromCodePoint(0x2705)}`)).toBe(true);
    expect(containsEmoji(`ok ${String.fromCodePoint(0x2764, 0xfe0f)}`)).toBe(true);
  });
  it("allows normal text, arrows and the naira sign", () => {
    expect(containsEmoji("Fare: \u20A6150 -> next \u2192 stop")).toBe(false);
  });
  it("reports line numbers", () => {
    const text = `a\nb ${String.fromCodePoint(0x1f680)}\nc`;
    expect(findEmojiLines(text)).toEqual([{ line: 2, text: `b ${String.fromCodePoint(0x1f680)}` }]);
  });
});
