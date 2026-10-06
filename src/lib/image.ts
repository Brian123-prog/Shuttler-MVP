export type ImageInfo = { ext: "jpg" | "png" | "webp"; contentType: string };
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));

/** Identifies an image by its first bytes, ignoring whatever type the browser claimed. Returns null for anything else. */
export function sniffImage(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  if (bytes.length > 8 && bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return { ext: "png", contentType: "image/png" };
  if (bytes.length > 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { ext: "webp", contentType: "image/webp" };
  return null;
}
