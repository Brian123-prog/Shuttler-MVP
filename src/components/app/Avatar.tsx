/** A round profile picture, or the person's initials when there is no picture. */
export function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  const box = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={box} className="shrink-0 rounded-full bg-slate-100 object-cover" />;
  }
  return (
    <span aria-hidden="true" style={{ ...box, fontSize: Math.round(size / 2.6) }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800">
      {initials}
    </span>
  );
}
