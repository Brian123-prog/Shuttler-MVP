import { cn } from "@/lib/cn";

type LogoMarkProps = { size?: number; className?: string };

/** White "S" inside a deep-blue rounded box. */
export function LogoMark({ size = 36, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Shuttler"
      className={className}
    >
      <rect width="48" height="48" rx="11" fill="#0b2769" />
      <path
        d="M31.5 16.2c-1.6-1.9-4.1-2.9-7.1-2.9-4.3 0-7.1 2.2-7.1 5.5 0 3 2.2 4.5 6.5 5.6l2 .5c2.6.7 3.6 1.5 3.6 2.9 0 1.7-1.6 2.8-4.2 2.8-2.4 0-4.3-.9-5.7-2.7l-3.1 2.6c1.9 2.5 4.9 3.9 8.7 3.9 4.9 0 8.1-2.4 8.1-6.1 0-3.1-2-4.9-6.6-6l-2-.5c-2.5-.6-3.4-1.3-3.4-2.6 0-1.4 1.4-2.3 3.6-2.3 1.9 0 3.4.7 4.6 2.1l3.1-2.6z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="text-xl font-bold tracking-tight text-brand-800">Shuttler</span>
    </span>
  );
}
