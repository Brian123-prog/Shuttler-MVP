import { describe, it, expect } from "vitest";
import { sniffImage } from "./image";

const bytes = (...n: number[]) => new Uint8Array([...n, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP by content", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe("png");
    expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]))?.ext).toBe("webp");
  });
  it("rejects other content such as scripts or PDFs", () => {
    expect(sniffImage(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("%PDF-1.7 ......."))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });
});
