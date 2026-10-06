export type FieldErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter your email address.";
  if (v.length > 254 || !EMAIL.test(v)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 10) return "Use at least 10 characters.";
  if (value.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return "Include at least one letter and one number.";
  return null;
}

export function validateText(label: string, value: string, min: number, max: number): string | null {
  const v = value.trim();
  if (v.length < min) return min <= 1 ? `Enter ${label}.` : `${label} must be at least ${min} characters.`;
  if (v.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

export function validateOptionalPhone(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return PHONE.test(v) ? null : "Enter a valid phone number.";
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Only allow same-site relative redirect targets. */
export function safeNextPath(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function compactErrors(entries: Record<string, string | null>): FieldErrors {
  return Object.fromEntries(Object.entries(entries).filter((e): e is [string, string] => e[1] !== null));
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isTime(value: string): boolean {
  return TIME.test(value);
}

/** Parses ISO weekday checkbox values (1 = Monday ... 7 = Sunday). Returns null when empty or invalid. */
export function parseDays(values: FormDataEntryValue[]): number[] | null {
  const days = [...new Set(values.map((v) => Number(v)))].sort((a, b) => a - b);
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return null;
  return days;
}

export function parseCoordinate(value: string, min: number, max: number): number | null {
  if (!/^-?\d{1,3}(\.\d{1,6})?$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}
