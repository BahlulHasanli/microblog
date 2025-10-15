import moment from "moment";
import "moment/locale/az";

/**
 * Tarixi formatla
 * @param date - Tarix (string, Date, və ya moment obyekti)
 * @param format - Format (default: "D MMMM YYYY")
 * @returns Formatlanmış tarix
 */
export function formatDate(
  date: string | Date,
  format: string = "D MMMM YYYY"
): string {
  return moment(date).locale("az").format(format);
}

/**
 * Qısa tarix formatı (gün və ay)
 * @param date - Tarix
 * @returns Formatlanmış tarix (məs: "15 Oktyabr")
 */
export function formatShortDate(date: string | Date): string {
  return moment(date).locale("az").format("D MMMM");
}

/**
 * Tam tarix formatı (gün, ay, il)
 * @param date - Tarix
 * @returns Formatlanmış tarix (məs: "15 Oktyabr 2025")
 */
export function formatFullDate(date: string | Date): string {
  return moment(date).locale("az").format("D MMMM YYYY");
}

/**
 * ISO formatında tarix
 * @param date - Tarix
 * @returns ISO formatında tarix
 */
export function formatISO(date: string | Date): string {
  return moment(date).toISOString();
}

/**
 * Sadə tarix formatı (YYYY-MM-DD)
 * @param date - Tarix
 * @returns Formatlanmış tarix (məs: "2025-10-15")
 */
export function formatSimpleDate(date: string | Date): string {
  return moment(date)
    .format("MMM D, YYYY")
    .toLowerCase()
    .replace(/^./, (firstChar) => firstChar.toUpperCase());
}
