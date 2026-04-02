import { format } from "date-fns";
import { az } from "date-fns/locale";

/**
 * Tarixi formatla
 * @param date - Tarix
 * @param formatStr - Format (default: "d MMMM yyyy")
 * @returns Formatlanmış tarix
 */
export function formatDate(
  date: string | Date,
  formatStr: string = "d MMMM yyyy"
): string {
  return format(new Date(date), formatStr, { locale: az });
}

/**
 * Qısa tarix formatı (gün və ay)
 * @param date - Tarix
 * @returns Formatlanmış tarix (məs: "15 Oktyabr")
 */
export function formatShortDate(date: string | Date): string {
  return format(new Date(date), "d MMMM", { locale: az });
}

/**
 * Tam tarix formatı (gün, ay, il)
 * @param date - Tarix
 * @returns Formatlanmış tarix (məs: "15 Oktyabr 2025")
 */
export function formatFullDate(date: string | Date): string {
  return format(new Date(date), "d MMMM yyyy", { locale: az });
}

/**
 * ISO formatında tarix
 * @param date - Tarix
 * @returns ISO formatında tarix
 */
export function formatISO(date: string | Date): string {
  return new Date(date).toISOString();
}

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Nisbi tarix formatı — "indi", "bir neçə dəqiqə əvvəl", "dünən", "bir neçə gün əvvəl" və s.
 * UTC təqvim gününə görə müqayisə edir (server vaxtı ilə).
 * @param date - Tarix (ISO string və ya Date)
 * @returns Oxunaqlı nisbi tarix
 */
export function formatSimpleDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();

  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 30) return "indi";
  if (diffSec < 60) return "bir neçə saniyə əvvəl";
  if (diffMin < 2) return "bir dəqiqə əvvəl";
  if (diffMin < 60) return `${diffMin} dəqiqə əvvəl`;
  if (diffHr < 2) return "bir saat əvvəl";
  if (diffHr < 24) return `${diffHr} saat əvvəl`;

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

  if (sameUtcDay(d, yesterday)) return "dünən";
  if (sameUtcDay(d, twoDaysAgo)) return "2 gün əvvəl";

  const nowDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const commentDayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDay = Math.round((nowDayStart - commentDayStart) / 86400000);

  if (diffDay < 7) return `${diffDay} gün əvvəl`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek} həftə əvvəl`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    if (diffMonth === 1) return "bir ay əvvəl";
    return `${diffMonth} ay əvvəl`;
  }

  const diffYear = Math.floor(diffDay / 365);
  if (diffYear === 1) return "bir il əvvəl";
  return `${diffYear} il əvvəl`;
}
