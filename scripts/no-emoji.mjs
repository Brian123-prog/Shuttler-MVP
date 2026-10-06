// Emoji are not allowed anywhere in Shuttler. Shared by the CLI check and tests.
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{FE0F}\u{200D}\u{20E3}]/u;

export function containsEmoji(text) {
  return EMOJI.test(text);
}

export function findEmojiLines(text) {
  return text
    .split("\n")
    .map((line, i) => ({ line: i + 1, text: line }))
    .filter((l) => EMOJI.test(l.text));
}
