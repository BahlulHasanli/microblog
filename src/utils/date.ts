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

/**
 * Sadə tarix formatı (Okt 21, 2025)
 * @param date - Tarix
 * @returns Formatlanmış tarix (məs: "Okt 21, 2025")
 */
export function formatSimpleDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy", { locale: az });
}
