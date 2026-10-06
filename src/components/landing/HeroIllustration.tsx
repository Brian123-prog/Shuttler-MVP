/**
 * Shuttler hero artwork: a campus shuttle, a QR card, a naira badge and a change confirmation.
 * Pure SVG (no images, no scripts). The QR pattern is decorative and is not a working code.
 * The amounts are an illustrative example, not real data.
 */

const N = 21;

function buildCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!inFinder(x, y) && next() > 0.52) cells.push({ x, y });
    }
  }
  return cells;
}
const CELLS = buildCells();

function Finder({ x, y, cell }: { x: number; y: number; cell: number }) {
  return (
    <g transform={`translate(${x * cell} ${y * cell})`}>
      <rect width={7 * cell} height={7 * cell} rx={cell} fill="#0b2769" />
      <rect x={cell} y={cell} width={5 * cell} height={5 * cell} rx={cell * 0.6} fill="#ffffff" />
      <rect x={2 * cell} y={2 * cell} width={3 * cell} height={3 * cell} rx={cell * 0.5} fill="#0b2769" />
    </g>
  );
}

export function HeroIllustration({ className }: { className?: string }) {
  const size = 118;
  const cell = size / N;
  const font = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  return (
    <svg viewBox="0 0 560 430" className={className} role="img" aria-label="A campus shuttle with a Shuttler QR code, a naira badge, and a driver-confirmed change record" fontFamily={font}>
      <defs>
        <clipPath id="bus-clip"><rect x="30" y="150" width="360" height="132" rx="34" /></clipPath>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="220%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#020b24" floodOpacity="0.35" /></filter>
      </defs>

      <circle cx="285" cy="215" r="175" fill="#ffffff" opacity="0.06" />
      <circle cx="285" cy="215" r="125" fill="#ffffff" opacity="0.06" />
      <rect x="0" y="326" width="560" height="5" rx="2.5" fill="#ffffff" opacity="0.22" />

      {/* shuttle */}
      <g filter="url(#soft)">
        <rect x="30" y="150" width="360" height="132" rx="34" fill="#f4f8ff" />
        <g clipPath="url(#bus-clip)">
          <rect x="30" y="236" width="360" height="30" fill="#2a58bb" />
          <rect x="30" y="266" width="360" height="20" fill="#0b2769" />
          <rect x="30" y="150" width="360" height="12" fill="#d9e4f8" />
        </g>
        <rect x="56" y="174" width="246" height="52" rx="12" fill="#17325f" />
        <path d="M130 174v52M204 174v52" stroke="#f4f8ff" strokeWidth="5" />
        <path d="M318 174h28a20 20 0 0120 20v32h-48z" fill="#2a58bb" />
        <text x="56" y="258" fill="#ffffff" fontSize="17" fontWeight="800" letterSpacing="5">SHUTTLER</text>
        <circle cx="383" cy="250" r="7" fill="#ffffff" />
      </g>
      {[112, 312].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="290" r="32" fill="#0b2769" stroke="#ffffff" strokeWidth="8" />
          <circle cx={cx} cy="290" r="10" fill="#8db4ff" />
        </g>
      ))}

      {/* QR card */}
      <g transform="translate(372 80) rotate(6)" filter="url(#soft)">
        <rect width="156" height="196" rx="22" fill="#ffffff" />
        <g transform="translate(19 19)">
          <rect width={size} height={size} rx="8" fill="#ffffff" />
          {CELLS.map((c) => (<rect key={`${c.x}-${c.y}`} x={c.x * cell} y={c.y * cell} width={cell * 0.9} height={cell * 0.9} fill="#0b2769" />))}
          <Finder x={0} y={0} cell={cell} />
          <Finder x={N - 7} y={0} cell={cell} />
          <Finder x={0} y={N - 7} cell={cell} />
        </g>
        <text x="78" y="172" textAnchor="middle" fill="#0b2769" fontSize="9" fontWeight="800" letterSpacing="0.4">SCAN {"\u00B7"} RECORD {"\u00B7"} CONFIRM</text>
        <text x="78" y="187" textAnchor="middle" fill="#4f7ad6" fontSize="9" fontWeight="700" letterSpacing="0.8">DRIVER QR CODE</text>
      </g>

      {/* naira badge */}
      <g filter="url(#soft)">
        <circle cx="470" cy="52" r="36" fill="#16a34a" stroke="#ffffff" strokeWidth="7" />
        <text x="470" y="65" textAnchor="middle" fill="#ffffff" fontSize="38" fontWeight="800">{"\u20A6"}</text>
      </g>

      {/* change record */}
      <g transform="translate(24 340)" filter="url(#soft)">
        <rect width="290" height="80" rx="18" fill="#ffffff" />
        <text x="20" y="27" fill="#4f7ad6" fontSize="11" fontWeight="800" letterSpacing="1.4">EXAMPLE</text>
        <text x="20" y="49" fill="#0b2769" fontSize="15" fontWeight="600">Fare {"\u20A6"}200  {"\u00B7"}  You paid {"\u20A6"}500</text>
        <text x="20" y="69" fill="#05603a" fontSize="16" fontWeight="800">Change owed {"\u20A6"}300</text>
      </g>
      <g transform="translate(332 352)" filter="url(#soft)">
        <rect width="196" height="52" rx="26" fill="#16a34a" />
        <circle cx="26" cy="26" r="13" fill="#ffffff" />
        <path d="M19.5 26.5l4.5 4.5 8-9" fill="none" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="50" y="32" fill="#ffffff" fontSize="16" fontWeight="800">Driver confirmed</text>
      </g>
    </svg>
  );
}
