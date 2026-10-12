import { convert, getUnitByKey } from './units';
import { normalizeName } from './normalize';
import type { Id, Quantity, ShoppingItemDraft } from './types';

export interface MergeInput {
  name: string;
  quantity: Quantity;
  recipeId: Id | null;
  recipeTitle: string;
}

/** Items merge only if they share a bucket: same dimension (convertible), same count unit, or both unitless. */
function bucketOf(q: Quantity): string {
  const def = getUnitByKey(q.unit);
  if (!def) return q.unit === null ? 'none' : `unit:${q.unit}`;
  return def.dimension === 'count' ? `unit:${def.key}` : def.dimension;
}

/**
 * Combine ingredient lines into shopping items.
 *  - same name + same/convertible unit → summed (in the first line's unit)
 *  - same name, different dimension ("1 onion" vs "100 g onion") → separate lines
 *  - unspecified amounts ("salt to taste") fold into a quantified line, or stand alone
 * Output order follows first appearance.
 */
export function mergeIngredients(inputs: MergeInput[]): ShoppingItemDraft[] {
  type Acc = ShoppingItemDraft & { bucket: string };
  const groups = new Map<string, { buckets: Acc[]; unspecified: MergeInput[]; displayName: string }>();

  for (const input of inputs) {
    const nameKey = normalizeName(input.name);
    let g = groups.get(nameKey);
    if (!g) {
      g = { buckets: [], unspecified: [], displayName: input.name.trim() };
      groups.set(nameKey, g);
    }
    if (input.quantity.value === null) {
      g.unspecified.push(input);
      continue;
    }
    const bucket = bucketOf(input.quantity);
    const source = { recipeId: input.recipeId, recipeTitle: input.recipeTitle, quantity: input.quantity };
    const existing = g.buckets.find((b) => b.bucket === bucket);
    if (!existing) {
      g.buckets.push({
        bucket,
        name: g.displayName,
        nameKey,
        quantity: { ...input.quantity },
        sources: [source],
      });
      continue;
    }
    const add = convert(input.quantity, existing.quantity.unit)!;
    const total = existing.quantity.value! + add.value!;
    const maxSum =
      existing.quantity.max !== undefined || add.max !== undefined
        ? (existing.quantity.max ?? existing.quantity.value!) + (add.max ?? add.value!)
        : undefined;
    existing.quantity = { value: total, ...(maxSum !== undefined ? { max: maxSum } : {}), unit: existing.quantity.unit };
    existing.sources.push(source);
  }

  const out: ShoppingItemDraft[] = [];
  for (const [nameKey, g] of groups) {
    const unspecifiedSources = g.unspecified.map((u) => ({
      recipeId: u.recipeId,
      recipeTitle: u.recipeTitle,
      quantity: u.quantity,
    }));
    if (g.buckets.length === 0) {
      out.push({ name: g.displayName, nameKey, quantity: { value: null, unit: null }, sources: unspecifiedSources });
      continue;
    }
    g.buckets[0].sources.push(...unspecifiedSources);
    for (const { bucket: _bucket, ...item } of g.buckets) out.push(item);
  }
  return out;
}
