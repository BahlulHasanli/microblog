/** TipTap/HTML məzmunundan təxmini söz sayı */
export function estimateWordCountFromHtml(html: string): number {
  if (!html || !html.trim()) return 0;
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

const WPM = 200;

export function estimateReadMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / WPM));
}

export function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Soldan sağa: ən köhnə gün … bu gün (UTC tarix sərhədi) */
export function rollingUtcDayLabels(numDays: number): string[] {
  const labels: string[] = [];
  const today = new Date();
  const base = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    labels.push(utcDayKey(d));
  }
  return labels;
}

/** `currentLabels`-dən əvvəlki eyni uzunluqda dövr (müqayisə üçün) */
export function previousPeriodLabels(currentLabels: string[]): string[] {
  const n = currentLabels.length;
  if (n === 0) return [];
  const [y, mo, da] = currentLabels[0].split("-").map(Number);
  const oldest = new Date(Date.UTC(y, mo - 1, da));
  const out: string[] = [];
  for (let k = n; k >= 1; k--) {
    const d = new Date(oldest);
    d.setUTCDate(d.getUTCDate() - k);
    out.push(utcDayKey(d));
  }
  return out;
}

export function sumForDayKeys(
  counts: Record<string, number>,
  keys: string[],
): number {
  let s = 0;
  for (const k of keys) s += counts[k] ?? 0;
  return s;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatWriterTrendPct(
  delta: number | null,
  current: number,
  previous: number,
): string {
  if (previous === 0 && current === 0) return "0%";
  if (previous === 0 && current > 0) return "yeni fəaliyyət";
  if (previous === 0) return "—";
  if (delta === null) return "—";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export function writerTrendClassName(
  delta: number | null,
  current: number,
  previous: number,
): string {
  if (previous === 0 && current === 0)
    return "text-base-500 dark:text-base-400";
  if (previous === 0) return "text-emerald-600 dark:text-emerald-400";
  if (delta === null) return "text-base-500";
  if (delta > 0) return "text-emerald-600 dark:text-emerald-400";
  if (delta < 0) return "text-rose-600 dark:text-rose-400";
  return "text-base-600 dark:text-base-400";
}
