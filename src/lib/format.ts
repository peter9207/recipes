import { formatQuantity, toDisplayUnit, type Quantity } from '@/domain';

const METRIC = new Set(['ml', 'l', 'g', 'kg']);
const TIDYABLE = new Set([...METRIC, 'tsp', 'tbsp', 'cup', 'oz', 'lb']);

/** Pick a readable unit in the same system the quantity is already expressed in (1000 ml → 1 l). */
export function tidyQuantity(q: Quantity): Quantity {
  if (!q.unit || !TIDYABLE.has(q.unit)) return q;
  return toDisplayUnit(q, METRIC.has(q.unit) ? 'metric' : 'imperial');
}

/** "1 ½ cup flour" */
export function formatLine(name: string, q: Quantity): string {
  const amount = formatQuantity(tidyQuantity(q));
  return amount ? `${amount} ${name}` : name;
}

export function formatMinutes(total: number | null): string | null {
  if (total === null) return null;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
