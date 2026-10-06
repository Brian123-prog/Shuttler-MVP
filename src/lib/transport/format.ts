const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_OPTIONS: [number, string][] = DAY_SHORT.map((label, i) => [i + 1, label]);

export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  const label = (n: number) => DAY_SHORT[n - 1] ?? "";
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const prev = sorted[i - 1] ?? 0;
    if (sorted[i] !== prev + 1) {
      const first = sorted[start] ?? prev;
      parts.push(i - start >= 3 ? `${label(first)} to ${label(prev)}` : sorted.slice(start, i).map(label).join(", "));
      start = i;
    }
  }
  return parts.join(", ");
}

export function formatTime(value: string): string {
  return value.slice(0, 5);
}
