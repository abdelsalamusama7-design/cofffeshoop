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

/**
 * Calculate hours worked between two 24h time strings (HH:MM:SS or HH:MM).
 * Returns a decimal number with full precision (e.g. 0.0167 for 1 minute).
 * Handles cases where checkIn might have Arabic numerals or AM/PM.
 */
export function calcHoursWorked(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;

  // Parse checkIn - handle Arabic numerals
  const cleanIn = parseArabicTime(checkIn).replace(/[APap][Mm]/g, '').trim();
  const inParts = cleanIn.split(':').map(Number);
  let h1 = isNaN(inParts[0]) ? 0 : inParts[0];
  const m1 = isNaN(inParts[1]) ? 0 : inParts[1];
  const s1 = isNaN(inParts[2]) ? 0 : inParts[2];

  // Handle AM/PM from original string
  if (checkIn.includes('م') || checkIn.toUpperCase().includes('PM')) {
    if (h1 < 12) h1 += 12;
  } else if (checkIn.includes('ص') || checkIn.toUpperCase().includes('AM')) {
    if (h1 === 12) h1 = 0;
  }

  // Parse checkOut
  const cleanOut = parseArabicTime(checkOut).replace(/[APap][Mm]/g, '').trim();
  const outParts = cleanOut.split(':').map(Number);
  let h2 = isNaN(outParts[0]) ? 0 : outParts[0];
  const m2 = isNaN(outParts[1]) ? 0 : outParts[1];
  const s2 = isNaN(outParts[2]) ? 0 : outParts[2];

  if (checkOut.includes('م') || checkOut.toUpperCase().includes('PM')) {
    if (h2 < 12) h2 += 12;
  } else if (checkOut.includes('ص') || checkOut.toUpperCase().includes('AM')) {
    if (h2 === 12) h2 = 0;
  }

  const startSecs = h1 * 3600 + m1 * 60 + s1;
  const endSecs = h2 * 3600 + m2 * 60 + s2;
  let diffSecs = endSecs - startSecs;
  if (diffSecs < 0) diffSecs += 24 * 3600; // overnight

  return Math.round((diffSecs / 3600) * 10000) / 10000; // 4 decimal precision
}

/**
 * Format decimal hours to "X ساعة Y دقيقة Z ثانية" (Arabic).
 * Always shows at least one unit. Skips zero units.
 */
export function formatHoursDetailed(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0 ثانية';
  const totalSecs = Math.round(decimalHours * 3600);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs} ساعة`);
  if (mins > 0) parts.push(`${mins} دقيقة`);
  if (secs > 0) parts.push(`${secs} ثانية`);
  return parts.length > 0 ? parts.join(' ') : '0 ثانية';
}
