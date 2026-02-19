import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert Arabic/Eastern numerals + ص/م to parseable western time string */
export function parseArabicTime(t: string): string {
  const eastern = '٠١٢٣٤٥٦٧٨٩';
  const western = t.replace(/[٠-٩]/g, d => String(eastern.indexOf(d)));
  return western.replace('ص', 'AM').replace('م', 'PM');
}

/** Compare two date+time entries for newest-first sorting (handles Arabic time) */
export function compareDateTime(
  dateA: string, timeA: string,
  dateB: string, timeB: string
): number {
  const a = new Date(dateA + ' ' + parseArabicTime(timeA)).getTime() || 0;
  const b = new Date(dateB + ' ' + parseArabicTime(timeB)).getTime() || 0;
  return b - a; // newest first
}
