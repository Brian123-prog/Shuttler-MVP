import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className = "h-6 w-6", children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const QrIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" /></Svg>
);
export const NairaIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <span aria-hidden="true" className={`inline-flex items-center justify-center text-lg font-extrabold leading-none ${className}`}>{"\u20A6"}</span>
);
export const CheckIcon = (p: IconProps) => (<Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>);
export const ArrowRightIcon = (p: IconProps) => (<Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>);
export const ArrowDownIcon = (p: IconProps) => (<Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>);
export const ClockIcon = (p: IconProps) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>);
export const StudentIcon = (p: IconProps) => (<Svg {...p}><path d="M3 9l9-5 9 5-9 5-9-5z" /><path d="M7 11.5V16c0 1.2 2.2 3 5 3s5-1.8 5-3v-4.5" /></Svg>);
export const DriverIcon = (p: IconProps) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.2" /><path d="M12 14.2V21M9.9 11.1L3.5 9.5M14.1 11.1l6.4-1.6" /></Svg>);
export const UniversityIcon = (p: IconProps) => (<Svg {...p}><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></Svg>);
export const ScaleIcon = (p: IconProps) => (<Svg {...p}><path d="M12 4v16M7 20h10M5 7h14" /><path d="M5 7l-3 7a3.5 3.5 0 006 0L5 7zM19 7l-3 7a3.5 3.5 0 006 0l-3-7z" /></Svg>);
export const ShieldIcon = (p: IconProps) => (<Svg {...p}><path d="M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6l7-3z" /><path d="M9 12l2.2 2.2L15.5 10" /></Svg>);
