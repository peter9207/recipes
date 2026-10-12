import { parseLeadingQuantity } from './quantity';
import { getUnit } from './units';
import type { Quantity } from './types';

export interface ParsedIngredient {
  quantity: Quantity;
  name: string;
  note: string | null;
}

/** Try to read a unit off the front of `text` (one or two words). */
function takeUnit(text: string): { unit: string; rest: string } | null {
  const words = text.trim().split(/\s+/);
  for (const n of [2, 1]) {
    if (words.length < n) continue;
    const def = getUnit(words.slice(0, n).join(' '));
    if (def) return { unit: def.key, rest: words.slice(n).join(' ') };
  }
  return null;
}

/**
 * "2 cups flour, sifted" → { 2 cup, "flour", "sifted" }.
 * Never throws: unparseable input becomes a name-only ingredient.
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  const original = line.trim();
  let rest = original;
  let value: number | null = null;
  let max: number | undefined;
  let unit: string | null = null;

  const lead = parseLeadingQuantity(rest);
  if (lead) {
    value = lead.value;
    max = lead.max;
    rest = lead.rest;
    const u = takeUnit(rest);
    if (u) {
      unit = u.unit;
      rest = u.rest;
    }
  } else {
    const article = /^(an?)\s+(.*)$/i.exec(rest);
    const u = article && takeUnit(article[2]);
    if (u) {
      value = 1;
      unit = u.unit;
      rest = u.rest;
    }
  }
  if (value !== null) rest = rest.replace(/^of\s+/i, '');

  const notes: string[] = [];
  rest = rest.replace(/\(([^)]*)\)/g, (_m, inner: string) => {
    if (inner.trim()) notes.push(inner.trim());
    return ' ';
  });
  const comma = rest.indexOf(',');
  if (comma >= 0) {
    const tail = rest.slice(comma + 1).trim();
    if (tail) notes.push(tail);
    rest = rest.slice(0, comma);
  }
  let name = rest.replace(/\s+/g, ' ').trim();
  const toTaste = /^(.*?)\s+to taste$/i.exec(name);
  if (toTaste) {
    name = toTaste[1];
    notes.unshift('to taste');
  }
  if (!name) name = original;

  return {
    quantity: { value, ...(max !== undefined ? { max } : {}), unit },
    name,
    note: notes.length ? notes.join(', ') : null,
  };
}
