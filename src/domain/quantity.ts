import { getUnitByKey, unitLabel } from './units';
import type { Quantity } from './types';

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

const NUM = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+`;
const LEADING = new RegExp(
  String.raw`^\s*(${NUM})(?:(?:\s*[-–—]\s*|\s+to\s+)(${NUM}))?(?![\d/.])\s*(.*)$`,
  'i',
);

function normalizeFractions(s: string): string {
  return s.replace(/(\d)?\s*([½⅓⅔¼¾⅛⅜⅝⅞])/g, (_m, whole: string | undefined, frac: string) =>
    `${whole ? `${whole} ` : ''}${UNICODE_FRACTIONS[frac]}`,
  );
}

/** Parse "1", "1.5", "1/2", "1 1/2" into a number, or null. */
export function parseNumber(text: string): number | null {
  const s = normalizeFractions(text).trim();
  let m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  return /^(\d*\.\d+|\d+)$/.test(s) ? Number(s) : null;
}

export interface LeadingQuantity {
  value: number;
  max?: number;
  rest: string;
}

/** Pull a leading amount ("1 1/2", "2-3", "½") off a line, returning the remainder. */
export function parseLeadingQuantity(line: string): LeadingQuantity | null {
  const m = LEADING.exec(normalizeFractions(line));
  if (!m) return null;
  let value = parseNumber(m[1]);
  if (value === null) return null;
  let max = m[2] ? parseNumber(m[2]) : null;
  if (max !== null && max <= value) {
    // "1-1/2" reads as 1½, not a range
    if (max < 1 && !/\s/.test(m[0].slice(0, m[0].length - m[3].length).trim())) value += max;
    max = null;
  }
  return { value, ...(max !== null ? { max } : {}), rest: m[3] };
}

const FRACTIONS: [number, string][] = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'],
  [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'],
];

/** 1.5 → "1 ½", 0.333 → "⅓", 2.37 → "2.37". */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  const whole = Math.floor(n + 0.02);
  const frac = n - whole;
  if (Math.abs(frac) < 0.02) return String(whole);
  for (const [v, glyph] of FRACTIONS) {
    if (Math.abs(frac - v) < 0.02) return whole === 0 ? glyph : `${whole} ${glyph}`;
  }
  if (Math.abs(frac - 1) < 0.02) return String(whole + 1);
  return String(Math.round(n * 100) / 100);
}

/** "1 ½ cup", "2–3 tbsp", "3". Empty string when no amount is specified. */
export function formatQuantity(q: Quantity): string {
  if (q.value === null) return '';
  const amount =
    q.max !== undefined ? `${formatNumber(q.value)}–${formatNumber(q.max)}` : formatNumber(q.value);
  const unit = getUnitByKey(q.unit) ? unitLabel(q.unit) : '';
  return unit ? `${amount} ${unit}` : amount;
}
