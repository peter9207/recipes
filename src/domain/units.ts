import type { Quantity, UnitDef, UnitSystem } from './types';

const plural = (key: string) => [key, `${key}s`, `${key}es`];

export const UNITS: UnitDef[] = [
  // volume (base: ml)
  { key: 'ml', dimension: 'volume', toBase: 1, labels: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'] },
  { key: 'l', dimension: 'volume', toBase: 1000, labels: ['l', 'liter', 'liters', 'litre', 'litres'] },
  { key: 'tsp', dimension: 'volume', toBase: 4.92892, labels: ['tsp', 'tsps', 'teaspoon', 'teaspoons'] },
  { key: 'tbsp', dimension: 'volume', toBase: 14.7868, labels: ['tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons'] },
  { key: 'floz', dimension: 'volume', toBase: 29.5735, labels: ['fl oz', 'floz', 'fluid ounce', 'fluid ounces'] },
  { key: 'cup', dimension: 'volume', toBase: 236.588, labels: ['cup', 'cups', 'c'] },
  { key: 'pint', dimension: 'volume', toBase: 473.176, labels: ['pint', 'pints', 'pt'] },
  { key: 'quart', dimension: 'volume', toBase: 946.353, labels: ['quart', 'quarts', 'qt'] },
  { key: 'gallon', dimension: 'volume', toBase: 3785.41, labels: ['gallon', 'gallons', 'gal'] },
  // mass (base: g)
  { key: 'g', dimension: 'mass', toBase: 1, labels: ['g', 'gram', 'grams', 'gr'] },
  { key: 'kg', dimension: 'mass', toBase: 1000, labels: ['kg', 'kgs', 'kilogram', 'kilograms'] },
  { key: 'oz', dimension: 'mass', toBase: 28.3495, labels: ['oz', 'ounce', 'ounces'] },
  { key: 'lb', dimension: 'mass', toBase: 453.592, labels: ['lb', 'lbs', 'pound', 'pounds'] },
  // counts: only mergeable with the same key
  ...['clove', 'pinch', 'dash', 'can', 'slice', 'piece', 'bunch', 'sprig', 'stick', 'package'].map(
    (key): UnitDef => ({ key, dimension: 'count', toBase: 1, labels: plural(key) }),
  ),
];

const BY_KEY = new Map(UNITS.map((u) => [u.key, u]));
const BY_LABEL = new Map<string, UnitDef>();
for (const u of UNITS) for (const l of u.labels) BY_LABEL.set(l, u);

export function getUnitByKey(key: string | null): UnitDef | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/** Resolve a key or user-typed alias ("Tablespoons", "tbsp.") to a UnitDef. */
export function getUnit(keyOrAlias: string | null): UnitDef | null {
  if (!keyOrAlias) return null;
  const s = keyOrAlias.trim().toLowerCase().replace(/\.$/, '');
  return BY_LABEL.get(s) ?? null;
}

/** Whether two units can be summed after conversion. */
export function areCompatible(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  const ua = getUnitByKey(a);
  const ub = getUnitByKey(b);
  return !!ua && !!ub && ua.dimension === ub.dimension && ua.dimension !== 'count';
}

/** Convert within a dimension. Returns null if the units are incompatible. */
export function convert(q: Quantity, toUnit: string | null): Quantity | null {
  if (q.unit === toUnit) return q;
  if (!areCompatible(q.unit, toUnit)) return null;
  const from = getUnitByKey(q.unit)!;
  const to = getUnitByKey(toUnit)!;
  const f = from.toBase / to.toBase;
  return {
    value: q.value === null ? null : q.value * f,
    ...(q.max !== undefined ? { max: q.max * f } : {}),
    unit: toUnit,
  };
}

const LADDERS: Record<UnitSystem, Record<'volume' | 'mass', string[]>> = {
  metric: { volume: ['ml', 'l'], mass: ['g', 'kg'] },
  imperial: { volume: ['tsp', 'tbsp', 'cup'], mass: ['oz', 'lb'] },
};

/**
 * Express a quantity in the most readable unit of the preferred system
 * (1000 ml → 1 l, 3 tsp → 1 tbsp). Counts and unitless quantities are unchanged.
 */
export function toDisplayUnit(q: Quantity, system: UnitSystem): Quantity {
  const def = getUnitByKey(q.unit);
  if (!def || def.dimension === 'count' || q.value === null) return q;
  const ladder = LADDERS[system][def.dimension];
  let best = convert(q, ladder[0])!;
  for (const key of ladder.slice(1)) {
    const c = convert(q, key)!;
    if (Math.abs(c.value!) >= 0.99) best = c;
  }
  return best;
}
