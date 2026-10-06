import QRCode from "qrcode";

/** Renders a QR code as inline SVG. The content is generated here from a server-built URL, never from user input. */
export async function QrImage({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      className="[&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
